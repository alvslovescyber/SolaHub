using MediatR;
using SolaHub.Application.Commands.Notes;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Queries.Notes;

public sealed record GetVerseNotesQuery(string VerseRef, bool SharedOnly)
    : IQuery<IReadOnlyList<NoteDto>>;

internal sealed class GetVerseNotesQueryHandler(IVerseNoteRepository noteRepository)
    : IRequestHandler<GetVerseNotesQuery, Result<IReadOnlyList<NoteDto>>>
{
    public async Task<Result<IReadOnlyList<NoteDto>>> Handle(
        GetVerseNotesQuery request,
        CancellationToken ct
    )
    {
        if (!VerseRef.TryParse(request.VerseRef, out var verseRef))
            return Error.Validation(
                "Notes.InvalidVerseRef",
                $"'{request.VerseRef}' is not a valid verse reference."
            );

        var notes = await noteRepository.GetByVerseRefAsync(verseRef, request.SharedOnly, ct);
        return notes.Select(CreateNoteCommandHandler.MapToDto).ToList().AsReadOnly();
    }
}
