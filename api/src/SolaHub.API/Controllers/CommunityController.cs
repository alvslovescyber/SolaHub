using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolaHub.API.Extensions;
using SolaHub.Application.Commands.Community;
using SolaHub.Application.DTOs;
using SolaHub.Application.Queries.Community;
using SolaHub.Core.Common;
using SolaHub.Core.ValueObjects;

namespace SolaHub.API.Controllers;

[ApiController]
[Route("api/community")]
[Authorize]
[RequestSizeLimit(512_000)]
public sealed class CommunityController(ISender sender) : ControllerBase
{
    private UserId CurrentUserId => User.GetRequiredUserId();

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CommunityPostDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetFeed(
        [FromQuery] string feed = "everyone",
        [FromQuery] int take = 30,
        [FromQuery] DateTimeOffset? before = null,
        CancellationToken ct = default
    )
    {
        var query = new GetCommunityFeedQuery(CurrentUserId, feed, take, before);
        var result = await sender.Send(query, ct);

        return result.Match<IActionResult>(
            Ok,
            error =>
                error.Type switch
                {
                    ErrorType.Validation => BadRequest(new { error.Code, error.Description }),
                    _ => StatusCode(500, new { error.Code, error.Description }),
                }
        );
    }

    [HttpPost]
    [ProducesResponseType(typeof(CommunityPostDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create(
        [FromBody] UpsertCommunityPostRequest request,
        CancellationToken ct
    )
    {
        var command = new CreateCommunityPostCommand(
            CurrentUserId,
            request.Kind,
            request.Visibility,
            request.Title,
            request.Body,
            request.VerseRef,
            request.Tags ?? [],
            request.Deck?.GetRawText()
        );
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            value => CreatedAtAction(nameof(GetFeed), new { feed = "mine" }, value),
            error => MapWriteError(error)
        );
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CommunityPostDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Update(
        [FromRoute] Guid id,
        [FromBody] UpsertCommunityPostRequest request,
        CancellationToken ct
    )
    {
        var command = new UpdateCommunityPostCommand(
            CommunityPostId.From(id),
            CurrentUserId,
            request.Kind,
            request.Visibility,
            request.Title,
            request.Body,
            request.VerseRef,
            request.Tags ?? [],
            request.Deck?.GetRawText()
        );
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(Ok, MapWriteError);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
    {
        var command = new DeleteCommunityPostCommand(CommunityPostId.From(id), CurrentUserId);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(() => NoContent(), MapWriteError);
    }

    [HttpPost("{id:guid}/reports")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Report(
        [FromRoute] Guid id,
        [FromBody] ReportCommunityPostRequest request,
        CancellationToken ct
    )
    {
        var command = new ReportCommunityPostCommand(
            CommunityPostId.From(id),
            CurrentUserId,
            request.Reason
        );
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(() => NoContent(), MapWriteError);
    }

    private IActionResult MapWriteError(Error error) =>
        error.Type switch
        {
            ErrorType.Validation => UnprocessableEntity(new { error.Code, error.Description }),
            ErrorType.NotFound => NotFound(new { error.Code, error.Description }),
            ErrorType.Forbidden => Forbid(),
            ErrorType.Conflict => Conflict(new { error.Code, error.Description }),
            ErrorType.Unauthorized => Unauthorized(new { error.Code, error.Description }),
            _ => StatusCode(500, new { error.Code, error.Description }),
        };
}

public sealed record UpsertCommunityPostRequest(
    string Kind,
    string Visibility,
    string? Title,
    string? Body,
    string? VerseRef,
    IReadOnlyList<string>? Tags,
    JsonElement? Deck
);

public sealed record ReportCommunityPostRequest(string? Reason);
