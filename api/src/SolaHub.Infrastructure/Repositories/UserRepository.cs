using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure.Persistence;

namespace SolaHub.Infrastructure.Repositories;

public sealed class UserRepository(AppDbContext db, IHttpContextAccessor httpContextAccessor)
    : IUserRepository
{
    private const string UniqueViolation = "23505";

    // Reads that are followed by an Update (login, refresh) keep tracking enabled —
    // change tracking is what makes the subsequent SaveChangesAsync efficient.
    public Task<User?> GetByIdAsync(UserId id, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByIdForAuthenticationAsync(UserId id, CancellationToken ct) =>
        ExecuteWithAuthContextAsync(() => db.Users.FirstOrDefaultAsync(u => u.Id == id, ct), ct);

    public async Task<IReadOnlyList<User>> GetByIdsAsync(
        IEnumerable<UserId> ids,
        CancellationToken ct
    )
    {
        var userIds = ids.Distinct().ToList();
        if (userIds.Count == 0)
            return [];
        return await ExecuteWithAuthContextAsync(
            () => db.Users.AsNoTracking().Where(u => userIds.Contains(u.Id)).ToListAsync(ct),
            ct
        );
    }

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return ExecuteWithAuthContextAsync(
            () => db.Users.FirstOrDefaultAsync(u => u.Email.Value == normalized, ct),
            ct
        );
    }

    public Task<bool> ExistsByEmailAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return ExecuteWithAuthContextAsync(
            () => db.Users.AsNoTracking().AnyAsync(u => u.Email.Value == normalized, ct),
            ct
        );
    }

    public Task<IReadOnlyList<User>> GetAllAsync(int skip, int take, CancellationToken ct) =>
        db
            .Users.AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct)
            .ContinueWith(t => (IReadOnlyList<User>)t.Result, ct);

    public Task<int> CountAsync(CancellationToken ct) => db.Users.AsNoTracking().CountAsync(ct);

    public async Task AddAsync(User user, CancellationToken ct)
    {
        await ExecuteWithAuthContextAsync(
            async () =>
            {
                await db.Users.AddAsync(user, ct);
                await db.SaveChangesAsync(ct);
            },
            ct
        );
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

    public async Task UpdateAsync(User user, CancellationToken ct)
    {
        // See ReadingPlanRepository.UpdateAsync — avoid Update() on already-tracked
        // entities so newly added owned children aren't mis-flagged as Modified.
        if (IsAuthenticatedRequest())
        {
            if (db.Entry(user).State == EntityState.Detached)
                db.Users.Update(user);
            await db.SaveChangesAsync(ct);
            return;
        }

        await ExecuteWithAuthContextAsync(
            async () =>
            {
                if (db.Entry(user).State == EntityState.Detached)
                    db.Users.Update(user);
                await db.SaveChangesAsync(ct);
            },
            ct
        );
    }

    public async Task DeleteAsync(UserId id, CancellationToken ct)
    {
        await db.Users.Where(u => u.Id == id).ExecuteDeleteAsync(ct);
    }

    private static bool IsUniqueEmailViolation(DbUpdateException ex) =>
        ex.InnerException
            is PostgresException { SqlState: UniqueViolation, ConstraintName: "ix_users_email" };

    private bool IsAuthenticatedRequest() =>
        httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated == true;

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
