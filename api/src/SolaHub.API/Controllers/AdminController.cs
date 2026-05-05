using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolaHub.Application.DTOs;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Application.Common;

namespace SolaHub.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public sealed class AdminController(
    IUserRepository userRepository,
    IAdminService adminService
) : ControllerBase
{
    private const int MaxPageSize = 100;

    /// <summary>Paginated list of all registered users.</summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(AdminUsersResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var total = await userRepository.CountAsync(ct);
        var skip = (page - 1) * pageSize;
        var users = await userRepository.GetAllAsync(skip, pageSize, ct);

        var dtos = users.Select(u => new AdminUserDto(
            u.Id.Value,
            u.DisplayName,
            u.Email.Value,
            u.Role.ToString(),
            u.IsActive,
            u.IsEmailVerified,
            u.ChurchId?.Value,
            u.CreatedAt,
            u.LastLoginAt
        )).ToList();

        return Ok(new AdminUsersResponse(dtos, total, page, pageSize));
    }

    /// <summary>Aggregate statistics across the platform.</summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(AdminStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken ct = default)
    {
        var stats = await adminService.GetStatsAsync(ct);
        return Ok(stats);
    }
}
