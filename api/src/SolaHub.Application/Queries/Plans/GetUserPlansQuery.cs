using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Queries.Plans;

public sealed record GetUserPlansQuery(UserId UserId) : IQuery<IReadOnlyList<ReadingPlanDto>>;

internal sealed class GetUserPlansQueryHandler(
    IReadingPlanRepository planRepository,
    IUserRepository userRepository
) : IRequestHandler<GetUserPlansQuery, Result<IReadOnlyList<ReadingPlanDto>>>
{
    public async Task<Result<IReadOnlyList<ReadingPlanDto>>> Handle(
        GetUserPlansQuery request,
        CancellationToken ct
    )
    {
        var plans = await planRepository.GetByUserAsync(request.UserId, ct);

        // Collect all unique participant IDs across all plans for a single batch fetch
        var allParticipantIds = plans
            .SelectMany(p => p.Participants.Select(part => part.UserId))
            .Distinct()
            .ToList();

        var users = await userRepository.GetByIdsAsync(allParticipantIds, ct);
        var displayNames = users.ToDictionary(u => u.Id.Value, u => u.DisplayName);

        var dtos = plans
            .Select(p => ReadingPlanMapper.ToDto(p, displayNames))
            .ToList()
            .AsReadOnly();

        return Result<IReadOnlyList<ReadingPlanDto>>.Success(dtos);
    }
}
