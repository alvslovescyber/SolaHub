using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Queries.Notes;

public sealed record GetUserNotesQuery(UserId UserId) : IQuery<IReadOnlyList<NoteDto>>;

internal sealed class GetUserNotesQueryHandler(IVerseNoteRepository noteRepository)
    : IRequestHandler<GetUserNotesQuery, Result<IReadOnlyList<NoteDto>>>
{
    public async Task<Result<IReadOnlyList<NoteDto>>> Handle(
        GetUserNotesQuery request,
        CancellationToken ct
    )
    {
        var notes = await noteRepository.GetByUserAsync(request.UserId, ct);
        var dtos = notes.Select(NoteMapper.ToDto).ToList().AsReadOnly();
        return Result<IReadOnlyList<NoteDto>>.Success(dtos);
    }
}
