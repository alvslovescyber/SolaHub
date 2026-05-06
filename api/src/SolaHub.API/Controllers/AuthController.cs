using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SolaHub.API.Extensions;
using SolaHub.Application.Commands.Auth;
using SolaHub.Application.DTOs;
using SolaHub.Core.Common;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure.Auth;

namespace SolaHub.API.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    ISender sender,
    IWebHostEnvironment env,
    IOptions<JwtOptions> jwtOptions
) : ControllerBase
{
    private const string RefreshTokenCookieName = "solahub_refresh";

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
            value =>
            {
                SetRefreshTokenCookie(value.RefreshToken);
                return CreatedAtAction(nameof(Register), value);
            },
            error =>
                error.Type switch
                {
                    ErrorType.Conflict => Conflict(new { error.Code, error.Description }),
                    ErrorType.Validation => UnprocessableEntity(
                        new { error.Code, error.Description }
                    ),
                    _ => StatusCode(
                        StatusCodes.Status500InternalServerError,
                        new { error.Code, error.Description }
                    ),
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
            value =>
            {
                SetRefreshTokenCookie(value.RefreshToken);
                return Ok(value);
            },
            error =>
                error.Type switch
                {
                    ErrorType.Unauthorized => Unauthorized(new { error.Code, error.Description }),
                    _ => StatusCode(
                        StatusCodes.Status500InternalServerError,
                        new { error.Code, error.Description }
                    ),
                }
        );
    }

    /// <summary>Rotate access + refresh token pair.</summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshTokenRequest? request,
        CancellationToken ct
    )
    {
        var refreshToken = ResolveRefreshToken(request);
        if (string.IsNullOrWhiteSpace(refreshToken))
            return Unauthorized(
                new { Code = "Auth.InvalidToken", Description = "Missing refresh token." }
            );

        var command = new RefreshTokenCommand(refreshToken);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            value =>
            {
                SetRefreshTokenCookie(value.RefreshToken);
                return Ok(value);
            },
            error =>
            {
                ClearRefreshTokenCookie();
                return Unauthorized(new { error.Code, error.Description });
            }
        );
    }

    /// <summary>Revoke the current user's refresh token (logout).</summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout(
        [FromBody] RefreshTokenRequest? request,
        CancellationToken ct
    )
    {
        var refreshToken = ResolveRefreshToken(request);
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            ClearRefreshTokenCookie();
            return NoContent();
        }

        var userId = User.GetRequiredUserId();
        var command = new RevokeTokenCommand(userId, refreshToken);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            () =>
            {
                ClearRefreshTokenCookie();
                return NoContent();
            },
            error =>
                error.Type switch
                {
                    ErrorType.Forbidden => Forbid(),
                    ErrorType.Unauthorized => Unauthorized(new { error.Code, error.Description }),
                    ErrorType.Validation => UnprocessableEntity(
                        new { error.Code, error.Description }
                    ),
                    _ => StatusCode(
                        StatusCodes.Status500InternalServerError,
                        new { error.Code, error.Description }
                    ),
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
        var command = new ChangePasswordCommand(
            userId,
            request.CurrentPassword,
            request.NewPassword
        );
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            () =>
            {
                ClearRefreshTokenCookie();
                return NoContent();
            },
            error =>
                error.Type switch
                {
                    ErrorType.Unauthorized => Unauthorized(new { error.Code, error.Description }),
                    ErrorType.NotFound => NotFound(new { error.Code, error.Description }),
                    ErrorType.Validation => UnprocessableEntity(
                        new { error.Code, error.Description }
                    ),
                    _ => StatusCode(
                        StatusCodes.Status500InternalServerError,
                        new { error.Code, error.Description }
                    ),
                }
        );
    }

    private string? ResolveRefreshToken(RefreshTokenRequest? request) =>
        !string.IsNullOrWhiteSpace(request?.RefreshToken) ? request.RefreshToken
        : Request.Cookies.TryGetValue(RefreshTokenCookieName, out var cookieToken) ? cookieToken
        : null;

    private void SetRefreshTokenCookie(string refreshToken)
    {
        Response.Cookies.Append(
            RefreshTokenCookieName,
            refreshToken,
            BuildRefreshCookieOptions(
                DateTimeOffset.UtcNow.Add(jwtOptions.Value.RefreshTokenExpiry)
            )
        );
    }

    private void ClearRefreshTokenCookie() =>
        Response.Cookies.Delete(
            RefreshTokenCookieName,
            BuildRefreshCookieOptions(DateTimeOffset.UnixEpoch)
        );

    private CookieOptions BuildRefreshCookieOptions(DateTimeOffset expires)
    {
        var isLocal = env.IsDevelopment() || env.IsEnvironment("Test");
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = !isLocal,
            SameSite = isLocal ? SameSiteMode.Lax : SameSiteMode.None,
            Path = "/api/auth",
            Expires = expires,
        };
    }
}

// ─── Request records ───────────────────────────────────────────────────────────
public sealed record RegisterRequest(string Email, string Password, string DisplayName);

public sealed record LoginRequest(string Email, string Password);

public sealed record RefreshTokenRequest(string? RefreshToken = null);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
