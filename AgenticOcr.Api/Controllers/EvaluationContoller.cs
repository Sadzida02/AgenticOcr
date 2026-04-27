using AgenticOcr.Application.Evaluation;
using AgenticOcr.Domain.Entities;
using AgenticOcr.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace AgenticOcr.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EvaluationController : ControllerBase
{
    private readonly OcrDbContext _db;

    public EvaluationController(OcrDbContext db)
    {
        _db = db;
    }

    // POST /api/evaluation/ground-truth
    [HttpPost("ground-truth")]
    public async Task<IActionResult> SubmitGroundTruth(
        [FromBody] GroundTruthRequest request)
    {
        var document = await _db.Documents.FindAsync(request.DocumentId);
        if (document == null)
            return NotFound($"Document {request.DocumentId} not found.");

        var existing = await _db.GroundTruths
            .FirstOrDefaultAsync(g => g.DocumentId == request.DocumentId);
        if (existing != null)
            _db.GroundTruths.Remove(existing);

        var groundTruth = new GroundTruth
        {
            DocumentId = request.DocumentId,
            CorrectText = request.CorrectText
        };
        _db.GroundTruths.Add(groundTruth);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Ground truth saved successfully." });
    }

    // POST /api/evaluation/evaluate/{documentId}
    [HttpPost("evaluate/{documentId}")]
    public async Task<IActionResult> Evaluate(Guid documentId)
    {
        var groundTruth = await _db.GroundTruths
            .FirstOrDefaultAsync(g => g.DocumentId == documentId);

        if (groundTruth == null)
            return BadRequest(
                "No ground truth found. Submit ground truth first.");

        var ocrResults = await _db.OcrResults
            .Where(r => r.DocumentId == documentId)
            .ToListAsync();

        if (!ocrResults.Any())
            return BadRequest("No OCR results found for this document.");

        var evaluationResults = new List<object>();

        foreach (var result in ocrResults)
        {
            // --- Calculate CER and WER using Levenshtein distance ---
            var metrics = MetricsCalculator.Calculate(
                groundTruth.CorrectText,
                result.RawText);

            // --- Calculate token overlap (more robust for formatting differences) ---
            var tokenOverlap = MetricsCalculator.CalculateTokenOverlap(
                groundTruth.CorrectText,
                result.RawText);

            // --- Remove existing metrics for this result before saving new ones ---
            var existing = await _db.EvaluationMetrics
                .FirstOrDefaultAsync(e => e.OcrResultId == result.Id);
            if (existing != null)
                _db.EvaluationMetrics.Remove(existing);

            // --- Store metrics in database ---
            // Note: we store TokenOverlap in the LayoutScore column
            // since we don't have a separate column for it yet
            var evalMetric = new EvaluationMetric
            {
                OcrResultId = result.Id,
                CharacterErrorRate = metrics.CharacterErrorRate,
                WordErrorRate = metrics.WordErrorRate,
                Precision = metrics.CharacterAccuracy,
                Recall = metrics.WordAccuracy,
                LayoutScore = tokenOverlap  // repurposed for token overlap
            };
            _db.EvaluationMetrics.Add(evalMetric);

            // --- Build result object with all metrics ---
            evaluationResults.Add(new
            {
                pipelineType = result.PipelineType.ToString(),
                processingTimeMs = result.ProcessingTimeMs,
                characterErrorRate = metrics.CharacterErrorRate,
                wordErrorRate = metrics.WordErrorRate,
                characterAccuracy = metrics.CharacterAccuracy,
                wordAccuracy = metrics.WordAccuracy,
                tokenOverlap = tokenOverlap,
                totalCharacters = metrics.TotalCharacters,
                totalWords = metrics.TotalWords,
                // --- Include preview of what was actually extracted ---
                extractedTextPreview = result.RawText.Length > 200
                    ? result.RawText[..200] + "..."
                    : result.RawText
            });
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            documentId,
            groundTruthLength = groundTruth.CorrectText.Length,
            // --- Include ground truth preview so you can verify it is correct ---
            groundTruthPreview = groundTruth.CorrectText.Length > 200
                ? groundTruth.CorrectText[..200] + "..."
                : groundTruth.CorrectText,
            results = evaluationResults
        });
    }

    // GET /api/evaluation/summary
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var metrics = await _db.EvaluationMetrics
            .Include(e => e.OcrResult)
            .ToListAsync();

        if (!metrics.Any())
            return Ok(new { message = "No evaluations yet." });

        var baseline = metrics
            .Where(e => e.OcrResult.PipelineType ==
                Domain.Enums.PipelineType.Baseline)
            .ToList();

        var agentic = metrics
            .Where(e => e.OcrResult.PipelineType ==
                Domain.Enums.PipelineType.Agentic)
            .ToList();

        return Ok(new
        {
            totalDocumentsEvaluated = metrics
                .Select(e => e.OcrResult.DocumentId)
                .Distinct().Count(),

            baseline = baseline.Any() ? new
            {
                avgCer = baseline.Average(e => e.CharacterErrorRate),
                avgWer = baseline.Average(e => e.WordErrorRate),
                avgCharAccuracy = baseline.Average(e => e.Precision),
                avgWordAccuracy = baseline.Average(e => e.Recall),
                // --- Token overlap average added ---
                avgTokenOverlap = Math.Round(
                    baseline.Average(e => e.LayoutScore ?? 0), 4),
                avgProcessingTimeMs = Math.Round(
                    baseline.Average(e => e.OcrResult.ProcessingTimeMs), 0),
                documentsCount = baseline.Count
            } : null,

            agentic = agentic.Any() ? new
            {
                avgCer = agentic.Average(e => e.CharacterErrorRate),
                avgWer = agentic.Average(e => e.WordErrorRate),
                avgCharAccuracy = agentic.Average(e => e.Precision),
                avgWordAccuracy = agentic.Average(e => e.Recall),
                // --- Token overlap average added ---
                avgTokenOverlap = Math.Round(
                    agentic.Average(e => e.LayoutScore ?? 0), 4),
                avgProcessingTimeMs = Math.Round(
                    agentic.Average(e => e.OcrResult.ProcessingTimeMs), 0),
                documentsCount = agentic.Count
            } : null,

            // --- Improvement summary comparing agentic vs baseline ---
            // Only shown when both pipelines have results
            improvement = baseline.Any() && agentic.Any() ? new
            {
                cerImprovement =
                    baseline.Average(e => e.CharacterErrorRate) -
                    agentic.Average(e => e.CharacterErrorRate),
                werImprovement =
                    baseline.Average(e => e.WordErrorRate) -
                    agentic.Average(e => e.WordErrorRate),
                tokenOverlapImprovement = Math.Round(
                    agentic.Average(e => e.LayoutScore ?? 0) -
                    baseline.Average(e => e.LayoutScore ?? 0), 4),
                processingTimeTradeoffMs = Math.Round(
                    agentic.Average(e => e.OcrResult.ProcessingTimeMs) -
                    baseline.Average(e => e.OcrResult.ProcessingTimeMs), 0)
            } : null
        });
    }

    // GET /api/evaluation/export-csv
    // Downloads all evaluation results as a CSV file for Excel/Python analysis
    [HttpGet("export-csv")]
    public async Task<IActionResult> ExportCsv()
    {
        var metrics = await _db.EvaluationMetrics
            .Include(e => e.OcrResult)
            .ThenInclude(r => r.Document)
            .OrderBy(e => e.OcrResult.Document.FileName)
            .ThenBy(e => e.OcrResult.PipelineType)
            .ToListAsync();

        if (!metrics.Any())
            return BadRequest("No evaluation results to export yet.");

        var csv = new StringBuilder();

        // --- CSV header row ---
        csv.AppendLine(
            "DocumentName,PipelineType,CER,WER," +
            "CharAccuracy,WordAccuracy,TokenOverlap," +
            "ProcessingTimeMs,EvaluatedAt");

        // --- One row per evaluation result ---
        foreach (var m in metrics)
        {
            csv.AppendLine(
                $"{m.OcrResult.Document.FileName}," +
                $"{m.OcrResult.PipelineType}," +
                $"{m.CharacterErrorRate:F4}," +
                $"{m.WordErrorRate:F4}," +
                $"{m.Precision:F4}," +
                $"{m.Recall:F4}," +
                $"{m.LayoutScore:F4}," +
                $"{m.OcrResult.ProcessingTimeMs}," +
                $"{m.CreatedAt:yyyy-MM-dd HH:mm:ss}");
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", "ocr_evaluation_results.csv");
    }

    // GET /api/evaluation/document/{documentId}
    // Get detailed evaluation for a single document — useful for debugging
    [HttpGet("document/{documentId}")]
    public async Task<IActionResult> GetDocumentEvaluation(Guid documentId)
    {
        var groundTruth = await _db.GroundTruths
            .FirstOrDefaultAsync(g => g.DocumentId == documentId);

        var ocrResults = await _db.OcrResults
            .Include(r => r.EvaluationMetric)
            .Include(r => r.Document)
            .Where(r => r.DocumentId == documentId)
            .ToListAsync();

        if (!ocrResults.Any())
            return NotFound("No results found for this document.");

        return Ok(new
        {
            documentId,
            fileName = ocrResults.First().Document.FileName,
            hasGroundTruth = groundTruth != null,
            // --- Show ground truth and extracted text side by side ---
            // so you can visually verify they are comparable
            groundTruth = groundTruth?.CorrectText,
            results = ocrResults.Select(r => new
            {
                pipelineType = r.PipelineType.ToString(),
                rawText = r.RawText,
                processingTimeMs = r.ProcessingTimeMs,
                metrics = r.EvaluationMetric == null ? null : new
                {
                    cer = r.EvaluationMetric.CharacterErrorRate,
                    wer = r.EvaluationMetric.WordErrorRate,
                    charAccuracy = r.EvaluationMetric.Precision,
                    wordAccuracy = r.EvaluationMetric.Recall,
                    tokenOverlap = r.EvaluationMetric.LayoutScore
                }
            })
        });
    }

}

public class GroundTruthRequest
{
    public Guid DocumentId { get; set; }
    public string CorrectText { get; set; } = string.Empty;
}