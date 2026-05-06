using System.Collections.Concurrent;
using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Distributed;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using StackExchange.Redis;

namespace SolaHub.API.Hubs;

/// <summary>
/// Real-time collaboration hub for reading plan progress sync and shared annotations.
/// Clients join plan-specific groups to receive targeted updates.
/// </summary>
[Authorize]
public sealed class CollaborationHub(
    IServiceScopeFactory scopeFactory,
    ILogger<CollaborationHub> logger,
    IDistributedCache cache,
    IConnectionMultiplexer? redis = null
) : Hub
{
    private const int MaxVerseRefLength = 128;
    private static readonly TimeSpan HubRateLimitWindow = TimeSpan.FromMinutes(1);
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> HubKeyLocks = new();

    private static string PlanGroup(Guid planId) => $"plan:{planId}";

    private UserId RequireUserId()
    {
        var sub = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var guid))
            throw new HubException("Missing or invalid user identity.");
        return UserId.From(guid);
    }

    private async Task EnsurePlanParticipantAsync(Guid planId, CancellationToken ct)
    {
        var userId = RequireUserId();
        await using var scope = scopeFactory.CreateAsyncScope();
        var repo = scope.ServiceProvider.GetRequiredService<IReadingPlanRepository>();
        // Lightweight existence + participant check; avoids loading the full aggregate per call.
        var isParticipant = await repo.IsParticipantAsync(ReadingPlanId.From(planId), userId, ct);
        if (!isParticipant)
            throw new HubException("You are not a participant in this plan.");
    }

    /// <summary>
    /// Normalizes and validates verse references pushed over SignalR (length / abuse guardrails).
    /// </summary>
    private static string? NormalizeVerseRefOrNull(string? verseRef)
    {
        if (verseRef is null)
            return null;
        var trimmed = verseRef.Trim();
        if (trimmed.Length == 0)
            return null;
        if (trimmed.Length > MaxVerseRefLength)
            throw new HubException(
                $"Verse reference must not exceed {MaxVerseRefLength} characters."
            );
        return trimmed;
    }

    // ─── Connection lifecycle ──────────────────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        var userId = RequireUserId();
        logger.LogDebug(
            "User {UserId} connected (connection={ConnectionId})",
            userId.Value,
            Context.ConnectionId
        );
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var sub = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(sub, out var guid))
        {
            if (exception is not null)
                logger.LogWarning(exception, "User {UserId} disconnected with error", guid);
            else
                logger.LogDebug("User {UserId} disconnected cleanly", guid);
        }
        else if (exception is not null)
            logger.LogWarning(exception, "Connection disconnected with error");

        await base.OnDisconnectedAsync(exception);
    }

    // ─── Plan group management ─────────────────────────────────────────────────

    /// <summary>Subscribe to real-time updates for a specific reading plan.</summary>
    public async Task JoinPlan(Guid planId)
    {
        await EnforceHubRateLimitAsync("join", 60);
        await EnsurePlanParticipantAsync(planId, Context.ConnectionAborted);
        var userId = RequireUserId();
        var group = PlanGroup(planId);
        await Groups.AddToGroupAsync(Context.ConnectionId, group);

        logger.LogDebug("User {UserId} joined plan group {PlanId}", userId.Value, planId);

        await Clients
            .OthersInGroup(group)
            .SendAsync(
                "UserJoined",
                new { UserId = userId.Value, JoinedAt = DateTimeOffset.UtcNow }
            );
    }

    /// <summary>Unsubscribe from real-time updates for a plan.</summary>
    public async Task LeavePlan(Guid planId)
    {
        await EnforceHubRateLimitAsync("leave", 60);
        await EnsurePlanParticipantAsync(planId, Context.ConnectionAborted);
        var userId = RequireUserId();
        var group = PlanGroup(planId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);

        logger.LogDebug("User {UserId} left plan group {PlanId}", userId.Value, planId);

        await Clients
            .OthersInGroup(group)
            .SendAsync("UserLeft", new { UserId = userId.Value, LeftAt = DateTimeOffset.UtcNow });
    }

    // ─── Progress broadcasting ─────────────────────────────────────────────────

    /// <summary>
    /// Broadcast progress update to all plan participants.
    /// The API controller handles persistence; this is purely real-time notification.
    /// </summary>
    public async Task BroadcastProgress(Guid planId, int dayNumber)
    {
        await EnforceHubRateLimitAsync("progress", 120);
        await EnsurePlanParticipantAsync(planId, Context.ConnectionAborted);
        if (dayNumber < 1 || dayNumber > 10_000)
            throw new HubException("Day number is out of allowed range.");

        var userId = RequireUserId();
        var group = PlanGroup(planId);

        await Clients
            .OthersInGroup(group)
            .SendAsync(
                "ProgressUpdated",
                new
                {
                    PlanId = planId,
                    UserId = userId.Value,
                    DayNumber = dayNumber,
                    UpdatedAt = DateTimeOffset.UtcNow,
                }
            );

        logger.LogDebug(
            "User {UserId} broadcast progress day={Day} for plan {PlanId}",
            userId.Value,
            dayNumber,
            planId
        );
    }

    // ─── Annotation broadcasting ───────────────────────────────────────────────

    /// <summary>Share a live verse annotation with plan participants during a study session.</summary>
    public async Task BroadcastAnnotation(Guid planId, string verseRef, string content)
    {
        await EnforceHubRateLimitAsync("annotation", 60);
        await EnsurePlanParticipantAsync(planId, Context.ConnectionAborted);
        var userId = RequireUserId();
        var normalizedRef = NormalizeVerseRefOrNull(verseRef);
        if (normalizedRef is null || string.IsNullOrWhiteSpace(content))
            return;

        var truncated = content.Length > 1_000 ? content[..1_000] : content;
        var group = PlanGroup(planId);

        await Clients
            .OthersInGroup(group)
            .SendAsync(
                "AnnotationReceived",
                new
                {
                    PlanId = planId,
                    UserId = userId.Value,
                    VerseRef = normalizedRef,
                    Content = truncated,
                    SentAt = DateTimeOffset.UtcNow,
                }
            );
    }

    // ─── Presenter mode ────────────────────────────────────────────────────────

    /// <summary>Push the current verse reference to all attendees in presenter mode.</summary>
    public async Task PushPresenterVerse(Guid planId, string verseRef)
    {
        await EnforceHubRateLimitAsync("presenter", 120);
        await EnsurePlanParticipantAsync(planId, Context.ConnectionAborted);
        var userId = RequireUserId();
        var normalizedRef = NormalizeVerseRefOrNull(verseRef);
        if (normalizedRef is null)
            return;

        var group = PlanGroup(planId);
        await Clients
            .OthersInGroup(group)
            .SendAsync(
                "PresenterVerseChanged",
                new
                {
                    PlanId = planId,
                    PresenterUserId = userId.Value,
                    VerseRef = normalizedRef,
                    PushedAt = DateTimeOffset.UtcNow,
                }
            );
    }

    private async Task EnforceHubRateLimitAsync(string action, int limit)
    {
        var userId = RequireUserId();
        var minuteBucket = DateTime.UtcNow.Ticks / TimeSpan.TicksPerMinute;
        var key = $"solahub:ratelimit:hub:{userId.Value}:{action}:{minuteBucket}";
        CleanupExpiredLocks(minuteBucket);

        var limited = redis is not null
            ? await IsRedisLimitedAsync(key, limit)
            : await IsDistributedCacheLimitedAsync(key, limit, Context.ConnectionAborted);

        if (limited)
            throw new HubException("Too many realtime requests. Try again later.");
    }

    private async Task<bool> IsRedisLimitedAsync(string key, int limit)
    {
        try
        {
            var db = redis!.GetDatabase();
            var count = await db.StringIncrementAsync(key);
            if (count == 1)
                await db.KeyExpireAsync(key, HubRateLimitWindow);
            return count > limit;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis hub rate-limit operation failed; falling back to cache.");
            return await IsDistributedCacheLimitedAsync(key, limit, Context.ConnectionAborted);
        }
    }

    private async Task<bool> IsDistributedCacheLimitedAsync(
        string key,
        int limit,
        CancellationToken ct
    )
    {
        var keyLock = HubKeyLocks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await keyLock.WaitAsync(ct);
        try
        {
            var raw = await cache.GetStringAsync(key, ct);
            var count =
                raw is not null
                && int.TryParse(
                    raw,
                    NumberStyles.Integer,
                    CultureInfo.InvariantCulture,
                    out var parsed
                )
                    ? parsed
                    : 0;

            if (count >= limit)
                return true;

            await cache.SetStringAsync(
                key,
                (count + 1).ToString(CultureInfo.InvariantCulture),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = HubRateLimitWindow,
                },
                ct
            );
            return false;
        }
        finally
        {
            keyLock.Release();
        }
    }

    private static void CleanupExpiredLocks(long currentMinuteBucket)
    {
        var oldestLiveBucket = currentMinuteBucket - 2;
        foreach (var entry in HubKeyLocks)
        {
            if (
                TryReadMinuteBucket(entry.Key, out var entryBucket)
                && entryBucket < oldestLiveBucket
            )
            {
                HubKeyLocks.TryRemove(entry.Key, out _);
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
