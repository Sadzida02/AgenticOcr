namespace AgenticOcr.Application.Evaluation;

public class OcrMetrics
{
    public double CharacterErrorRate { get; set; }
    public double WordErrorRate { get; set; }
    public double CharacterAccuracy { get; set; }
    public double WordAccuracy { get; set; }
    public int TotalCharacters { get; set; }
    public int TotalWords { get; set; }
}

public class WordComparisonResult
{
    public List<WordMatch> Words { get; set; } = new();
    public int TotalGroundTruthWords { get; set; }
    public int CorrectWords { get; set; }
    public int MissingWords { get; set; }
    public int ExtraWords { get; set; }
    public double WordDetectionRate { get; set; }
}

public class WordMatch
{
    public string Word { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public bool Found { get; set; }
}

public class EntityEvaluationResult
{
    public int TotalEntities { get; set; }
    public int ExactMatches { get; set; }
    public int PartialMatches { get; set; }
    public int Missing { get; set; }
    public double ExactMatchRate { get; set; }
    public double PartialMatchRate { get; set; }
    public double F1Score { get; set; }
    public List<EntityMatch> Details { get; set; } = new();
}

public class EntityMatch
{
    public string EntityName { get; set; } = string.Empty;
    public string ExpectedValue { get; set; } = string.Empty;
    public bool Found { get; set; }
    public bool ExactMatch { get; set; }
    public bool PartialMatch { get; set; }
}

public static class MetricsCalculator
{
    // ─── CER and WER calculation ─────────────────────────────────────

    public static OcrMetrics Calculate(string groundTruth, string extracted)
    {
        var cleanGround = Normalize(groundTruth);
        var cleanExtracted = Normalize(extracted);

        var cerDistance = LevenshteinDistance(cleanGround, cleanExtracted);
        var cer = cleanGround.Length == 0 ? 0.0
            : (double)cerDistance / cleanGround.Length;

        var groundWords = cleanGround.Split(' ',
            StringSplitOptions.RemoveEmptyEntries);
        var extractedWords = cleanExtracted.Split(' ',
            StringSplitOptions.RemoveEmptyEntries);

        var werDistance = LevenshteinDistance(
            string.Join(" ", groundWords),
            string.Join(" ", extractedWords));
        var wer = groundWords.Length == 0 ? 0.0
            : (double)werDistance / groundWords.Length;

        return new OcrMetrics
        {
            CharacterErrorRate = Math.Round(cer, 4),
            WordErrorRate = Math.Round(wer, 4),
            CharacterAccuracy = Math.Round(1 - cer, 4),
            WordAccuracy = Math.Round(1 - wer, 4),
            TotalCharacters = cleanGround.Length,
            TotalWords = groundWords.Length
        };
    }

    // ─── Token overlap ───────────────────────────────────────────────

    public static double CalculateTokenOverlap(
        string groundTruth, string extracted)
    {
        var gtTokens = Tokenize(groundTruth);
        var exTokens = new HashSet<string>(Tokenize(extracted));

        if (gtTokens.Count == 0) return 0;

        var matches = gtTokens.Count(t => exTokens.Contains(t));
        return Math.Round((double)matches / gtTokens.Count, 4);
    }

    // ─── Word-level comparison ───────────────────────────────────────

    public static WordComparisonResult CompareWords(
        string groundTruth, string extracted)
    {
        var gtWords = Tokenize(groundTruth);
        var exWords = Tokenize(extracted);
        var exSet = new HashSet<string>(exWords);
        var gtSet = new HashSet<string>(gtWords);

        var words = new List<WordMatch>();

        foreach (var word in gtWords.Distinct())
        {
            words.Add(new WordMatch
            {
                Word = word,
                Source = "ground_truth",
                Found = exSet.Contains(word)
            });
        }

        foreach (var word in exWords.Distinct())
        {
            if (!gtSet.Contains(word))
            {
                words.Add(new WordMatch
                {
                    Word = word,
                    Source = "extra_in_extracted",
                    Found = false
                });
            }
        }

        var correctCount = gtWords.Distinct()
            .Count(w => exSet.Contains(w));
        var missingCount = gtWords.Distinct()
            .Count(w => !exSet.Contains(w));
        var extraCount = exWords.Distinct()
            .Count(w => !gtSet.Contains(w));

        return new WordComparisonResult
        {
            Words = words,
            TotalGroundTruthWords = gtWords.Distinct().Count(),
            CorrectWords = correctCount,
            MissingWords = missingCount,
            ExtraWords = extraCount,
            WordDetectionRate = gtWords.Distinct().Count() == 0 ? 0 :
                Math.Round((double)correctCount /
                    gtWords.Distinct().Count(), 4)
        };
    }

    // ─── Entity evaluation ───────────────────────────────────────────

