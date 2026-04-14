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

        // ─── STEP 1 — Assess image quality and decide strategy ───────────
        audit.Add($"{DateTime.UtcNow:o} - image_assessment_started");
        var assessmentJson = await _llm.CallWithImageAsync(
            "assess_image_quality.md", imagePath);
        audit.Add($"{DateTime.UtcNow:o} - image_assessment_completed");

        var strategy = ParseField(assessmentJson, "recommended_strategy");
        var docType = ParseField(assessmentJson, "document_type");
        var hasTables = ParseBool(assessmentJson, "has_tables");
        audit.Add($"{DateTime.UtcNow:o} - strategy_selected: {strategy}, doc_type: {docType}");

        // ─── NEW: STEP 1b — Detect visual elements ───────────────────────
        audit.Add($"{DateTime.UtcNow:o} - visual_element_detection_started");
        var visualElementsJson = await _llm.CallWithImageAsync(
            "detect_visual_elements.md", imagePath);
        audit.Add($"{DateTime.UtcNow:o} - visual_element_detection_completed");

        var hasCharts = ParseBool(visualElementsJson, "has_charts");
        var hasCheckboxes = ParseBool(visualElementsJson, "has_checkboxes");
        var isOfficial = ParseBool(visualElementsJson, "document_appears_official");
        audit.Add($"{DateTime.UtcNow:o} - visual_elements: charts={hasCharts}, checkboxes={hasCheckboxes}, official={isOfficial}");

        // ─── STEP 2 — Extract based on strategy ──────────────────────────
        string extractionJson;

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

        // ─── NEW: STEP 2b — Additional extractions based on visual elements
        if (hasCheckboxes)
        {
            audit.Add($"{DateTime.UtcNow:o} - form_field_extraction_started");
            var formJson = await _llm.CallWithImageAsync(
                "extract_form_fields.md", imagePath);
            extractionJson = MergeExtractions(extractionJson, formJson);
            audit.Add($"{DateTime.UtcNow:o} - form_field_extraction_completed");
        }

        if (hasCharts)
        {
            audit.Add($"{DateTime.UtcNow:o} - chart_extraction_started");
            var chartJson = await _llm.CallWithImageAsync(
                "extract_chart_data.md", imagePath);
            extractionJson = MergeExtractions(extractionJson, chartJson);
            audit.Add($"{DateTime.UtcNow:o} - chart_extraction_completed");
        }

        // ─── STEP 3 — Confidence check and re-extraction loop ────────────
        var rawText = ParseField(extractionJson, "raw_text")
            ?? ParseField(extractionJson, "final_text")
            ?? ParseField(extractionJson, "reconstructed_text")
            ?? string.Empty;

        var confidence = ParseDouble(extractionJson, "overall_legibility_score");
        if (confidence < 0.7 && !hasTables)
        {
            audit.Add($"{DateTime.UtcNow:o} - low_confidence_detected: {confidence}, triggering_reextraction");
            var uncertainTokens = ParseField(extractionJson, "uncertain_tokens");
            var reextractionJson = await _llm.CallWithTextAsync(
                "targeted_reextraction.md",
                $"uncertain_tokens: {uncertainTokens}\n\noriginal_extraction: {extractionJson}");
            extractionJson = MergeExtractions(extractionJson, reextractionJson);
            audit.Add($"{DateTime.UtcNow:o} - reextraction_completed");
        }

        // ─── STEP 4 — Normalize medication entries ───────────────────────
        var normalizedJson = extractionJson;
        if (!hasTables)
        {
            audit.Add($"{DateTime.UtcNow:o} - normalization_started");
            normalizedJson = await _llm.CallWithTextAsync(
                "normalize_medication.md",
                $"Raw extraction result:\n{extractionJson}");
            audit.Add($"{DateTime.UtcNow:o} - normalization_completed");
        }

        // ─── STEP 5 — Safety validation ──────────────────────────────────
        audit.Add($"{DateTime.UtcNow:o} - safety_validation_started");
        var validationJson = await _llm.CallWithTextAsync(
            "validate_dosage.md",
            $"Normalized medications:\n{normalizedJson}");
        audit.Add($"{DateTime.UtcNow:o} - safety_validation_completed");

        // ─── NEW: STEP 5b — Medication interaction check ─────────────────
        audit.Add($"{DateTime.UtcNow:o} - interaction_check_started");
        var interactionJson = await _llm.CallWithTextAsync(
            "check_medication_interactions.md",
            $"Medications extracted:\n{normalizedJson}");
        audit.Add($"{DateTime.UtcNow:o} - interaction_check_completed");

        var hasInteractions = ParseBool(interactionJson, "requires_clinical_review");
        if (hasInteractions)
            audit.Add($"{DateTime.UtcNow:o} - WARNING: medication_interactions_detected");

        // ─── NEW: STEP 5c — Document authenticity check ──────────────────
        audit.Add($"{DateTime.UtcNow:o} - authenticity_check_started");
        var authenticityJson = await _llm.CallWithImageAsync(
            "assess_document_authenticity.md", imagePath);
        audit.Add($"{DateTime.UtcNow:o} - authenticity_check_completed");

        var flaggedAuthenticity = ParseBool(authenticityJson, "flag_for_review");
        if (flaggedAuthenticity)
            audit.Add($"{DateTime.UtcNow:o} - WARNING: document_authenticity_flagged");

        // ─── STEP 6 — Confidence scoring ─────────────────────────────────
        audit.Add($"{DateTime.UtcNow:o} - confidence_scoring_started");
        var confidenceJson = await _llm.CallWithTextAsync(
            "confidence_scoring.md",
            $"Assessment: {assessmentJson}\n\n" +
            $"Extraction: {extractionJson}\n\n" +
            $"Validation: {validationJson}\n\n" +
            $"Interactions: {interactionJson}\n\n" +
            $"Authenticity: {authenticityJson}");
        audit.Add($"{DateTime.UtcNow:o} - confidence_scoring_completed");

        // ─── STEP 7 — Simplify for elderly ───────────────────────────────
        audit.Add($"{DateTime.UtcNow:o} - simplification_started");
        var simplifiedJson = await _llm.CallWithTextAsync(
            "simplify_for_elderly.md",
            $"Document content:\n{normalizedJson}");
        audit.Add($"{DateTime.UtcNow:o} - simplification_completed");

        // ─── STEP 8 — Final report ────────────────────────────────────────
        audit.Add($"{DateTime.UtcNow:o} - final_report_started");
        var finalJson = await _llm.CallWithTextAsync(
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

        stopwatch.Stop();

        // ─── Combine review flags from all checks ────────────────────────
        var reviewRequired = ParseBool(validationJson, "review_required")
            || hasInteractions
            || flaggedAuthenticity;

        return new AgenticPipelineResult
        {
            RawText = rawText,
            StructuredJson = finalJson,
            SimplifiedText = ParseField(simplifiedJson, "simplified_text")
                ?? BuildSimplifiedText(normalizedJson),
            GlobalConfidence = ParseDouble(confidenceJson, "global_confidence"),
            ReviewRequired = reviewRequired,
            AuditLog = audit,
            ProcessingTimeMs = (int)stopwatch.ElapsedMilliseconds
        };
    }

    private static string MergeExtractions(string original, string additional)
    {
        try
        {
            using var origDoc = JsonDocument.Parse(original);
            using var addDoc = JsonDocument.Parse(additional);
            return original + "\n/* additional_extraction: " + additional + " */";
        }
        catch { return original; }
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