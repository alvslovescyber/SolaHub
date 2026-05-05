using System.Text.Json;
using System.Text.RegularExpressions;

namespace SolaHub.Core.Common;

public static class ContentSafetyPolicy
{
    public const int MaxDeckSlides = 20;
    public const int MaxDeckElementsPerSlide = 12;
    public const int MaxDeckTextCharacters = 8_000;
    public const int MaxDeckJsonCharacters = 120_000;
    public const int MaxBackgroundValueCharacters = 2_000;
    public const int MaxPublicLinks = 2;

    private static readonly Regex UrlPattern = new(
        @"\b(?:https?://|www\.)[^\s<>()]+",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant
    );

    private static readonly Regex HexColorPattern = new(
        @"^#(?:[0-9a-f]{3}|[0-9a-f]{6})$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant
    );

    private static readonly Regex PresetPattern = new(
        @"^[a-z0-9][a-z0-9-]{0,79}$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant
    );

    private static readonly Regex PrivateImageDataUrlPattern = new(
        @"^data:image/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\r\n]+$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant
    );

    private static readonly Regex VerseReferencePattern = new(
        @"^[A-Za-z0-9 .:;\-]{2,80}$",
        RegexOptions.CultureInvariant
    );

    private static readonly string[] BlockedTerms =
    [
        "fuck",
        "shit",
        "bitch",
        "cunt",
        "asshole",
        "bastard",
        "damn",
        "porn",
        "kill yourself",
        "kys",
        "bomb threat",
    ];

    private static readonly string[] UnsafeMarkers =
    [
        "<script",
        "</script",
        "<iframe",
        "</iframe",
        "<object",
        "<embed",
        "<svg",
        "<img",
        "javascript:",
        "data:text/html",
        "vbscript:",
        "onerror=",
        "onclick=",
        "onload=",
        "@import",
        "expression(",
        "innerhtml",
        "insertadjacenthtml",
        "v-html",
    ];

    private static readonly HashSet<string> AllowedGradientBackgrounds =
    [
        "linear-gradient(135deg, #111827 0%, #1f2937 48%, #0f766e 100%)",
        "linear-gradient(135deg, #5b2333 0%, #b45309 58%, #f59e0b 100%)",
        "radial-gradient(circle at 22% 28%, rgba(20, 184, 166, 0.58), transparent 34%), radial-gradient(circle at 78% 22%, rgba(245, 158, 11, 0.45), transparent 32%), linear-gradient(135deg, #08111f 0%, #111827 42%, #052e2b 100%)",
        "radial-gradient(circle at 48% 42%, rgba(255, 255, 255, 0.2), transparent 18%), radial-gradient(circle at 18% 76%, rgba(59, 130, 246, 0.5), transparent 35%), linear-gradient(135deg, #140f2d 0%, #1f2937 52%, #3f1d38 100%)",
        "radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.38), transparent 30%), radial-gradient(circle at 82% 72%, rgba(45, 212, 191, 0.42), transparent 34%), linear-gradient(135deg, #06141f 0%, #0f172a 48%, #134e4a 100%)",
        "radial-gradient(circle at 18% 24%, rgba(251, 191, 36, 0.52), transparent 30%), radial-gradient(circle at 78% 30%, rgba(244, 114, 182, 0.34), transparent 32%), linear-gradient(135deg, #21121d 0%, #3b1f2b 48%, #78350f 100%)",
        "radial-gradient(circle at 26% 76%, rgba(34, 197, 94, 0.34), transparent 34%), radial-gradient(circle at 78% 18%, rgba(250, 204, 21, 0.28), transparent 30%), linear-gradient(135deg, #08140d 0%, #11221a 50%, #1f2937 100%)",
    ];

    public static Result ValidateNoUnsafeMarkup(IEnumerable<string?> values)
    {
        var combined = string.Join(" ", values.Where(v => !string.IsNullOrWhiteSpace(v)));
        if (combined.Length == 0)
            return Result.Ok;

        var lower = combined.ToLowerInvariant();
        if (UnsafeMarkers.Any(lower.Contains))
            return Result.Failure(
                Error.Validation(
                    "Content.UnsafeMarkup",
                    "Content cannot include scripts, unsafe HTML, or JavaScript URLs."
                )
            );

        return Result.Ok;
    }

    public static Result ValidatePublicText(IEnumerable<string?> values)
    {
        var unsafeResult = ValidateNoUnsafeMarkup(values);
        if (unsafeResult.IsFailure)
            return unsafeResult;

        var combined = string.Join(" ", values.Where(v => !string.IsNullOrWhiteSpace(v)));
        if (combined.Length == 0)
            return Result.Ok;

        if (ContainsBlockedTerm(combined))
            return Result.Failure(
                Error.Validation(
                    "Content.Blocked",
                    "Content cannot be published because it violates community guidelines."
                )
            );

        var links = UrlPattern.Matches(combined);
        if (links.Count > MaxPublicLinks)
            return Result.Failure(
                Error.Validation(
                    "Content.TooManyLinks",
                    $"Public content cannot include more than {MaxPublicLinks} links."
                )
            );

        if (
            links.Any(match =>
                !match.Value.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            )
        )
            return Result.Failure(
                Error.Validation(
                    "Content.InsecureLink",
                    "Public content can only include https:// links."
                )
            );

        return Result.Ok;
    }

