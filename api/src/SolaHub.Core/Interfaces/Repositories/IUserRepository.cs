using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Interfaces.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(UserId id, CancellationToken ct = default);
    Task<User?> GetByIdForAuthenticationAsync(UserId id, CancellationToken ct = default);
    Task<IReadOnlyList<User>> GetByIdsAsync(
        IEnumerable<UserId> ids,
        CancellationToken ct = default
    );
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByRefreshTokenHashAsync(string refreshTokenHash, CancellationToken ct = default);
    Task<bool> ExistsByEmailAsync(string email, CancellationToken ct = default);
    Task<IReadOnlyList<User>> GetAllAsync(int skip, int take, CancellationToken ct = default);
    Task<int> CountAsync(CancellationToken ct = default);
    Task AddAsync(User user, CancellationToken ct = default);
    Task<bool> TryAddAsync(User user, CancellationToken ct = default);
    Task<bool> TryRotateRefreshTokenAsync(
        UserId userId,
        string expectedRefreshTokenHash,
        string newRefreshTokenHash,
        DateTimeOffset newExpiry,
        CancellationToken ct = default
    );
    Task UpdateAsync(User user, CancellationToken ct = default);
    Task DeleteAsync(UserId id, CancellationToken ct = default);
}
