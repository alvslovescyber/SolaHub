using FluentAssertions;
using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Tests.Unit.Domain;

public sealed class VerseNoteEntityTests
{
    private readonly UserId _userId = UserId.New();

    // ─── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public void Create_WithValidInputs_ReturnsSuccess()
    {
        var verseRef = VerseRef.Parse("JHN.3.16");

        var result = VerseNote.Create(_userId, verseRef, "For God so loved the world...", ["love", "salvation"]);

        result.IsSuccess.Should().BeTrue();
        result.Value.Content.Should().Be("For God so loved the world...");
        result.Value.UserId.Should().Be(_userId);
        result.Value.VerseRef.Should().Be(verseRef);
        result.Value.Tags.Should().BeEquivalentTo(new[] { "love", "salvation" });
    }

    [Fact]
    public void Create_WithEmptyContent_ReturnsFailure()
    {
        var verseRef = VerseRef.Parse("JHN.3.16");
        var result = VerseNote.Create(_userId, verseRef, "", []);
        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public void Create_WithContentExceedingMaxLength_ReturnsFailure()
    {
        var verseRef = VerseRef.Parse("JHN.3.16");
        var longContent = new string('x', 10_001);

        var result = VerseNote.Create(_userId, verseRef, longContent, []);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Notes.ContentTooLong");
    }

    [Fact]
    public void Create_WithTooManyTags_ReturnsFailure()
    {
        var verseRef = VerseRef.Parse("JHN.3.16");
        var tooManyTags = Enumerable.Range(1, 21).Select(i => $"tag{i}").ToList();

        var result = VerseNote.Create(_userId, verseRef, "content", tooManyTags);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Notes.TooManyTags");
    }

    // ─── SetTags ───────────────────────────────────────────────────────────────

    [Fact]
    public void SetTags_NormalizesTagsToLowercase()
    {
        var note = CreateValidNote();
        var updateResult = note.SetTags(["FAITH", "Grace", "LOVE"]);

        updateResult.IsSuccess.Should().BeTrue();
        note.Tags.Should().BeEquivalentTo(new[] { "faith", "grace", "love" });
    }

    [Fact]
    public void SetTags_DeduplicatesTags()
    {
        var note = CreateValidNote();
        var updateResult = note.SetTags(["faith", "faith", "FAITH"]);

        updateResult.IsSuccess.Should().BeTrue();
        note.Tags.Should().HaveCount(1).And.Contain("faith");
    }

    [Fact]
    public void SetTags_RejectsTagExceedingMaxLength()
    {
        var note = CreateValidNote();
        var longTag = new string('x', 51);

        var result = note.SetTags([longTag]);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Notes.TagTooLong");
    }

    // ─── SetShared ────────────────────────────────────────────────────────────

    [Fact]
    public void SetShared_ChangesSharedState()
    {
        var note = CreateValidNote();
        note.IsShared.Should().BeFalse();

        note.SetShared(true);
        note.IsShared.Should().BeTrue();

        note.SetShared(false);
        note.IsShared.Should().BeFalse();
    }

    // ─── UpdateContent ────────────────────────────────────────────────────────

    [Fact]
    public void UpdateContent_WithValidContent_Succeeds()
    {
        var note = CreateValidNote();
        var result = note.UpdateContent("New content here.");

        result.IsSuccess.Should().BeTrue();
        note.Content.Should().Be("New content here.");
    }

    [Fact]
    public void UpdateContent_WithEmptyContent_Fails()
    {
        var note = CreateValidNote();
        var result = note.UpdateContent("");
        result.IsFailure.Should().BeTrue();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private VerseNote CreateValidNote() =>
        VerseNote.Create(_userId, VerseRef.Parse("JHN.3.16"), "Initial content", []).Value;
}
