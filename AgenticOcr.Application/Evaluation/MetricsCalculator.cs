using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AgenticOcr.Application.Evaluation
{
    public class OcrMetrics
    {
        public double CharacterErrorRate { get; set; }
        public double WordErrorRate { get; set; }
        public double CharacterAccuracy { get; set; }
        public double WordAccuracy { get; set; }
        public int TotalCharacters { get; set; }
        public int TotalWords { get; set; }
    }

    public static class MetricsCalculator
    {
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

        public static double CalculateTokenOverlap(
    string groundTruth, string extracted)
        {
            var gtTokens = Tokenize(groundTruth);
            var exTokens = new HashSet<string>(Tokenize(extracted));

            if (gtTokens.Count == 0) return 0;

            var matches = gtTokens.Count(t => exTokens.Contains(t));
            return Math.Round((double)matches / gtTokens.Count, 4);
        }

        private static List<string> Tokenize(string text)
        {
            return text
                .ToLower()
                .Split(new[] { ' ', '\n', '\r', '\t', ':', '(', ')',
            '[', ']', ',', '.', '/', '-', '|' },
                    StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length > 1)
                .ToList();
        }
    }
}

public static class StringExtensions
{
    public static string Let(this IEnumerable<string> source,
        Func<IEnumerable<string>, string> transform)
        => transform(source);
}