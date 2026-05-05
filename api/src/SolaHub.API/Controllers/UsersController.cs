using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolaHub.API.Extensions;
using SolaHub.Application.Commands.Users;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;

namespace SolaHub.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UsersController(ISender sender, IUserRepository userRepository) : ControllerBase
{
    /// <summary>Get the authenticated user's profile.</summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMe(CancellationToken ct)
    {
        var userId = User.GetRequiredUserId();
        var user = await userRepository.GetByIdAsync(userId, ct);
        if (user is null)
            return NotFound(new { Code = "Users.NotFound", Description = "User not found." });
        return Ok(UserMapper.ToDto(user));
    }

    /// <summary>Update the authenticated user's display name.</summary>
    [HttpPut("me")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> UpdateProfile(
        [FromBody] UpdateProfileRequest request,
        CancellationToken ct
    )
    {
        var userId = User.GetRequiredUserId();
        var command = new UpdateProfileCommand(userId, request.DisplayName);
        var result = await sender.Send(command, ct);

        return result.Match<IActionResult>(
            Ok,
            error =>
                error.Type switch
                {
                    ErrorType.NotFound => NotFound(new { error.Code, error.Description }),
                    ErrorType.Validation => UnprocessableEntity(
                        new { error.Code, error.Description }
                    ),
                    ErrorType.Conflict => Conflict(new { error.Code, error.Description }),
                    _ => StatusCode(500, new { error.Code, error.Description }),
                }
        );
    }
}

public sealed record UpdateProfileRequest(string DisplayName);
