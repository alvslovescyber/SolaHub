using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Enums;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Plans;

public sealed record JoinPlanCommand(ReadingPlanId PlanId, UserId UserId) : ICommand;

internal sealed class JoinPlanCommandHandler(IReadingPlanRepository planRepository)
    : IRequestHandler<JoinPlanCommand, Result>
{
    public async Task<Result> Handle(JoinPlanCommand request, CancellationToken ct)
    {
        var plan = await planRepository.GetByIdAsync(request.PlanId, ct);
        if (plan is null)
            return Error.NotFound("Plans.NotFound", $"Plan {request.PlanId.Value} was not found.");

        if (!plan.IsPublic)
            return Error.Forbidden(
                "Plans.PrivatePlan",
                "This plan is private. You cannot join without an invitation."
            );

        if (plan.Status != PlanStatus.Active)
            return Error.Conflict("Plans.NotActive", "Only active plans can be joined.");

        var addResult = plan.AddParticipant(request.UserId);
        if (addResult.IsFailure)
            return addResult.Error;

        await planRepository.UpdateAsync(plan, ct);
        return Result.Success();
    }
}
