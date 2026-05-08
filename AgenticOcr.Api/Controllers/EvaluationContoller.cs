using AgenticOcr.Application.Evaluation;
using AgenticOcr.Application.Interfaces;
using AgenticOcr.Application.Pipelines;
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

            var f1Result = MetricsCalculator.CalculateF1Score(
                groundTruth.CorrectText, result.RawText);

            // --- Remove existing metrics for this result before saving new ones ---
            var existing = await _db.EvaluationMetrics
                .FirstOrDefaultAsync(e => e.OcrResultId == result.Id);
            if (existing != null)
                _db.EvaluationMetrics.Remove(existing);

            // --- Store metrics in database ---
            var evalMetric = new EvaluationMetric
            {
                OcrResultId = result.Id,
                CharacterErrorRate = metrics.CharacterErrorRate,
                WordErrorRate = metrics.WordErrorRate,
                Precision = f1Result.Precision,
                Recall = f1Result.Recall,
                TokenOverlap = tokenOverlap 
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
                precision = f1Result.Precision,
                recall = f1Result.Recall,
                f1Score = f1Result.F1Score,
                truePositives = f1Result.TruePositives,
                falsePositives = f1Result.FalsePositives,
                falseNegatives = f1Result.FalseNegatives,
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
                avgTokenOverlap = Math.Round(
                    baseline.Average(e => e.TokenOverlap ?? 0), 4),
                avgF1Score = Math.Round(baseline.Average(e =>
                    ((double)e.Precision + (double)e.Recall) == 0 ? 0 :
                    2 * (double)e.Precision * (double)e.Recall /
                    ((double)e.Precision + (double)e.Recall)), 4),
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
                avgTokenOverlap = Math.Round(
                    agentic.Average(e => e.TokenOverlap ?? 0), 4),
                avgF1Score = Math.Round(agentic.Average(e =>
                    ((double)e.Precision + (double)e.Recall) == 0 ? 0 :
                    2 * (double)e.Precision * (double)e.Recall /
                    ((double)e.Precision + (double)e.Recall)), 4),
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
                    agentic.Average(e => e.TokenOverlap ?? 0) -
                    baseline.Average(e => e.TokenOverlap ?? 0), 4),
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

        // Load ground truths and OCR results for word detection calculation
        var groundTruths = await _db.GroundTruths.ToListAsync();
        var ocrResults = await _db.OcrResults.ToListAsync();

        var csv = new StringBuilder();

        // Header
        csv.AppendLine(
            "DocumentName,PipelineType,CER,WER," +
            "CharAccuracy,WordAccuracy,TokenOverlap," +
            "Precision,Recall,F1Score," +
            "WordDetectionRate,CorrectWords,MissingWords," +
            "ProcessingTimeMs,EvaluatedAt");

        foreach (var m in metrics)
        {
            // Calculate F1 from stored precision and recall
            var precision = m.Precision.GetValueOrDefault();
            var recall = m.Recall.GetValueOrDefault();
            var f1 = (precision + recall) == 0
                ? 0.0
                : Math.Round(2 * precision * recall / (precision + recall), 4);

            // Calculate word detection rate
            var ocrResult = ocrResults
                .FirstOrDefault(r => r.Id == m.OcrResultId);
            var gt = ocrResult != null
                ? groundTruths.FirstOrDefault(
                    g => g.DocumentId == ocrResult.DocumentId)
                : null;

            double wordDetectionRate = 0;
            int correctWords = 0;
            int missingWords = 0;

            if (gt != null && ocrResult != null)
            {
                var comparison = MetricsCalculator.CompareWords(
                    gt.CorrectText, ocrResult.RawText);
                wordDetectionRate = comparison.WordDetectionRate;
                correctWords = comparison.CorrectWords;
                missingWords = comparison.MissingWords;
            }

            // Character accuracy is 1 - CER, word accuracy is 1 - WER
            var charAccuracy = Math.Round(
                1 - m.CharacterErrorRate.GetValueOrDefault(), 4);
            var wordAccuracy = Math.Round(
                1 - m.WordErrorRate.GetValueOrDefault(), 4);

            csv.AppendLine(
                $"{m.OcrResult.Document.FileName}," +
                $"{m.OcrResult.PipelineType}," +
                $"{m.CharacterErrorRate.GetValueOrDefault():F4}," +
                $"{m.WordErrorRate.GetValueOrDefault():F4}," +
                $"{charAccuracy:F4}," +
                $"{wordAccuracy:F4}," +
                $"{m.TokenOverlap.GetValueOrDefault():F4}," +
                $"{precision:F4}," +
                $"{recall:F4}," +
                $"{f1:F4}," +
                $"{wordDetectionRate:F4}," +
                $"{correctWords}," +
                $"{missingWords}," +
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
                    tokenOverlap = r.EvaluationMetric.TokenOverlap
                }
            })
        });
    }

    // POST /api/evaluation/ablation/{documentId}
    [HttpPost("ablation/{documentId}")]
    public async Task<IActionResult> RunAblationStudy(
        Guid documentId,
        [FromServices] ILlmService llm)
    {
        var document = await _db.Documents.FindAsync(documentId);
        if (document == null)
            return NotFound("Document not found.");

        var groundTruth = await _db.GroundTruths
            .FirstOrDefaultAsync(g => g.DocumentId == documentId);

        // Define all pipeline configurations to test
        var configs = new List<PipelineConfig>
    {
        PipelineConfig.FullPipeline,
        PipelineConfig.PlainTextOnly,
        PipelineConfig.ExtractionOnly,
        PipelineConfig.NoAssessment,
        PipelineConfig.NoVisualElements,
        PipelineConfig.NoReextraction,
        PipelineConfig.NoSafetyChecks,
        PipelineConfig.NoSimplification
    };

        var results = new List<object>();

        foreach (var cfg in configs)
        {
            try
            {
                var pipeline = new AgenticPipeline(llm);
                var result = await pipeline.RunAsync(
                    document.FilePath, cfg);

                var metrics = groundTruth != null
                    ? MetricsCalculator.Calculate(
                        groundTruth.CorrectText, result.RawText)
                    : null;

                var tokenOverlap = groundTruth != null
                    ? MetricsCalculator.CalculateTokenOverlap(
                        groundTruth.CorrectText, result.RawText)
                    : 0.0;

                results.Add(new
                {
                    config = cfg.ConfigName,
                    processingTimeMs = result.ProcessingTimeMs,
                    rawTextLength = result.RawText.Length,
                    globalConfidence = result.GlobalConfidence,
                    reviewRequired = result.ReviewRequired,
                    hasSimplifiedText = !string.IsNullOrEmpty(
                        result.SimplifiedText),
                    cer = metrics?.CharacterErrorRate,
                    wer = metrics?.WordErrorRate,
                    charAccuracy = metrics?.CharacterAccuracy,
                    tokenOverlap = tokenOverlap,
                    stepsExecuted = result.AuditLog
                        .Count(a => a.Contains("_completed")),
                    stepsSkipped = result.AuditLog
                        .Count(a => a.Contains("_SKIPPED")),
                    auditLog = result.AuditLog
                });
            }
            catch (Exception ex)
            {
                results.Add(new
                {
                    config = cfg.ConfigName,
                    error = ex.Message
                });
            }
        }

        return Ok(new
        {
            documentId,
            fileName = document.FileName,
            ablationResults = results
        });
    }

    // POST /api/evaluation/ablation-batch
    [HttpPost("ablation-batch")]
    public async Task<IActionResult> RunAblationBatch(
        [FromServices] ILlmService llm,
        [FromBody] List<Guid> documentIds)
    {
        var csv = new StringBuilder();
        csv.AppendLine(
            "DocumentName,Config,CER,TokenOverlap," +
            "ProcessingTimeMs,StepsExecuted,StepsSkipped");

        var configs = new List<PipelineConfig>
    {
        PipelineConfig.FullPipeline,
        PipelineConfig.PlainTextOnly,
        PipelineConfig.ExtractionOnly,
        PipelineConfig.NoAssessment,
        PipelineConfig.NoReextraction,
        PipelineConfig.NoSafetyChecks,
    };

        foreach (var docId in documentIds)
        {
            var document = await _db.Documents.FindAsync(docId);
            var groundTruth = await _db.GroundTruths
                .FirstOrDefaultAsync(g => g.DocumentId == docId);

            if (document == null || groundTruth == null) continue;

            foreach (var cfg in configs)
            {
                try
                {
                    var pipeline = new AgenticPipeline(llm);
                    var result = await pipeline.RunAsync(
                        document.FilePath, cfg);

                    var metrics = MetricsCalculator.Calculate(
                        groundTruth.CorrectText, result.RawText);
                    var tokenOverlap = MetricsCalculator.CalculateTokenOverlap(
                        groundTruth.CorrectText, result.RawText);

                    csv.AppendLine(
                        $"{document.FileName},{cfg.ConfigName}," +
                        $"{metrics.CharacterErrorRate:F4}," +
                        $"{tokenOverlap:F4}," +
                        $"{result.ProcessingTimeMs}," +
                        $"{result.AuditLog.Count(a => a.Contains("_completed"))}," +
                        $"{result.AuditLog.Count(a => a.Contains("_SKIPPED"))}");
                }
                catch { }
            }
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", "ablation_study_results.csv");
    }

    // GET /api/evaluation/word-comparison/{documentId}
    [HttpGet("word-comparison/{documentId}")]
    public async Task<IActionResult> WordComparison(Guid documentId)
    {
        var groundTruth = await _db.GroundTruths
            .FirstOrDefaultAsync(g => g.DocumentId == documentId);

        if (groundTruth == null)
            return BadRequest("No ground truth found.");

        var ocrResults = await _db.OcrResults
            .Where(r => r.DocumentId == documentId)
            .ToListAsync();

        var results = new List<object>();

        foreach (var result in ocrResults)
        {
            var comparison = MetricsCalculator.CompareWords(
                groundTruth.CorrectText, result.RawText);

            results.Add(new
            {
                pipelineType = result.PipelineType.ToString(),
                totalWords = comparison.TotalGroundTruthWords,
                correctWords = comparison.CorrectWords,
                missingWords = comparison.MissingWords,
                extraWords = comparison.ExtraWords,
                wordDetectionRate = comparison.WordDetectionRate,
                missingWordsList = comparison.Words
                    .Where(w => w.Source == "ground_truth" && !w.Found)
                    .Select(w => w.Word)
                    .ToList(),
                correctWordsList = comparison.Words
                    .Where(w => w.Source == "ground_truth" && w.Found)
                    .Select(w => w.Word)
                    .ToList(),
                extraWordsList = comparison.Words
                    .Where(w => w.Source == "extra_in_extracted")
                    .Select(w => w.Word)
                    .ToList()
            });
        }

        return Ok(new { documentId, results });
    }

    // GET /api/evaluation/detailed/{documentId}
    // Returns all metrics including word detection and entity scores
    [HttpGet("detailed/{documentId}")]
    public async Task<IActionResult> GetDetailedMetrics(Guid documentId)
    {
        var groundTruth = await _db.GroundTruths
            .FirstOrDefaultAsync(g => g.DocumentId == documentId);

        if (groundTruth == null)
            return BadRequest("No ground truth found for this document.");

        var ocrResults = await _db.OcrResults
            .Where(r => r.DocumentId == documentId)
            .ToListAsync();

        if (!ocrResults.Any())
            return NotFound("No OCR results found.");

        var results = new List<object>();

        foreach (var result in ocrResults)
        {
            // Standard metrics
            var metrics = MetricsCalculator.Calculate(
                groundTruth.CorrectText, result.RawText);

            // Token overlap
            var tokenOverlap = MetricsCalculator.CalculateTokenOverlap(
                groundTruth.CorrectText, result.RawText);

            // Word detection
            var wordComparison = MetricsCalculator.CompareWords(
                groundTruth.CorrectText, result.RawText);

            // Confidence explanation
            var confidenceBreakdown = ExplainConfidence(result);

            results.Add(new
            {
                pipelineType = result.PipelineType.ToString(),
                processingTimeMs = result.ProcessingTimeMs,

                // CER and WER
                characterErrorRate = metrics.CharacterErrorRate,
                wordErrorRate = metrics.WordErrorRate,
                characterAccuracy = metrics.CharacterAccuracy,
                wordAccuracy = metrics.WordAccuracy,
                totalCharacters = metrics.TotalCharacters,
                totalWords = metrics.TotalWords,

                // Token overlap
                tokenOverlap = tokenOverlap,

                // Word detection
                wordDetectionRate = wordComparison.WordDetectionRate,
                correctWords = wordComparison.CorrectWords,
                missingWords = wordComparison.MissingWords,
                extraWords = wordComparison.ExtraWords,
                totalGroundTruthWords = wordComparison.TotalGroundTruthWords,
                missingWordsList = wordComparison.Words
                    .Where(w => w.Source == "ground_truth" && !w.Found)
                    .Select(w => w.Word)
                    .ToList(),
                correctWordsList = wordComparison.Words
                    .Where(w => w.Source == "ground_truth" && w.Found)
                    .Select(w => w.Word)
                    .ToList(),

                // Confidence
                globalConfidence = result.StructuredJson != null
                    ? ExtractConfidence(result.StructuredJson)
                    : 0.5,
                confidenceBreakdown = confidenceBreakdown,

                // Text previews for comparison
                extractedTextPreview = result.RawText.Length > 300
                    ? result.RawText[..300] + "..."
                    : result.RawText,
                groundTruthPreview = groundTruth.CorrectText.Length > 300
                    ? groundTruth.CorrectText[..300] + "..."
                    : groundTruth.CorrectText
            });
        }

        return Ok(new { documentId, results });
    }

    // GET /api/evaluation/detailed-summary
    // Aggregate all metrics across all evaluated documents
    [HttpGet("detailed-summary")]
    public async Task<IActionResult> GetDetailedSummary()
    {
        var metrics = await _db.EvaluationMetrics
            .Include(e => e.OcrResult)
            .ThenInclude(r => r.Document)
            .ToListAsync();

        if (!metrics.Any())
            return Ok(new { message = "No evaluations yet." });

        var groundTruths = await _db.GroundTruths.ToListAsync();
        var ocrResults = await _db.OcrResults.ToListAsync();

        var baseline = metrics.Where(e =>
            e.OcrResult.PipelineType == Domain.Enums.PipelineType.Baseline)
            .ToList();
        var agentic = metrics.Where(e =>
            e.OcrResult.PipelineType == Domain.Enums.PipelineType.Agentic)
            .ToList();

        // Calculate word detection rates for each result
        var baselineWordDetection = CalculateWordDetectionRates(
            baseline, groundTruths, ocrResults);
        var agenticWordDetection = CalculateWordDetectionRates(
            agentic, groundTruths, ocrResults);

        return Ok(new
        {
            totalDocumentsEvaluated = metrics
                .Select(e => e.OcrResult.DocumentId)
                .Distinct().Count(),

            baseline = baseline.Any() ? new
            {
                avgCer = Math.Round(
                    (double)baseline.Average(e => e.CharacterErrorRate), 4),
                avgWer = Math.Round(
                    (double)baseline.Average(e => e.WordErrorRate), 4),
                avgCharAccuracy = Math.Round(
                    (double)baseline.Average(e => e.Precision), 4),
                avgWordAccuracy = Math.Round(
                    (double)baseline.Average(e => e.Recall), 4),
                avgTokenOverlap = Math.Round(
                    baseline.Average(e => e.TokenOverlap ?? 0), 4),
                avgWordDetectionRate = Math.Round(
                    baselineWordDetection.Average(), 4),
                avgProcessingTimeMs = Math.Round(
                    baseline.Average(e => e.OcrResult.ProcessingTimeMs), 0),
                documentsCount = baseline.Count
            } : null,

            agentic = agentic.Any() ? new
            {
                avgCer = Math.Round(
                    (double)agentic.Average(e => e.CharacterErrorRate), 4),
                avgWer = Math.Round(
                    (double)agentic.Average(e => e.WordErrorRate), 4),
                avgCharAccuracy = Math.Round(
                    (double)agentic.Average(e => e.Precision), 4),
                avgWordAccuracy = Math.Round(
                    (double)agentic.Average(e => e.Recall), 4),
                avgTokenOverlap = Math.Round(
                    agentic.Average(e => e.TokenOverlap ?? 0), 4),
                avgWordDetectionRate = Math.Round(
                    agenticWordDetection.Average(), 4),
                avgProcessingTimeMs = Math.Round(
                    agentic.Average(e => e.OcrResult.ProcessingTimeMs), 0),
                documentsCount = agentic.Count
            } : null,

            improvement = baseline.Any() && agentic.Any() ? new
            {
                cerReduction = Math.Round(
                    (double)baseline.Average(e => e.CharacterErrorRate) -
                   (double)agentic.Average(e => e.CharacterErrorRate), 4),
                tokenOverlapGain = Math.Round(
                    agentic.Average(e => e.TokenOverlap ?? 0) -
                    baseline.Average(e => e.TokenOverlap ?? 0), 4),
                wordDetectionGain = Math.Round(
                    agenticWordDetection.Average() -
                    baselineWordDetection.Average(), 4),
                processingTimeCostMs = Math.Round(
                    agentic.Average(e => e.OcrResult.ProcessingTimeMs) -
                    baseline.Average(e => e.OcrResult.ProcessingTimeMs), 0)
            } : null
        });
    }

    private static List<double> CalculateWordDetectionRates(
        List<EvaluationMetric> pipelineMetrics,
        List<GroundTruth> groundTruths,
        List<OcrResult> ocrResults)
    {
        var rates = new List<double>();

        foreach (var metric in pipelineMetrics)
        {
            var result = ocrResults
                .FirstOrDefault(r => r.Id == metric.OcrResultId);
            if (result == null) continue;

            var gt = groundTruths
                .FirstOrDefault(g => g.DocumentId == result.DocumentId);
            if (gt == null) continue;

            var comparison = MetricsCalculator.CompareWords(
                gt.CorrectText, result.RawText);
            rates.Add(comparison.WordDetectionRate);
        }

        return rates.Any() ? rates : new List<double> { 0 };
    }

    private static double ExtractConfidence(string structuredJson)
    {
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(structuredJson);
            var root = doc.RootElement;

            if (root.TryGetProperty("global_confidence", out var gc))
                return gc.GetDouble();

            if (root.TryGetProperty("report_metadata", out var meta) &&
                meta.TryGetProperty("global_confidence", out var mgc))
                return mgc.GetDouble();

            return 0.5;
        }
        catch { return 0.5; }
    }

    private static object ExplainConfidence(OcrResult result)
    {
        return new
        {
            description = "Confidence is computed by the agentic pipeline " +
                "based on four factors",
            factors = new[]
            {
            new
            {
                factor = "Image Quality",
                weight = "25%",
                description = "Blur, noise, skew, contrast of the scanned image"
            },
            new
            {
                factor = "Text Legibility",
                weight = "25%",
                description = "Clarity of handwriting or print, " +
                    "font consistency"
            },
            new
            {
                factor = "Entity Match Quality",
                weight = "30%",
                description = "How well extracted entities match known " +
                    "medical terminology and drug databases"
            },
            new
            {
                factor = "Dosage Plausibility",
                weight = "20%",
                description = "Whether extracted dosages and frequencies " +
                    "are medically plausible"
            }
        },
            note = "Confidence below 0.7 triggers mandatory human review. " +
                "Synthetic documents without official stamps, " +
                "letterheads, or signatures may score lower " +
                "regardless of extraction quality.",
            reviewRequired = result.ReviewRequired
        };
    }



}

public class GroundTruthRequest
{
    public Guid DocumentId { get; set; }
    public string CorrectText { get; set; } = string.Empty;
}