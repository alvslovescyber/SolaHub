using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.Interfaces.Services;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Auth;

public sealed record RevokeTokenCommand(UserId RequestingUserId, string RefreshToken) : ICommand;

public sealed class RevokeTokenCommandValidator : AbstractValidator<RevokeTokenCommand>
{
    public RevokeTokenCommandValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty();
    }
}

internal sealed class RevokeTokenCommandHandler(
    IUserSessionRepository userSessionRepository,
    IRefreshTokenHasher refreshTokenHasher
) : IRequestHandler<RevokeTokenCommand, Result>
{
    public async Task<Result> Handle(RevokeTokenCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return Error.Validation("Auth.InvalidToken", "Refresh token is required.");

        var refreshHash = refreshTokenHasher.Hash(request.RefreshToken);
        var session = await userSessionRepository.GetByRefreshTokenHashAsync(refreshHash, ct);
        if (session is null || !session.IsValid(DateTimeOffset.UtcNow))
            return Error.Unauthorized("Auth.InvalidToken", "Token not recognized.");

        if (session.UserId != request.RequestingUserId)
            return Error.Forbidden(
                "Auth.TokenOwnerMismatch",
                "The refresh token does not belong to the signed-in user."
            );

        session.Revoke(DateTimeOffset.UtcNow);
        await userSessionRepository.UpdateAsync(session, ct);

        return Result.Success();
    }
}
