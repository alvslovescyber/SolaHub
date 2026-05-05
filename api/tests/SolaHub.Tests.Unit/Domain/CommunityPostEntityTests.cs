using FluentAssertions;
using SolaHub.Core.Entities;
using SolaHub.Core.Enums;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Tests.Unit.Domain;

public sealed class CommunityPostEntityTests
{
    private readonly UserId _userId = UserId.New();

    [Fact]
    public void Create_PublicPostWithValidInputs_Succeeds()
    {
        var result = CommunityPost.Create(
            _userId,
            "Pastor Ada",
            CommunityPostKind.Post,
            CommunityVisibility.Public,
            "Sunday recap",
            "We looked at Romans 8 together.",
            null,
            ["sermon", "sunday"],
            null
        );

        result.IsSuccess.Should().BeTrue();
        result.Value.Visibility.Should().Be(CommunityVisibility.Public);
        result.Value.Tags.Should().BeEquivalentTo(["sermon", "sunday"]);
    }

    [Fact]
    public void Create_PublicPostWithBlockedWord_Fails()
    {
        var result = CommunityPost.Create(
            _userId,
            "Pastor Ada",
            CommunityPostKind.Post,
            CommunityVisibility.Public,
            "Sunday recap",
            "This contains shit content.",
            null,
            [],
            null
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Validation.Content.Blocked");
    }

    [Fact]
    public void Create_PublicPostWithHttpLink_Fails()
    {
        var result = CommunityPost.Create(
            _userId,
            "Pastor Ada",
            CommunityPostKind.Post,
            CommunityVisibility.Public,
            "Sunday recap",
            "Read more at http://example.com",
            null,
            [],
            null
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Validation.Content.InsecureLink");
    }

    [Fact]
    public void Create_NotationDeckWithTooManySlides_Fails()
    {
        var slides = string.Join(",", Enumerable.Range(1, 21).Select(_ => ValidSlideJson()));
        var deckJson = $$"""{"id":"deck-1","title":"Too many","slides":[{{slides}}]}""";

        var result = CommunityPost.Create(
            _userId,
            "Pastor Ada",
            CommunityPostKind.NotationDeck,
            CommunityVisibility.Public,
            "Sunday deck",
            "",
            null,
            [],
            deckJson
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Validation.Community.TooManySlides");
    }

    [Fact]
    public void Create_NotationDeckWithImageBackground_Fails()
    {
        var deckJson = """
            {
              "id":"deck-1",
              "title":"Sunday",
              "slides":[
                {
                  "source":"notation",
                  "verseRef":"slide-1",
                  "title":"Welcome",
                  "text":"Welcome",
                  "background":{"type":"image","value":"https://example.com/bg.png","textTone":"light"},
                  "elements":[{"id":"el-1","kind":"text","text":"Welcome","color":"#ffffff"}]
                }
              ]
            }
            """;

        var result = CommunityPost.Create(
            _userId,
            "Pastor Ada",
            CommunityPostKind.NotationDeck,
            CommunityVisibility.Public,
            "Sunday deck",
            "",
            null,
            [],
            deckJson
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Validation.Community.ImageBackgroundNotAllowed");
    }

    [Fact]
    public void Create_PrivateNotationDeckWithImageBackground_Succeeds()
    {
        var deckJson = """
            {
              "id":"deck-1",
              "title":"Sunday",
              "slides":[
                {
                  "source":"notation",
                  "verseRef":"slide-1",
                  "title":"Welcome",
                  "text":"Welcome",
                  "background":{"type":"image","value":"data:image/png;base64,abc123==","textTone":"light"},
                  "elements":[{"id":"el-1","kind":"text","text":"Welcome","color":"#ffffff"}]
                }
              ]
            }
            """;

        var result = CommunityPost.Create(
            _userId,
            "Pastor Ada",
            CommunityPostKind.NotationDeck,
            CommunityVisibility.Private,
            "Sunday deck",
            "",
            null,
            [],
            deckJson
        );

        result.IsSuccess.Should().BeTrue();
        result.Value.DeckJson.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Create_PublicNotationDeckWithPresetMotionBackground_Succeeds()
    {
        var deckJson = """
            {
              "id":"deck-1",
              "title":"Sunday",
              "slides":[
                {
                  "source":"notation",
                  "verseRef":"slide-1",
                  "title":"Welcome",
                  "text":"Welcome",
                  "background":{"type":"motion","value":"radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.38), transparent 30%), radial-gradient(circle at 82% 72%, rgba(45, 212, 191, 0.42), transparent 34%), linear-gradient(135deg, #06141f 0%, #0f172a 48%, #134e4a 100%)","textTone":"light"},
                  "elements":[{"id":"el-1","kind":"text","text":"Welcome","color":"#ffffff"}]
                }
              ]
            }
            """;

        var result = CommunityPost.Create(
            _userId,
            "Pastor Ada",
            CommunityPostKind.NotationDeck,
            CommunityVisibility.Public,
            "Sunday deck",
            "",
            null,
            [],
            deckJson
        );

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Update_FavouriteVerseWithoutVerseRef_Fails()
    {
        var post = CommunityPost
            .Create(
                _userId,
                "Pastor Ada",
                CommunityPostKind.Post,
                CommunityVisibility.Private,
                "",
                "Private note",
                null,
                [],
                null
            )
            .Value;

        var result = post.Update(
            CommunityPostKind.FavouriteVerse,
            CommunityVisibility.Public,
            "",
            "A reflection",
            "",
            [],
            null
        );

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Validation.Community.VerseRefRequired");
    }

    private static string ValidSlideJson() =>
        """
            {
              "source":"notation",
              "verseRef":"slide-1",
              "title":"Welcome",
              "text":"Welcome",
              "background":{"type":"solid","value":"#020617","textTone":"light"},
              "elements":[{"id":"el-1","kind":"text","text":"Welcome","color":"#ffffff"}]
            }
            """;
}
