using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Core.Common;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Notes;

public sealed record UpdateNoteCommand(
    VerseNoteId NoteId,
    UserId RequestingUserId,
    string Content,
    IReadOnlyList<string> Tags,
    bool IsShared
) : ICommand<NoteDto>;

public sealed class UpdateNoteCommandValidator : AbstractValidator<UpdateNoteCommand>
{
    public UpdateNoteCommandValidator()
    {
        RuleFor(x => x.Content)
            .NotEmpty()
            .WithMessage("Content cannot be empty.")
            .MaximumLength(VerseNote.MaxContentLength)
            .WithMessage($"Content must not exceed {VerseNote.MaxContentLength:N0} characters.");

        RuleFor(x => x.Tags)
            .Must(tags => tags.Count <= VerseNote.MaxTagCount)
            .WithMessage($"Cannot have more than {VerseNote.MaxTagCount} tags.");
    }
}

internal sealed class UpdateNoteCommandHandler(IVerseNoteRepository noteRepository)
    : IRequestHandler<UpdateNoteCommand, Result<NoteDto>>
{
    public async Task<Result<NoteDto>> Handle(UpdateNoteCommand request, CancellationToken ct)
    {
        var note = await noteRepository.GetByIdAsync(request.NoteId, ct);
        if (note is null)
            return Error.NotFound("Notes.NotFound", $"Note {request.NoteId.Value} was not found.");

        if (note.UserId != request.RequestingUserId)
            return Error.Forbidden(
                "Notes.Forbidden",
                "You do not have permission to update this note."
            );

        var contentResult = note.UpdateContent(request.Content);
        if (contentResult.IsFailure)
            return contentResult.Error;

        note.SetShared(request.IsShared);

        var tagResult = note.SetTags(request.Tags);
        if (tagResult.IsFailure)
            return tagResult.Error;

        await noteRepository.UpdateAsync(note, ct);
        return CreateNoteCommandHandler.MapToDto(note);
    }
}
