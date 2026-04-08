namespace AgenticOcr.Domain.Entities;

public class EvaluationMetric
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OcrResultId { get; set; }
    public double? CharacterErrorRate { get; set; }
    public double? WordErrorRate { get; set; }
    public double? Precision { get; set; }
    public double? Recall { get; set; }
    public double? LayoutScore { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public OcrResult OcrResult { get; set; } = null!;
}