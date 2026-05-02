using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolaHub.API.Extensions;
using SolaHub.Application.Commands.Notes;
using SolaHub.Application.DTOs;
using SolaHub.Application.Queries.Notes;
using SolaHub.Core.Common;
using SolaHub.Core.ValueObjects;

namespace SolaHub.API.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize]
public sealed class NotesController(ISender sender) : ControllerBase
{
    private UserId CurrentUserId => User.GetRequiredUserId();

    /// <summary>Get all notes for the authenticated user.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<NoteDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyNotes(CancellationToken ct)
    {
        var query = new GetUserNotesQuery(CurrentUserId);
        var result = await sender.Send(query, ct);

        return result.Match<IActionResult>(
            value => Ok(value),
            error => StatusCode(500, new { error.Code, error.Description })
        );
    }

    /// <summary>Get notes for a specific Bible verse, optionally filtered to shared only.</summary>
    [HttpGet("verse/{verseRef}")]
    [ProducesResponseType(typeof(IReadOnlyList<NoteDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetVerseNotes(
        [FromRoute] string verseRef,
        [FromQuery] bool sharedOnly = false,
        CancellationToken ct = default
    )
    {
        var query = new GetVerseNotesQuery(CurrentUserId, verseRef, sharedOnly);
        var result = await sender.Send(query, ct);

        return result.Match<IActionResult>(
            value => Ok(value),
            error =>
                error.Type switch
                {
                    ErrorType.Validation => BadRequest(new { error.Code, error.Description }),
                    _ => StatusCode(500, new { error.Code, error.Description }),
                }
        );
    }

    /// <summary>Create a new verse note.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(NoteDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CreateNote(
        [FromBody] CreateNoteRequest request,
        CancellationToken ct
    )
    {
        var command = new CreateNoteCommand(
            CurrentUserId,
            request.VerseRef,
            request.Content,
            request.Tags ?? [],
            request.IsShared
        );
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            value => CreatedAtAction(nameof(GetMyNotes), value),
            error =>
                error.Type switch
                {
                    ErrorType.Validation => UnprocessableEntity(
                        new { error.Code, error.Description }
                    ),
                    _ => StatusCode(500, new { error.Code, error.Description }),
                }
        );
    }

    /// <summary>Update an existing note (owner only).</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(NoteDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateNote(
        [FromRoute] Guid id,
        [FromBody] UpdateNoteRequest request,
        CancellationToken ct
    )
    {
        var command = new UpdateNoteCommand(
            VerseNoteId.From(id),
            CurrentUserId,
            request.Content,
            request.Tags ?? [],
            request.IsShared
        );
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            value => Ok(value),
            error =>
                error.Type switch
                {
                    ErrorType.NotFound => NotFound(new { error.Code, error.Description }),
                    ErrorType.Forbidden => Forbid(),
                    ErrorType.Validation => UnprocessableEntity(
                        new { error.Code, error.Description }
                    ),
                    _ => StatusCode(500, new { error.Code, error.Description }),
                }
        );
    }

    /// <summary>Delete a note (owner only).</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteNote([FromRoute] Guid id, CancellationToken ct)
    {
        var command = new DeleteNoteCommand(VerseNoteId.From(id), CurrentUserId);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            () => NoContent(),
            error =>
                error.Type switch
                {
                    ErrorType.NotFound => NotFound(new { error.Code, error.Description }),
                    ErrorType.Forbidden => Forbid(),
                    _ => StatusCode(500, new { error.Code, error.Description }),
                }
        );
    }
}

// ─── Request records ───────────────────────────────────────────────────────────
public sealed record CreateNoteRequest(
    string VerseRef,
    string Content,
    IReadOnlyList<string>? Tags,
    bool IsShared
);

public sealed record UpdateNoteRequest(string Content, IReadOnlyList<string>? Tags, bool IsShared);
