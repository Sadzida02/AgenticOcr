using AgenticOcr.Application.Interfaces;
using AgenticOcr.Application.Pipelines;
using AgenticOcr.Domain.Entities;
using AgenticOcr.Domain.Enums;
using AgenticOcr.Infrastructure.Data;
using AgenticOcr.Infrastructure.ExternalServices;
using Microsoft.AspNetCore.Mvc;

namespace AgenticOcr.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AgenticOcrController : ControllerBase
{
    private readonly ILlmService _llm;
    private readonly FileStorageService _fileStorage;
    private readonly OcrDbContext _db;

    public AgenticOcrController(
        ILlmService llm,
        FileStorageService fileStorage,
        OcrDbContext db)
    {
        _llm = llm;
        _fileStorage = fileStorage;
        _db = db;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var filePath = await _fileStorage.SaveFileAsync(
            file.OpenReadStream(), file.FileName);

        var document = new Document
        {
            FileName = file.FileName,
            FilePath = filePath,
            FileType = Path.GetExtension(file.FileName),
            FileSizeBytes = file.Length,
            Status = ProcessingStatus.Processing
        };
        _db.Documents.Add(document);
        await _db.SaveChangesAsync();

        try
        {
            var pipeline = new AgenticPipeline(_llm);
            var result = await pipeline.RunAsync(filePath);

            var ocrResult = new OcrResult
            {
                DocumentId = document.Id,
                PipelineType = PipelineType.Agentic,
                RawText = result.RawText,
                StructuredJson = result.StructuredJson,
                SimplifiedText = result.SimplifiedText,
                ProcessingTimeMs = result.ProcessingTimeMs
            };
            _db.OcrResults.Add(ocrResult);
            document.Status = ProcessingStatus.Done;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                documentId = document.Id,
                fileName = document.FileName,
                rawText = result.RawText,
                structuredJson = result.StructuredJson,
                simplifiedText = result.SimplifiedText,
                globalConfidence = result.GlobalConfidence,
                reviewRequired = result.ReviewRequired,
                processingTimeMs = result.ProcessingTimeMs,
                auditLog = result.AuditLog
            });
        }
        catch (Exception ex)
        {
            document.Status = ProcessingStatus.Failed;
            await _db.SaveChangesAsync();
            return StatusCode(500, $"Agentic pipeline failed: {ex.Message}");
        }
    }

    // POST /api/AgenticOcr/upload-plain
    // Runs Gemini as simple OCR — one plain text extraction call, no agents
    [HttpPost("upload-plain")]
    public async Task<IActionResult> UploadPlain(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        var filePath = await _fileStorage.SaveFileAsync(
            file.OpenReadStream(), file.FileName);

        var document = new Document
        {
            FileName = file.FileName,
            FilePath = filePath,
            FileType = Path.GetExtension(file.FileName),
            FileSizeBytes = file.Length,
            Status = ProcessingStatus.Processing
        };
        _db.Documents.Add(document);
        await _db.SaveChangesAsync();

        try
        {
            // Single plain text extraction call — no agent pipeline
            var plainText = await _llm
                .ExtractPlainTextFromImageAsync(filePath);

            stopwatch.Stop();

            _db.OcrResults.Add(new OcrResult
            {
                DocumentId = document.Id,
                PipelineType = PipelineType.GeminiPlain,
                RawText = plainText,
                ProcessingTimeMs = (int)stopwatch.ElapsedMilliseconds
            });

            document.Status = ProcessingStatus.Done;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                documentId = document.Id,
                fileName = document.FileName,
                rawText = plainText,
                processingTimeMs = (int)stopwatch.ElapsedMilliseconds,
                pipeline = "GeminiPlain"
            });
        }
        catch (Exception ex)
        {
            document.Status = ProcessingStatus.Failed;
            await _db.SaveChangesAsync();
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // POST /api/AgenticOcr/upload-all
    // Runs all four pipelines on the same document
    [HttpPost("upload-all")]
    public async Task<IActionResult> UploadAll(
        IFormFile file,
        [FromServices] IOcrService ocrService,
        [FromServices] IConfiguration config,
        [FromServices] PromptLoaderService promptLoader)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var filePath = await _fileStorage.SaveFileAsync(
            file.OpenReadStream(), file.FileName);

        var document = new Document
        {
            FileName = file.FileName,
            FilePath = filePath,
            FileType = Path.GetExtension(file.FileName),
            FileSizeBytes = file.Length,
            Status = ProcessingStatus.Processing
        };
        _db.Documents.Add(document);
        await _db.SaveChangesAsync();

        var results = new List<object>();

        // ── Pipeline 1: Tesseract baseline ───────────────────────────────────
        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var (text, _) = await ocrService.ExtractTextAsync(filePath);
            sw.Stop();

            _db.OcrResults.Add(new OcrResult
            {
                DocumentId = document.Id,
                PipelineType = PipelineType.Baseline,
                RawText = text,
                ProcessingTimeMs = (int)sw.ElapsedMilliseconds
            });

            results.Add(new
            {
                pipeline = "Baseline (Tesseract)",
                rawText = text,
                processingTimeMs = (int)sw.ElapsedMilliseconds
            });
        }
        catch (Exception ex)
        {
            results.Add(new
            {
                pipeline = "Baseline (Tesseract)",
                error = ex.Message
            });
        }

        // ── Pipeline 2: Gemini plain text ─────────────────────────────────────
        await Task.Delay(2000);
        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var plainText = await _llmService
                .ExtractPlainTextFromImageAsync(filePath);
            sw.Stop();

            _db.OcrResults.Add(new OcrResult
            {
                DocumentId = document.Id,
                PipelineType = PipelineType.GeminiPlain,
                RawText = plainText,
                ProcessingTimeMs = (int)sw.ElapsedMilliseconds
            });

            results.Add(new
            {
                pipeline = "Gemini Plain",
                rawText = plainText,
                processingTimeMs = (int)sw.ElapsedMilliseconds
            });
        }
        catch (Exception ex)
        {
            results.Add(new
            {
                pipeline = "Gemini Plain",
                error = ex.Message
            });
        }

        // ── Pipeline 3: Google Vision ─────────────────────────────────────────
        await Task.Delay(1000);
        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var visionService = new GoogleVisionService(config, promptLoader);
            var text = await visionService
                .ExtractPlainTextFromImageAsync(filePath);
            sw.Stop();

            _db.OcrResults.Add(new OcrResult
            {
                DocumentId = document.Id,
                PipelineType = PipelineType.GoogleVision,
                RawText = text,
                ProcessingTimeMs = (int)sw.ElapsedMilliseconds
            });

            results.Add(new
            {
                pipeline = "Google Vision",
                rawText = text,
                processingTimeMs = (int)sw.ElapsedMilliseconds
            });
        }
        catch (Exception ex)
        {
            results.Add(new
            {
                pipeline = "Google Vision",
                error = ex.Message
            });
        }

        // ── Pipeline 4: Gemini agentic ────────────────────────────────────────
        await Task.Delay(3000);
        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var pipeline = new AgenticPipeline(_llm);
            var agenticResult = await pipeline.RunAsync(filePath);
            sw.Stop();

            _db.OcrResults.Add(new OcrResult
            {
                DocumentId = document.Id,
                PipelineType = PipelineType.Agentic,
                RawText = agenticResult.RawText,
                StructuredJson = agenticResult.StructuredJson,
                SimplifiedText = agenticResult.SimplifiedText,
                ReviewRequired = agenticResult.ReviewRequired,
                ProcessingTimeMs = (int)sw.ElapsedMilliseconds
            });

            results.Add(new
            {
                pipeline = "Agentic (Gemini)",
                rawText = agenticResult.RawText,
                simplifiedText = agenticResult.SimplifiedText,
                globalConfidence = agenticResult.GlobalConfidence,
                reviewRequired = agenticResult.ReviewRequired,
                processingTimeMs = (int)sw.ElapsedMilliseconds
            });
        }
        catch (Exception ex)
        {
            results.Add(new
            {
                pipeline = "Agentic (Gemini)",
                error = ex.Message
            });
        }

        document.Status = ProcessingStatus.Done;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            documentId = document.Id,
            fileName = document.FileName,
            results
        });
    }
}