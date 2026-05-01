using FluentAssertions;
using SolaHub.Core.Entities;
using SolaHub.Core.Enums;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Tests.Unit.Domain;

public sealed class ReadingPlanEntityTests
{
    private readonly UserId _creatorId = UserId.New();

    // ─── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public void Create_WithValidInputs_ReturnsSuccessWithCreatorAsParticipant()
    {
        var result = ReadingPlan.Create(_creatorId, "Genesis Plan", "Read through Genesis", true);

        result.IsSuccess.Should().BeTrue();
        result.Value.Title.Should().Be("Genesis Plan");
        result.Value.Status.Should().Be(PlanStatus.Draft);
        result.Value.Participants.Should().HaveCount(1);
        result.Value.Participants[0].UserId.Should().Be(_creatorId);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public void Create_WithEmptyTitle_ReturnsFailure(string title)
    {
        var result = ReadingPlan.Create(_creatorId, title, null, false);
        result.IsFailure.Should().BeTrue();
    }

    // ─── AddParticipant ────────────────────────────────────────────────────────

    [Fact]
    public void AddParticipant_NewUser_Succeeds()
    {
        var plan = CreateActivePlan();
        var newUser = UserId.New();

        var result = plan.AddParticipant(newUser);

        result.IsSuccess.Should().BeTrue();
        plan.Participants.Should().Contain(p => p.UserId == newUser);
    }

    [Fact]
    public void AddParticipant_ExistingUser_ReturnsConflict()
    {
        var plan = CreateActivePlan();

        // Creator is already a participant
        var result = plan.AddParticipant(_creatorId);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Plans.AlreadyParticipant");
    }

    [Fact]
    public void AddParticipant_ToArchivedPlan_ReturnsFailure()
    {
        var plan = CreateActivePlan();
        plan.Archive();
        var newUser = UserId.New();

        var result = plan.AddParticipant(newUser);

        result.IsFailure.Should().BeTrue();
    }

    // ─── RemoveParticipant ─────────────────────────────────────────────────────

    [Fact]
    public void RemoveParticipant_Creator_ReturnsFailure()
    {
        var plan = CreateActivePlan();

        var result = plan.RemoveParticipant(_creatorId);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Plans.CreatorCannotLeave");
    }

    [Fact]
    public void RemoveParticipant_NonCreator_Succeeds()
    {
        var plan = CreateActivePlan();
        var member = UserId.New();
        plan.AddParticipant(member);

        var result = plan.RemoveParticipant(member);

        result.IsSuccess.Should().BeTrue();
        plan.Participants.Should().NotContain(p => p.UserId == member);
    }

    // ─── Publish ──────────────────────────────────────────────────────────────

    [Fact]
    public void Publish_PlanWithDays_Succeeds()
    {
        var plan = CreatePlan();
        plan.AddDay(1, "Day 1", [VerseRef.Parse("GEN.1.1")]);

        var result = plan.Publish();

        result.IsSuccess.Should().BeTrue();
        plan.Status.Should().Be(PlanStatus.Active);
    }

    [Fact]
    public void Publish_PlanWithoutDays_ReturnsFailure()
    {
        var plan = CreatePlan();

        var result = plan.Publish();

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Plans.NoDays");
    }

    // ─── RecordProgress ───────────────────────────────────────────────────────

    [Fact]
    public void RecordProgress_ForParticipant_Succeeds()
    {
        var plan = CreateActivePlan();

        var result = plan.RecordProgress(_creatorId, 1);

        result.IsSuccess.Should().BeTrue();
        plan.Participants[0].CurrentDay.Should().Be(1);
    }

    [Fact]
    public void RecordProgress_ForNonParticipant_ReturnsFailure()
    {
        var plan = CreateActivePlan();
        var stranger = UserId.New();

        var result = plan.RecordProgress(stranger, 1);

        result.IsFailure.Should().BeTrue();
    }

    // ─── AddDay ───────────────────────────────────────────────────────────────

    [Fact]
    public void AddDay_OnDraftPlan_Succeeds()
    {
        var plan = CreatePlan();

        var result = plan.AddDay(1, "Day 1", [VerseRef.Parse("GEN.1.1")]);

        result.IsSuccess.Should().BeTrue();
        plan.Days.Should().HaveCount(1);
    }

    [Fact]
    public void AddDay_OnActivePlan_ReturnsFailure()
    {
        var plan = CreateActivePlan();

        var result = plan.AddDay(2, "Day 2", [VerseRef.Parse("GEN.1.2")]);

        result.IsFailure.Should().BeTrue();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private ReadingPlan CreatePlan() =>
        ReadingPlan.Create(_creatorId, "Test Plan", null, true).Value;

    private ReadingPlan CreateActivePlan()
    {
        var plan = CreatePlan();
        plan.AddDay(1, "Day 1", [VerseRef.Parse("GEN.1.1")]);
        plan.Publish();
        return plan;
    }
}