    public static Result ValidateVerseReference(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return Result.Failure(
                Error.Validation("Community.VerseRefRequired", "Verse reference is required.")
            );

        if (!VerseReferencePattern.IsMatch(value.Trim()))
            return Result.Failure(
                Error.Validation(
                    "Community.InvalidVerseRef",
                    "Verse reference contains unsupported characters."
                )
            );

        return Result.Ok;
    }

    public static Result ValidateNotationDeck(string? deckJson, bool publicContent)
    {
        if (string.IsNullOrWhiteSpace(deckJson))
            return Result.Failure(
                Error.Validation("Community.DeckRequired", "Notation deck is required.")
            );

        if (deckJson.Length > MaxDeckJsonCharacters)
            return Result.Failure(
                Error.Validation(
                    "Community.DeckTooLarge",
                    $"Notation deck JSON must not exceed {MaxDeckJsonCharacters:N0} characters."
                )
            );

        try
        {
            using var document = JsonDocument.Parse(deckJson);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
                return Result.Failure(
                    Error.Validation("Community.InvalidDeck", "Notation deck must be an object.")
                );

            if (
                !root.TryGetProperty("slides", out var slides)
                || slides.ValueKind != JsonValueKind.Array
            )
                return Result.Failure(
                    Error.Validation("Community.InvalidDeck", "Notation deck must include slides.")
                );

            var slideCount = slides.GetArrayLength();
            if (slideCount is <= 0 or > MaxDeckSlides)
                return Result.Failure(
                    Error.Validation(
                        "Community.TooManySlides",
                        $"Notation deck must include 1-{MaxDeckSlides} slides."
                    )
                );

            var textValues = new List<string?>();
            AddIfString(root, "title", textValues);

            var totalTextLength = 0;
            foreach (var slide in slides.EnumerateArray())
            {
                var slideResult = ValidateSlide(
                    slide,
                    publicContent,
                    textValues,
                    ref totalTextLength
                );
                if (slideResult.IsFailure)
                    return slideResult;
            }

            if (totalTextLength > MaxDeckTextCharacters)
                return Result.Failure(
                    Error.Validation(
                        "Community.DeckTextTooLong",
                        $"Notation deck text must not exceed {MaxDeckTextCharacters:N0} characters."
                    )
                );

            var unsafeResult = ValidateNoUnsafeMarkup(textValues);
            if (unsafeResult.IsFailure)
                return unsafeResult;

            return publicContent ? ValidatePublicText(textValues) : Result.Ok;
        }
        catch (JsonException)
        {
            return Result.Failure(
                Error.Validation("Community.InvalidDeck", "Notation deck JSON is malformed.")
            );
        }
    }

    private static Result ValidateSlide(
        JsonElement slide,
        bool publicContent,
        List<string?> textValues,
        ref int totalTextLength
    )
    {
        if (slide.ValueKind != JsonValueKind.Object)
            return Result.Failure(
                Error.Validation("Community.InvalidSlide", "Notation slide must be an object.")
            );

        AddIfString(slide, "title", textValues, ref totalTextLength);
        AddIfString(slide, "text", textValues, ref totalTextLength);

        if (
            slide.TryGetProperty("background", out var background)
            && background.ValueKind == JsonValueKind.Object
        )
        {
            var backgroundResult = ValidateBackground(background, publicContent);
            if (backgroundResult.IsFailure)
                return backgroundResult;
        }
        else
        {
            return Result.Failure(
                Error.Validation("Community.InvalidBackground", "Slide background is required.")
            );
        }

        if (
            !slide.TryGetProperty("elements", out var elements)
            || elements.ValueKind != JsonValueKind.Array
        )
            return Result.Failure(
                Error.Validation("Community.InvalidElements", "Slide elements are required.")
            );

        if (elements.GetArrayLength() > MaxDeckElementsPerSlide)
            return Result.Failure(
                Error.Validation(
                    "Community.TooManyElements",
                    $"Each slide can include up to {MaxDeckElementsPerSlide} elements."
                )
            );

        foreach (var element in elements.EnumerateArray())
        {
            var elementResult = ValidateElement(element, textValues, ref totalTextLength);
            if (elementResult.IsFailure)
                return elementResult;
        }

        return Result.Ok;
    }

