using SolaHub.Core.Common;
using SolaHub.Core.Enums;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Entities;

public sealed class CommunityPost : BaseEntity<CommunityPostId>
{
    public const int MaxTitleLength = 120;
    public const int MaxBodyLength = 2_000;
    public const int MaxTagCount = 8;
    public const int MaxTagLength = 30;
    public const int MaxAuthorDisplayNameLength = 100;

    private readonly List<string> _tags = [];

    private CommunityPost()
        : base(default!)
    {
        AuthorDisplayName = string.Empty;
        Title = string.Empty;
        Body = string.Empty;
    }

    private CommunityPost(
        CommunityPostId id,
        UserId authorId,
        string authorDisplayName,
        CommunityPostKind kind,
        CommunityVisibility visibility
    )
        : base(id)
    {
        AuthorId = authorId;
        AuthorDisplayName = authorDisplayName;
        Kind = kind;
        Visibility = visibility;
        Title = string.Empty;
        Body = string.Empty;
    }

    public UserId AuthorId { get; private set; }
    public string AuthorDisplayName { get; private set; }
    public CommunityPostKind Kind { get; private set; }
    public CommunityVisibility Visibility { get; private set; }
    public string Title { get; private set; }
    public string Body { get; private set; }
    public string? VerseRef { get; private set; }
    public string? DeckJson { get; private set; }
    public IReadOnlyList<string> Tags => _tags.AsReadOnly();

    public bool IsPublic => Visibility == CommunityVisibility.Public;

    public static Result<CommunityPost> Create(
        UserId authorId,
        string authorDisplayName,
        CommunityPostKind kind,
        CommunityVisibility visibility,
        string? title,
        string? body,
        string? verseRef,
        IEnumerable<string> tags,
        string? deckJson
    )
    {
        var normalizedName = NormalizeAuthorDisplayName(authorDisplayName);
        if (normalizedName.IsFailure)
            return normalizedName.Error;

        var post = new CommunityPost(
            CommunityPostId.New(),
            authorId,
            normalizedName.Value,
            kind,
            visibility
        );

        var updateResult = post.Apply(kind, visibility, title, body, verseRef, tags, deckJson);
        if (updateResult.IsFailure)
            return updateResult.Error;

        return post;
    }

    public Result Update(
        CommunityPostKind kind,
        CommunityVisibility visibility,
        string? title,
        string? body,
        string? verseRef,
        IEnumerable<string> tags,
        string? deckJson
    )
    {
        var result = Apply(kind, visibility, title, body, verseRef, tags, deckJson);
        if (result.IsSuccess)
            MarkUpdated();
        return result;
    }

    private Result Apply(
        CommunityPostKind kind,
        CommunityVisibility visibility,
        string? title,
        string? body,
        string? verseRef,
        IEnumerable<string> tags,
        string? deckJson
    )
    {
        var normalizedTitle = Clean(title);
        var normalizedBody = Clean(body);
        var normalizedVerseRef = string.IsNullOrWhiteSpace(verseRef) ? null : verseRef.Trim();
        var normalizedDeckJson = string.IsNullOrWhiteSpace(deckJson) ? null : deckJson.Trim();

        if (normalizedTitle.Length > MaxTitleLength)
            return Result.Failure(
                Error.Validation(
                    "Community.TitleTooLong",
                    $"Title must not exceed {MaxTitleLength} characters."
                )
            );

        if (normalizedBody.Length > MaxBodyLength)
            return Result.Failure(
                Error.Validation(
                    "Community.BodyTooLong",
                    $"Body must not exceed {MaxBodyLength:N0} characters."
                )
            );

        var tagsResult = NormalizeTags(tags);
        if (tagsResult.IsFailure)
            return Result.Failure(tagsResult.Error);

        var contentResult = ValidateKindContent(
            kind,
            visibility,
            normalizedTitle,
            normalizedBody,
            normalizedVerseRef,
            tagsResult.Value,
            normalizedDeckJson
        );
        if (contentResult.IsFailure)
            return contentResult;

        Kind = kind;
        Visibility = visibility;
        Title = normalizedTitle;
        Body = normalizedBody;
        VerseRef = kind == CommunityPostKind.FavouriteVerse ? normalizedVerseRef : null;
        DeckJson = kind == CommunityPostKind.NotationDeck ? normalizedDeckJson : null;
        _tags.Clear();
        _tags.AddRange(tagsResult.Value);

        return Result.Ok;
    }

