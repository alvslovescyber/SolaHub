using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;

namespace SolaHub.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public sealed class AdminController(IAdminService adminService) : ControllerBase
{
    private const int MaxPageSize = 100;

    /// <summary>Paginated, searchable list of all registered users.</summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(AdminUsersResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        CancellationToken ct = default
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);
        var result = await adminService.GetUsersAsync(page, pageSize, search, role, ct);
        return Ok(result);
    }

    /// <summary>Update a user's role or active status.</summary>
    [HttpPatch("users/{id:guid}")]
    [ProducesResponseType(typeof(AdminUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUser(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken ct = default
    )
    {
        var result = await adminService.UpdateUserAsync(id, request, ct);
        return result is null ? NotFound() : Ok(result);
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
