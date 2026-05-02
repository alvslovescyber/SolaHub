using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using SolaHub.Core.Interfaces.Services;

namespace SolaHub.Infrastructure.Auth;

public sealed class RefreshTokenHasher(IOptions<JwtOptions> options) : IRefreshTokenHasher
{
    private readonly byte[] _key = Encoding.UTF8.GetBytes(options.Value.SecretKey);

    public string Hash(string refreshToken)
    {
        if (string.IsNullOrEmpty(refreshToken))
            throw new ArgumentException("Refresh token cannot be empty.", nameof(refreshToken));

        using var hmac = new HMACSHA256(_key);
        return Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(refreshToken)));
    }
}
