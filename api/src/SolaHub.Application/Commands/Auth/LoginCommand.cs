using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.Interfaces.Services;

namespace SolaHub.Application.Commands.Auth;

public sealed record LoginCommand(string Email, string Password) : ICommand<AuthResponse>;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

internal sealed class LoginCommandHandler(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IRefreshTokenHasher refreshTokenHasher
) : IRequestHandler<LoginCommand, Result<AuthResponse>>
{
    public async Task<Result<AuthResponse>> Handle(LoginCommand request, CancellationToken ct)
    {
        var user = await userRepository.GetByEmailAsync(request.Email, ct);

        // Always verify against a real BCrypt hash to prevent timing-based user enumeration.
        const string DummyHash = "$2a$12$Ik1jqbHknHuD0HcjJKrqDuhOHWG0VVsIGm0eCJJH8VN6S2r8rPr4q";
        var isValid =
            passwordHasher.Verify(request.Password, user?.PasswordHash ?? DummyHash)
            && user is not null;

        if (!isValid)
            return Error.Unauthorized("Auth.InvalidCredentials", "Invalid email or password.");

        if (!user!.IsActive)
            return Error.Unauthorized(
                "Auth.AccountDeactivated",
                "This account has been deactivated."
            );

        user.RecordLogin();
        var now = DateTimeOffset.UtcNow;
        var accessToken = tokenService.GenerateAccessToken(user);
        var newRefreshToken = tokenService.GenerateRefreshToken();
        var refreshHash = refreshTokenHasher.Hash(newRefreshToken);
        var tokenResult = user.UpdateRefreshToken(
            refreshHash,
            now.Add(tokenService.RefreshTokenLifetime)
        );
        if (tokenResult.IsFailure)
            return tokenResult.Error;

        await userRepository.UpdateAsync(user, ct);

        return new AuthResponse(
            accessToken,
            newRefreshToken,
            now.Add(tokenService.AccessTokenLifetime),
            UserMapper.ToDto(user)
        );
    }
}
