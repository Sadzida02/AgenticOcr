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
}