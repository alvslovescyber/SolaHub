using Microsoft.EntityFrameworkCore;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure.Persistence;

namespace SolaHub.Infrastructure.Repositories;

public sealed class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(UserId id, CancellationToken ct)
        => db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return db.Users.FirstOrDefaultAsync(u => u.Email.Value == normalized, ct);
    }

    public Task<User?> GetByRefreshTokenAsync(string refreshToken, CancellationToken ct)
        => db.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshToken, ct);

    public Task<bool> ExistsByEmailAsync(string email, CancellationToken ct)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return db.Users.AnyAsync(u => u.Email.Value == normalized, ct);
    }

    public async Task AddAsync(User user, CancellationToken ct)
    {
        await db.Users.AddAsync(user, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(User user, CancellationToken ct)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(UserId id, CancellationToken ct)
    {
        await db.Users
            .Where(u => u.Id == id)
            .ExecuteDeleteAsync(ct);
    }
}
