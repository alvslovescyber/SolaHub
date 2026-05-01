using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;

namespace SolaHub.API.Hubs;

/// <summary>
/// Real-time collaboration hub for reading plan progress sync and shared annotations.
/// Clients join plan-specific groups to receive targeted updates.
/// </summary>
[Authorize]
public sealed class CollaborationHub(IServiceScopeFactory scopeFactory, ILogger<CollaborationHub> logger)
    : Hub
{
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
        var plan = await repo.GetByIdAsync(ReadingPlanId.From(planId), ct);
        if (plan is null || !plan.Participants.Any(p => p.UserId == userId))
            throw new HubException("You are not a participant in this plan.");
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
                logger.LogWarning(
                    exception,
                    "User {UserId} disconnected with error",
                    guid
                );
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
        await EnsurePlanParticipantAsync(planId, Context.ConnectionAborted);
        var userId = RequireUserId();
        var group = PlanGroup(planId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);

        logger.LogDebug("User {UserId} left plan group {PlanId}", userId.Value, planId);

        await Clients
            .OthersInGroup(group)
            .SendAsync(
                "UserLeft",
                new { UserId = userId.Value, LeftAt = DateTimeOffset.UtcNow }
            );
    }

    // ─── Progress broadcasting ─────────────────────────────────────────────────

    /// <summary>
    /// Broadcast progress update to all plan participants.
    /// The API controller handles persistence; this is purely real-time notification.
    /// </summary>
    public async Task BroadcastProgress(Guid planId, int dayNumber)
    {
        await EnsurePlanParticipantAsync(planId, Context.ConnectionAborted);
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
        await EnsurePlanParticipantAsync(planId, Context.ConnectionAborted);
        var userId = RequireUserId();
        if (string.IsNullOrWhiteSpace(verseRef) || string.IsNullOrWhiteSpace(content))
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
                    VerseRef = verseRef,
                    Content = truncated,
                    SentAt = DateTimeOffset.UtcNow,
                }
            );
    }

    // ─── Presenter mode ────────────────────────────────────────────────────────

    /// <summary>Push the current verse reference to all attendees in presenter mode.</summary>
    public async Task PushPresenterVerse(Guid planId, string verseRef)
    {
        await EnsurePlanParticipantAsync(planId, Context.ConnectionAborted);
        var userId = RequireUserId();
        if (string.IsNullOrWhiteSpace(verseRef))
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
                    VerseRef = verseRef,
                    PushedAt = DateTimeOffset.UtcNow,
                }
            );
    }
}
