using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolaHub.Application.Commands.Plans;
using SolaHub.Application.DTOs;
using SolaHub.Application.Queries.Plans;
using SolaHub.Core.Common;
using SolaHub.Core.ValueObjects;

namespace SolaHub.API.Controllers;

[ApiController]
[Route("api/plans")]
[Authorize]
public sealed class PlansController(ISender sender) : ControllerBase
{
    private UserId CurrentUserId =>
        UserId.From(Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!));

    /// <summary>Get all reading plans the authenticated user is part of.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ReadingPlanDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyPlans(CancellationToken ct)
    {
        var query = new GetUserPlansQuery(CurrentUserId);
        var result = await sender.Send(query, ct);
        return result.Match<IActionResult>(
            Ok,
            error => StatusCode(500, new { error.Code, error.Description })
        );
    }

    /// <summary>Get a single reading plan by ID.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ReadingPlanDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPlan([FromRoute] Guid id, CancellationToken ct)
    {
        var query = new GetPlanByIdQuery(ReadingPlanId.From(id), CurrentUserId);
        var result = await sender.Send(query, ct);

        return result.Match<IActionResult>(
            Ok,
            error =>
                error.Type switch
                {
                    ErrorType.NotFound => NotFound(new { error.Code, error.Description }),
                    ErrorType.Forbidden => Forbid(),
                    _ => StatusCode(500, new { error.Code, error.Description }),
                }
        );
    }

    /// <summary>Create a new reading plan.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ReadingPlanDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CreatePlan(
        [FromBody] CreatePlanRequest request,
        CancellationToken ct
    )
    {
        var command = new CreatePlanCommand(
            CurrentUserId,
            request.Title,
            request.Description,
            request.IsPublic
        );
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            value => CreatedAtAction(nameof(GetPlan), new { id = value.Id }, value),
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

    /// <summary>Join a public reading plan.</summary>
    [HttpPost("{id:guid}/join")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> JoinPlan([FromRoute] Guid id, CancellationToken ct)
    {
        var command = new JoinPlanCommand(ReadingPlanId.From(id), CurrentUserId);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            () => NoContent(),
            error =>
                error.Type switch
                {
                    ErrorType.NotFound => NotFound(new { error.Code, error.Description }),
                    ErrorType.Conflict => Conflict(new { error.Code, error.Description }),
                    _ => StatusCode(500, new { error.Code, error.Description }),
                }
        );
    }

    /// <summary>Record progress for the current day in a reading plan.</summary>
    [HttpPost("{id:guid}/progress")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RecordProgress(
        [FromRoute] Guid id,
        [FromBody] RecordProgressRequest request,
        CancellationToken ct
    )
    {
        var command = new RecordProgressCommand(
            ReadingPlanId.From(id),
            CurrentUserId,
            request.DayNumber
        );
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

    /// <summary>Delete a reading plan (creator only).</summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePlan([FromRoute] Guid id, CancellationToken ct)
    {
        var command = new DeletePlanCommand(ReadingPlanId.From(id), CurrentUserId);
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
public sealed record CreatePlanRequest(string Title, string? Description, bool IsPublic);

public sealed record RecordProgressRequest(int DayNumber);
