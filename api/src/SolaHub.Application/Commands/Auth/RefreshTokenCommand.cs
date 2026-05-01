using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
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
    ITokenService tokenService
) : IRequestHandler<RefreshTokenCommand, Result<AuthResponse>>
{
    private static readonly TimeSpan AccessTokenExpiry = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan RefreshTokenExpiry = TimeSpan.FromDays(30);

    public async Task<Result<AuthResponse>> Handle(
        RefreshTokenCommand request,
        CancellationToken ct
    )
    {
        var user = await userRepository.GetByRefreshTokenAsync(request.RefreshToken, ct);

        if (user is null || !user.HasValidRefreshToken(request.RefreshToken))
            return Error.Unauthorized("Auth.InvalidToken", "Invalid or expired refresh token.");

        if (!user.IsActive)
            return Error.Unauthorized(
                "Auth.AccountDeactivated",
                "This account has been deactivated."
            );

        // Rotate refresh token on every use — prevents stolen-token reuse
        var newAccessToken = tokenService.GenerateAccessToken(user);
        var newRefreshToken = tokenService.GenerateRefreshToken();
        var tokenResult = user.UpdateRefreshToken(
            newRefreshToken,
            DateTimeOffset.UtcNow.Add(RefreshTokenExpiry)
        );
        if (tokenResult.IsFailure)
            return tokenResult.Error;

        await userRepository.UpdateAsync(user, ct);

        return new AuthResponse(
            newAccessToken,
            newRefreshToken,
            DateTimeOffset.UtcNow.Add(AccessTokenExpiry),
            RegisterCommandHandler.MapToUserDto(user)
        );
    }
}
