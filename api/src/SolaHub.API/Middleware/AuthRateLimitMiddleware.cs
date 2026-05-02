using System.Globalization;
using Microsoft.Extensions.Caching.Distributed;

namespace SolaHub.API.Middleware;

/// <summary>
/// Simple fixed-window rate limit for unauthenticated auth endpoints (login, register, refresh).
/// </summary>
public sealed class AuthRateLimitMiddleware(
    RequestDelegate next,
    IDistributedCache cache,
    ILogger<AuthRateLimitMiddleware> logger
)
{
    private const int MaxRequestsPerWindow = 60;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    public async Task InvokeAsync(HttpContext context)
    {
        if (ShouldLimit(context))
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var minuteBucket = DateTime.UtcNow.Ticks / TimeSpan.TicksPerMinute;
            var path = context.Request.Path.Value ?? "";
            var key = $"solahub:ratelimit:auth:{ip}:{path}:{minuteBucket}";

            var count = 0;
            try
            {
                var raw = await cache.GetStringAsync(key, context.RequestAborted);
                if (
                    raw is not null
                    && !int.TryParse(
                        raw,
                        NumberStyles.Integer,
                        CultureInfo.InvariantCulture,
                        out count
                    )
                )
                {
                    // Corrupted/legacy cache entry – treat as fresh window and log.
                    logger.LogWarning(
                        "Discarding non-integer rate-limit counter for key {Key}: {Raw}",
                        key,
                        raw
                    );
                    count = 0;
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Fail open on cache outages so a flaky cache cannot lock out auth.
                logger.LogWarning(
                    ex,
                    "Distributed cache read failed for rate limit; failing open."
                );
                await next(context);
                return;
            }

            if (count >= MaxRequestsPerWindow)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers.RetryAfter = ((int)Window.TotalSeconds).ToString(
                    CultureInfo.InvariantCulture
                );
                await context.Response.WriteAsync("Too many requests. Try again later.");
                return;
            }

            try
            {
                await cache.SetStringAsync(
                    key,
                    (count + 1).ToString(CultureInfo.InvariantCulture),
                    new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = Window },
                    context.RequestAborted
                );
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Distributed cache write failed for rate limit; continuing.");
            }
        }

        await next(context);
    }

    private static bool ShouldLimit(HttpContext context)
    {
        if (!HttpMethods.IsPost(context.Request.Method))
            return false;

        var path = context.Request.Path;
        return path.StartsWithSegments("/api/auth/login")
            || path.StartsWithSegments("/api/auth/register")
            || path.StartsWithSegments("/api/auth/refresh");
    }
}
