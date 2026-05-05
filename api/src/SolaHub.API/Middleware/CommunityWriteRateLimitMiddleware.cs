using System.Collections.Concurrent;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;

namespace SolaHub.API.Middleware;

/// <summary>
/// Fixed-window write limiter for community publishing/reporting endpoints.
/// </summary>
public sealed class CommunityWriteRateLimitMiddleware(
    RequestDelegate next,
    IDistributedCache cache,
    ILogger<CommunityWriteRateLimitMiddleware> logger,
    IConnectionMultiplexer? redis = null
)
{
    private const int MaxRequestsPerWindow = 20;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> KeyLocks = new();

    public async Task InvokeAsync(HttpContext context)
    {
        if (ShouldLimit(context))
        {
            var minuteBucket = DateTime.UtcNow.Ticks / TimeSpan.TicksPerMinute;
            var principalKey = ResolvePrincipalKey(context);
            var key = $"solahub:ratelimit:community:{principalKey}:{minuteBucket}";
            CleanupExpiredLocks(minuteBucket);

            var limited = redis is not null
                ? await IsRedisLimitedAsync(key)
                : await IsDistributedCacheLimitedAsync(key, context.RequestAborted);

            if (limited)
            {
                context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.Response.Headers.RetryAfter = ((int)Window.TotalSeconds).ToString(
                    CultureInfo.InvariantCulture
                );
                await context.Response.WriteAsync("Too many community writes. Try again later.");
                return;
            }
        }

        await next(context);
    }

    private async Task<bool> IsRedisLimitedAsync(string key)
    {
        try
        {
            var db = redis!.GetDatabase();
            var count = await db.StringIncrementAsync(key);
            if (count == 1)
                await db.KeyExpireAsync(key, Window);
            return count > MaxRequestsPerWindow;
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Redis community rate-limit operation failed; falling back to memory cache."
            );
            return await IsDistributedCacheLimitedAsync(key, CancellationToken.None);
        }
    }

    private async Task<bool> IsDistributedCacheLimitedAsync(string key, CancellationToken ct)
    {
        var keyLock = KeyLocks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await keyLock.WaitAsync(ct);
        try
        {
            var count = 0;
            var raw = await cache.GetStringAsync(key, ct);
            if (
                raw is not null
                && !int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out count)
            )
            {
                logger.LogWarning(
                    "Discarding non-integer community rate-limit counter for key {Key}: {Raw}",
                    key,
                    raw
                );
                count = 0;
            }

            if (count >= MaxRequestsPerWindow)
                return true;

            await cache.SetStringAsync(
                key,
                (count + 1).ToString(CultureInfo.InvariantCulture),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = Window },
                ct
            );

            return false;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Community rate-limit cache failed; denying request.");
            return true;
        }
        finally
        {
            keyLock.Release();
        }
    }

    private static bool ShouldLimit(HttpContext context)
    {
        if (
            !HttpMethods.IsPost(context.Request.Method)
            && !HttpMethods.IsPut(context.Request.Method)
            && !HttpMethods.IsDelete(context.Request.Method)
        )
            return false;

        return context.Request.Path.StartsWithSegments("/api/community");
    }

    private static string ResolvePrincipalKey(HttpContext context)
    {
        var userId =
            context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!string.IsNullOrWhiteSpace(userId))
            return $"user:{userId}";

        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return $"ip:{ip}";
    }

    private static void CleanupExpiredLocks(long currentMinuteBucket)
    {
        var oldestLiveBucket = currentMinuteBucket - 2;
        foreach (var entry in KeyLocks)
        {
            if (
                TryReadMinuteBucket(entry.Key, out var entryBucket)
                && entryBucket < oldestLiveBucket
            )
            {
                KeyLocks.TryRemove(entry.Key, out _);
            }
        }
    }

    private static bool TryReadMinuteBucket(string key, out long bucket)
    {
        bucket = 0;
        var separator = key.LastIndexOf(':');
        return separator >= 0
            && long.TryParse(
                key.AsSpan(separator + 1),
                NumberStyles.Integer,
                CultureInfo.InvariantCulture,
                out bucket
            );
    }
}
