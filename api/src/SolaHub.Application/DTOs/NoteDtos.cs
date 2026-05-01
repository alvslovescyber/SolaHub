namespace SolaHub.Application.DTOs;

public sealed record CreateNoteRequest(
    string VerseRef,
    string Content,
    bool IsShared = false,
    IReadOnlyList<string>? Tags = null
);

public sealed record UpdateNoteRequest(
    string Content,
    bool IsShared,
    IReadOnlyList<string>? Tags = null
);

public sealed record NoteDto(
    Guid Id,
    string VerseRef,
    string Content,
    bool IsShared,
    IReadOnlyList<string> Tags,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
