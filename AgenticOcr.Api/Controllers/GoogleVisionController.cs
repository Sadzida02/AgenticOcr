using AgenticOcr.Domain.Entities;
using AgenticOcr.Domain.Enums;
using AgenticOcr.Infrastructure.Data;
using AgenticOcr.Infrastructure.ExternalServices;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgenticOcr.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GoogleVisionController : ControllerBase
{
    private readonly OcrDbContext _db;
    private readonly FileStorageService _fileStorage;
    private readonly IConfiguration _config;
    private readonly PromptLoaderService _promptLoader;

    public GoogleVisionController(
        OcrDbContext db,
        FileStorageService fileStorage,
        IConfiguration config,
        PromptLoaderService promptLoader)
    {
        _db = db;
        _fileStorage = fileStorage;
        _config = config;
        _promptLoader = promptLoader;
    }

    // POST /api/googlevision/upload
    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Save file
        var filePath = await _fileStorage.SaveFileAsync(
            file.OpenReadStream(), file.FileName);

        // Save document record
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
            // Run Google Vision
            var visionService = new OcrSpaceService(_config, _promptLoader);
            var extractedText = await visionService
                .ExtractPlainTextFromImageAsync(filePath);

            stopwatch.Stop();

            // Save OCR result
            // Using Baseline pipeline type since Google Vision
            // is a cloud OCR baseline — not agentic
            var ocrResult = new OcrResult
            {
                DocumentId = document.Id,
                PipelineType = PipelineType.GoogleVision,
                RawText = extractedText,
                ProcessingTimeMs = (int)stopwatch.ElapsedMilliseconds
            };
            _db.OcrResults.Add(ocrResult);

            document.Status = ProcessingStatus.Done;
            await _db.SaveChangesAsync();

            return Ok(new
            {
                documentId = document.Id,
                fileName = document.FileName,
                rawText = extractedText,
                processingTimeMs = (int)stopwatch.ElapsedMilliseconds,
                pipeline = "GoogleVision"
            });
        }
        catch (Exception ex)
        {
            document.Status = ProcessingStatus.Failed;
            await _db.SaveChangesAsync();
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // POST /api/googlevision/upload-all
    // Runs all three pipelines on the same document
    [HttpPost("upload-all")]
    public async Task<IActionResult> UploadAll(
        IFormFile file,
        [FromServices] AgenticOcr.Application.Interfaces.ILlmService llmService,
        [FromServices] AgenticOcr.Application.Interfaces.IOcrService ocrService)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        // Save file once
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

        // ── Pipeline 2: Google Vision ─────────────────────────────────────────
        await Task.Delay(1000); // small gap between API calls
        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var visionService = new OcrSpaceService(_config, _promptLoader);
            var text = await visionService.ExtractPlainTextFromImageAsync(filePath);
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

        // ── Pipeline 3: Agentic ───────────────────────────────────────────────
        await Task.Delay(3000); // gap before Gemini calls
        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var pipeline = new AgenticOcr.Application.Pipelines.AgenticPipeline(
                llmService);
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