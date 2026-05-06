using FluentAssertions;
using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Tests.Unit.Domain;

public sealed class UserSessionEntityTests
{
    [Fact]
    public void Create_WithValidInputs_ReturnsSession()
    {
        var userId = UserId.New();
        var expiresAt = DateTimeOffset.UtcNow.AddDays(30);

        var result = UserSession.Create(userId, "refresh-hash", expiresAt);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Value.Version.Should().Be(7);
        result.Value.UserId.Should().Be(userId);
        result.Value.RefreshTokenHash.Should().Be("refresh-hash");
        result.Value.ExpiresAt.Should().Be(expiresAt);
        result.Value.RevokedAt.Should().BeNull();
    }

    [Fact]
    public void Create_WithBlankHash_ReturnsFailure()
    {
        var result = UserSession.Create(UserId.New(), "", DateTimeOffset.UtcNow.AddDays(30));

        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public void Rotate_ReplacesHashAndExtendsExpiry()
    {
        var session = UserSession
            .Create(UserId.New(), "old-hash", DateTimeOffset.UtcNow.AddDays(30))
            .Value;
        var now = DateTimeOffset.UtcNow;
        var newExpiry = now.AddDays(30);

        var result = session.Rotate("new-hash", newExpiry, now);

        result.IsSuccess.Should().BeTrue();
        session.RefreshTokenHash.Should().Be("new-hash");
        session.ExpiresAt.Should().Be(newExpiry);
        session.LastUsedAt.Should().Be(now);
    }

    [Fact]
    public void Revoke_MarksSessionInvalid()
    {
        var session = UserSession
            .Create(UserId.New(), "refresh-hash", DateTimeOffset.UtcNow.AddDays(30))
            .Value;
        var now = DateTimeOffset.UtcNow;

        session.Revoke(now);

        session.RevokedAt.Should().Be(now);
        session.IsValid(now).Should().BeFalse();
    }
}
