using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Application.DTOs;
using SolaHub.Application.Mappers;
using SolaHub.Core.Common;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.Interfaces.Services;

namespace SolaHub.Application.Commands.Auth;

public sealed record RegisterCommand(string Email, string Password, string DisplayName)
    : ICommand<AuthResponse>;

public sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.DisplayName)
            .NotEmpty()
            .WithMessage("Display name is required.")
            .MaximumLength(100)
            .WithMessage("Display name must not exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("Email is required.")
            .EmailAddress()
            .WithMessage("A valid email address is required.")
            .MaximumLength(254)
            .WithMessage("Email must not exceed 254 characters.");

        RuleFor(x => x.Password)
            .NotEmpty()
            .WithMessage("Password is required.")
            .MinimumLength(8)
            .WithMessage("Password must be at least 8 characters.")
            .MaximumLength(100)
            .WithMessage("Password must not exceed 100 characters.")
            .Matches("[A-Z]")
            .WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[a-z]")
            .WithMessage("Password must contain at least one lowercase letter.")
            .Matches("[0-9]")
            .WithMessage("Password must contain at least one digit.");
    }
}

internal sealed class RegisterCommandHandler(
    IUserRepository userRepository,
    IUserSessionRepository userSessionRepository,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IRefreshTokenHasher refreshTokenHasher
) : IRequestHandler<RegisterCommand, Result<AuthResponse>>
{
    public async Task<Result<AuthResponse>> Handle(RegisterCommand request, CancellationToken ct)
    {
        // Check uniqueness before hashing (expensive operation).
        // Generic message prevents email enumeration by attackers.
        if (await userRepository.ExistsByEmailAsync(request.Email, ct))
            return Error.Conflict("Auth.EmailTaken", "An account with this email already exists.");

        var hash = passwordHasher.Hash(request.Password);
        var userResult = User.Create(request.Email, hash, request.DisplayName);
        if (userResult.IsFailure)
            return userResult.Error;

        var user = userResult.Value;
        var now = DateTimeOffset.UtcNow;
        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken();
        var refreshExpiry = now.Add(tokenService.RefreshTokenLifetime);
        var sessionResult = UserSession.Create(
            user.Id,
            refreshTokenHasher.Hash(refreshToken),
            refreshExpiry
        );
        if (sessionResult.IsFailure)
            return sessionResult.Error;

        if (!await userRepository.TryAddAsync(user, ct))
            return Error.Conflict("Auth.EmailTaken", "An account with this email already exists.");

        await userSessionRepository.AddAsync(sessionResult.Value, ct);

        return new AuthResponse(
            accessToken,
            refreshToken,
            now.Add(tokenService.AccessTokenLifetime),
            UserMapper.ToDto(user)
        );
    }
}
