using Microsoft.EntityFrameworkCore;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure.Persistence;

namespace SolaHub.Infrastructure.Repositories;

public sealed class ReadingPlanRepository(AppDbContext db) : IReadingPlanRepository
{
    public Task<ReadingPlan?> GetByIdAsync(ReadingPlanId id, CancellationToken ct) =>
        db
            .ReadingPlans.Include(p => p.Days)
            .Include(p => p.Participants)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<IReadOnlyList<ReadingPlan>> GetByUserAsync(
        UserId userId,
        CancellationToken ct
    )
    {
        var plans = await db
            .ReadingPlans.Include(p => p.Participants)
            .Where(p => p.CreatedBy == userId || p.Participants.Any(pp => pp.UserId == userId))
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
        return plans.AsReadOnly();
    }

    public async Task<IReadOnlyList<ReadingPlan>> GetByChurchAsync(
        ChurchId churchId,
        CancellationToken ct
    )
    {
        var plans = await db
            .ReadingPlans.Where(p => p.ChurchId == churchId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
        return plans.AsReadOnly();
    }

    public async Task AddAsync(ReadingPlan plan, CancellationToken ct)
    {
        await db.ReadingPlans.AddAsync(plan, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(ReadingPlan plan, CancellationToken ct)
    {
        db.ReadingPlans.Update(plan);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(ReadingPlanId id, CancellationToken ct)
    {
        await db.ReadingPlans.Where(p => p.Id == id).ExecuteDeleteAsync(ct);
    }
}
