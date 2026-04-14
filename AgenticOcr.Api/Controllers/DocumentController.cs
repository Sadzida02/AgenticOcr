using AgenticOcr.Domain.Entities;
using AgenticOcr.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgenticOcr.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly OcrDbContext _db;

    public DocumentsController(OcrDbContext db)
    {
        _db = db;
    }

    // GET /api/documents
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var documents = await _db.Documents
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new
            {
                d.Id,
                d.FileName,
                d.FileType,
                d.FileSizeBytes,
                d.UploadedAt,
                d.Status,
                resultCount = _db.OcrResults.Count(r => r.DocumentId == d.Id)
            })
            .ToListAsync();

        return Ok(documents);
    }

    // GET /api/documents/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var document = await _db.Documents
            .Include(d => d.OcrResults)
            .ThenInclude(r => r.EvaluationMetric)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null)
            return NotFound($"Document {id} not found.");

        return Ok(new
        {
            document.Id,
            document.FileName,
            document.FileType,
            document.FileSizeBytes,
            document.UploadedAt,
            document.Status,
            ocrResults = document.OcrResults.Select(r => new
            {
                r.Id,
                r.PipelineType,
                r.RawText,
                r.ProcessingTimeMs,
                r.CreatedAt,
                evaluation = r.EvaluationMetric == null ? null : new
                {
                    r.EvaluationMetric.CharacterErrorRate,
                    r.EvaluationMetric.WordErrorRate,
                    r.EvaluationMetric.Precision,
                    r.EvaluationMetric.Recall
                }
            })
        });
    }

    // GET /api/documents/{id}/file
    [HttpGet("{id}/file")]
    public async Task<IActionResult> GetFile(Guid id)
    {
        var document = await _db.Documents.FindAsync(id);

        if (document == null)
            return NotFound($"Document {id} not found.");

        if (!System.IO.File.Exists(document.FilePath))
            return NotFound("File not found on disk.");

        var fileBytes = await System.IO.File.ReadAllBytesAsync(document.FilePath);
        var contentType = GetContentType(document.FileType);

        return File(fileBytes, contentType, document.FileName);
    }

    // GET /api/documents/{id}/compare
    [HttpGet("{id}/compare")]
    public async Task<IActionResult> Compare(Guid id)
    {
        var document = await _db.Documents
            .Include(d => d.OcrResults)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null)
            return NotFound($"Document {id} not found.");

        var baseline = document.OcrResults
            .FirstOrDefault(r => r.PipelineType == Domain.Enums.PipelineType.Baseline);

        var agentic = document.OcrResults
            .FirstOrDefault(r => r.PipelineType == Domain.Enums.PipelineType.Agentic);

        return Ok(new
        {
            documentId = id,
            fileName = document.FileName,
            baseline = baseline == null ? null : new
            {
                baseline.RawText,
                baseline.ProcessingTimeMs,
                baseline.CreatedAt
            },
            agentic = agentic == null ? null : new
            {
                agentic.RawText,
                agentic.ProcessingTimeMs,
                agentic.CreatedAt
            }
        });
    }

    // DELETE /api/documents/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var document = await _db.Documents
            .Include(d => d.OcrResults)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null)
            return NotFound($"Document {id} not found.");

        // Delete file from disk
        if (System.IO.File.Exists(document.FilePath))
            System.IO.File.Delete(document.FilePath);

        // Delete from database (OcrResults cascade automatically)
        _db.Documents.Remove(document);
        await _db.SaveChangesAsync();

        return Ok(new { message = $"Document {document.FileName} deleted successfully." });
    }

    private static string GetContentType(string fileExtension)
    {
        return fileExtension.ToLower() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
    }
}