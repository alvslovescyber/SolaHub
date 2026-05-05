using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using SolaHub.Tests.Integration.Fixtures;

namespace SolaHub.Tests.Integration.Api;

[Collection(nameof(ApiCollection))]
public sealed class CommunityEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    private static async Task<AuthResponseDto> RegisterUser(
        HttpClient client,
        string email,
        string displayName
    )
    {
        var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password = "SecureP@ss1",
                displayName,
            }
        );
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<AuthResponseDto>())!;
    }

    [Fact]
    public async Task GetFeeds_PublicAndPrivateVisibility_AreSeparated()
    {
        var user = await RegisterUser(
            _client,
            $"community_feed_{Guid.NewGuid():N}@example.com",
            "Community User"
        );

        await CreatePostAsync(user.AccessToken, "Private recap", "Private body", "Private");
        await CreatePostAsync(user.AccessToken, "Public recap", "Public body", "Public");

        var everyone = await GetFeedAsync(user.AccessToken, "everyone");
        everyone.Should().ContainSingle(p => p.Title == "Public recap");
        everyone.Should().NotContain(p => p.Title == "Private recap");

        var mine = await GetFeedAsync(user.AccessToken, "mine");
        mine.Should().Contain(p => p.Title == "Public recap");
        mine.Should().Contain(p => p.Title == "Private recap");
    }

    [Fact]
    public async Task UpdatePost_AsNonOwner_Returns403()
    {
        var owner = await RegisterUser(
            _client,
            $"community_owner_{Guid.NewGuid():N}@example.com",
            "Owner"
        );
        var stranger = await RegisterUser(
            _client,
            $"community_stranger_{Guid.NewGuid():N}@example.com",
            "Stranger"
        );

        var post = await CreatePostAsync(owner.AccessToken, "Owner post", "Body", "Public");

        using var req = new HttpRequestMessage(HttpMethod.Put, $"/api/community/{post.Id}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", stranger.AccessToken);
        req.Content = JsonContent.Create(
            new
            {
                kind = "Post",
                visibility = "Public",
                title = "Hijacked",
                body = "Changed",
                verseRef = (string?)null,
                tags = Array.Empty<string>(),
                deck = (object?)null,
            }
        );

        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ReportPost_HidesItFromEveryoneFeedForReporter()
    {
        var owner = await RegisterUser(
            _client,
            $"community_report_owner_{Guid.NewGuid():N}@example.com",
            "Owner"
        );
        var reporter = await RegisterUser(
            _client,
            $"community_reporter_{Guid.NewGuid():N}@example.com",
            "Reporter"
        );

        var post = await CreatePostAsync(owner.AccessToken, "Reportable", "Public body", "Public");

        using (
            var reportReq = new HttpRequestMessage(
                HttpMethod.Post,
                $"/api/community/{post.Id}/reports"
            )
        )
        {
            reportReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                reporter.AccessToken
            );
            reportReq.Content = JsonContent.Create(new { reason = "Spam" });
            var reportResp = await _client.SendAsync(reportReq);
            reportResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        var reporterFeed = await GetFeedAsync(reporter.AccessToken, "everyone");
        reporterFeed.Should().NotContain(p => p.Id == post.Id);

        var ownerFeed = await GetFeedAsync(owner.AccessToken, "everyone");
        ownerFeed.Should().Contain(p => p.Id == post.Id);
    }

    [Fact]
    public async Task CreatePublicPost_WithBlockedContent_Returns422()
    {
        var user = await RegisterUser(
            _client,
            $"community_block_{Guid.NewGuid():N}@example.com",
            "Blocked User"
        );

        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/community");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", user.AccessToken);
        req.Content = JsonContent.Create(
            new
            {
                kind = "Post",
                visibility = "Public",
                title = "Bad",
                body = "This is shit content",
                verseRef = (string?)null,
                tags = Array.Empty<string>(),
                deck = (object?)null,
            }
        );

        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task CreatePost_WithNumericEnumPayload_Returns422()
    {
        var user = await RegisterUser(
            _client,
            $"community_enum_{Guid.NewGuid():N}@example.com",
            "Enum User"
        );

        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/community");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", user.AccessToken);
        req.Content = JsonContent.Create(
            new
            {
                kind = "999",
                visibility = "999",
                title = "Invalid enum",
                body = "This should not save.",
                verseRef = (string?)null,
                tags = Array.Empty<string>(),
                deck = (object?)null,
            }
        );

        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task GetFeed_WithNumericEnumPayload_Returns400()
    {
        var user = await RegisterUser(
            _client,
            $"community_feed_enum_{Guid.NewGuid():N}@example.com",
            "Feed Enum User"
        );

        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/community?feed=999");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", user.AccessToken);

        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CommunityWriteRateLimit_Returns429AfterWindowLimit()
    {
        var user = await RegisterUser(
            _client,
            $"community_limit_{Guid.NewGuid():N}@example.com",
            "Limited User"
        );

        HttpResponseMessage? lastResponse = null;
        for (var i = 0; i < 21; i++)
        {
            lastResponse = await SendCreatePostAsync(
                user.AccessToken,
                $"Rate {i}",
                $"Body {i}",
                "Private"
            );
        }

        lastResponse!.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    private async Task<CommunityPostStubDto> CreatePostAsync(
        string accessToken,
        string title,
        string body,
        string visibility
    )
    {
        using var response = await SendCreatePostAsync(accessToken, title, body, visibility);
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await response.Content.ReadFromJsonAsync<CommunityPostStubDto>())!;
    }

    private async Task<HttpResponseMessage> SendCreatePostAsync(
        string accessToken,
        string title,
        string body,
        string visibility
    )
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/community");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        req.Content = JsonContent.Create(
            new
            {
                kind = "Post",
                visibility,
                title,
                body,
                verseRef = (string?)null,
                tags = Array.Empty<string>(),
                deck = (object?)null,
            }
        );
        return await _client.SendAsync(req);
    }

    private async Task<IReadOnlyList<CommunityPostStubDto>> GetFeedAsync(
        string accessToken,
        string feed
    )
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"/api/community?feed={feed}");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var response = await _client.SendAsync(req);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<List<CommunityPostStubDto>>())!;
    }
}

internal sealed record CommunityPostStubDto(
    Guid Id,
    Guid AuthorId,
    string AuthorDisplayName,
    string Kind,
    string Visibility,
    string Title,
    string Body,
    string? VerseRef,
    IReadOnlyList<string> Tags,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool IsMine,
    bool HasReported
);
