using System.Text.Json;

namespace SolaHub.Application.DTOs;

public sealed record CommunityPostDto(
    Guid Id,
    Guid AuthorId,
    string AuthorDisplayName,
    string Kind,
    string Visibility,
    string Title,
    string Body,
    string? VerseRef,
    IReadOnlyList<string> Tags,
    JsonElement? Deck,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool IsMine,
    bool HasReported
);
