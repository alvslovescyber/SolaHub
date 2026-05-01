using SolaHub.Core.Interfaces.Services;

namespace SolaHub.Infrastructure.Auth;

/// <summary>
/// BCrypt-based password hasher with work factor 12 (balances security vs. auth latency).
/// Upgrade work factor as hardware improves.
/// </summary>
public sealed class BcryptPasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 12;

    public string Hash(string password)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(password);
        return BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);
    }

    public bool Verify(string password, string hash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(hash))
            return false;

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch
        {
            // Malformed hash — treat as mismatch, not an exception
            return false;
        }
    }
}
