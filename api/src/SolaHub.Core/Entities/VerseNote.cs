using SolaHub.Core.Common;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Entities;

public sealed class VerseNote : BaseEntity<VerseNoteId>
{
    public const int MaxContentLength = 10_000;
    public const int MaxTagCount = 20;
    public const int MaxTagLength = 50;

    private readonly List<string> _tags = [];

    private VerseNote(VerseNoteId id, UserId userId, VerseRef verseRef, string content) : base(id)
    {
        UserId = userId;
        VerseRef = verseRef;
        Content = content;
    }

    public UserId UserId { get; private set; }
    public VerseRef VerseRef { get; private set; }
    public string Content { get; private set; }
    public bool IsShared { get; private set; }
    public IReadOnlyList<string> Tags => _tags.AsReadOnly();

    // ─── Factory ──────────────────────────────────────────────────────────────

    public static Result<VerseNote> Create(
        UserId userId,
        VerseRef verseRef,
        string content,
        IEnumerable<string> tags,
        bool isShared = false)
    {
        if (string.IsNullOrWhiteSpace(content))
            return Error.Validation("Notes.ContentRequired", "Note content cannot be empty.");

        if (content.Length > MaxContentLength)
            return Error.Validation("Notes.ContentTooLong",
                $"Note content must not exceed {MaxContentLength:N0} characters.");

        var note = new VerseNote(VerseNoteId.New(), userId, verseRef, content.Trim())
        {
            IsShared = isShared,
        };

        var tagsResult = note.SetTags(tags);
        if (tagsResult.IsFailure)
            return tagsResult.Error;

        return note;
    }

    // ─── Behaviour ────────────────────────────────────────────────────────────

    public Result UpdateContent(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return Result.Failure(Error.Validation("Notes.ContentRequired", "Content cannot be empty."));

        if (content.Length > MaxContentLength)
            return Result.Failure(Error.Validation("Notes.ContentTooLong",
                $"Content must not exceed {MaxContentLength:N0} characters."));

        Content = content.Trim();
        MarkUpdated();
        return Result.Ok;
    }

    public void SetShared(bool shared)
    {
        if (IsShared == shared) return;
        IsShared = shared;
        MarkUpdated();
    }

    public Result SetTags(IEnumerable<string> tags)
    {
        var normalized = tags
            .Select(t => t.Trim().ToLowerInvariant())
            .Where(t => t.Length > 0)
            .Distinct()
            .ToList();

        if (normalized.Count > MaxTagCount)
            return Result.Failure(Error.Validation("Notes.TooManyTags",
                $"Cannot have more than {MaxTagCount} tags."));

        var tooLong = normalized.FirstOrDefault(t => t.Length > MaxTagLength);
        if (tooLong is not null)
            return Result.Failure(Error.Validation("Notes.TagTooLong",
                $"Tag '{tooLong}' exceeds the maximum length of {MaxTagLength} characters."));

        _tags.Clear();
        _tags.AddRange(normalized);
        MarkUpdated();
        return Result.Ok;
    }
}
