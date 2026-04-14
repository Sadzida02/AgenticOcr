using AgenticOcr.Application.Interfaces;
using GenerativeAI.Types;
using GenerativeAI;
using Microsoft.Extensions.Configuration;

namespace AgenticOcr.Infrastructure.ExternalServices;

public class GeminiService : ILlmService
{
    private readonly string _apiKey;
    private readonly string _model;
    private readonly PromptLoaderService _promptLoader;

    public GeminiService(IConfiguration config, PromptLoaderService promptLoader)
    {
        _apiKey = config["Gemini:ApiKey"]
            ?? throw new Exception("Gemini API key not configured.");
        _model = config["Gemini:Model"] ?? "gemini-1.5-flash";
        _promptLoader = promptLoader;
    }

    public async Task<string> CallWithImageAsync(
        string promptFileName,
        string imagePath,
        bool isAgentFile = false)
    {
        var systemPrompt = isAgentFile
            ? _promptLoader.LoadAgent(promptFileName)
            : _promptLoader.LoadPrompt(promptFileName);

        var imageBytes = await File.ReadAllBytesAsync(imagePath);
        var base64 = Convert.ToBase64String(imageBytes);
        var mimeType = GetMimeType(imagePath);

        var client = new GenerativeModel(_apiKey, _model);

        var request = new GenerateContentRequest
        {
            Contents = new List<Content>
            {
                new Content
                {
                    Role = "user",
                    Parts = new List<Part>
                    {
                        new Part { Text = systemPrompt },
                        new Part
                        {
                            InlineData = new Blob
                            {
                                MimeType = mimeType,
                                Data = base64
                            }
                        },
                        new Part
                        {
                            Text = "Process this document according to your role. Return JSON only, no markdown fences."
                        }
                    }
                }
            }
        };

        var response = await client.GenerateContentAsync(request);
        return CleanJson(response.Text ?? "{}");
    }

    public async Task<string> CallWithTextAsync(
        string promptFileName,
        string inputText,
        bool isAgentFile = false)
    {
        var systemPrompt = isAgentFile
            ? _promptLoader.LoadAgent(promptFileName)
            : _promptLoader.LoadPrompt(promptFileName);

        var client = new GenerativeModel(_apiKey, _model);

        var request = new GenerateContentRequest
        {
            Contents = new List<Content>
            {
                new Content
                {
                    Role = "user",
                    Parts = new List<Part>
                    {
                        new Part { Text = systemPrompt },
                        new Part { Text = inputText }
                    }
                }
            }
        };

        var response = await client.GenerateContentAsync(request);
        return CleanJson(response.Text ?? "{}");
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

    private static string CleanJson(string raw)
    {
        var text = raw.Trim();
        if (text.StartsWith("```"))
        {
            var start = text.IndexOf('\n') + 1;
            var end = text.LastIndexOf("```");
            if (end > start)
                text = text[start..end].Trim();
        }
        return text;
    }
}