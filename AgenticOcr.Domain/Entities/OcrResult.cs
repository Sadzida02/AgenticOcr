using AgenticOcr.Domain.Enums;

namespace AgenticOcr.Domain.Entities;

public class OcrResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    public PipelineType PipelineType { get; set; }
    public string RawText { get; set; } = string.Empty;
    public string? StructuredJson { get; set; }
    public string? SimplifiedText { get; set; }
    public int ProcessingTimeMs { get; set; }
    public bool ReviewRequired { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Document Document { get; set; } = null!;
    public EvaluationMetric? EvaluationMetric { get; set; }
}