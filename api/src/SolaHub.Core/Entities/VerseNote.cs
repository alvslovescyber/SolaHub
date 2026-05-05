using SolaHub.Core.Common;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Entities;

public sealed class VerseNote : BaseEntity<VerseNoteId>
{
    public const int MaxContentLength = 10_000;
    public const int MaxTagCount = 20;
    public const int MaxTagLength = 50;

    private readonly List<string> _tags = [];

    // Required by EF Core for materialization — never called by application code
    private VerseNote()
        : base(default!)
    {
        UserId = default;
        VerseRef = null!;
        Content = string.Empty;
    }

    private VerseNote(VerseNoteId id, UserId userId, VerseRef verseRef, string content)
        : base(id)
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
        bool isShared = false
    )
    {
        if (string.IsNullOrWhiteSpace(content))
            return Error.Validation("Notes.ContentRequired", "Note content cannot be empty.");

        if (content.Length > MaxContentLength)
            return new Error(
                "Notes.ContentTooLong",
                $"Note content must not exceed {MaxContentLength:N0} characters.",
                ErrorType.Validation
            );

        if (isShared)
        {
            var publicResult = ContentSafetyPolicy.ValidatePublicText([content, .. tags]);
            if (publicResult.IsFailure)
                return publicResult.Error;
        }

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
            return Result.Failure(
                Error.Validation("Notes.ContentRequired", "Content cannot be empty.")
            );

        if (content.Length > MaxContentLength)
            return Result.Failure(
                Error.Validation(
                    "Notes.ContentTooLong",
                    $"Content must not exceed {MaxContentLength:N0} characters."
                )
            );

        if (IsShared)
        {
            var publicResult = ContentSafetyPolicy.ValidatePublicText([content, .. _tags]);
            if (publicResult.IsFailure)
                return publicResult;
        }

        Content = content.Trim();
        MarkUpdated();
        return Result.Ok;
    }

    public Result SetShared(bool shared)
    {
        if (IsShared == shared)
            return Result.Ok;

        if (shared)
        {
            var publicResult = ContentSafetyPolicy.ValidatePublicText([Content, .. _tags]);
            if (publicResult.IsFailure)
                return publicResult;
        }

        IsShared = shared;
        MarkUpdated();
        return Result.Ok;
    }

    public Result SetTags(IEnumerable<string> tags)
    {
        var normalized = tags.Select(t => t.Trim().ToLowerInvariant())
            .Where(t => t.Length > 0)
            .Distinct()
            .ToList();

        if (normalized.Count > MaxTagCount)
            return Result.Failure(
                new Error(
                    "Notes.TooManyTags",
                    $"Cannot have more than {MaxTagCount} tags.",
                    ErrorType.Validation
                )
            );

        var tooLong = normalized.FirstOrDefault(t => t.Length > MaxTagLength);
        if (tooLong is not null)
            return Result.Failure(
                new Error(
                    "Notes.TagTooLong",
                    $"Tag '{tooLong}' exceeds the maximum length of {MaxTagLength} characters.",
                    ErrorType.Validation
                )
            );

        if (IsShared)
        {
            var publicResult = ContentSafetyPolicy.ValidatePublicText([Content, .. normalized]);
            if (publicResult.IsFailure)
                return publicResult;
        }

        _tags.Clear();
        _tags.AddRange(normalized);
        MarkUpdated();
        return Result.Ok;
    }
}
