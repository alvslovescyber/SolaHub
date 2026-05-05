using Microsoft.EntityFrameworkCore;
using Npgsql;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure.Persistence;

namespace SolaHub.Infrastructure.Repositories;

public sealed class UserRepository(AppDbContext db) : IUserRepository
{
    private const string UniqueViolation = "23505";

    // Reads that are followed by an Update (login, refresh) keep tracking enabled —
    // change tracking is what makes the subsequent SaveChangesAsync efficient.
    public Task<User?> GetByIdAsync(UserId id, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public async Task<IReadOnlyList<User>> GetByIdsAsync(
        IEnumerable<UserId> ids,
        CancellationToken ct
    )
    {
        var userIds = ids.Distinct().ToList();
        if (userIds.Count == 0)
            return [];
        return await db.Users.AsNoTracking().Where(u => userIds.Contains(u.Id)).ToListAsync(ct);
    }

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return db.Users.FirstOrDefaultAsync(u => u.Email.Value == normalized, ct);
    }

    public Task<User?> GetByRefreshTokenHashAsync(string refreshTokenHash, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshTokenHash, ct);

    public Task<bool> ExistsByEmailAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return db.Users.AsNoTracking().AnyAsync(u => u.Email.Value == normalized, ct);
    }

    public Task<IReadOnlyList<User>> GetAllAsync(int skip, int take, CancellationToken ct) =>
        db.Users
            .AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct)
            .ContinueWith(t => (IReadOnlyList<User>)t.Result, ct);

    public Task<int> CountAsync(CancellationToken ct) => db.Users.AsNoTracking().CountAsync(ct);

    public async Task AddAsync(User user, CancellationToken ct)
    {
        await db.Users.AddAsync(user, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> TryAddAsync(User user, CancellationToken ct)
    {
        try
        {
            await AddAsync(user, ct);
            return true;
        }
        catch (DbUpdateException ex) when (IsUniqueEmailViolation(ex))
        {
            db.Entry(user).State = EntityState.Detached;
            return false;
        }
    }

    public async Task<bool> TryRotateRefreshTokenAsync(
        UserId userId,
        string expectedRefreshTokenHash,
        string newRefreshTokenHash,
        DateTimeOffset newExpiry,
        CancellationToken ct = default
    )
    {
        var now = DateTimeOffset.UtcNow;
        var affected = await db
            .Users.Where(u =>
                u.Id == userId
                && u.IsActive
                && u.RefreshToken == expectedRefreshTokenHash
                && u.RefreshTokenExpiry.HasValue
                && u.RefreshTokenExpiry.Value > now
            )
            .ExecuteUpdateAsync(
                setters =>
                    setters
                        .SetProperty(u => u.RefreshToken, newRefreshTokenHash)
                        .SetProperty(u => u.RefreshTokenExpiry, newExpiry)
                        .SetProperty(u => u.UpdatedAt, now),
                ct
            );

        return affected == 1;
    }

    public async Task UpdateAsync(User user, CancellationToken ct)
    {
        // See ReadingPlanRepository.UpdateAsync — avoid Update() on already-tracked
        // entities so newly added owned children aren't mis-flagged as Modified.
        if (db.Entry(user).State == EntityState.Detached)
            db.Users.Update(user);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(UserId id, CancellationToken ct)
    {
        await db.Users.Where(u => u.Id == id).ExecuteDeleteAsync(ct);
    }

    private static bool IsUniqueEmailViolation(DbUpdateException ex) =>
        ex.InnerException
            is PostgresException { SqlState: UniqueViolation, ConstraintName: "ix_users_email" };
}
