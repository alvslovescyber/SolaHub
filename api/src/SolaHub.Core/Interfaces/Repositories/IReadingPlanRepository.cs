using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Interfaces.Repositories;

public interface IReadingPlanRepository
{
    Task<ReadingPlan?> GetByIdAsync(ReadingPlanId id, CancellationToken ct = default);
    Task<IReadOnlyList<ReadingPlan>> GetByUserAsync(UserId userId, CancellationToken ct = default);
    Task<IReadOnlyList<ReadingPlan>> GetByChurchAsync(
        ChurchId churchId,
        CancellationToken ct = default
    );

    /// <summary>
    /// Lightweight participant check (no aggregate load) used by the realtime hub
    /// to authorize per-plan operations without re-fetching the full plan tree.
    /// </summary>
    Task<bool> IsParticipantAsync(
        ReadingPlanId planId,
        UserId userId,
        CancellationToken ct = default
    );

    Task AdvanceParticipantProgressAsync(
        ReadingPlanId planId,
        UserId userId,
        int dayNumber,
        CancellationToken ct = default
    );

    Task AddAsync(ReadingPlan plan, CancellationToken ct = default);
    Task UpdateAsync(ReadingPlan plan, CancellationToken ct = default);
    Task DeleteAsync(ReadingPlanId id, CancellationToken ct = default);
}
