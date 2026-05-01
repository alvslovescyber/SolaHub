using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using SolaHub.Core.Interfaces.Services;

namespace SolaHub.Infrastructure.Auth;

public sealed class RefreshTokenHasher(IConfiguration config) : IRefreshTokenHasher
{
    private readonly byte[] _key = Encoding.UTF8.GetBytes(
        config["Jwt:SecretKey"]
        ?? throw new InvalidOperationException("Jwt:SecretKey is required for refresh token hashing.")
    );

    public string Hash(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
            throw new ArgumentException("Refresh token cannot be empty.", nameof(refreshToken));

        using var hmac = new HMACSHA256(_key);
        return Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(refreshToken)));
    }
}
