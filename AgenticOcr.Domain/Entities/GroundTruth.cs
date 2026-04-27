namespace AgenticOcr.Domain.Entities;

public class GroundTruth
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    public string CorrectText { get; set; } = string.Empty;
    public string AddedBy { get; set; } = "manual";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Document Document { get; set; } = null!;
}