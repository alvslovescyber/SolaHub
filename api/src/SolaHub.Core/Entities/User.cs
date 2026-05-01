using SolaHub.Core.Common;
using SolaHub.Core.Enums;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Entities;

public sealed class User : BaseEntity<UserId>
{
    // Required by EF Core for materialization — never called by application code
    private User()
        : base(default!)
    {
        DisplayName = string.Empty;
        Email = null!;
    }

    private User(UserId id, string displayName, Email email, UserRole role)
        : base(id)
    {
        DisplayName = displayName;
        Email = email;
        Role = role;
    }

    public string DisplayName { get; private set; }
    public Email Email { get; private set; }
    public string PasswordHash { get; private set; } = string.Empty;
    public UserRole Role { get; private set; }
    public ChurchId? ChurchId { get; private set; }
    public bool IsEmailVerified { get; private set; }
    public DateTimeOffset? LastLoginAt { get; private set; }
    public string? RefreshToken { get; private set; }
    public DateTimeOffset? RefreshTokenExpiry { get; private set; }
    public bool IsActive { get; private set; } = true;

    // ─── Factory ──────────────────────────────────────────────────────────────

    public static Result<User> Create(
        string email,
        string passwordHash,
        string displayName,
        UserRole role = UserRole.Member
    )
    {
        if (string.IsNullOrWhiteSpace(displayName))
            return Error.Validation("User.DisplayNameRequired", "Display name cannot be empty.");

        if (displayName.Length > 100)
            return Error.Validation(
                "User.DisplayNameTooLong",
                "Display name must not exceed 100 characters."
            );

        var emailResult = Email.Create(email);
        if (emailResult.IsFailure)
            return emailResult.Error;

        if (string.IsNullOrWhiteSpace(passwordHash))
            return Error.Validation("User.PasswordHashRequired", "Password hash cannot be empty.");

        var user = new User(UserId.New(), displayName.Trim(), emailResult.Value, role)
        {
            PasswordHash = passwordHash,
        };

        user.RaiseDomainEvent(new UserCreatedEvent(user.Id, user.Email.Value));
        return user;
    }

    // ─── Behaviour ────────────────────────────────────────────────────────────

    public void UpdateProfile(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name cannot be empty.", nameof(displayName));

        DisplayName = displayName.Trim();
        MarkUpdated();
    }

    public Result UpdateEmail(string newEmail)
    {
        var emailResult = Email.Create(newEmail);
        if (emailResult.IsFailure)
            return Result.Failure(emailResult.Error);

        Email = emailResult.Value;
        IsEmailVerified = false; // Re-verification required on email change
        MarkUpdated();
        return Result.Ok;
    }

    /// <param name="refreshTokenHash">Hashed refresh token (never store the raw token).</param>
    public Result UpdateRefreshToken(string refreshTokenHash, DateTimeOffset expiry)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenHash))
            return Result.Failure(
                Error.Validation("User.InvalidToken", "Refresh token cannot be empty.")
            );

        if (expiry <= DateTimeOffset.UtcNow)
            return Result.Failure(
                Error.Validation("User.InvalidExpiry", "Token expiry must be in the future.")
            );

        RefreshToken = refreshTokenHash;
        RefreshTokenExpiry = expiry;
        MarkUpdated();
        return Result.Ok;
    }

    public void RevokeRefreshToken()
    {
        RefreshToken = null;
        RefreshTokenExpiry = null;
        MarkUpdated();
    }

    /// <param name="refreshTokenHash">HMAC hash of the client-supplied refresh token.</param>
    public bool HasValidRefreshTokenHash(string? refreshTokenHash) =>
        refreshTokenHash is not null
        && RefreshToken == refreshTokenHash
        && RefreshTokenExpiry.HasValue
        && RefreshTokenExpiry.Value > DateTimeOffset.UtcNow;

    public void RecordLogin()
    {
        LastLoginAt = DateTimeOffset.UtcNow;
        MarkUpdated();
    }

    public void JoinChurch(ChurchId churchId)
    {
        ChurchId = churchId;
        MarkUpdated();
    }

    public void LeaveChurch()
    {
        ChurchId = null;
        MarkUpdated();
    }

    public void VerifyEmail()
    {
        IsEmailVerified = true;
        MarkUpdated();
    }

    public void Deactivate()
    {
        IsActive = false;
        RevokeRefreshToken();
        MarkUpdated();
    }
}

public sealed record UserCreatedEvent(UserId UserId, string Email) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTimeOffset OccurredAt { get; } = DateTimeOffset.UtcNow;
}
