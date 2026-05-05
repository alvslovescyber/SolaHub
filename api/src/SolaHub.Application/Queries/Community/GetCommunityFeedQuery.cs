using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Enums;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Queries.Community;

public sealed record GetCommunityFeedQuery(
    UserId RequestingUserId,
    string Feed,
    int Take,
    DateTimeOffset? Before
) : IQuery<IReadOnlyList<CommunityPostDto>>;

public sealed class GetCommunityFeedQueryValidator : AbstractValidator<GetCommunityFeedQuery>
{
    public GetCommunityFeedQueryValidator()
    {
        RuleFor(x => x.Feed).NotEmpty();
        RuleFor(x => x.Take).InclusiveBetween(1, 50);
    }
}

internal sealed class GetCommunityFeedQueryHandler(ICommunityPostRepository postRepository)
    : IRequestHandler<GetCommunityFeedQuery, Result<IReadOnlyList<CommunityPostDto>>>
{
    public async Task<Result<IReadOnlyList<CommunityPostDto>>> Handle(
        GetCommunityFeedQuery request,
        CancellationToken ct
    )
    {
        if (
            !Enum.TryParse<CommunityFeed>(request.Feed, ignoreCase: true, out var feed)
            || !Enum.IsDefined(feed)
        )
            return Error.Validation("Community.InvalidFeed", "Community feed is invalid.");

        var posts = await postRepository.GetFeedAsync(
            request.RequestingUserId,
            feed,
            request.Take,
            request.Before,
            ct
        );
        var reportedIds = await postRepository.GetReportedPostIdsAsync(
            request.RequestingUserId,
            posts.Select(p => p.Id),
            ct
        );

        return posts
            .Select(post =>
                CommunityPostMapper.ToDto(
                    post,
                    request.RequestingUserId,
                    reportedIds.Contains(post.Id)
                )
            )
            .ToList();
    }
}
