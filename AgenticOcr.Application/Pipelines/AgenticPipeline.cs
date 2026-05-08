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

public class PipelineConfig
{
    public bool EnableImageAssessment { get; set; } = true;
    public bool EnableVisualElements { get; set; } = true;
    public bool EnablePlainTextExtraction { get; set; } = true;
    public bool EnableStructuredExtraction { get; set; } = true;
    public bool EnableReextraction { get; set; } = true;
    public bool EnableNormalization { get; set; } = true;
    public bool EnableSafetyValidation { get; set; } = true;
    public bool EnableInteractionCheck { get; set; } = true;
    public bool EnableAuthenticity { get; set; } = true;
    public bool EnableConfidenceScoring { get; set; } = true;
    public bool EnableSimplification { get; set; } = true;
    public bool EnableFinalReport { get; set; } = true;

    public string ConfigName { get; set; } = "full_pipeline";

    public static PipelineConfig FullPipeline => new()
    { ConfigName = "full_pipeline" };

    public static PipelineConfig PlainTextOnly => new()
    {
        ConfigName = "plain_text_only",
        EnableImageAssessment = false,
        EnableVisualElements = false,
        EnableStructuredExtraction = false,
        EnableReextraction = false,
        EnableNormalization = false,
        EnableSafetyValidation = false,
        EnableInteractionCheck = false,
        EnableAuthenticity = false,
        EnableConfidenceScoring = false,
        EnableSimplification = false,
        EnableFinalReport = false
    };

    public static PipelineConfig NoAssessment => new()
    {
        ConfigName = "no_assessment",
        EnableImageAssessment = false
    };

    public static PipelineConfig NoVisualElements => new()
    {
        ConfigName = "no_visual_elements",
        EnableVisualElements = false
    };

    public static PipelineConfig NoReextraction => new()
    {
        ConfigName = "no_reextraction",
        EnableReextraction = false
    };

    public static PipelineConfig NoSafetyChecks => new()
    {
        ConfigName = "no_safety_checks",
        EnableSafetyValidation = false,
        EnableInteractionCheck = false,
        EnableAuthenticity = false
    };

    public static PipelineConfig NoSimplification => new()
    {
        ConfigName = "no_simplification",
        EnableSimplification = false
    };

    public static PipelineConfig ExtractionOnly => new()
    {
        ConfigName = "extraction_only",
        EnableImageAssessment = true,
        EnableVisualElements = false,
        EnablePlainTextExtraction = true,
        EnableStructuredExtraction = true,
        EnableReextraction = false,
        EnableNormalization = false,
        EnableSafetyValidation = false,
        EnableInteractionCheck = false,
        EnableAuthenticity = false,
        EnableConfidenceScoring = false,
        EnableSimplification = false,
        EnableFinalReport = false
    };
}

public class AgenticPipeline
{
    private readonly ILlmService _llm;

    public AgenticPipeline(ILlmService llm)
    {
        _llm = llm;
    }

