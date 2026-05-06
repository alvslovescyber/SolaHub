using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Interfaces.Repositories;

public interface IUserSessionRepository
{
    Task AddAsync(UserSession session, CancellationToken ct = default);
    Task<UserSession?> GetByRefreshTokenHashAsync(
        string refreshTokenHash,
        CancellationToken ct = default
    );
    Task<bool> TryRotateAsync(
        UserSessionId sessionId,
        string expectedRefreshTokenHash,
        string newRefreshTokenHash,
        DateTimeOffset newExpiry,
        DateTimeOffset now,
        CancellationToken ct = default
    );
    Task UpdateAsync(UserSession session, CancellationToken ct = default);
    Task RevokeAllForUserAsync(UserId userId, DateTimeOffset now, CancellationToken ct = default);
}
