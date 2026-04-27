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
public class BaselineOcrController : ControllerBase
{
    private readonly IOcrService _ocrService;
    private readonly FileStorageService _fileStorage;
    private readonly OcrDbContext _db;
    private readonly ILlmService _llmService;

    public BaselineOcrController(
        IOcrService ocrService,
        FileStorageService fileStorage,
        OcrDbContext db,
        ILlmService llmService)
    {
        _ocrService = ocrService;
        _fileStorage = fileStorage;
        _db = db;
        _llmService = llmService;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        // Save file to disk
        var filePath = await _fileStorage.SaveFileAsync(file.OpenReadStream(), file.FileName);

        // Save document record to DB
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

        // Run baseline OCR
        var (text, processingTimeMs) = await _ocrService.ExtractTextAsync(filePath);

        // Save OCR result
        var ocrResult = new OcrResult
        {
            DocumentId = document.Id,
            PipelineType = PipelineType.Baseline,
            RawText = text,
            ProcessingTimeMs = processingTimeMs
        };
        _db.OcrResults.Add(ocrResult);

        // Update document status
        document.Status = ProcessingStatus.Done;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            documentId = document.Id,
            fileName = document.FileName,
            extractedText = text,
            processingTimeMs
        });
    }

    [HttpPost("upload-both")]
    public async Task<IActionResult> UploadBoth(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        // Save file once
        var filePath = await _fileStorage.SaveFileAsync(
            file.OpenReadStream(), file.FileName);

        // Save one document record
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

        // Run baseline
        try
        {
            var (text, processingTimeMs) = await _ocrService.ExtractTextAsync(filePath);
            var baselineResult = new OcrResult
            {
                DocumentId = document.Id,
                PipelineType = PipelineType.Baseline,
                RawText = text,
                ProcessingTimeMs = processingTimeMs
            };
            _db.OcrResults.Add(baselineResult);
            results.Add(new
            {
                pipeline = "Baseline",
                rawText = text,
                processingTimeMs
            });
        }
        catch (Exception ex)
        {
            results.Add(new { pipeline = "Baseline", error = ex.Message });
        }

        // Run agentic
        try
        {
            var pipeline = new AgenticPipeline(_llmService);
            var agenticPipelineResult = await pipeline.RunAsync(filePath);

            // Make sure rawText is not empty
            var rawText = agenticPipelineResult.RawText;
            if (string.IsNullOrWhiteSpace(rawText))
            {
                // Try to extract from structured JSON as fallback
                try
                {
                    var doc = System.Text.Json.JsonDocument.Parse(
                        agenticPipelineResult.StructuredJson);
                    if (doc.RootElement.TryGetProperty("raw_text", out var rt))
                        rawText = rt.GetString() ?? string.Empty;
                }
                catch { }
            }

            var ocrResult = new OcrResult
            {
                DocumentId = document.Id,
                PipelineType = PipelineType.Agentic,
                RawText = rawText,
                StructuredJson = agenticPipelineResult.StructuredJson,
                SimplifiedText = agenticPipelineResult.SimplifiedText,
                ProcessingTimeMs = agenticPipelineResult.ProcessingTimeMs
            };
            _db.OcrResults.Add(ocrResult);

            results.Add(new
            {
                pipeline = "Agentic",
                rawText = agenticPipelineResult.RawText,
                simplifiedText = agenticPipelineResult.SimplifiedText,
                globalConfidence = agenticPipelineResult.GlobalConfidence,
                processingTimeMs = agenticPipelineResult.ProcessingTimeMs
            });
        }
        catch (Exception ex)
        {
            results.Add(new { pipeline = "Agentic", error = ex.Message });
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