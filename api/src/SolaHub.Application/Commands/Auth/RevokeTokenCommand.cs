using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.Interfaces.Services;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Auth;

public sealed record RevokeTokenCommand(UserId RequestingUserId, string RefreshToken) : ICommand;

internal sealed class RevokeTokenCommandHandler(
    IUserRepository userRepository,
    IRefreshTokenHasher refreshTokenHasher
) : IRequestHandler<RevokeTokenCommand, Result>
{
    public async Task<Result> Handle(RevokeTokenCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return Error.Validation("Auth.InvalidToken", "Refresh token is required.");

        var refreshHash = refreshTokenHasher.Hash(request.RefreshToken);
        var user = await userRepository.GetByRefreshTokenHashAsync(refreshHash, ct);
        if (user is null || !user.HasValidRefreshTokenHash(refreshHash))
            return Error.Unauthorized("Auth.InvalidToken", "Token not recognized.");

        if (user.Id != request.RequestingUserId)
            return Error.Forbidden(
                "Auth.TokenOwnerMismatch",
                "The refresh token does not belong to the signed-in user."
            );

        user.RevokeRefreshToken();
        await userRepository.UpdateAsync(user, ct);

        return Result.Success();
    }
}
