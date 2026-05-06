using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using SolaHub.Core.ValueObjects;

namespace SolaHub.API.Extensions;

/// <summary>
/// Resolves the authenticated user's id from the JWT identity claims.
/// Invalid tokens yield <see cref="UnauthorizedAccessException"/>, mapped to HTTP 401 by global exception middleware.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public static UserId GetRequiredUserId(this ClaimsPrincipal user)
    {
        var sub =
            user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var guid))
        {
            throw new UnauthorizedAccessException(
                "The access token is missing a valid user identifier (sub claim)."
            );
        }

        return UserId.From(guid);
    }
}
