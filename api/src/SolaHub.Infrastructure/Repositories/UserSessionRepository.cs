using Microsoft.EntityFrameworkCore;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure.Persistence;

namespace SolaHub.Infrastructure.Repositories;

public sealed class UserSessionRepository(AppDbContext db) : IUserSessionRepository
{
    public Task AddAsync(UserSession session, CancellationToken ct) =>
        ExecuteWithAuthContextAsync(
            async () =>
            {
                await db.UserSessions.AddAsync(session, ct);
                await db.SaveChangesAsync(ct);
            },
            ct
        );

    public Task<UserSession?> GetByRefreshTokenHashAsync(
        string refreshTokenHash,
        CancellationToken ct
    ) =>
        ExecuteWithAuthContextAsync(
            () =>
                db.UserSessions.FirstOrDefaultAsync(
                    s => s.RefreshTokenHash == refreshTokenHash,
                    ct
                ),
            ct
        );

    public async Task<bool> TryRotateAsync(
        UserSessionId sessionId,
        string expectedRefreshTokenHash,
        string newRefreshTokenHash,
        DateTimeOffset newExpiry,
        DateTimeOffset now,
        CancellationToken ct = default
    )
    {
        var affected = await ExecuteWithAuthContextAsync(
            () =>
                db
                    .UserSessions.Where(s =>
                        s.Id == sessionId
                        && s.RefreshTokenHash == expectedRefreshTokenHash
                        && s.RevokedAt == null
                        && s.ExpiresAt > now
                    )
                    .ExecuteUpdateAsync(
                        setters =>
                            setters
                                .SetProperty(s => s.RefreshTokenHash, newRefreshTokenHash)
                                .SetProperty(s => s.ExpiresAt, newExpiry)
                                .SetProperty(s => s.LastUsedAt, now)
                                .SetProperty(s => s.UpdatedAt, now),
                        ct
                    ),
            ct
        );

        return affected == 1;
    }

    public Task UpdateAsync(UserSession session, CancellationToken ct) =>
        ExecuteWithAuthContextAsync(
            async () =>
            {
                if (db.Entry(session).State == EntityState.Detached)
                    db.UserSessions.Update(session);
                await db.SaveChangesAsync(ct);
            },
            ct
        );

    public Task RevokeAllForUserAsync(UserId userId, DateTimeOffset now, CancellationToken ct) =>
        ExecuteWithAuthContextAsync(
            () =>
                db
                    .UserSessions.Where(s => s.UserId == userId && s.RevokedAt == null)
                    .ExecuteUpdateAsync(
                        setters =>
                            setters
                                .SetProperty(s => s.RevokedAt, now)
                                .SetProperty(s => s.UpdatedAt, now),
                        ct
                    ),
            ct
        );

    private async Task ExecuteWithAuthContextAsync(Func<Task> operation, CancellationToken ct)
    {
        await ExecuteWithAuthContextAsync(
            async () =>
            {
                await operation();
                return true;
            },
            ct
        );
    }

    private async Task<T> ExecuteWithAuthContextAsync<T>(
        Func<Task<T>> operation,
        CancellationToken ct
    )
    {
        await db.Database.OpenConnectionAsync(ct);
        try
        {
            await db.Database.ExecuteSqlRawAsync("SET app.auth_context = 'true'", ct);
            return await operation();
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync(
                "SET app.auth_context = 'false'",
                CancellationToken.None
            );
            await db.Database.CloseConnectionAsync();
        }
    }
}
