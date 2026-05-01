using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Notes;

public sealed record DeleteNoteCommand(VerseNoteId NoteId, UserId RequestingUserId) : ICommand;

internal sealed class DeleteNoteCommandHandler(IVerseNoteRepository noteRepository)
    : IRequestHandler<DeleteNoteCommand, Result>
{
    public async Task<Result> Handle(DeleteNoteCommand request, CancellationToken ct)
    {
        var note = await noteRepository.GetByIdAsync(request.NoteId, ct);
        if (note is null)
            return Error.NotFound("Notes.NotFound", $"Note {request.NoteId.Value} was not found.");

        if (note.UserId != request.RequestingUserId)
            return Error.Forbidden("Notes.Forbidden", "You do not have permission to delete this note.");

        await noteRepository.DeleteAsync(request.NoteId, ct);
        return Result.Success();
    }
}
