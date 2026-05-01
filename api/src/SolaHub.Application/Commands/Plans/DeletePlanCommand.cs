using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Plans;

public sealed record DeletePlanCommand(ReadingPlanId PlanId, UserId RequestingUserId) : ICommand;

internal sealed class DeletePlanCommandHandler(IReadingPlanRepository planRepository)
    : IRequestHandler<DeletePlanCommand, Result>
{
    public async Task<Result> Handle(DeletePlanCommand request, CancellationToken ct)
    {
        var plan = await planRepository.GetByIdAsync(request.PlanId, ct);
        if (plan is null)
            return Error.NotFound("Plans.NotFound", $"Plan {request.PlanId.Value} was not found.");

        if (plan.CreatedBy != request.RequestingUserId)
            return Error.Forbidden("Plans.Forbidden", "Only the plan creator can delete this plan.");

        await planRepository.DeleteAsync(request.PlanId, ct);
        return Result.Success();
    }
}
