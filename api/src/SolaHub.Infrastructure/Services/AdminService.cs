using Microsoft.EntityFrameworkCore;
using SolaHub.Application.DTOs;
using SolaHub.Application.Common;
using SolaHub.Core.Enums;
using SolaHub.Infrastructure.Persistence;

namespace SolaHub.Infrastructure.Services;

public sealed class AdminService(AppDbContext db) : IAdminService
{
    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default)
    {
        var totalUsers = await db.Users.AsNoTracking().CountAsync(ct);
        var activeUsers = await db.Users.AsNoTracking().CountAsync(u => u.IsActive, ct);
        var adminUsers = await db.Users.AsNoTracking().CountAsync(u => u.Role == UserRole.Admin, ct);
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
}
