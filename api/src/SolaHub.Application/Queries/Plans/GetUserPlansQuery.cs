using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Queries.Plans;

public sealed record GetUserPlansQuery(UserId UserId) : IQuery<IReadOnlyList<ReadingPlanDto>>;

internal sealed class GetUserPlansQueryHandler(IReadingPlanRepository planRepository)
    : IRequestHandler<GetUserPlansQuery, Result<IReadOnlyList<ReadingPlanDto>>>
{
    public async Task<Result<IReadOnlyList<ReadingPlanDto>>> Handle(
        GetUserPlansQuery request,
        CancellationToken ct
    )
    {
        var plans = await planRepository.GetByUserAsync(request.UserId, ct);
        var dtos = plans.Select(ReadingPlanMapper.ToDto).ToList().AsReadOnly();
        return Result<IReadOnlyList<ReadingPlanDto>>.Success(dtos);
    }
}
