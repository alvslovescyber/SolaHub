using FluentValidation;
using MediatR;
using SolaHub.Application.Common;
using SolaHub.Core.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.Interfaces.Services;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Application.Commands.Auth;

public sealed record ChangePasswordCommand(
    UserId UserId,
    string CurrentPassword,
    string NewPassword
) : ICommand;

public sealed class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordCommandValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty().WithMessage("Current password is required.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("New password is required.")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters.")
            .MaximumLength(100).WithMessage("Password must not exceed 100 characters.")
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[a-z]").WithMessage("Password must contain at least one lowercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one digit.");
    }
}

internal sealed class ChangePasswordCommandHandler(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher
) : IRequestHandler<ChangePasswordCommand, Result>
{
    public async Task<Result> Handle(ChangePasswordCommand request, CancellationToken ct)
    {
        var user = await userRepository.GetByIdAsync(request.UserId, ct);
        if (user is null)
            return Error.NotFound("Users.NotFound", "User not found.");

        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            return Error.Unauthorized("Auth.InvalidPassword", "Current password is incorrect.");

        var newHash = passwordHasher.Hash(request.NewPassword);
        user.ChangePassword(newHash);
        await userRepository.UpdateAsync(user, ct);
        return Result.Ok;
    }
}
