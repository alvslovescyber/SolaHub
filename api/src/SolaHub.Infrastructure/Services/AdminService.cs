using Microsoft.EntityFrameworkCore;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Core.Enums;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure.Persistence;

namespace SolaHub.Infrastructure.Services;

public sealed class AdminService(AppDbContext db) : IAdminService
{
    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default)
    {
        var totalUsers = await db.Users.AsNoTracking().CountAsync(ct);
        var activeUsers = await db.Users.AsNoTracking().CountAsync(u => u.IsActive, ct);
        var adminUsers = await db
            .Users.AsNoTracking()
            .CountAsync(u => u.Role == UserRole.Admin, ct);
        var totalNotes = await db.VerseNotes.AsNoTracking().CountAsync(ct);
        var totalPlans = await db.ReadingPlans.AsNoTracking().CountAsync(ct);
        var totalChurches = await db.Churches.AsNoTracking().CountAsync(ct);
        var totalPosts = await db.CommunityPosts.AsNoTracking().CountAsync(ct);

        return new AdminStatsDto(
            totalUsers,
            activeUsers,
            adminUsers,
            totalNotes,
            totalPlans,
            totalChurches,
            totalPosts
        );
    }

    public async Task<AdminUsersResponse> GetUsersAsync(
        int page,
        int pageSize,
        string? search,
        string? role,
        CancellationToken ct = default
    )
    {
        var query = db.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                u.DisplayName.ToLower().Contains(term) || u.Email.Value.ToLower().Contains(term)
            );
        }

        if (
            !string.IsNullOrWhiteSpace(role)
            && Enum.TryParse<UserRole>(role, ignoreCase: true, out var roleEnum)
        )
        {
            query = query.Where(u => u.Role == roleEnum);
        }

        var total = await query.CountAsync(ct);
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var dtos = users
            .Select(u => new AdminUserDto(
                u.Id.Value,
                u.DisplayName,
                u.Email.Value,
                u.Role.ToString(),
                u.IsActive,
                u.IsEmailVerified,
                u.ChurchId?.Value,
                u.CreatedAt,
                u.LastLoginAt
            ))
            .ToList();

        return new AdminUsersResponse(dtos, total, page, pageSize);
    }

    public async Task<AdminUserDto?> UpdateUserAsync(
        Guid id,
        UpdateUserRequest request,
        CancellationToken ct = default
    )
    {
        var userId = new UserId(id);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
            return null;

        if (
            request.Role is not null
            && Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var roleEnum)
        )
        {
            user.UpdateRole(roleEnum);
        }

        if (request.IsActive is true)
            user.Activate();
        else if (request.IsActive is false)
            user.Deactivate();

        await db.SaveChangesAsync(ct);

        return new AdminUserDto(
            user.Id.Value,
            user.DisplayName,
            user.Email.Value,
            user.Role.ToString(),
            user.IsActive,
            user.IsEmailVerified,
            user.ChurchId?.Value,
            user.CreatedAt,
            user.LastLoginAt
        );
    }
}
