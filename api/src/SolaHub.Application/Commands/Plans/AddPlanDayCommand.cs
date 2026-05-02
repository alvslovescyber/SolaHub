using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Plans;

public sealed record AddPlanDayCommand(
    ReadingPlanId PlanId,
    UserId RequestingUserId,
    int DayNumber,
    string Title,
    IReadOnlyList<string> VerseRefKeys
) : ICommand<ReadingPlanDto>;

public sealed class AddPlanDayCommandValidator : AbstractValidator<AddPlanDayCommand>
{
    public AddPlanDayCommandValidator()
    {
        RuleFor(x => x.DayNumber).GreaterThan(0).WithMessage("Day number must be positive.");

        RuleFor(x => x.Title)
            .NotEmpty()
            .MaximumLength(200)
            .WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.VerseRefKeys)
            .NotEmpty()
            .WithMessage("At least one verse reference is required.");
    }
}

internal sealed class AddPlanDayCommandHandler(IReadingPlanRepository planRepository)
    : IRequestHandler<AddPlanDayCommand, Result<ReadingPlanDto>>
{
    public async Task<Result<ReadingPlanDto>> Handle(
        AddPlanDayCommand request,
        CancellationToken ct
    )
    {
        var plan = await planRepository.GetByIdAsync(request.PlanId, ct);
        if (plan is null)
            return Error.NotFound("Plans.NotFound", $"Plan {request.PlanId.Value} was not found.");

        if (plan.CreatedBy != request.RequestingUserId)
            return Error.Forbidden("Plans.Forbidden", "Only the plan creator can edit this plan.");

        var verseRefs = new List<VerseRef>();
        foreach (var key in request.VerseRefKeys)
        {
            if (!VerseRef.TryParse(key, out var vr))
                return Error.Validation(
                    "Plans.InvalidVerseRef",
                    $"'{key}' is not a valid verse reference (BOOK.CHAPTER.VERSE)."
                );
            verseRefs.Add(vr);
        }

        var addResult = plan.AddDay(request.DayNumber, request.Title, verseRefs);
        if (addResult.IsFailure)
            return addResult.Error;

        await planRepository.UpdateAsync(plan, ct);
        return ReadingPlanMapper.ToDto(plan);
    }
}
