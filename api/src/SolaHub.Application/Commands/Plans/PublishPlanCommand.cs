using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Plans;

public sealed record PublishPlanCommand(ReadingPlanId PlanId, UserId RequestingUserId)
    : ICommand<ReadingPlanDto>;

internal sealed class PublishPlanCommandHandler(IReadingPlanRepository planRepository)
    : IRequestHandler<PublishPlanCommand, Result<ReadingPlanDto>>
{
    public async Task<Result<ReadingPlanDto>> Handle(
        PublishPlanCommand request,
        CancellationToken ct
    )
    {
        var plan = await planRepository.GetByIdAsync(request.PlanId, ct);
        if (plan is null)
            return Error.NotFound("Plans.NotFound", $"Plan {request.PlanId.Value} was not found.");

        if (plan.CreatedBy != request.RequestingUserId)
            return Error.Forbidden(
                "Plans.Forbidden",
                "Only the plan creator can publish this plan."
            );

        var publishResult = plan.Publish();
        if (publishResult.IsFailure)
            return publishResult.Error;

        await planRepository.UpdateAsync(plan, ct);
        return ReadingPlanMapper.ToDto(plan);
    }
}
