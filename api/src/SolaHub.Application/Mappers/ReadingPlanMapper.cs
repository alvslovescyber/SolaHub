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
    public static ReadingPlanDto ToDto(ReadingPlan plan) =>
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
                    p.CurrentDay,
                    p.JoinedAt
                ))
                .ToList()
        );
}
