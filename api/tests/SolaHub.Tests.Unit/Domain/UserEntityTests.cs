using FluentAssertions;
using SolaHub.Core.Entities;
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

    // ─── UpdateRefreshToken ────────────────────────────────────────────────────

    [Fact]
    public void UpdateRefreshToken_WithFutureExpiry_Succeeds()
    {
        var user = CreateValidUser();
        var expiry = DateTimeOffset.UtcNow.AddDays(7);

        var result = user.UpdateRefreshToken("new-token", expiry);

        result.IsSuccess.Should().BeTrue();
        user.RefreshToken.Should().Be("new-token");
        user.RefreshTokenExpiry.Should().Be(expiry);
    }

    [Fact]
    public void UpdateRefreshToken_WithPastExpiry_ReturnsFailure()
    {
        var user = CreateValidUser();
        var expiry = DateTimeOffset.UtcNow.AddDays(-1);

        var result = user.UpdateRefreshToken("token", expiry);

        result.IsFailure.Should().BeTrue();
    }

    // ─── HasValidRefreshToken ──────────────────────────────────────────────────

    [Fact]
    public void HasValidRefreshToken_WithMatchingNonExpiredToken_ReturnsTrue()
    {
        var user = CreateValidUser();
        user.UpdateRefreshToken("valid-token", DateTimeOffset.UtcNow.AddDays(7));

        user.HasValidRefreshToken("valid-token").Should().BeTrue();
    }

    [Fact]
    public void HasValidRefreshToken_WithNullToken_ReturnsFalse()
    {
        var user = CreateValidUser();
        user.HasValidRefreshToken(null).Should().BeFalse();
    }

    [Fact]
    public void HasValidRefreshToken_WithWrongToken_ReturnsFalse()
    {
        var user = CreateValidUser();
        user.UpdateRefreshToken("correct-token", DateTimeOffset.UtcNow.AddDays(7));

        user.HasValidRefreshToken("wrong-token").Should().BeFalse();
    }

    // ─── RevokeRefreshToken ────────────────────────────────────────────────────

    [Fact]
    public void RevokeRefreshToken_ClearsToken()
    {
        var user = CreateValidUser();
        user.UpdateRefreshToken("token", DateTimeOffset.UtcNow.AddDays(7));

        user.RevokeRefreshToken();

        user.RefreshToken.Should().BeNull();
        user.HasValidRefreshToken("token").Should().BeFalse();
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
    public void Deactivate_SetsIsActiveFalse_AndRevokesToken()
    {
        var user = CreateValidUser();
        user.UpdateRefreshToken("token", DateTimeOffset.UtcNow.AddDays(7));

        user.Deactivate();

        user.IsActive.Should().BeFalse();
        user.RefreshToken.Should().BeNull();
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
