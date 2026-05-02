using SolaHub.Application.DTOs;
using SolaHub.Core.Entities;

namespace SolaHub.Application.Mappers;

/// <summary>
/// Maps <see cref="VerseNote"/> domain entities to API-facing <see cref="NoteDto"/>s.
/// </summary>
internal static class NoteMapper
{
    public static NoteDto ToDto(VerseNote note) =>
        new(
            note.Id.Value,
            note.VerseRef.Key,
            note.Content,
            note.IsShared,
            note.Tags.ToList(),
            note.CreatedAt,
            note.UpdatedAt
        );
}
