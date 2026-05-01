using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using SolaHub.Core.Entities;
using SolaHub.Core.Interfaces.Services;

namespace SolaHub.Infrastructure.Auth;

public sealed class JwtTokenService : ITokenService
{
    private const int RefreshTokenByteLength = 64;

    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expiryMinutes;
    private readonly ILogger<JwtTokenService> _logger;

    public JwtTokenService(IConfiguration config, ILogger<JwtTokenService> logger)
    {
        _logger = logger;
        _secret = config["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("Jwt:SecretKey is not configured.");
        _issuer = config["Jwt:Issuer"] ?? "SolaHub";
        _audience = config["Jwt:Audience"] ?? "SolaHub.Desktop";
        _expiryMinutes = int.TryParse(config["Jwt:AccessTokenExpiryMinutes"], out var m) ? m : 15;

        // Enforce minimum key length for HMAC-SHA256 security
        if (Encoding.UTF8.GetByteCount(_secret) < 32)
            throw new InvalidOperationException("Jwt:Secret must be at least 32 bytes.");
    }

    public string GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = BuildClaims(user);

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(_expiryMinutes),
            signingCredentials: credentials);

        _logger.LogDebug("Generated access token for user {UserId}", user.Id);
        return new JwtSecurityTokenHandler().WriteToken(token);
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
            new(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
        };

        if (user.ChurchId.HasValue)
            claims.Add(new Claim("church_id", user.ChurchId.Value.Value.ToString()));

        return claims;
    }
}
