using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Plans;

public sealed record RecordProgressCommand(ReadingPlanId PlanId, UserId UserId, int DayNumber)
    : ICommand;

internal sealed class RecordProgressCommandHandler(IReadingPlanRepository planRepository)
    : IRequestHandler<RecordProgressCommand, Result>
{
    public async Task<Result> Handle(RecordProgressCommand request, CancellationToken ct)
    {
        var plan = await planRepository.GetByIdAsync(request.PlanId, ct);
        if (plan is null)
            return Error.NotFound("Plans.NotFound", $"Plan {request.PlanId.Value} was not found.");

        var progressResult = plan.RecordProgress(request.UserId, request.DayNumber);
        if (progressResult.IsFailure)
            return progressResult.Error;

        await planRepository.UpdateAsync(plan, ct);
        return Result.Success();
    }
}
