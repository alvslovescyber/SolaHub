using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolaHub.API.Extensions;
using SolaHub.Application.Commands.Auth;
using SolaHub.Application.DTOs;
using SolaHub.Core.Common;
using SolaHub.Core.ValueObjects;

namespace SolaHub.API.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(ISender sender) : ControllerBase
{
    /// <summary>Register a new user account.</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request,
        CancellationToken ct
    )
    {
        var command = new RegisterCommand(request.Email, request.Password, request.DisplayName);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            value => CreatedAtAction(nameof(Register), value),
            error =>
                error.Type switch
                {
                    ErrorType.Conflict => Conflict(new { error.Code, error.Description }),
                    ErrorType.Validation => UnprocessableEntity(new { error.Code, error.Description }),
                    _ => StatusCode(StatusCodes.Status500InternalServerError, new { error.Code, error.Description }),
                }
        );
    }

    /// <summary>Authenticate and obtain token pair.</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var command = new LoginCommand(request.Email, request.Password);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            value => Ok(value),
            error =>
                error.Type switch
                {
                    ErrorType.Unauthorized => Unauthorized(new { error.Code, error.Description }),
                    _ => StatusCode(StatusCodes.Status500InternalServerError, new { error.Code, error.Description }),
                }
        );
    }

    /// <summary>Rotate access + refresh token pair.</summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshTokenRequest request,
        CancellationToken ct
    )
    {
        var command = new RefreshTokenCommand(request.RefreshToken);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            value => Ok(value),
            error => Unauthorized(new { error.Code, error.Description })
        );
    }

    /// <summary>Revoke the current user's refresh token (logout).</summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout(
        [FromBody] RefreshTokenRequest request,
        CancellationToken ct
    )
    {
        var userId = User.GetRequiredUserId();
        var command = new RevokeTokenCommand(userId, request.RefreshToken);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            () => NoContent(),
            error =>
                error.Type switch
                {
                    ErrorType.Forbidden => Forbid(),
                    ErrorType.Unauthorized => Unauthorized(new { error.Code, error.Description }),
                    ErrorType.Validation => UnprocessableEntity(new { error.Code, error.Description }),
                    _ => StatusCode(StatusCodes.Status500InternalServerError, new { error.Code, error.Description }),
                }
        );
    }

    /// <summary>Change the authenticated user's password. Revokes all active sessions on success.</summary>
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken ct
    )
    {
        var userId = User.GetRequiredUserId();
        var command = new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            () => NoContent(),
            error =>
                error.Type switch
                {
                    ErrorType.Unauthorized => Unauthorized(new { error.Code, error.Description }),
                    ErrorType.NotFound => NotFound(new { error.Code, error.Description }),
                    ErrorType.Validation => UnprocessableEntity(new { error.Code, error.Description }),
                    _ => StatusCode(StatusCodes.Status500InternalServerError, new { error.Code, error.Description }),
                }
        );
    }
}

// ─── Request records ───────────────────────────────────────────────────────────
public sealed record RegisterRequest(string Email, string Password, string DisplayName);

public sealed record LoginRequest(string Email, string Password);

public sealed record RefreshTokenRequest(string RefreshToken);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
