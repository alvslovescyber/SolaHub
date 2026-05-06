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
            .ReadingPlans.AsSplitQuery()
            .Include(p => p.Days)
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
            .AsSplitQuery()
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
            .AsSplitQuery()
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

    public async Task AdvanceParticipantProgressAsync(
        ReadingPlanId planId,
        UserId userId,
        int dayNumber,
        CancellationToken ct = default
    )
    {
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE plan_participants
            SET current_day = GREATEST(current_day, {dayNumber})
            WHERE plan_id = {planId.Value}
              AND user_id = {userId.Value};
            """,
            ct
        );

        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE reading_plans
            SET updated_at = {DateTimeOffset.UtcNow}
            WHERE id = {planId.Value};
            """,
            ct
        );
    }

    public async Task<bool> TryAddParticipantAsync(
        ReadingPlanId planId,
        UserId userId,
        CancellationToken ct = default
    )
    {
        var affected = await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO plan_participants (plan_id, user_id, current_day, joined_at)
            SELECT id, {userId.Value}, 0, {DateTimeOffset.UtcNow}
            FROM reading_plans
            WHERE id = {planId.Value}
              AND is_public = true
              AND status = 'Active'
            ON CONFLICT (plan_id, user_id) DO NOTHING;
            """,
            ct
        );

        return affected == 1;
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

        // EF Core's owned-collection change tracking with natural composite keys
        // (e.g. ReadingPlanDay keyed on plan_id + DayNumber) marks newly added
        // children as Modified, because their key value is non-default and EF
        // assumes the row already exists. That issues UPDATE for a row that was
        // never inserted → DbUpdateConcurrencyException ("expected 1, affected 0").
        // Detect children that aren't in the DB yet and promote them to Added.
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
                if (entry.State != EntityState.Modified)
                    continue;
                var inDb = await entry.GetDatabaseValuesAsync(ct);
                if (inDb is null)
                    entry.State = EntityState.Added;
            }
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(ReadingPlanId id, CancellationToken ct)
    {
        await db.ReadingPlans.Where(p => p.Id == id).ExecuteDeleteAsync(ct);
    }
}
