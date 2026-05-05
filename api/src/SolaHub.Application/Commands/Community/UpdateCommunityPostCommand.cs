using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Community;

public sealed record UpdateCommunityPostCommand(
    CommunityPostId PostId,
    UserId RequestingUserId,
    string Kind,
    string Visibility,
    string? Title,
    string? Body,
    string? VerseRef,
    IReadOnlyList<string> Tags,
    string? DeckJson
) : ICommand<CommunityPostDto>;

public sealed class UpdateCommunityPostCommandValidator
    : AbstractValidator<UpdateCommunityPostCommand>
{
    public UpdateCommunityPostCommandValidator()
    {
        RuleFor(x => x.Kind).NotEmpty();
        RuleFor(x => x.Visibility).NotEmpty();
        RuleFor(x => x.Title).MaximumLength(CommunityPost.MaxTitleLength);
        RuleFor(x => x.Body).MaximumLength(CommunityPost.MaxBodyLength);
        RuleFor(x => x.Tags)
            .Must(tags => tags.Count <= CommunityPost.MaxTagCount)
            .WithMessage($"Cannot have more than {CommunityPost.MaxTagCount} tags.");
    }
}

internal sealed class UpdateCommunityPostCommandHandler(ICommunityPostRepository postRepository)
    : IRequestHandler<UpdateCommunityPostCommand, Result<CommunityPostDto>>
{
    public async Task<Result<CommunityPostDto>> Handle(
        UpdateCommunityPostCommand request,
        CancellationToken ct
    )
    {
        if (
            !CreateCommunityPostCommandHandler.TryParse(
                request.Kind,
                request.Visibility,
                out var kind,
                out var visibility,
                out var parseError
            )
        )
            return parseError;

        var post = await postRepository.GetByIdAsync(request.PostId, ct);
        if (post is null)
            return Error.NotFound("Community.NotFound", request.PostId.Value);

        if (post.AuthorId != request.RequestingUserId)
            return Error.Forbidden(
                "Community.Forbidden",
                "You do not have permission to update this community post."
            );

        var updateResult = post.Update(
            kind,
            visibility,
            request.Title,
            request.Body,
            request.VerseRef,
            request.Tags,
            request.DeckJson
        );
        if (updateResult.IsFailure)
            return updateResult.Error;

        await postRepository.UpdateAsync(post, ct);
        return CommunityPostMapper.ToDto(post, request.RequestingUserId, hasReported: false);
    }
}
