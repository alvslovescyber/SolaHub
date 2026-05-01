using MediatR;
using SolaHub.Application.Commands.Plans;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Queries.Plans;

public sealed record GetPlanByIdQuery(ReadingPlanId PlanId, UserId RequestingUserId)
    : IQuery<ReadingPlanDto>;

internal sealed class GetPlanByIdQueryHandler(IReadingPlanRepository planRepository)
    : IRequestHandler<GetPlanByIdQuery, Result<ReadingPlanDto>>
{
    public async Task<Result<ReadingPlanDto>> Handle(GetPlanByIdQuery request, CancellationToken ct)
    {
        var plan = await planRepository.GetByIdAsync(request.PlanId, ct);
        if (plan is null)
            return Error.NotFound("Plans.NotFound", $"Plan {request.PlanId.Value} was not found.");

        // Only participants or creator can view non-public plans
        var isParticipant = plan.Participants.Any(p => p.UserId == request.RequestingUserId);
        if (!plan.IsPublic && plan.CreatedBy != request.RequestingUserId && !isParticipant)
            return Error.Forbidden("Plans.Forbidden", "You do not have access to this plan.");

        return CreatePlanCommandHandler.MapToDto(plan);
    }
}
