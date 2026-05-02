using SolaHub.Core.Entities;

namespace SolaHub.Core.Interfaces.Services;

public interface ITokenService
{
    /// <summary>Lifetime of issued access tokens (driven by configuration).</summary>
    TimeSpan AccessTokenLifetime { get; }

    /// <summary>Lifetime of issued refresh tokens (driven by configuration).</summary>
    TimeSpan RefreshTokenLifetime { get; }

    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
}
