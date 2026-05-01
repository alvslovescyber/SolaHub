namespace SolaHub.Core.Interfaces.Services;

/// <summary>
/// Produces a deterministic hash for storing refresh tokens (never store plaintext).
/// </summary>
public interface IRefreshTokenHasher
{
    string Hash(string refreshToken);
}
