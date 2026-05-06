using SolaHub.Core.Common;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Entities;

public sealed class UserSession : BaseEntity<UserSessionId>
{
    private UserSession()
        : base(default)
    {
        RefreshTokenHash = string.Empty;
    }

    private UserSession(
        UserSessionId id,
        UserId userId,
        string refreshTokenHash,
        DateTimeOffset expiresAt
    )
        : base(id)
    {
        UserId = userId;
        RefreshTokenHash = refreshTokenHash;
        ExpiresAt = expiresAt;
        LastUsedAt = DateTimeOffset.UtcNow;
    }

    public UserId UserId { get; private set; }
    public string RefreshTokenHash { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset LastUsedAt { get; private set; }
    public DateTimeOffset? RevokedAt { get; private set; }

    public bool IsValid(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now;

    public static Result<UserSession> Create(
        UserId userId,
        string refreshTokenHash,
        DateTimeOffset expiresAt
    )
    {
        if (string.IsNullOrWhiteSpace(refreshTokenHash))
            return Error.Validation("UserSession.InvalidToken", "Refresh token hash is required.");

        if (expiresAt <= DateTimeOffset.UtcNow)
            return Error.Validation(
                "UserSession.InvalidExpiry",
                "Session expiry must be in the future."
            );

        return new UserSession(UserSessionId.New(), userId, refreshTokenHash, expiresAt);
    }

    public Result Rotate(string refreshTokenHash, DateTimeOffset expiresAt, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(refreshTokenHash))
            return Error.Validation("UserSession.InvalidToken", "Refresh token hash is required.");

        if (expiresAt <= now)
            return Error.Validation(
                "UserSession.InvalidExpiry",
                "Session expiry must be in the future."
            );

        RefreshTokenHash = refreshTokenHash;
        ExpiresAt = expiresAt;
        LastUsedAt = now;
        MarkUpdated();
        return Result.Ok;
    }

    public void Revoke(DateTimeOffset now)
    {
        if (RevokedAt is not null)
            return;

        RevokedAt = now;
        MarkUpdated();
    }
}