    private static Result ValidateBackground(JsonElement background, bool publicContent)
    {
        var type = GetString(background, "type");
        var value = GetString(background, "value");
        if (string.IsNullOrWhiteSpace(type) || string.IsNullOrWhiteSpace(value))
            return Result.Failure(
                Error.Validation("Community.InvalidBackground", "Slide background is incomplete.")
            );

        if (value.Length > MaxBackgroundValueCharacters)
            return Result.Failure(
                Error.Validation(
                    "Community.BackgroundTooLong",
                    $"Slide background values must not exceed {MaxBackgroundValueCharacters:N0} characters."
                )
            );

        if (publicContent)
            return ValidatePublicBackground(type, value);

        return ValidatePrivateBackground(type, value);
    }

    private static Result ValidatePublicBackground(string type, string value)
    {
        if (type.Equals("image", StringComparison.OrdinalIgnoreCase))
            return Result.Failure(
                Error.Validation(
                    "Community.ImageBackgroundNotAllowed",
                    "Public community notation decks cannot include image backgrounds in this version."
                )
            );

        if (value.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            return Result.Failure(
                Error.Validation(
                    "Community.DataBackgroundNotAllowed",
                    "Public community notation decks cannot include data URL backgrounds."
                )
            );

        return type.ToLowerInvariant() switch
        {
            "solid" when HexColorPattern.IsMatch(value) => Result.Ok,
            "preset" when PresetPattern.IsMatch(value) => Result.Ok,
            "gradient" or "motion" when AllowedGradientBackgrounds.Contains(value) => Result.Ok,
            _ => Result.Failure(
                Error.Validation(
                    "Community.UnsafeBackground",
                    "Slide background is not supported for community sharing."
                )
            ),
        };
    }

    private static Result ValidatePrivateBackground(string type, string value)
    {
        var unsafeResult = ValidateNoUnsafeMarkup([value]);
        if (unsafeResult.IsFailure)
            return unsafeResult;

        return type.ToLowerInvariant() switch
        {
            "solid" when HexColorPattern.IsMatch(value) => Result.Ok,
            "preset" when PresetPattern.IsMatch(value) => Result.Ok,
            "gradient" or "motion" => Result.Ok,
            "image"
                when value.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                    || PrivateImageDataUrlPattern.IsMatch(value) => Result.Ok,
            "image" => Result.Failure(
                Error.Validation(
                    "Community.UnsafePrivateImage",
                    "Private notation deck image backgrounds must use https or supported image data URLs."
                )
            ),
            _ => Result.Failure(
                Error.Validation(
                    "Community.UnsafeBackground",
                    "Slide background is not supported for community sharing."
                )
            ),
        };
    }

    private static Result ValidateElement(
        JsonElement element,
        List<string?> textValues,
        ref int totalTextLength
    )
    {
        if (element.ValueKind != JsonValueKind.Object)
            return Result.Failure(
                Error.Validation("Community.InvalidElement", "Slide element must be an object.")
            );

        var kind = GetString(element, "kind");
        if (kind is not ("text" or "verse"))
            return Result.Failure(
                Error.Validation("Community.InvalidElement", "Slide element kind is invalid.")
            );

        AddIfString(element, "text", textValues, ref totalTextLength);
        AddIfString(element, "reference", textValues, ref totalTextLength);
        AddIfString(element, "translation", textValues, ref totalTextLength);

        var color = GetString(element, "color");
        if (!string.IsNullOrWhiteSpace(color) && !HexColorPattern.IsMatch(color))
            return Result.Failure(
                Error.Validation("Community.InvalidElementColor", "Slide element color is invalid.")
            );

        return Result.Ok;
    }

    private static bool ContainsBlockedTerm(string value)
    {
        var normalized = NormalizeForTerms(value);
        foreach (var term in BlockedTerms)
        {
            if (term.Contains(' '))
            {
                if (normalized.Contains(term, StringComparison.Ordinal))
                    return true;
                continue;
            }

            if (Regex.IsMatch(normalized, $@"\b{Regex.Escape(term)}\b"))
                return true;
        }

        return false;
    }

    private static string NormalizeForTerms(string value)
    {
        var chars = value
            .ToLowerInvariant()
            .Select(ch =>
                ch switch
                {
                    '0' => 'o',
                    '1' or '!' => 'i',
                    '3' => 'e',
                    '4' or '@' => 'a',
                    '5' or '$' => 's',
                    '7' => 't',
                    _ when char.IsLetterOrDigit(ch) => ch,
                    _ => ' ',
                }
            )
            .ToArray();

        return Regex.Replace(new string(chars), @"\s+", " ").Trim();
    }

    private static string? GetString(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var value)
        && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static void AddIfString(JsonElement element, string propertyName, List<string?> values)
    {
        var value = GetString(element, propertyName);
        if (!string.IsNullOrWhiteSpace(value))
            values.Add(value);
    }

    private static void AddIfString(
        JsonElement element,
        string propertyName,
        List<string?> values,
        ref int totalTextLength
    )
    {
        var value = GetString(element, propertyName);
        if (string.IsNullOrWhiteSpace(value))
            return;

        values.Add(value);
        totalTextLength += value.Length;
    }
}
