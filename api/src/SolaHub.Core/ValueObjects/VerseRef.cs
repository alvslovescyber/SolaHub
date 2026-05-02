namespace SolaHub.Core.ValueObjects;

/// <summary>
/// Canonical reference to a Bible verse or chapter.
/// Supported formats:
///   BOOK.CHAPTER.VERSE  (e.g. "JHN.3.16") — specific verse
///   BOOK.CHAPTER        (e.g. "JHN.3")    — whole-chapter ref; Verse == 0
/// </summary>
public sealed record VerseRef(string BookShort, int Chapter, int Verse)
{
    public bool IsChapterRef => Verse == 0;

    public string Key => Verse == 0 ? $"{BookShort}.{Chapter}" : $"{BookShort}.{Chapter}.{Verse}";

    public static VerseRef Parse(string key)
    {
        if (!TryParse(key, out var result))
            throw new ArgumentException(
                $"Invalid verse reference: '{key}'. Expected BOOK.CHAPTER or BOOK.CHAPTER.VERSE",
                nameof(key)
            );
        return result;
    }

    public static bool TryParse(string? key, out VerseRef result)
    {
        result = default!;
        if (string.IsNullOrWhiteSpace(key))
            return false;

        var parts = key.Split('.');

        if (parts.Length == 2)
        {
            // Whole-chapter reference: BOOK.CHAPTER
            if (string.IsNullOrWhiteSpace(parts[0]) || !parts[0].All(char.IsLetter))
                return false;
            if (!int.TryParse(parts[1], out var ch) || ch < 1)
                return false;
            result = new VerseRef(parts[0].ToUpperInvariant(), ch, 0);
            return true;
        }

        if (parts.Length != 3)
            return false;
        if (string.IsNullOrWhiteSpace(parts[0]) || !parts[0].All(char.IsLetter))
            return false;
        if (!int.TryParse(parts[1], out var chapter) || chapter < 1)
            return false;
        if (!int.TryParse(parts[2], out var verse) || verse < 1)
            return false;

        result = new VerseRef(parts[0].ToUpperInvariant(), chapter, verse);
        return true;
    }

    public override string ToString() => Key;
}
