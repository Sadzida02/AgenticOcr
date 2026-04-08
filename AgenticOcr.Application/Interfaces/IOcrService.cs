namespace AgenticOcr.Application.Interfaces;

public interface IOcrService
{
    Task<(string text, int processingTimeMs)> ExtractTextAsync(string imagePath);
}