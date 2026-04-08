using AgenticOcr.Application.Interfaces;
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

    public BaselineOcrController(
        IOcrService ocrService,
        FileStorageService fileStorage,
        OcrDbContext db)
    {
        _ocrService = ocrService;
        _fileStorage = fileStorage;
        _db = db;
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
}