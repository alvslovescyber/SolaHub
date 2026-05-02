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
        // Read-only list — include owned collections so the DTO mapper has full data,
        // and use AsNoTracking since we never mutate these entities here.
        var plans = await db
            .ReadingPlans.AsNoTracking()
            .Include(p => p.Days)
            .Include(p => p.Participants)
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
            .ReadingPlans.AsNoTracking()
            .Include(p => p.Days)
            .Include(p => p.Participants)
            .Where(p => p.ChurchId == churchId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
        return plans.AsReadOnly();
    }

    public async Task<bool> IsParticipantAsync(
        ReadingPlanId planId,
        UserId userId,
        CancellationToken ct
    )
    {
        // Cheap presence check — avoids loading the full aggregate just to authorize hub calls.
        return await db
            .ReadingPlans.AsNoTracking()
            .AnyAsync(p => p.Id == planId && p.Participants.Any(pp => pp.UserId == userId), ct);
    }

    public async Task AddAsync(ReadingPlan plan, CancellationToken ct)
    {
        await db.ReadingPlans.AddAsync(plan, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(ReadingPlan plan, CancellationToken ct)
    {
        // Re-attach if this came in detached (rare — usually GetById tracks it).
        if (db.Entry(plan).State == EntityState.Detached)
            db.ReadingPlans.Update(plan);

        // EF Core's snapshot change tracking treats newly-added owned entities with
        // explicit/natural primary keys (e.g. ReadingPlanDay.DayNumber) as Modified
        // because the key is non-default. That generates UPDATE for rows that don't
        // exist yet → DbUpdateConcurrencyException. Walk the owned collections and
        // promote Modified entries that aren't actually in the DB to Added.
        db.ChangeTracker.DetectChanges();

        var planEntry = db.Entry(plan);
        foreach (var collection in planEntry.Collections)
        {
            if (collection.CurrentValue is null)
                continue;
            foreach (var item in collection.CurrentValue)
            {
                if (item is null)
                    continue;
                var entry = db.Entry(item);
                Console.WriteLine(
                    $"[DBG2] {entry.Entity.GetType().Name} state={entry.State} props_modified=["
                        + string.Join(
                            ",",
                            entry.Properties.Select(p =>
                                p.IsModified ? p.Metadata.Name + "*" : p.Metadata.Name
                            )
                        )
                        + "]"
                );
                if (entry.State == EntityState.Modified && !entry.Properties.Any(p => p.IsModified))
                {
                    Console.WriteLine($"[DBG2] -> promoting to Added");
                    entry.State = EntityState.Added;
                }
            }
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(ReadingPlanId id, CancellationToken ct)
    {
        await db.ReadingPlans.Where(p => p.Id == id).ExecuteDeleteAsync(ct);
    }
}