    private static Result ValidateKindContent(
        CommunityPostKind kind,
        CommunityVisibility visibility,
        string title,
        string body,
        string? verseRef,
        IReadOnlyList<string> tags,
        string? deckJson
    )
    {
        var unsafeResult = ContentSafetyPolicy.ValidateNoUnsafeMarkup([
            title,
            body,
            verseRef,
            .. tags,
        ]);
        if (unsafeResult.IsFailure)
            return unsafeResult;

        switch (kind)
        {
            case CommunityPostKind.Post:
                if (string.IsNullOrWhiteSpace(body))
                    return Result.Failure(
                        Error.Validation("Community.BodyRequired", "Post body is required.")
                    );
                break;

            case CommunityPostKind.FavouriteVerse:
                var verseResult = ContentSafetyPolicy.ValidateVerseReference(verseRef);
                if (verseResult.IsFailure)
                    return verseResult;
                if (string.IsNullOrWhiteSpace(body))
                    return Result.Failure(
                        Error.Validation(
                            "Community.ReflectionRequired",
                            "Favourite verse posts need a reflection."
                        )
                    );
                break;

            case CommunityPostKind.NotationDeck:
                if (string.IsNullOrWhiteSpace(title))
                    return Result.Failure(
                        Error.Validation(
                            "Community.TitleRequired",
                            "Notation deck posts need a title."
                        )
                    );
                var deckResult = ContentSafetyPolicy.ValidateNotationDeck(
                    deckJson,
                    visibility == CommunityVisibility.Public
                );
                if (deckResult.IsFailure)
                    return deckResult;
                break;

            default:
                return Result.Failure(
                    Error.Validation("Community.InvalidKind", "Community post kind is invalid.")
                );
        }

        if (visibility == CommunityVisibility.Public)
        {
            var publicResult = ContentSafetyPolicy.ValidatePublicText([
                title,
                body,
                verseRef,
                .. tags,
            ]);
            if (publicResult.IsFailure)
                return publicResult;
        }

        return Result.Ok;
    }

    private static Result<string> NormalizeAuthorDisplayName(string value)
    {
        var normalized = Clean(value);
        if (string.IsNullOrWhiteSpace(normalized))
            return Error.Validation("Community.AuthorRequired", "Author display name is required.");

        if (normalized.Length > MaxAuthorDisplayNameLength)
            return Error.Validation(
                "Community.AuthorTooLong",
                $"Author display name must not exceed {MaxAuthorDisplayNameLength} characters."
            );

        return normalized;
    }

    private static Result<IReadOnlyList<string>> NormalizeTags(IEnumerable<string> tags)
    {
        var normalized = tags.Select(Clean)
            .Where(t => t.Length > 0)
            .Select(t => t.ToLowerInvariant())
            .Distinct()
            .ToList();

        if (normalized.Count > MaxTagCount)
            return Error.Validation(
                "Community.TooManyTags",
                $"Cannot have more than {MaxTagCount} tags."
            );

        var tooLong = normalized.FirstOrDefault(tag => tag.Length > MaxTagLength);
        if (tooLong is not null)
            return Error.Validation(
                "Community.TagTooLong",
                $"Tag '{tooLong}' exceeds the maximum length of {MaxTagLength} characters."
            );

        return normalized;
    }

    private static string Clean(string? value) => value?.Trim() ?? string.Empty;
}

public sealed class CommunityPostReport
{
    public const int MaxReasonLength = 500;

    private CommunityPostReport()
    {
        Reason = string.Empty;
    }

    private CommunityPostReport(CommunityPostId postId, UserId userId, string reason)
    {
        PostId = postId;
        UserId = userId;
        Reason = reason;
    }

    public CommunityPostId PostId { get; private set; }
    public UserId UserId { get; private set; }
    public string Reason { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;

    public static Result<CommunityPostReport> Create(
        CommunityPostId postId,
        UserId userId,
        string? reason
    )
    {
        var normalized = CleanReason(reason);
        if (normalized.Length > MaxReasonLength)
            return Error.Validation(
                "Community.ReportReasonTooLong",
                $"Report reason must not exceed {MaxReasonLength} characters."
            );

        var unsafeResult = ContentSafetyPolicy.ValidateNoUnsafeMarkup([normalized]);
        if (unsafeResult.IsFailure)
            return unsafeResult.Error;

        return new CommunityPostReport(postId, userId, normalized);
    }

    private static string CleanReason(string? value) => value?.Trim() ?? string.Empty;
}
