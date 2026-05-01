using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Core.Common;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Plans;

public sealed record CreatePlanCommand(
    UserId CreatedBy,
    string Title,
    string? Description,
    bool IsPublic) : ICommand<ReadingPlanDto>;

public sealed class CreatePlanCommandValidator : AbstractValidator<CreatePlanCommand>
{
    public CreatePlanCommandValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(2000).When(x => x.Description is not null)
            .WithMessage("Description must not exceed 2,000 characters.");
    }
}

internal sealed class CreatePlanCommandHandler(IReadingPlanRepository planRepository)
    : IRequestHandler<CreatePlanCommand, Result<ReadingPlanDto>>
{
    public async Task<Result<ReadingPlanDto>> Handle(CreatePlanCommand request, CancellationToken ct)
    {
        var planResult = ReadingPlan.Create(
            request.CreatedBy,
            request.Title,
            request.Description,
            request.IsPublic);

        if (planResult.IsFailure)
            return planResult.Error;

        var plan = planResult.Value;
        await planRepository.AddAsync(plan, ct);

        return MapToDto(plan);
    }

    internal static ReadingPlanDto MapToDto(ReadingPlan plan) => new(
        plan.Id.Value,
        plan.Title,
        plan.Description,
        plan.Status.ToString(),
        plan.IsPublic,
        plan.CreatedBy.Value,
        plan.CreatedAt,
        plan.Days.Select(d => new PlanDayDto(d.DayNumber, d.Title, d.VerseRefs.Select(v => v.Key).ToList())).ToList(),
        plan.Participants.Select(p => new PlanParticipantDto(p.UserId.Value, p.CurrentDay, p.JoinedAt)).ToList()
    );
}