    public static EntityEvaluationResult EvaluateEntities(
        Dictionary<string, string> expectedEntities,
        string extractedText)
    {
        var extractedLower = extractedText.ToLower();
        var details = new List<EntityMatch>();
        int exactMatches = 0;
        int partialMatches = 0;

        foreach (var entity in expectedEntities)
        {
            var expectedLower = entity.Value.ToLower().Trim();
            var match = new EntityMatch
            {
                EntityName = entity.Key,
                ExpectedValue = entity.Value
            };

            if (extractedLower.Contains(expectedLower))
            {
                match.Found = true;
                match.ExactMatch = true;
                exactMatches++;
            }
            else
            {
                var tokens = expectedLower
                    .Split(new[] { ' ', ',', '.', ':', '/', '-' },
                        StringSplitOptions.RemoveEmptyEntries)
                    .Where(t => t.Length > 1)
                    .ToList();

                var foundTokens = tokens
                    .Count(t => extractedLower.Contains(t));

                if (tokens.Count > 0 &&
                    (double)foundTokens / tokens.Count >= 0.5)
                {
                    match.Found = true;
                    match.PartialMatch = true;
                    partialMatches++;
                }
            }

            details.Add(match);
        }

        var total = expectedEntities.Count;
        var totalFound = exactMatches + partialMatches;
        var precision = total == 0 ? 0.0 : (double)totalFound / total;
        var recall = precision;
        var f1 = precision == 0 ? 0.0
            : 2 * precision * recall / (precision + recall);

        return new EntityEvaluationResult
        {
            TotalEntities = total,
            ExactMatches = exactMatches,
            PartialMatches = partialMatches,
            Missing = total - totalFound,
            ExactMatchRate = Math.Round(precision, 4),
            PartialMatchRate = Math.Round(
                (double)(exactMatches + partialMatches) /
                    Math.Max(total, 1), 4),
            F1Score = Math.Round(f1, 4),
            Details = details
        };
    }

    public class F1ScoreResult
    {
        public double Precision { get; set; }
        public double Recall { get; set; }
        public double F1Score { get; set; }
        public int TruePositives { get; set; }
        public int FalsePositives { get; set; }
        public int FalseNegatives { get; set; }
    }

    public static F1ScoreResult CalculateF1Score(
        string groundTruth, string extracted)
    {
        var gtTokens = new HashSet<string>(Tokenize(groundTruth));
        var exTokens = new HashSet<string>(Tokenize(extracted));

        // True positives — tokens in extracted that are in ground truth
        var truePositives = exTokens.Count(t => gtTokens.Contains(t));

        // False positives — tokens in extracted that are NOT in ground truth
        var falsePositives = exTokens.Count(t => !gtTokens.Contains(t));

        // False negatives — tokens in ground truth that are NOT in extracted
        var falseNegatives = gtTokens.Count(t => !exTokens.Contains(t));

        var precision = (truePositives + falsePositives) == 0
            ? 0.0
            : (double)truePositives / (truePositives + falsePositives);

        var recall = (truePositives + falseNegatives) == 0
            ? 0.0
            : (double)truePositives / (truePositives + falseNegatives);

        var f1 = (precision + recall) == 0
            ? 0.0
            : 2 * precision * recall / (precision + recall);

        return new F1ScoreResult
        {
            Precision = Math.Round(precision, 4),
            Recall = Math.Round(recall, 4),
            F1Score = Math.Round(f1, 4),
            TruePositives = truePositives,
            FalsePositives = falsePositives,
            FalseNegatives = falseNegatives
        };
    }

    // ─── Private helpers ─────────────────────────────────────────────

    private static string Normalize(string text)
    {
        var result = text
            .ToLower()
            .Replace("\r\n", " ")
            .Replace("\n", " ")
            .Replace("\t", " ")
            .Replace(":", " ")
            .Replace("(", " ")
            .Replace(")", " ")
            .Replace("[", " ")
            .Replace("]", " ")
            .Replace(",", " ")
            .Replace(".", " ")
            .Replace("/", " ")
            .Replace("-", " ")
            .Replace("|", " ");

        return string.Join(" ",
            result.Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static int LevenshteinDistance(string s, string t)
    {
        if (string.IsNullOrEmpty(s)) return t?.Length ?? 0;
        if (string.IsNullOrEmpty(t)) return s.Length;

        var d = new int[s.Length + 1, t.Length + 1];

        for (var i = 0; i <= s.Length; i++) d[i, 0] = i;
        for (var j = 0; j <= t.Length; j++) d[0, j] = j;

        for (var i = 1; i <= s.Length; i++)
        {
            for (var j = 1; j <= t.Length; j++)
            {
                var cost = s[i - 1] == t[j - 1] ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost);
            }
        }

        return d[s.Length, t.Length];
    }

    private static List<string> Tokenize(string text)
    {
        return text
            .ToLower()
            .Split(new[] { ' ', '\n', '\r', '\t', ':', '(',
                ')', '[', ']', ',', '.', '/', '-', '|' },
                StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length > 1)
            .ToList();
    }
}