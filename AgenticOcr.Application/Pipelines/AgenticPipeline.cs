using AgenticOcr.Application.Interfaces;
using System.Text.Json;

namespace AgenticOcr.Application.Pipelines;

public class AgenticPipelineResult
{
    public string RawText { get; set; } = string.Empty;
    public string StructuredJson { get; set; } = string.Empty;
    public string SimplifiedText { get; set; } = string.Empty;
    public double GlobalConfidence { get; set; }
    public bool ReviewRequired { get; set; }
    public List<string> AuditLog { get; set; } = new();
    public int ProcessingTimeMs { get; set; }
}

public class AgenticPipeline
{
    private readonly ILlmService _llm;

    public AgenticPipeline(ILlmService llm)
    {
        _llm = llm;
    }

    public async Task<AgenticPipelineResult> RunAsync(string imagePath)
    {
        var audit = new List<string>();
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Step 1 — Gemini reads the handwritten image
        audit.Add($"{DateTime.UtcNow:o} - vision_extraction_started");
        var extractionJson = await _llm.CallWithImageAsync(
            "extract_prescription.md", imagePath);
        audit.Add($"{DateTime.UtcNow:o} - vision_extraction_completed");

        var rawText = ParseField(extractionJson, "raw_text");

        // Step 2 — Normalize medication entries
        audit.Add($"{DateTime.UtcNow:o} - normalization_started");
        var normalizedJson = await _llm.CallWithTextAsync(
            "normalize_medication.md",
            $"Raw extraction result:\n{extractionJson}");
        audit.Add($"{DateTime.UtcNow:o} - normalization_completed");

        // Step 3 — Safety validation
        audit.Add($"{DateTime.UtcNow:o} - safety_validation_started");
        var validationJson = await _llm.CallWithTextAsync(
            "validate_dosage.md",
            $"Normalized medications:\n{normalizedJson}");
        audit.Add($"{DateTime.UtcNow:o} - safety_validation_completed");

        // Step 4 — Confidence scoring
        audit.Add($"{DateTime.UtcNow:o} - confidence_scoring_started");
        var confidenceJson = await _llm.CallWithTextAsync(
            "confidence_scoring.md",
            $"Extraction:\n{extractionJson}\n\nValidation:\n{validationJson}");
        audit.Add($"{DateTime.UtcNow:o} - confidence_scoring_completed");

        // Step 5 — Final report
        audit.Add($"{DateTime.UtcNow:o} - final_report_started");
        var finalJson = await _llm.CallWithTextAsync(
            "final_report.md",
            $"Extraction: {extractionJson}\n\n" +
            $"Normalized: {normalizedJson}\n\n" +
            $"Validation: {validationJson}\n\n" +
            $"Confidence: {confidenceJson}\n\n" +
            $"Audit: {string.Join(", ", audit)}");
        audit.Add($"{DateTime.UtcNow:o} - final_report_completed");

        stopwatch.Stop();

        return new AgenticPipelineResult
        {
            RawText = rawText,
            StructuredJson = finalJson,
            SimplifiedText = BuildSimplifiedText(normalizedJson),
            GlobalConfidence = ParseDouble(confidenceJson, "global_confidence"),
            ReviewRequired = ParseBool(validationJson, "review_required"),
            AuditLog = audit,
            ProcessingTimeMs = (int)stopwatch.ElapsedMilliseconds
        };
    }

    private static string BuildSimplifiedText(string normalizedJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(normalizedJson);
            if (!doc.RootElement.TryGetProperty("medications", out var meds))
                return normalizedJson;

            var lines = new List<string> { "Your medications:" };
            foreach (var med in meds.EnumerateArray())
            {
                var name = GetString(med, "drug_name")
                    ?? GetString(med, "raw_text")
                    ?? "Unknown";
                var strength = GetString(med, "strength") ?? "unknown strength";
                var frequency = GetString(med, "frequency") ?? "as directed";
                var duration = GetString(med, "duration") ?? "";
                var line = $"- {name} {strength}, take {frequency}";
                if (!string.IsNullOrEmpty(duration))
                    line += $" for {duration}";
                lines.Add(line);
            }
            return string.Join("\n", lines);
        }
        catch { return normalizedJson; }
    }

    private static string ParseField(string json, string field)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty(field, out var val)
                ? val.GetString() ?? string.Empty
                : string.Empty;
        }
        catch { return string.Empty; }
    }

    private static double ParseDouble(string json, string field)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty(field, out var val)
                ? val.GetDouble() : 0.5;
        }
        catch { return 0.5; }
    }

    private static bool ParseBool(string json, string field)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty(field, out var val)
                && val.GetBoolean();
        }
        catch { return false; }
    }

    private static string? GetString(JsonElement el, string field)
        => el.TryGetProperty(field, out var val) ? val.GetString() : null;
}