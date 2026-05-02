using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Plans;

public sealed record ArchivePlanCommand(ReadingPlanId PlanId, UserId RequestingUserId)
    : ICommand<ReadingPlanDto>;

internal sealed class ArchivePlanCommandHandler(IReadingPlanRepository planRepository)
    : IRequestHandler<ArchivePlanCommand, Result<ReadingPlanDto>>
{
    public async Task<Result<ReadingPlanDto>> Handle(
        ArchivePlanCommand request,
        CancellationToken ct
    )
    {
        var plan = await planRepository.GetByIdAsync(request.PlanId, ct);
        if (plan is null)
            return Error.NotFound("Plans.NotFound", $"Plan {request.PlanId.Value} was not found.");

        if (plan.CreatedBy != request.RequestingUserId)
            return Error.Forbidden(
                "Plans.Forbidden",
                "Only the plan creator can archive this plan."
            );

        var archiveResult = plan.Archive();
        if (archiveResult.IsFailure)
            return archiveResult.Error;

        await planRepository.UpdateAsync(plan, ct);
        return ReadingPlanMapper.ToDto(plan);
    }
}
