using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SolaHub.Core.ValueObjects;

namespace SolaHub.API.Hubs;

/// <summary>
/// Real-time collaboration hub for reading plan progress sync and shared annotations.
/// Clients join plan-specific groups to receive targeted updates.
/// </summary>
[Authorize]
public sealed class CollaborationHub(ILogger<CollaborationHub> logger) : Hub
{
    // ─── Group helpers ─────────────────────────────────────────────────────────
    private static string PlanGroup(Guid planId) => $"plan:{planId}";

    private UserId CurrentUserId =>
        UserId.From(Guid.Parse(Context.User!.FindFirstValue(ClaimTypes.NameIdentifier)!));

    // ─── Connection lifecycle ──────────────────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        logger.LogDebug("User {UserId} connected (connection={ConnectionId})",
            CurrentUserId.Value, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception is not null)
            logger.LogWarning(exception, "User {UserId} disconnected with error", CurrentUserId.Value);
        else
            logger.LogDebug("User {UserId} disconnected cleanly", CurrentUserId.Value);

        await base.OnDisconnectedAsync(exception);
    }

    // ─── Plan group management ─────────────────────────────────────────────────

    /// <summary>Subscribe to real-time updates for a specific reading plan.</summary>
    public async Task JoinPlan(Guid planId)
    {
        var group = PlanGroup(planId);
        await Groups.AddToGroupAsync(Context.ConnectionId, group);

        logger.LogDebug("User {UserId} joined plan group {PlanId}", CurrentUserId.Value, planId);

        // Notify others in the group that this user is now active
        await Clients.OthersInGroup(group).SendAsync("UserJoined", new
        {
            UserId = CurrentUserId.Value,
            JoinedAt = DateTimeOffset.UtcNow,
        });
    }

    /// <summary>Unsubscribe from real-time updates for a plan.</summary>
    public async Task LeavePlan(Guid planId)
    {
        var group = PlanGroup(planId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);

        logger.LogDebug("User {UserId} left plan group {PlanId}", CurrentUserId.Value, planId);

        await Clients.OthersInGroup(group).SendAsync("UserLeft", new
        {
            UserId = CurrentUserId.Value,
            LeftAt = DateTimeOffset.UtcNow,
        });
    }

    // ─── Progress broadcasting ─────────────────────────────────────────────────

    /// <summary>
    /// Broadcast progress update to all plan participants.
    /// The API controller handles persistence; this is purely real-time notification.
    /// </summary>
    public async Task BroadcastProgress(Guid planId, int dayNumber)
    {
        var group = PlanGroup(planId);

        await Clients.OthersInGroup(group).SendAsync("ProgressUpdated", new
        {
            PlanId = planId,
            UserId = CurrentUserId.Value,
            DayNumber = dayNumber,
            UpdatedAt = DateTimeOffset.UtcNow,
        });

        logger.LogDebug("User {UserId} broadcast progress day={Day} for plan {PlanId}",
            CurrentUserId.Value, dayNumber, planId);
    }

    // ─── Annotation broadcasting ───────────────────────────────────────────────

    /// <summary>Share a live verse annotation with plan participants during a study session.</summary>
    public async Task BroadcastAnnotation(Guid planId, string verseRef, string content)
    {
        if (string.IsNullOrWhiteSpace(verseRef) || string.IsNullOrWhiteSpace(content))
            return;

        // Truncate to avoid abusive payloads (max 1,000 chars for live annotations)
        var truncated = content.Length > 1_000 ? content[..1_000] : content;
        var group = PlanGroup(planId);

        await Clients.OthersInGroup(group).SendAsync("AnnotationReceived", new
        {
            PlanId = planId,
            UserId = CurrentUserId.Value,
            VerseRef = verseRef,
            Content = truncated,
            SentAt = DateTimeOffset.UtcNow,
        });
    }

    // ─── Presenter mode ────────────────────────────────────────────────────────

    /// <summary>Push the current verse reference to all attendees in presenter mode.</summary>
    public async Task PushPresenterVerse(Guid planId, string verseRef)
    {
        if (string.IsNullOrWhiteSpace(verseRef))
            return;

        var group = PlanGroup(planId);
        await Clients.OthersInGroup(group).SendAsync("PresenterVerseChanged", new
        {
            PlanId = planId,
            PresenterUserId = CurrentUserId.Value,
            VerseRef = verseRef,
            PushedAt = DateTimeOffset.UtcNow,
        });
    }
}
