using SolaHub.Core.Common;
using SolaHub.Core.Enums;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Entities;

public sealed class ReadingPlan : BaseEntity<ReadingPlanId>
{
    private readonly List<ReadingPlanDay> _days = [];
    private readonly List<PlanParticipant> _participants = [];

    // Required by EF Core for materialization — never called by application code
    private ReadingPlan()
        : base(default!)
    {
        CreatedBy = default;
        Title = string.Empty;
    }

    private ReadingPlan(ReadingPlanId id, UserId createdBy, string title)
        : base(id)
    {
        CreatedBy = createdBy;
        Title = title;
    }

    public string Title { get; private set; }
    public string? Description { get; private set; }
    public bool IsPublic { get; private set; }
    public UserId CreatedBy { get; private set; }
    public ChurchId? ChurchId { get; private set; }
    public PlanStatus Status { get; private set; } = PlanStatus.Draft;
    public IReadOnlyList<ReadingPlanDay> Days => _days.AsReadOnly();
    public IReadOnlyList<PlanParticipant> Participants => _participants.AsReadOnly();

    // ─── Factory ──────────────────────────────────────────────────────────────

    public static Result<ReadingPlan> Create(
        UserId createdBy,
        string title,
        string? description,
        bool isPublic
    )
    {
        if (string.IsNullOrWhiteSpace(title))
            return Error.Validation("Plans.TitleRequired", "Title cannot be empty.");

        if (title.Length > 200)
            return Error.Validation("Plans.TitleTooLong", "Title must not exceed 200 characters.");

        var plan = new ReadingPlan(ReadingPlanId.New(), createdBy, title.Trim())
        {
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            IsPublic = isPublic,
        };

        // Creator is auto-enrolled as first participant
        plan._participants.Add(new PlanParticipant(createdBy));
        return plan;
    }

    // ─── Days ─────────────────────────────────────────────────────────────────

    public Result AddDay(int dayNumber, string title, IReadOnlyList<VerseRef> verseRefs)
    {
        if (Status != PlanStatus.Draft)
            return Result.Failure(
                Error.Conflict("Plans.NotDraft", "Can only modify days of a Draft plan.")
            );

        if (dayNumber <= 0)
            return Result.Failure(
                Error.Validation("Plans.InvalidDayNumber", "Day number must be positive.")
            );

        if (string.IsNullOrWhiteSpace(title))
            return Result.Failure(
                Error.Validation("Plans.DayTitleRequired", "Day title cannot be empty.")
            );

        if (_days.Any(d => d.DayNumber == dayNumber))
            return Result.Failure(
                Error.Conflict("Plans.DuplicateDay", $"Day {dayNumber} already exists.")
            );

        if (verseRefs.Count == 0)
            return Result.Failure(
                Error.Validation(
                    "Plans.NoVerseRefs",
                    "At least one verse reference is required per day."
                )
            );

        _days.Add(new ReadingPlanDay(dayNumber, title.Trim(), verseRefs));
        _days.Sort((a, b) => a.DayNumber.CompareTo(b.DayNumber));
        MarkUpdated();
        return Result.Ok;
    }

    // ─── Participants ─────────────────────────────────────────────────────────

    public Result AddParticipant(UserId userId)
    {
        if (Status == PlanStatus.Archived)
            return Result.Failure(
                Error.Conflict("Plans.Archived", "Cannot join an archived plan.")
            );

        if (_participants.Any(p => p.UserId == userId))
            return Result.Failure(
                new Error(
                    "Plans.AlreadyParticipant",
                    "User is already a participant.",
                    ErrorType.Conflict
                )
            );

        _participants.Add(new PlanParticipant(userId));
        MarkUpdated();
        return Result.Ok;
    }

    public Result RemoveParticipant(UserId userId)
    {
        if (userId == CreatedBy)
            return Result.Failure(
                new Error(
                    "Plans.CreatorCannotLeave",
                    "Plan creator cannot leave the plan.",
                    ErrorType.Conflict
                )
            );

        var participant = _participants.FirstOrDefault(p => p.UserId == userId);
        if (participant is null)
            return Result.Failure(
                Error.NotFound(
                    "Plans.ParticipantNotFound",
                    $"User {userId.Value} is not a participant."
                )
            );

        _participants.Remove(participant);
        MarkUpdated();
        return Result.Ok;
    }

    // ─── Progress ─────────────────────────────────────────────────────────────

    public Result RecordProgress(UserId userId, int dayNumber)
    {
        var participant = _participants.FirstOrDefault(p => p.UserId == userId);
        if (participant is null)
            return Result.Failure(
                new Error(
                    "Plans.NotParticipant",
                    "You are not a participant in this plan.",
                    ErrorType.Forbidden
                )
            );

        if (!_days.Any(d => d.DayNumber == dayNumber))
            return Result.Failure(
                Error.NotFound("Plans.DayNotFound", $"Day {dayNumber} does not exist in this plan.")
            );

        participant.AdvanceToDay(dayNumber);
        MarkUpdated();
        return Result.Ok;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    public Result Publish()
    {
        if (Status != PlanStatus.Draft)
            return Result.Failure(
                Error.Conflict("Plans.NotDraft", "Only Draft plans can be published.")
            );

        if (_days.Count == 0)
            return Result.Failure(
                new Error(
                    "Plans.NoDays",
                    "Plan must have at least one day before publishing.",
                    ErrorType.Conflict
                )
            );

        Status = PlanStatus.Active;
        MarkUpdated();
        return Result.Ok;
    }

    public Result Archive()
    {
        if (Status == PlanStatus.Archived)
            return Result.Failure(
                Error.Conflict("Plans.AlreadyArchived", "Plan is already archived.")
            );

        Status = PlanStatus.Archived;
        MarkUpdated();
        return Result.Ok;
    }

    public void AssignToChurch(ChurchId churchId)
    {
        ChurchId = churchId;
        MarkUpdated();
    }
}

public sealed class ReadingPlanDay
{
    // EF Core uses this field for JSONB persistence via UsePropertyAccessMode(Field)
    private List<string> _verseRefKeys = [];

    // Private parameterless constructor for EF Core materialization
    private ReadingPlanDay() { }

    public ReadingPlanDay(int dayNumber, string title, IReadOnlyList<VerseRef> verseRefs)
    {
        DayNumber = dayNumber;
        Title = title;
        _verseRefKeys = [.. verseRefs.Select(v => v.Key)];
    }

    public int DayNumber { get; private set; }
    public string Title { get; private set; } = string.Empty;

    // Computed from the persisted keys — parsed on first access
    public IReadOnlyList<VerseRef> VerseRefs =>
        _verseRefKeys.Select(VerseRef.Parse).ToList().AsReadOnly();
}

public sealed class PlanParticipant
{
    // Private parameterless constructor for EF Core materialization
    private PlanParticipant() { }

    public PlanParticipant(UserId userId)
    {
        UserId = userId;
        JoinedAt = DateTimeOffset.UtcNow;
    }

    public UserId UserId { get; private set; }
    public int CurrentDay { get; private set; }
    public DateTimeOffset JoinedAt { get; private set; }

    internal void AdvanceToDay(int day)
    {
        if (day > CurrentDay)
            CurrentDay = day;
    }
}
