namespace AgenticOcr.Domain.Entities;

public class MedicationEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OcrResultId { get; set; }
    public string RawText { get; set; } = string.Empty;
    public string? DrugName { get; set; }
    public string? Strength { get; set; }
    public string? Frequency { get; set; }
    public string? Duration { get; set; }
    public double Confidence { get; set; }
    public bool NeedsHumanReview { get; set; }

    public OcrResult OcrResult { get; set; } = null!;
}