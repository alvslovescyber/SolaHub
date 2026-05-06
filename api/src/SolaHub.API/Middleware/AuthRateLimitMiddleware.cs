using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;

namespace SolaHub.API.Middleware;

/// <summary>
/// Fixed-window rate limits for auth endpoints, including IP and account/email buckets.
/// </summary>
public sealed class AuthRateLimitMiddleware(
    RequestDelegate next,
    IDistributedCache cache,
    ILogger<AuthRateLimitMiddleware> logger,
    IConnectionMultiplexer? redis = null
)
{
    private const int MaxIpRequestsPerWindow = 60;
    private const int MaxAccountRequestsPerWindow = 10;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> KeyLocks = new();

    public async Task InvokeAsync(HttpContext context)
    {
        if (ShouldLimit(context))
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var minuteBucket = DateTime.UtcNow.Ticks / TimeSpan.TicksPerMinute;
            var path = context.Request.Path.Value ?? "";
            var keys = new List<(string Key, int Limit)>
            {
                ($"solahub:ratelimit:auth:ip:{ip}:{path}:{minuteBucket}", MaxIpRequestsPerWindow),
            };

            var email = await TryReadEmailAsync(context);
            if (email is not null)
            {
                keys.Add(
                    (
                        $"solahub:ratelimit:auth:account:{email}:{path}:{minuteBucket}",
                        MaxAccountRequestsPerWindow
                    )
                );
            }

            CleanupExpiredLocks(minuteBucket);

            foreach (var (key, limit) in keys)
            {
                var limited = redis is not null
                    ? await IsRedisLimitedAsync(key, limit)
                    : await IsDistributedCacheLimitedAsync(key, limit, context.RequestAborted);

                if (limited)
                {
                    context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                    context.Response.Headers.RetryAfter = ((int)Window.TotalSeconds).ToString(
                        CultureInfo.InvariantCulture
                    );
                    await context.Response.WriteAsync("Too many requests. Try again later.");
                    return;
                }
            }
        }

        await next(context);
    }

    private async Task<bool> IsRedisLimitedAsync(string key, int limit)
    {
        try
        {
            var db = redis!.GetDatabase();
            var count = await db.StringIncrementAsync(key);
            if (count == 1)
                await db.KeyExpireAsync(key, Window);
            return count > limit;
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex,
                "Redis rate-limit operation failed; falling back to memory cache."
            );
            return await IsDistributedCacheLimitedAsync(key, limit, CancellationToken.None);
        }
    }

    private async Task<bool> IsDistributedCacheLimitedAsync(
        string key,
        int limit,
        CancellationToken ct
    )
    {
        var keyLock = KeyLocks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await keyLock.WaitAsync(ct);
        try
        {
            var count = 0;
            try
            {
                var raw = await cache.GetStringAsync(key, ct);
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
                logger.LogWarning(
                    ex,
                    "Distributed cache read failed for rate limit; denying request."
                );
                return true;
            }

            if (count >= limit)
                return true;

            try
            {
                await cache.SetStringAsync(
                    key,
                    (count + 1).ToString(CultureInfo.InvariantCulture),
                    new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = Window },
                    ct
                );
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "Distributed cache write failed for rate limit; denying request."
                );
                return true;
            }

            return false;
        }
        finally
        {
            keyLock.Release();
        }
    }

    private static bool ShouldLimit(HttpContext context)
    {
        if (!HttpMethods.IsPost(context.Request.Method))
            return false;

        var path = context.Request.Path;
        return path.StartsWithSegments("/api/auth");
    }

    private static async Task<string?> TryReadEmailAsync(HttpContext context)
    {
        var path = context.Request.Path;
        if (
            !path.StartsWithSegments("/api/auth/login")
            && !path.StartsWithSegments("/api/auth/register")
        )
            return null;

        if (!context.Request.HasJsonContentType())
            return null;

        context.Request.EnableBuffering();
        try
        {
            using var document = await JsonDocument.ParseAsync(
                context.Request.Body,
                cancellationToken: context.RequestAborted
            );
            if (
                document.RootElement.TryGetProperty("email", out var emailElement)
                && emailElement.ValueKind == JsonValueKind.String
            )
            {
                var email = emailElement.GetString()?.Trim().ToLowerInvariant();
                return string.IsNullOrWhiteSpace(email) ? null : email;
            }
        }
        catch (JsonException)
        {
            return null;
        }
        finally
        {
            context.Request.Body.Position = 0;
        }

        return null;
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
