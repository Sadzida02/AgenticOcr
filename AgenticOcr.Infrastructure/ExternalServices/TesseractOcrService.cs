using AgenticOcr.Application.Interfaces;
using Tesseract;

namespace AgenticOcr.Infrastructure.ExternalServices;

public class TesseractOcrService : IOcrService
{
    private readonly string _tessDataPath;

    public TesseractOcrService()
    {
        _tessDataPath = @"C:\Program Files\Tesseract-OCR\tessdata";
    }

    public async Task<(string text, int processingTimeMs)> ExtractTextAsync(string imagePath)
    {
        return await Task.Run(() =>
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();

            using var engine = new TesseractEngine(_tessDataPath, "eng", EngineMode.Default);
            using var img = Pix.LoadFromFile(imagePath);
            using var page = engine.Process(img);

            stopwatch.Stop();
            var text = page.GetText();

            return (text, (int)stopwatch.ElapsedMilliseconds);
        });
    }
}