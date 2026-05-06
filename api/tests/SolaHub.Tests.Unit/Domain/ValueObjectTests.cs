using FluentAssertions;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Tests.Unit.Domain;

public sealed class EmailValueObjectTests
{
    [Theory]
    [InlineData("user@example.com")]
    [InlineData("User.Name+tag@Sub.Domain.org")]
    [InlineData("USER@EXAMPLE.COM")]
    public void Create_WithValidEmail_ReturnsSuccess(string email)
    {
        var result = Email.Create(email);
        result.IsSuccess.Should().BeTrue();
        result.Value.Value.Should().Be(email.Trim().ToLowerInvariant());
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("notanemail")]
    [InlineData("@nodomain.com")]
    [InlineData("missing@")]
    public void Create_WithInvalidEmail_ReturnsFailure(string email)
    {
        var result = Email.Create(email);
        result.IsFailure.Should().BeTrue();
    }

    [Fact]
    public void Create_NormalizesToLowercase()
    {
        var result = Email.Create("HELLO@EXAMPLE.COM");
        result.Value.Value.Should().Be("hello@example.com");
    }
}

public sealed class VerseRefValueObjectTests
{
    [Theory]
    [InlineData("GEN.1.1")]
    [InlineData("GEN.1")]
    [InlineData("JHN.3.16")]
    [InlineData("REV.22.21")]
    public void Parse_WithValidRef_Succeeds(string input)
    {
        var action = () => VerseRef.Parse(input);
        action.Should().NotThrow();
    }

    [Theory]
    [InlineData("")]
    [InlineData("TOOSHORT")]
    [InlineData("1.2.3")]
    public void TryParse_WithInvalidRef_ReturnsFalse(string input)
    {
        var success = VerseRef.TryParse(input, out _);
        success.Should().BeFalse();
    }

    [Fact]
    public void Key_ReturnsExpectedFormat()
    {
        var verseRef = VerseRef.Parse("JHN.3.16");
        verseRef.Key.Should().Be("JHN.3.16");
    }

    [Fact]
    public void TwoVerseRefs_WithSameValues_AreEqual()
    {
        var a = VerseRef.Parse("GEN.1.1");
        var b = VerseRef.Parse("GEN.1.1");
        a.Should().Be(b);
    }
}

public sealed class StronglyTypedIdTests
{
    [Fact]
    public void UserId_New_GeneratesUniqueIds()
    {
        var id1 = UserId.New();
        var id2 = UserId.New();
        id1.Should().NotBe(id2);
        id1.Value.Version.Should().Be(7);
        id2.Value.Version.Should().Be(7);
    }

    [Fact]
    public void UserId_From_PreservesValue()
    {
        var guid = Guid.NewGuid();
        var id = UserId.From(guid);
        id.Value.Should().Be(guid);
    }

    [Fact]
    public void UserId_From_RejectsEmptyGuid()
    {
        var action = () => UserId.From(Guid.Empty);
        action.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UserId_EqualityByValue()
    {
        var guid = Guid.NewGuid();
        var id1 = UserId.From(guid);
        var id2 = UserId.From(guid);
        id1.Should().Be(id2);
    }
}