    // config is optional — when not provided, runs full pipeline as before
    public async Task<AgenticPipelineResult> RunAsync(
        string imagePath, PipelineConfig? config = null)
    {
        var cfg = config ?? PipelineConfig.FullPipeline;
        var audit = new List<string>();
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        audit.Add($"{DateTime.UtcNow:o} - pipeline_config: {cfg.ConfigName}");

        // Initialize all variables so they exist even if steps are skipped
        string assessmentJson = "{}";
        string visualElementsJson = "{}";
        string extractionJson = "{}";
        string normalizedJson = "{}";
        string validationJson = "{}";
        string interactionJson = "{}";
        string authenticityJson = "{}";
        string confidenceJson = "{}";
        string simplifiedJson = "{}";
        string finalJson = "{}";
        string plainText = string.Empty;
        bool hasInteractions = false;
        bool flaggedAuthenticity = false;
        bool hasTables = false;
        string strategy = "standard";

        try
        {
            // ─── STEP 1 — Assess image quality and decide strategy ───
            if (cfg.EnableImageAssessment)
            {
                audit.Add($"{DateTime.UtcNow:o} - image_assessment_started");
                assessmentJson = await _llm.CallWithImageAsync(
                    "assess_image_quality.md", imagePath);
                audit.Add($"{DateTime.UtcNow:o} - image_assessment_completed");

                strategy = ParseField(assessmentJson, "recommended_strategy");
                var docType = ParseField(assessmentJson, "document_type");
                hasTables = ParseBool(assessmentJson, "has_tables");

                // Override for lab results and reports
                var docTypeStr = docType.ToLower();
                if (!hasTables && (
                    docTypeStr.Contains("lab") ||
                    docTypeStr.Contains("table") ||
                    docTypeStr.Contains("result") ||
                    docTypeStr.Contains("report")))
                {
                    hasTables = true;
                }

                audit.Add($"{DateTime.UtcNow:o} - strategy: {strategy}, doc_type: {docType}, tables: {hasTables}");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - image_assessment_SKIPPED");
            }

            // ─── STEP 1b — Detect visual elements ────────────────────
            if (cfg.EnableVisualElements)
            {
                audit.Add($"{DateTime.UtcNow:o} - visual_element_detection_started");
                visualElementsJson = await _llm.CallWithImageAsync(
                    "detect_visual_elements.md", imagePath);
                audit.Add($"{DateTime.UtcNow:o} - visual_element_detection_completed");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - visual_elements_SKIPPED");
            }

            // ─── STEP 1c — Plain text extraction ─────────────────────
            if (cfg.EnablePlainTextExtraction)
            {
                audit.Add($"{DateTime.UtcNow:o} - plain_text_extraction_started");
                plainText = await _llm.ExtractPlainTextFromImageAsync(imagePath);
                audit.Add($"{DateTime.UtcNow:o} - plain_text_extraction_completed");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - plain_text_extraction_SKIPPED");
            }

            // ─── STEP 2 — Structured extraction based on strategy ────
            if (cfg.EnableStructuredExtraction)
            {
                if (hasTables)
                {
                    audit.Add($"{DateTime.UtcNow:o} - table_extraction_started");
                    extractionJson = await _llm.CallWithImageAsync(
                        "extract_table_structure.md", imagePath);
                    audit.Add($"{DateTime.UtcNow:o} - table_extraction_completed");
                }
                else if (strategy == "careful_handwriting")
                {
                    audit.Add($"{DateTime.UtcNow:o} - careful_handwriting_extraction_started");
                    extractionJson = await _llm.CallWithImageAsync(
                        "extract_handwriting_careful.md", imagePath);
                    audit.Add($"{DateTime.UtcNow:o} - careful_handwriting_extraction_completed");
                }
                else if (strategy == "multi_pass")
                {
                    audit.Add($"{DateTime.UtcNow:o} - layout_aware_extraction_started");
                    extractionJson = await _llm.CallWithImageAsync(
                        "extract_layout_aware.md", imagePath);
                    audit.Add($"{DateTime.UtcNow:o} - layout_aware_extraction_completed");
                }
                else
                {
                    audit.Add($"{DateTime.UtcNow:o} - standard_extraction_started");
                    extractionJson = await _llm.CallWithImageAsync(
                        "extract_prescription.md", imagePath);
                    audit.Add($"{DateTime.UtcNow:o} - standard_extraction_completed");
                }

                // Additional extractions based on visual elements
                var hasCheckboxes = ParseBool(visualElementsJson, "has_checkboxes");
                var hasCharts = ParseBool(visualElementsJson, "has_charts");

                if (hasCheckboxes && cfg.EnableVisualElements)
                {
                    var formJson = await _llm.CallWithImageAsync(
                        "extract_form_fields.md", imagePath);
                    extractionJson = MergeExtractions(extractionJson, formJson);
                    audit.Add($"{DateTime.UtcNow:o} - form_fields_extracted");
                }
                if (hasCharts && cfg.EnableVisualElements)
                {
                    var chartJson = await _llm.CallWithImageAsync(
                        "extract_chart_data.md", imagePath);
                    extractionJson = MergeExtractions(extractionJson, chartJson);
                    audit.Add($"{DateTime.UtcNow:o} - chart_data_extracted");
                }
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - structured_extraction_SKIPPED");
            }

            // ─── STEP 3 — Confidence check and re-extraction ─────────
            if (cfg.EnableReextraction)
            {
                var confidence = ParseDouble(extractionJson, "overall_legibility_score");
                if (confidence < 0.7 && !hasTables)
                {
                    audit.Add($"{DateTime.UtcNow:o} - reextraction_triggered: confidence={confidence}");
                    var uncertainTokens = ParseField(extractionJson, "uncertain_tokens");
                    var reJson = await _llm.CallWithTextAsync(
                        "targeted_reextraction.md",
                        $"uncertain_tokens: {uncertainTokens}\n\n" +
                        $"original_extraction: {extractionJson}");
                    extractionJson = MergeExtractions(extractionJson, reJson);
                    audit.Add($"{DateTime.UtcNow:o} - reextraction_completed");
                }
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - reextraction_SKIPPED");
            }

            // ─── STEP 4 — Normalize medication entries ────────────────
            normalizedJson = extractionJson;
            if (cfg.EnableNormalization && !hasTables)
            {
                audit.Add($"{DateTime.UtcNow:o} - normalization_started");
                normalizedJson = await _llm.CallWithTextAsync(
                    "normalize_medication.md",
                    $"Raw extraction result:\n{extractionJson}");
                audit.Add($"{DateTime.UtcNow:o} - normalization_completed");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - normalization_SKIPPED");
            }

            // ─── STEP 5 — Safety validation ──────────────────────────
            if (cfg.EnableSafetyValidation)
            {
                audit.Add($"{DateTime.UtcNow:o} - safety_validation_started");
                validationJson = await _llm.CallWithTextAsync(
                    "validate_dosage.md",
                    $"Normalized medications:\n{normalizedJson}");
                audit.Add($"{DateTime.UtcNow:o} - safety_validation_completed");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - safety_validation_SKIPPED");
            }

            // ─── STEP 5b — Medication interaction check ───────────────
            if (cfg.EnableInteractionCheck)
            {
                audit.Add($"{DateTime.UtcNow:o} - interaction_check_started");
                interactionJson = await _llm.CallWithTextAsync(
                    "check_medication_interactions.md",
                    $"Medications extracted:\n{normalizedJson}");
                hasInteractions = ParseBool(interactionJson, "requires_clinical_review");
                if (hasInteractions)
                    audit.Add($"{DateTime.UtcNow:o} - WARNING: interactions_detected");
                audit.Add($"{DateTime.UtcNow:o} - interaction_check_completed");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - interaction_check_SKIPPED");
            }

            // ─── STEP 5c — Document authenticity check ────────────────
            if (cfg.EnableAuthenticity)
            {
                audit.Add($"{DateTime.UtcNow:o} - authenticity_check_started");
                authenticityJson = await _llm.CallWithImageAsync(
                    "assess_document_authenticity.md", imagePath);
                flaggedAuthenticity = ParseBool(authenticityJson, "flag_for_review");
                if (flaggedAuthenticity)
                    audit.Add($"{DateTime.UtcNow:o} - WARNING: authenticity_flagged");
                audit.Add($"{DateTime.UtcNow:o} - authenticity_check_completed");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - authenticity_check_SKIPPED");
            }

            // ─── STEP 6 — Confidence scoring ─────────────────────────
            if (cfg.EnableConfidenceScoring)
            {
                audit.Add($"{DateTime.UtcNow:o} - confidence_scoring_started");
                confidenceJson = await _llm.CallWithTextAsync(
                    "confidence_scoring.md",
                    $"Assessment: {assessmentJson}\n\n" +
                    $"Extraction: {extractionJson}\n\n" +
                    $"Validation: {validationJson}");
                audit.Add($"{DateTime.UtcNow:o} - confidence_scoring_completed");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - confidence_scoring_SKIPPED");
            }

            // ─── STEP 7 — Simplify for elderly ───────────────────────
            if (cfg.EnableSimplification)
            {
                audit.Add($"{DateTime.UtcNow:o} - simplification_started");
                simplifiedJson = await _llm.CallWithTextAsync(
                    "simplify_for_elderly.md",
                    $"Document content:\n{plainText}");
                audit.Add($"{DateTime.UtcNow:o} - simplification_completed");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - simplification_SKIPPED");
            }

            // ─── STEP 8 — Final report ────────────────────────────────
            if (cfg.EnableFinalReport)
            {
                audit.Add($"{DateTime.UtcNow:o} - final_report_started");
                finalJson = await _llm.CallWithTextAsync(
                    "final_report.md",
                    $"Assessment: {assessmentJson}\n\n" +
                    $"Visual elements: {visualElementsJson}\n\n" +
                    $"Extraction: {extractionJson}\n\n" +
                    $"Normalized: {normalizedJson}\n\n" +
                    $"Validation: {validationJson}\n\n" +
                    $"Interactions: {interactionJson}\n\n" +
                    $"Authenticity: {authenticityJson}\n\n" +
                    $"Confidence: {confidenceJson}\n\n" +
                    $"Audit: {string.Join(", ", audit)}");
                audit.Add($"{DateTime.UtcNow:o} - final_report_completed");
            }
            else
            {
                audit.Add($"{DateTime.UtcNow:o} - final_report_SKIPPED");
            }
        }
        catch (Exception ex)
        {
            audit.Add($"{DateTime.UtcNow:o} - pipeline_error: {ex.Message}");
            Console.WriteLine($"Pipeline error: {ex.Message}");
        }

        stopwatch.Stop();

        // ─── Build final raw text ────────────────────────────────────
        // Plain text is our primary reliable source
        var finalRawText = string.IsNullOrWhiteSpace(plainText)
            ? NullIfEmpty(ParseField(extractionJson, "raw_text"))
                ?? NullIfEmpty(ParseField(extractionJson, "final_text"))
                ?? NullIfEmpty(ParseField(extractionJson, "reconstructed_text"))
                ?? NullIfEmpty(ReconstructTextFromStructuredJson(finalJson))
                ?? NullIfEmpty(ReconstructTextFromStructuredJson(extractionJson))
                ?? NullIfEmpty(TryExtractAnyText(extractionJson))
                ?? string.Empty
            : plainText;

        finalRawText = CleanExtractedText(finalRawText);

        return new AgenticPipelineResult
        {
            RawText = finalRawText,
            StructuredJson = finalJson,
            SimplifiedText =
                NullIfEmpty(ParseField(simplifiedJson, "simplified_text"))
                ?? BuildSimplifiedText(normalizedJson),
            GlobalConfidence = ParseDouble(confidenceJson, "global_confidence"),
            ReviewRequired = ParseBool(validationJson, "review_required")
                || hasInteractions
                || flaggedAuthenticity,
            AuditLog = audit,
            ProcessingTimeMs = (int)stopwatch.ElapsedMilliseconds
        };
    }

