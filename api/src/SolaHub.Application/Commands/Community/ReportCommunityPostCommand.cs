using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Community;

public sealed record ReportCommunityPostCommand(
    CommunityPostId PostId,
    UserId RequestingUserId,
    string? Reason
) : ICommand;

public sealed class ReportCommunityPostCommandValidator
    : AbstractValidator<ReportCommunityPostCommand>
{
    public ReportCommunityPostCommandValidator()
    {
        RuleFor(x => x.Reason).MaximumLength(CommunityPostReport.MaxReasonLength);
    }
}

internal sealed class ReportCommunityPostCommandHandler(ICommunityPostRepository postRepository)
    : IRequestHandler<ReportCommunityPostCommand, Result>
{
    public async Task<Result> Handle(ReportCommunityPostCommand request, CancellationToken ct)
    {
        var post = await postRepository.GetByIdAsync(request.PostId, ct);
        if (post is null)
            return Error.NotFound("Community.Post", request.PostId.Value);

        if (post.AuthorId == request.RequestingUserId)
            return Error.Conflict("Community.ReportOwnPost", "You cannot report your own post.");

        if (await postRepository.HasReportAsync(request.PostId, request.RequestingUserId, ct))
            return Result.Ok;

        var reportResult = CommunityPostReport.Create(
            request.PostId,
            request.RequestingUserId,
            request.Reason
        );
        if (reportResult.IsFailure)
            return reportResult.Error;

        await postRepository.AddReportAsync(reportResult.Value, ct);
        return Result.Ok;
    }
}
