using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;

namespace SolaHub.Application.Commands.Auth;

public sealed record RevokeTokenCommand(string RefreshToken) : ICommand;

internal sealed class RevokeTokenCommandHandler(IUserRepository userRepository)
    : IRequestHandler<RevokeTokenCommand, Result>
{
    public async Task<Result> Handle(RevokeTokenCommand request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return Error.Validation("Auth.InvalidToken", "Refresh token is required.");

        var user = await userRepository.GetByRefreshTokenAsync(request.RefreshToken, ct);
        if (user is null)
            return Error.Unauthorized("Auth.InvalidToken", "Token not recognized.");

        user.RevokeRefreshToken();
        await userRepository.UpdateAsync(user, ct);

        return Result.Success();
    }
}
