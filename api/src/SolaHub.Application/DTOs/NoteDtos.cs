namespace SolaHub.Application.DTOs;

public sealed record NoteDto(
    Guid Id,
    string VerseRef,
    string Content,
    bool IsShared,
    IReadOnlyList<string> Tags,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
