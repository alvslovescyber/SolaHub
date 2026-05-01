using Microsoft.Extensions.Caching.Distributed;

namespace SolaHub.API.Middleware;

/// <summary>
/// Simple fixed-window rate limit for unauthenticated auth endpoints (login, register, refresh).
/// </summary>
public sealed class AuthRateLimitMiddleware(RequestDelegate next, IDistributedCache cache)
{
    private const int MaxRequestsPerWindow = 60;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    public async Task InvokeAsync(HttpContext context)
    {
        if (ShouldLimit(context))
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var key =
                $"solahub:ratelimit:auth:{ip}:{context.Request.Path.Value ?? ""}:{Window.Ticks}";

            var raw = await cache.GetStringAsync(key, context.RequestAborted);
            var count = raw is null ? 0 : int.Parse(raw, System.Globalization.CultureInfo.InvariantCulture);
            if (count >= MaxRequestsPerWindow)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers.RetryAfter = ((int)Window.TotalSeconds).ToString(
                    System.Globalization.CultureInfo.InvariantCulture
                );
                await context.Response.WriteAsync("Too many requests. Try again later.");
                return;
            }

            await cache.SetStringAsync(
                key,
                (count + 1).ToString(System.Globalization.CultureInfo.InvariantCulture),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = Window },
                context.RequestAborted
            );
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
