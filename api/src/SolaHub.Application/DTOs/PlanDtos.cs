namespace SolaHub.Application.DTOs;

public sealed record ReadingPlanDto(
    Guid Id,
    string Title,
    string? Description,
    string Status,
    bool IsPublic,
    Guid CreatedBy,
    DateTimeOffset CreatedAt,
    IReadOnlyList<PlanDayDto> Days,
    IReadOnlyList<PlanParticipantDto> Participants);

public sealed record PlanDayDto(
    int DayNumber,
    string Title,
    IReadOnlyList<string> VerseRefs);

public sealed record PlanParticipantDto(
    Guid UserId,
    int CurrentDay,
    DateTimeOffset JoinedAt);
