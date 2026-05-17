using AgenticOcr.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Text;
using System.Text.Json;

namespace AgenticOcr.Infrastructure.ExternalServices;

public class GoogleVisionService : ILlmService
{
    private readonly string _apiKey;
    private readonly PromptLoaderService _promptLoader;
    private readonly HttpClient _http;

    public GoogleVisionService(
        IConfiguration config,
        PromptLoaderService promptLoader)
    {
        _apiKey = config["GoogleVision:ApiKey"]
            ?? throw new Exception("Google Vision API key not configured.");
        _promptLoader = promptLoader;
        _http = new HttpClient
        {
            Timeout = TimeSpan.FromMinutes(2)
        };
    }

    // Google Vision does not use prompt files for structured extraction
    // so we call plain text extraction and return it as raw text
    public async Task<string> CallWithImageAsync(
        string promptFileName,
        string imagePath,
        bool isAgentFile = false)
    {
        // Google Vision API does not support custom prompts
        // so all image calls return plain text extraction
        return await ExtractPlainTextFromImageAsync(imagePath);
    }

    // Google Vision has no text-only reasoning capability
    // so text calls return the input unchanged as a passthrough
    public Task<string> CallWithTextAsync(
        string promptFileName,
        string inputText,
        bool isAgentFile = false)
    {
        // Google Vision is image-only — text reasoning not supported
        // return empty JSON so pipeline continues gracefully
        return Task.FromResult("{}");
    }

    public async Task<string> ExtractPlainTextFromImageAsync(string imagePath)
    {
        var imageBytes = await File.ReadAllBytesAsync(imagePath);
        var base64 = Convert.ToBase64String(imageBytes);

        // Google Vision API request format
        var requestBody = new
        {
            requests = new[]
            {
                new
                {
                    image = new { content = base64 },
                    features = new[]
                    {
                        new
                        {
                            // DOCUMENT_TEXT_DETECTION is better than
                            // TEXT_DETECTION for structured documents
                            // with tables and layouts
                            type = "DOCUMENT_TEXT_DETECTION",
                            maxResults = 1
                        }
                    },
                    imageContext = new
                    {
                        // Hint languages — English and Bosnian
                        languageHints = new[] { "en", "bs", "hr" }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var url = $"https://vision.googleapis.com/v1/images:annotate?key={_apiKey}";
        var response = await _http.PostAsync(url, content);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new Exception($"Google Vision API error: {response.StatusCode} — {error}");
        }

        var result = await response.Content.ReadAsStringAsync();
        return ParseVisionResponse(result);
    }

    private static string ParseVisionResponse(string jsonResponse)
    {
        try
        {
            using var doc = JsonDocument.Parse(jsonResponse);
            var root = doc.RootElement;

            // Navigate to fullTextAnnotation.text
            // which contains the complete document text
            if (root.TryGetProperty("responses", out var responses) &&
                responses.GetArrayLength() > 0)
            {
                var firstResponse = responses[0];

                // DOCUMENT_TEXT_DETECTION returns fullTextAnnotation
                if (firstResponse.TryGetProperty(
                        "fullTextAnnotation", out var fullText) &&
                    fullText.TryGetProperty("text", out var text))
                {
                    return text.GetString() ?? string.Empty;
                }

                // Fallback to textAnnotations if fullTextAnnotation missing
                if (firstResponse.TryGetProperty(
                        "textAnnotations", out var annotations) &&
                    annotations.GetArrayLength() > 0)
                {
                    // First element contains the full document text
                    if (annotations[0].TryGetProperty(
                            "description", out var desc))
                    {
                        return desc.GetString() ?? string.Empty;
                    }
                }

                // Check for API errors in response
                if (firstResponse.TryGetProperty("error", out var err))
                {
                    var msg = err.TryGetProperty("message", out var m)
                        ? m.GetString() : "Unknown error";
                    throw new Exception($"Google Vision returned error: {msg}");
                }
            }

            return string.Empty;
        }
        catch (JsonException ex)
        {
            throw new Exception(
                $"Failed to parse Google Vision response: {ex.Message}");
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