using SolaHub.Application.DTOs;
using SolaHub.Core.Entities;

namespace SolaHub.Application.Mappers;

/// <summary>
/// Maps <see cref="ReadingPlan"/> domain aggregates to API-facing
/// <see cref="ReadingPlanDto"/>s. Centralised here so commands and queries
/// don't reach into each other's handlers for shared projections.
/// </summary>
internal static class ReadingPlanMapper
{
    /// <summary>Map without enriched participant display names (display name will be empty string).</summary>
    public static ReadingPlanDto ToDto(ReadingPlan plan) => ToDto(plan, null);

    /// <summary>Map with an optional dictionary of UserId → DisplayName for participant enrichment.</summary>
    public static ReadingPlanDto ToDto(
        ReadingPlan plan,
        IReadOnlyDictionary<Guid, string>? displayNames
    ) =>
        new(
            plan.Id.Value,
            plan.Title,
            plan.Description,
            plan.Status.ToString(),
            plan.IsPublic,
            plan.CreatedBy.Value,
            plan.CreatedAt,
            plan.Days.Select(d => new PlanDayDto(
                    d.DayNumber,
                    d.Title,
                    d.VerseRefs.Select(v => v.Key).ToList()
                ))
                .ToList(),
            plan.Participants.Select(p => new PlanParticipantDto(
                    p.UserId.Value,
                    displayNames?.GetValueOrDefault(p.UserId.Value) ?? string.Empty,
                    p.CurrentDay,
                    p.JoinedAt
                ))
                .ToList()
        );
}
