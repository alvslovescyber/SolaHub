using System.ComponentModel.DataAnnotations;
using System.Text;

namespace SolaHub.Infrastructure.Auth;

/// <summary>
/// Strongly-typed JWT configuration bound from <c>Jwt:*</c> in app settings.
/// All token lifetimes are sourced from here so handlers and the token service
/// stay in sync (no hard-coded lifetime constants drifting from config).
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string SecretKey { get; init; } = string.Empty;

    [Required]
    public string Issuer { get; init; } = "SolaHub";

    [Required]
    public string Audience { get; init; } = "SolaHub.Desktop";

    [Range(1, 60 * 24)]
    public int AccessTokenExpiryMinutes { get; init; } = 60;

    [Range(1, 365)]
    public int RefreshTokenExpiryDays { get; init; } = 30;

    public TimeSpan AccessTokenExpiry => TimeSpan.FromMinutes(AccessTokenExpiryMinutes);

    public TimeSpan RefreshTokenExpiry => TimeSpan.FromDays(RefreshTokenExpiryDays);

    /// <summary>
    /// Validates that the secret meets the minimum HMAC-SHA256 strength requirement.
    /// Called at startup (DataAnnotations + ValidateOnStart) to fail fast.
    /// </summary>
    public ValidationResult? ValidateSecret()
    {
        if (Encoding.UTF8.GetByteCount(SecretKey) < 32)
        {
            return new ValidationResult("Jwt:SecretKey must be at least 32 bytes for HMAC-SHA256.");
        }
        return ValidationResult.Success;
    }
}
