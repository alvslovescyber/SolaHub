using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Community;

public sealed record DeleteCommunityPostCommand(CommunityPostId PostId, UserId RequestingUserId)
    : ICommand;

internal sealed class DeleteCommunityPostCommandHandler(ICommunityPostRepository postRepository)
    : IRequestHandler<DeleteCommunityPostCommand, Result>
{
    public async Task<Result> Handle(DeleteCommunityPostCommand request, CancellationToken ct)
    {
        var post = await postRepository.GetByIdAsync(request.PostId, ct);
        if (post is null)
            return Error.NotFound("Community.Post", request.PostId.Value);

        if (post.AuthorId != request.RequestingUserId)
            return Error.Forbidden(
                "Community.Forbidden",
                "You do not have permission to delete this community post."
            );

        await postRepository.DeleteAsync(request.PostId, ct);
        return Result.Ok;
    }
}
