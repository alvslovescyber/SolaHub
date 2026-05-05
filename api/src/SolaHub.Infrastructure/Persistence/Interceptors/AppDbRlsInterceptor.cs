using System.Data.Common;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace SolaHub.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Sets PostgreSQL session-level GUCs before each DB operation so that RLS
/// policies can identify the calling user without a second round-trip.
///
/// app.current_user_id — the authenticated user's UUID (empty string if unauthenticated)
/// app.is_admin        — 'true' when the JWT carries the Admin role claim
///
/// Registered as a singleton because IHttpContextAccessor is singleton and uses
/// AsyncLocal internally to isolate per-request values.
/// </summary>
public sealed class AppDbRlsInterceptor(IHttpContextAccessor httpContextAccessor)
    : DbConnectionInterceptor
{
    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = BuildSetStatement(httpContextAccessor.HttpContext);
        cmd.ExecuteNonQuery();
    }

    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default
    )
    {
        using var cmd = connection.CreateCommand();
        cmd.CommandText = BuildSetStatement(httpContextAccessor.HttpContext);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string BuildSetStatement(HttpContext? ctx)
    {
        var userId = "";
        var isAdmin = "false";

        if (ctx?.User?.Identity?.IsAuthenticated == true)
        {
            var raw = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(raw, out var parsed))
                userId = parsed.ToString("D");

            if (ctx.User.IsInRole("Admin"))
                isAdmin = "true";
        }

        // Values are either a validated UUID (D-format) or 'true'/'false' — no injection risk.
        return $"SET app.current_user_id = '{userId}'; SET app.is_admin = '{isAdmin}';";
    }
}
