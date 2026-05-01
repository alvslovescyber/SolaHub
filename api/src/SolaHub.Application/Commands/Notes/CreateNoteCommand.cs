using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Core.Common;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Notes;

public sealed record CreateNoteCommand(
    UserId UserId,
    string VerseRef,
    string Content,
    IReadOnlyList<string> Tags,
    bool IsShared
) : ICommand<NoteDto>;

public sealed class CreateNoteCommandValidator : AbstractValidator<CreateNoteCommand>
{
    public CreateNoteCommandValidator()
    {
        RuleFor(x => x.VerseRef)
            .NotEmpty()
            .Matches(@"^[A-Za-z0-9]+\.\d+\.\d+$")
            .WithMessage("VerseRef must follow format BOOK.CHAPTER.VERSE (e.g. JHN.3.16).");

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

internal sealed class CreateNoteCommandHandler(IVerseNoteRepository noteRepository)
    : IRequestHandler<CreateNoteCommand, Result<NoteDto>>
{
    public async Task<Result<NoteDto>> Handle(CreateNoteCommand request, CancellationToken ct)
    {
        if (!Core.ValueObjects.VerseRef.TryParse(request.VerseRef, out var verseRef))
            return Error.Validation(
                "Notes.InvalidVerseRef",
                $"'{request.VerseRef}' is not a valid verse reference. Expected format: BOOK.CHAPTER.VERSE"
            );

        var noteResult = VerseNote.Create(
            request.UserId,
            verseRef,
            request.Content,
            request.Tags,
            request.IsShared
        );

        if (noteResult.IsFailure)
            return noteResult.Error;

        await noteRepository.AddAsync(noteResult.Value, ct);
        return MapToDto(noteResult.Value);
    }

    internal static NoteDto MapToDto(VerseNote note) =>
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
