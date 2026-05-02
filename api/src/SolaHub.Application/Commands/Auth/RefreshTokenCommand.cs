using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.Interfaces.Services;

namespace SolaHub.Application.Commands.Auth;

public sealed record RefreshTokenCommand(string RefreshToken) : ICommand<AuthResponse>;

public sealed class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty();
    }
}

internal sealed class RefreshTokenCommandHandler(
    IUserRepository userRepository,
    ITokenService tokenService,
    IRefreshTokenHasher refreshTokenHasher
) : IRequestHandler<RefreshTokenCommand, Result<AuthResponse>>
{
    public async Task<Result<AuthResponse>> Handle(
        RefreshTokenCommand request,
        CancellationToken ct
    )
    {
        var refreshHash = refreshTokenHasher.Hash(request.RefreshToken);
        var user = await userRepository.GetByRefreshTokenHashAsync(refreshHash, ct);

        if (user is null || !user.HasValidRefreshTokenHash(refreshHash))
            return Error.Unauthorized("Auth.InvalidToken", "Invalid or expired refresh token.");

        if (!user.IsActive)
            return Error.Unauthorized(
                "Auth.AccountDeactivated",
                "This account has been deactivated."
            );

        // Rotate refresh token on every use — prevents stolen-token reuse
        var now = DateTimeOffset.UtcNow;
        var newAccessToken = tokenService.GenerateAccessToken(user);
        var newRefreshToken = tokenService.GenerateRefreshToken();
        var newHash = refreshTokenHasher.Hash(newRefreshToken);
        var tokenResult = user.UpdateRefreshToken(
            newHash,
            now.Add(tokenService.RefreshTokenLifetime)
        );
        if (tokenResult.IsFailure)
            return tokenResult.Error;

        var rotated = await userRepository.TryRotateRefreshTokenAsync(
            user.Id,
            refreshHash,
            newHash,
            now.Add(tokenService.RefreshTokenLifetime),
            ct
        );
        if (!rotated)
            return Error.Unauthorized(
                "Auth.InvalidToken",
                "Invalid or expired refresh token."
            );

        return new AuthResponse(
            newAccessToken,
            newRefreshToken,
            now.Add(tokenService.AccessTokenLifetime),
            UserMapper.ToDto(user)
        );
    }
}
