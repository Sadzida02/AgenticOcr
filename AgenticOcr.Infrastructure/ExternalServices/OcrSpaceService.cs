using AgenticOcr.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace AgenticOcr.Infrastructure.ExternalServices;

public class OcrSpaceService : ILlmService
{
    private readonly string _apiKey;
    private readonly PromptLoaderService _promptLoader;
    private readonly HttpClient _http;

    public OcrSpaceService(
        IConfiguration config,
        PromptLoaderService promptLoader)
    {
        // Free key — works without registration
        // or get your own at ocr.space/ocrapi
        _apiKey = config["OcrSpace:ApiKey"] ?? "helloworld";
        _promptLoader = promptLoader;
        _http = new HttpClient
        {
            Timeout = TimeSpan.FromMinutes(2)
        };
    }

    public async Task<string> CallWithImageAsync(
        string promptFileName,
        string imagePath,
        bool isAgentFile = false)
    {
        return await ExtractPlainTextFromImageAsync(imagePath);
    }

    public Task<string> CallWithTextAsync(
        string promptFileName,
        string inputText,
        bool isAgentFile = false)
    {
        return Task.FromResult("{}");
    }

    public async Task<string> ExtractPlainTextFromImageAsync(string imagePath)
    {
        var imageBytes = await File.ReadAllBytesAsync(imagePath);
        var base64 = Convert.ToBase64String(imageBytes);
        var mimeType = GetMimeType(imagePath);

        var formData = new MultipartFormDataContent();
        formData.Add(new StringContent(_apiKey), "apikey");
        formData.Add(new StringContent($"data:{mimeType};base64,{base64}"),
            "base64Image");
        formData.Add(new StringContent("eng"), "language");
        formData.Add(new StringContent("true"), "isOverlayRequired");
        formData.Add(new StringContent("true"), "detectOrientation");
        formData.Add(new StringContent("true"), "scale");
        formData.Add(new StringContent("true"), "isTable");

        var response = await _http.PostAsync(
            "https://api.ocr.space/parse/image", formData);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new Exception($"OCR.space error: {response.StatusCode}");
        }

        var result = await response.Content.ReadAsStringAsync();
        return ParseOcrSpaceResponse(result);
    }

    private static string ParseOcrSpaceResponse(string jsonResponse)
    {
        try
        {
            using var doc = JsonDocument.Parse(jsonResponse);
            var root = doc.RootElement;

            // Check for errors
            if (root.TryGetProperty("IsErroredOnProcessing", out var isError)
                && isError.GetBoolean())
            {
                var msg = root.TryGetProperty("ErrorMessage", out var errMsg)
                    ? errMsg.GetString() : "Unknown error";
                throw new Exception($"OCR.space processing error: {msg}");
            }

            var lines = new List<string>();

            // Navigate ParsedResults array
            if (root.TryGetProperty("ParsedResults", out var results))
            {
                foreach (var result in results.EnumerateArray())
                {
                    if (result.TryGetProperty("ParsedText", out var text))
                    {
                        var extracted = text.GetString() ?? string.Empty;
                        if (!string.IsNullOrWhiteSpace(extracted))
                            lines.Add(extracted.Trim());
                    }
                }
            }

            return string.Join("\n", lines);
        }
        catch (JsonException ex)
        {
            throw new Exception(
                $"Failed to parse OCR.space response: {ex.Message}");
        }
    }

    private static string GetMimeType(string filePath)
    {
        return Path.GetExtension(filePath).ToLower() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };
    }
}