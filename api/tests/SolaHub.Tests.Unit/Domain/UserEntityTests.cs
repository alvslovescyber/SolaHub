using FluentAssertions;
using SolaHub.Core.Entities;
using SolaHub.Core.Enums;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Tests.Unit.Domain;

public sealed class UserEntityTests
{
    // ─── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public void Create_WithValidInputs_ReturnsSuccess()
    {
        var result = User.Create("test@example.com", "hashedPassword", "Test User");

        result.IsSuccess.Should().BeTrue();
        result.Value.Email.Value.Should().Be("test@example.com");
        result.Value.DisplayName.Should().Be("Test User");
        result.Value.IsActive.Should().BeTrue();
        result.Value.IsEmailVerified.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("not-an-email")]
    public void Create_WithInvalidEmail_ReturnsFailure(string email)
    {
        var result = User.Create(email, "hashedPassword", "Test User");
        result.IsFailure.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    public void Create_WithEmptyDisplayName_ReturnsFailure(string displayName)
    {
        var result = User.Create("test@example.com", "hashedPassword", displayName);
        result.IsFailure.Should().BeTrue();
    }

    // ─── InvalidateSessions ───────────────────────────────────────────────────

    [Fact]
    public void InvalidateSessions_IncrementsSessionVersion()
    {
        var user = CreateValidUser();
        var initialSessionVersion = user.SessionVersion;

        user.InvalidateSessions();

        user.SessionVersion.Should().Be(initialSessionVersion + 1);
    }

    // ─── VerifyEmail ───────────────────────────────────────────────────────────

    [Fact]
    public void VerifyEmail_SetsVerifiedFlag()
    {
        var user = CreateValidUser();
        user.IsEmailVerified.Should().BeFalse();

        user.VerifyEmail();

        user.IsEmailVerified.Should().BeTrue();
    }

    // ─── Deactivate ───────────────────────────────────────────────────────────

    [Fact]
    public void Deactivate_SetsIsActiveFalse_AndInvalidatesSessions()
    {
        var user = CreateValidUser();
        var initialSessionVersion = user.SessionVersion;

        user.Deactivate();

        user.IsActive.Should().BeFalse();
        user.SessionVersion.Should().Be(initialSessionVersion + 1);
    }

    // ─── UpdateRole ───────────────────────────────────────────────────────────

    [Fact]
    public void UpdateRole_WithNewRole_IncrementsSessionVersion()
    {
        var user = CreateValidUser();
        var initialSessionVersion = user.SessionVersion;

        user.UpdateRole(UserRole.Admin);

        user.Role.Should().Be(UserRole.Admin);
        user.SessionVersion.Should().Be(initialSessionVersion + 1);
    }

    [Fact]
    public void UpdateRole_WithSameRole_DoesNotIncrementSessionVersion()
    {
        var user = CreateValidUser();
        var initialSessionVersion = user.SessionVersion;

        user.UpdateRole(UserRole.Member);

        user.SessionVersion.Should().Be(initialSessionVersion);
    }

    // ─── JoinChurch / LeaveChurch ──────────────────────────────────────────────

    [Fact]
    public void JoinChurch_SetsChurchId()
    {
        var user = CreateValidUser();
        var churchId = ChurchId.New();

        user.JoinChurch(churchId);

        user.ChurchId.Should().Be(churchId);
    }

    [Fact]
    public void LeaveChurch_ClearsChurchId()
    {
        var user = CreateValidUser();
        user.JoinChurch(ChurchId.New());

        user.LeaveChurch();

        user.ChurchId.Should().BeNull();
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private static User CreateValidUser() =>
        User.Create("test@example.com", "hashed", "Test User").Value;
}
