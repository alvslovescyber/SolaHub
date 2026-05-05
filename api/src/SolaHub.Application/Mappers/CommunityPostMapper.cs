using System.Text.Json;
using SolaHub.Application.DTOs;
using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Mappers;

public static class CommunityPostMapper
{
    public static CommunityPostDto ToDto(
        CommunityPost post,
        UserId requestingUserId,
        bool hasReported
    ) =>
        new(
            post.Id.Value,
            post.AuthorId.Value,
            post.AuthorDisplayName,
            post.Kind.ToString(),
            post.Visibility.ToString(),
            post.Title,
            post.Body,
            post.VerseRef,
            post.Tags,
            ParseDeck(post.DeckJson),
            post.CreatedAt,
            post.UpdatedAt,
            post.AuthorId == requestingUserId,
            hasReported
        );

    private static JsonElement? ParseDeck(string? deckJson)
    {
        if (string.IsNullOrWhiteSpace(deckJson))
            return null;

        try
        {
            using var document = JsonDocument.Parse(deckJson);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
