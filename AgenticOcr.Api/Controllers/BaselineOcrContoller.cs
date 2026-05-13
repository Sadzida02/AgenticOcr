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
 
                // Get plain text FIRST before full pipeline
                // This ensures we have reliable text even if pipeline fails
                var plainText = await _llmService.ExtractPlainTextFromImageAsync(filePath);

                Console.WriteLine($"=== AGENTIC PLAIN TEXT IN UPLOAD-BOTH ===");
                Console.WriteLine(plainText);

                var pipeline = new AgenticPipeline(_llmService);
                var agenticPipelineResult = await pipeline.RunAsync(filePath);

                // Use plain text if pipeline raw text is empty or wrong
                var rawText = string.IsNullOrWhiteSpace(agenticPipelineResult.RawText)
                    ? plainText
                    : agenticPipelineResult.RawText;

                // Verify the text contains actual test names, not just "Test"
                if (rawText.Split('\n').Count(l => l.Trim() == "Test") > 2)
                {
                    Console.WriteLine("WARNING: Raw text appears to contain repeated 'Test' — using plain text instead");
                    rawText = plainText;
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