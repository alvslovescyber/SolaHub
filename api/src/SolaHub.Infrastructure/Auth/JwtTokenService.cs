using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Services;

namespace SolaHub.Infrastructure.Auth;

public sealed class JwtTokenService : ITokenService
{
    private const int RefreshTokenByteLength = 64;

    private static readonly JwtSecurityTokenHandler JwtHandler = new();

    private readonly JwtOptions _options;
    private readonly ILogger<JwtTokenService> _logger;
    private readonly SigningCredentials _signingCredentials;

    public JwtTokenService(IOptions<JwtOptions> options, ILogger<JwtTokenService> logger)
    {
        _options = options.Value;
        _logger = logger;

        // SigningCredentials are immutable for the life of the service — build once.
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));
        _signingCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    }

    public TimeSpan AccessTokenLifetime => _options.AccessTokenExpiry;

    public TimeSpan RefreshTokenLifetime => _options.RefreshTokenExpiry;

    public string GenerateAccessToken(User user)
    {
        var claims = BuildClaims(user);
        var now = DateTime.UtcNow;

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: now.Add(_options.AccessTokenExpiry),
            signingCredentials: _signingCredentials
        );

        _logger.LogDebug("Generated access token for user {UserId}", user.Id);
        return JwtHandler.WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var bytes = new byte[RefreshTokenByteLength];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    private static List<Claim> BuildClaims(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.Value.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email.Value),
            new(JwtRegisteredClaimNames.Name, user.DisplayName),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(
                JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64
            ),
        };

        if (user.ChurchId.HasValue)
            claims.Add(new Claim("church_id", user.ChurchId.Value.Value.ToString()));

        return claims;
    }
}
