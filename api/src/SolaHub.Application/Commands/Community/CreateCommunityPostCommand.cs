using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Entities;
using SolaHub.Core.Enums;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Community;

public sealed record CreateCommunityPostCommand(
    UserId AuthorId,
    string Kind,
    string Visibility,
    string? Title,
    string? Body,
    string? VerseRef,
    IReadOnlyList<string> Tags,
    string? DeckJson
) : ICommand<CommunityPostDto>;

public sealed class CreateCommunityPostCommandValidator
    : AbstractValidator<CreateCommunityPostCommand>
{
    public CreateCommunityPostCommandValidator()
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

internal sealed class CreateCommunityPostCommandHandler(
    ICommunityPostRepository postRepository,
    IUserRepository userRepository
) : IRequestHandler<CreateCommunityPostCommand, Result<CommunityPostDto>>
{
    public async Task<Result<CommunityPostDto>> Handle(
        CreateCommunityPostCommand request,
        CancellationToken ct
    )
    {
        if (
            !TryParse(
                request.Kind,
                request.Visibility,
                out var kind,
                out var visibility,
                out var error
            )
        )
            return error;

        var author = await userRepository.GetByIdAsync(request.AuthorId, ct);
        if (author is null || !author.IsActive)
            return Error.Unauthorized("Community.AuthorUnavailable", "Author is unavailable.");

        var result = CommunityPost.Create(
            request.AuthorId,
            author.DisplayName,
            kind,
            visibility,
            request.Title,
            request.Body,
            request.VerseRef,
            request.Tags,
            request.DeckJson
        );
        if (result.IsFailure)
            return result.Error;

        await postRepository.AddAsync(result.Value, ct);
        return CommunityPostMapper.ToDto(result.Value, request.AuthorId, hasReported: false);
    }

    internal static bool TryParse(
        string kindValue,
        string visibilityValue,
        out CommunityPostKind kind,
        out CommunityVisibility visibility,
        out Error error
    )
    {
        var hasKind = Enum.TryParse(kindValue, ignoreCase: true, out kind);
        var hasVisibility = Enum.TryParse(visibilityValue, ignoreCase: true, out visibility);
        if (hasKind && hasVisibility && Enum.IsDefined(kind) && Enum.IsDefined(visibility))
        {
            error = Error.None;
            return true;
        }

        error = Error.Validation("Community.InvalidRequest", "Kind or visibility is invalid.");
        return false;
    }
}