    // ─── All existing private helpers stay exactly the same ──────────────

    private static string? NullIfEmpty(string? s)
        => string.IsNullOrWhiteSpace(s) ? null : s;

    private static string? TryExtractAnyText(string json)
    {
        try
        {
            var clean = CleanJson(json);
            using var doc = JsonDocument.Parse(clean);
            var longest = string.Empty;

            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                if (prop.Value.ValueKind == JsonValueKind.String)
                {
                    var val = prop.Value.GetString() ?? string.Empty;
                    if (val.Length > longest.Length)
                        longest = val;
                }
            }
            return longest.Length > 10 ? longest : null;
        }
        catch { return null; }
    }

    private static string? ReconstructTextFromStructuredJson(string structuredJson)
    {
        try
        {
            var clean = CleanJson(structuredJson);
            using var doc = JsonDocument.Parse(clean);
            var root = doc.RootElement;
            var parts = new List<string>();

            if (root.TryGetProperty("extracted_data", out var extractedData))
            {
                if (extractedData.TryGetProperty("metadata", out var metadata))
                {
                    foreach (var prop in metadata.EnumerateObject())
                    {
                        if (prop.Value.ValueKind == JsonValueKind.String)
                        {
                            var val = prop.Value.GetString();
                            if (!string.IsNullOrWhiteSpace(val))
                                parts.Add($"{prop.Name}: {val}");
                        }
                    }
                }

                if (extractedData.TryGetProperty("results_table", out var resultsTable))
                {
                    foreach (var row in resultsTable.EnumerateArray())
                    {
                        var test = GetStringFromElement(row, "test", "test_name", "name");
                        var result = GetStringFromElement(row, "result", "value");
                        var unit = GetStringFromElement(row, "unit");
                        var reference = GetStringFromElement(row,
                            "reference", "reference_range", "ref_range");
                        var flag = GetStringFromElement(row, "flag");

                        if (test == null) continue;

                        var line = test;
                        if (result != null) line += $": {result}";
                        if (unit != null) line += $" {unit}";
                        if (reference != null) line += $" (ref: {reference})";
                        if (flag != null && flag != "null")
                            line += $" [ABNORMAL]";
                        parts.Add(line);
                    }
                }

                if (extractedData.TryGetProperty("tables", out var tables))
                    ExtractTablesFromElement(extractedData, parts);
            }

            if (root.TryGetProperty("clinical_data", out var clinicalData))
            {
                if (clinicalData.TryGetProperty("lab_id", out var labId))
                    parts.Add($"Lab ID: {labId.GetString()}");
                if (clinicalData.TryGetProperty("date", out var date))
                    parts.Add($"Date: {date.GetString()}");
                if (clinicalData.TryGetProperty("referring_doctor", out var doctor))
                    parts.Add($"Referring Doctor: {doctor.GetString()}");

                if (clinicalData.TryGetProperty("results", out var results))
                {
                    foreach (var row in results.EnumerateArray())
                    {
                        var test = GetStringFromElement(row,
                            "Test", "test", "test_name", "name");
                        var result = GetStringFromElement(row,
                            "Result", "result", "value");
                        var unit = GetStringFromElement(row, "Unit", "unit");
                        var reference = GetStringFromElement(row,
                            "Reference", "reference", "reference_range");
                        var flag = GetStringFromElement(row, "Flag", "flag");

                        if (test == null) continue;

                        var line = test;
                        if (result != null) line += $": {result}";
                        if (unit != null) line += $" {unit}";
                        if (reference != null) line += $" (ref: {reference})";
                        if (flag != null && flag != "null") line += $" [ABNORMAL]";
                        parts.Add(line);
                    }
                }
            }

            if (root.TryGetProperty("patient_info", out var patientInfo))
            {
                foreach (var prop in patientInfo.EnumerateObject())
                {
                    if (prop.Value.ValueKind == JsonValueKind.String)
                    {
                        var val = prop.Value.GetString();
                        if (!string.IsNullOrWhiteSpace(val))
                            parts.Add($"{prop.Name}: {val}");
                    }
                }
            }

            if (root.TryGetProperty("clinical_summary", out var summary))
            {
                if (summary.TryGetProperty("findings", out var findings))
                    parts.Add(findings.GetString() ?? string.Empty);
            }

            if (root.TryGetProperty("medications", out var meds))
            {
                foreach (var med in meds.EnumerateArray())
                {
                    var name = GetStringFromElement(med,
                        "drug_name", "normalized_drug_name", "raw_text");
                    var strength = GetStringFromElement(med, "strength");
                    var frequency = GetStringFromElement(med, "frequency");
                    if (name != null)
                    {
                        var line = name;
                        if (strength != null) line += $" {strength}";
                        if (frequency != null) line += $" {frequency}";
                        parts.Add(line);
                    }
                }
            }

            if (root.TryGetProperty("raw_text", out var rt))
                parts.Add(rt.GetString() ?? string.Empty);

            if (root.TryGetProperty("non_table_text", out var ntt))
                parts.Add(ntt.GetString() ?? string.Empty);

            var result2 = string.Join("\n",
                parts.Where(p => !string.IsNullOrWhiteSpace(p)));

            return result2.Length > 10 ? result2 : null;
        }
        catch { return null; }
    }

    private static void ExtractTablesFromElement(
        JsonElement element, List<string> parts)
    {
        if (!element.TryGetProperty("tables", out var tables)) return;

        foreach (var table in tables.EnumerateArray())
        {
            if (table.TryGetProperty("title", out var title))
                parts.Add(title.GetString() ?? string.Empty);

            if (!table.TryGetProperty("rows", out var rows)) continue;

            foreach (var row in rows.EnumerateArray())
            {
                if (row.ValueKind != JsonValueKind.Object) continue;
                var rowValues = row.EnumerateObject()
                    .Where(p => p.Value.ValueKind == JsonValueKind.String)
                    .Select(p => p.Value.GetString() ?? string.Empty)
                    .Where(v => !string.IsNullOrEmpty(v));
                parts.Add(string.Join(" ", rowValues));
            }
        }
    }

    private static string? GetStringFromElement(
        JsonElement el, params string[] fieldNames)
    {
        foreach (var field in fieldNames)
        {
            if (el.TryGetProperty(field, out var val) &&
                val.ValueKind == JsonValueKind.String)
            {
                var str = val.GetString();
                if (!string.IsNullOrWhiteSpace(str) && str != "null")
                    return str;
            }
        }
        return null;
    }

    private static string CleanExtractedText(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var lines = text.Split('\n')
            .Select(l => l.Trim())
            .Where(l =>
                l.Length > 0 &&
                !l.StartsWith("/*") &&
                !l.StartsWith("//") &&
                !l.Contains("_started") &&
                !l.Contains("_completed") &&
                !l.Contains("UTC") &&
                !l.StartsWith("{") &&
                !l.StartsWith("}") &&
                !l.StartsWith("[") &&
                !l.StartsWith("]") &&
                !l.StartsWith("\"") &&
                l.Length < 300
            )
            .Distinct();

        return string.Join("\n", lines).Trim();
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

    private static string MergeExtractions(string original, string additional)
    {
        try
        {
            using var origDoc = JsonDocument.Parse(CleanJson(original));
            using var addDoc = JsonDocument.Parse(CleanJson(additional));
            return original + "\n/* additional_extraction: " + additional + " */";
        }
        catch { return original; }
    }

    private static string BuildSimplifiedText(string normalizedJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(CleanJson(normalizedJson));
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
            var clean = CleanJson(json);
            using var doc = JsonDocument.Parse(clean);
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
            var clean = CleanJson(json);
            using var doc = JsonDocument.Parse(clean);
            return doc.RootElement.TryGetProperty(field, out var val)
                ? val.GetDouble() : 0.5;
        }
        catch { return 0.5; }
    }

    private static bool ParseBool(string json, string field)
    {
        try
        {
            var clean = CleanJson(json);
            using var doc = JsonDocument.Parse(clean);
            return doc.RootElement.TryGetProperty(field, out var val)
                && val.GetBoolean();
        }
        catch { return false; }
    }

    private static string? GetString(JsonElement el, string field)
        => el.TryGetProperty(field, out var val) ? val.GetString() : null;
}