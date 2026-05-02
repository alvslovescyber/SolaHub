using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using SolaHub.Tests.Integration.Fixtures;

namespace SolaHub.Tests.Integration.Api;

[Collection(nameof(ApiCollection))]
public sealed class PlansEndpointTests(ApiFactory factory)
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
    public async Task GetPlan_AfterCreate_ReturnsPlanDetail()
    {
        var user = await RegisterUser(
            _client,
            $"plan_detail_{Guid.NewGuid():N}@example.com",
            "Detail Owner"
        );

        Guid planId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/plans"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                user.AccessToken
            );
            createReq.Content = JsonContent.Create(
                new
                {
                    title = "Detail plan",
                    description = "Can be fetched after creation",
                    isPublic = true,
                }
            );
            var createResp = await _client.SendAsync(createReq);
            createResp.StatusCode.Should().Be(HttpStatusCode.Created);
            planId = (await createResp.Content.ReadFromJsonAsync<ReadingPlanStubDto>())!.Id;
        }

        using var getReq = new HttpRequestMessage(HttpMethod.Get, $"/api/plans/{planId}");
        getReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", user.AccessToken);
        var getResp = await _client.SendAsync(getReq);

        getResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var plan = await getResp.Content.ReadFromJsonAsync<ReadingPlanStubDto>();
        plan!.Id.Should().Be(planId);
        plan.Title.Should().Be("Detail plan");
        plan.Participants.Should().ContainSingle(p => p.DisplayName == "Detail Owner");
    }

    [Fact]
    public async Task JoinPrivatePlan_AsNonCreator_Returns403()
    {
        var owner = await RegisterUser(
            _client,
            $"plan_owner_{Guid.NewGuid():N}@example.com",
            "Owner"
        );
        var stranger = await RegisterUser(
            _client,
            $"plan_stranger_{Guid.NewGuid():N}@example.com",
            "Stranger"
        );

        Guid planId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/plans"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                owner.AccessToken
            );
            createReq.Content = JsonContent.Create(
                new
                {
                    title = "Private study",
                    description = (string?)null,
                    isPublic = false,
                }
            );
            var createResp = await _client.SendAsync(createReq);
            createResp.StatusCode.Should().Be(HttpStatusCode.Created);
            var plan = await createResp.Content.ReadFromJsonAsync<ReadingPlanStubDto>();
            planId = plan!.Id;
        }

        using var joinReq = new HttpRequestMessage(HttpMethod.Post, $"/api/plans/{planId}/join");
        joinReq.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            stranger.AccessToken
        );
        var joinResp = await _client.SendAsync(joinReq);
        joinResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AddDay_Publish_ActivatesPlan()
    {
        var user = await RegisterUser(
            _client,
            $"plan_pub_{Guid.NewGuid():N}@example.com",
            "Publisher"
        );

        Guid planId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/plans"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                user.AccessToken
            );
            createReq.Content = JsonContent.Create(
                new
                {
                    title = "Public plan",
                    description = (string?)null,
                    isPublic = true,
                }
            );
            var createResp = await _client.SendAsync(createReq);
            createResp.StatusCode.Should().Be(HttpStatusCode.Created);
            var plan = await createResp.Content.ReadFromJsonAsync<ReadingPlanStubDto>();
            planId = plan!.Id;
            plan.Status.Should().Be("Draft");
        }

        using (var dayReq = new HttpRequestMessage(HttpMethod.Post, $"/api/plans/{planId}/days"))
        {
            dayReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                user.AccessToken
            );
            dayReq.Content = JsonContent.Create(
                new
                {
                    dayNumber = 1,
                    title = "Genesis start",
                    verseRefs = new[] { "GEN.1.1" },
                }
            );
            var dayResp = await _client.SendAsync(dayReq);
            dayResp.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        using (var pubReq = new HttpRequestMessage(HttpMethod.Post, $"/api/plans/{planId}/publish"))
        {
            pubReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                user.AccessToken
            );
            var pubResp = await _client.SendAsync(pubReq);
            pubResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var published = await pubResp.Content.ReadFromJsonAsync<ReadingPlanStubDto>();
            published!.Status.Should().Be("Active");
        }
    }

    [Fact]
    public async Task ArchivePlan_SetsArchivedStatus()
    {
        var user = await RegisterUser(
            _client,
            $"plan_arc_{Guid.NewGuid():N}@example.com",
            "Archiver"
        );

        Guid planId;
        using (var createReq = new HttpRequestMessage(HttpMethod.Post, "/api/plans"))
        {
            createReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                user.AccessToken
            );
            createReq.Content = JsonContent.Create(
                new
                {
                    title = "To archive",
                    description = (string?)null,
                    isPublic = true,
                }
            );
            var createResp = await _client.SendAsync(createReq);
            createResp.StatusCode.Should().Be(HttpStatusCode.Created);
            planId = (await createResp.Content.ReadFromJsonAsync<ReadingPlanStubDto>())!.Id;
        }

        using (var dayReq = new HttpRequestMessage(HttpMethod.Post, $"/api/plans/{planId}/days"))
        {
            dayReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                user.AccessToken
            );
            dayReq.Content = JsonContent.Create(
                new
                {
                    dayNumber = 1,
                    title = "Day 1",
                    verseRefs = new[] { "GEN.1.1" },
                }
            );
            (await _client.SendAsync(dayReq)).EnsureSuccessStatusCode();
        }

        using (var pubReq = new HttpRequestMessage(HttpMethod.Post, $"/api/plans/{planId}/publish"))
        {
            pubReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                user.AccessToken
            );
            (await _client.SendAsync(pubReq)).EnsureSuccessStatusCode();
        }

        using (var arcReq = new HttpRequestMessage(HttpMethod.Post, $"/api/plans/{planId}/archive"))
        {
            arcReq.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                user.AccessToken
            );
            var arcResp = await _client.SendAsync(arcReq);
            arcResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var archived = await arcResp.Content.ReadFromJsonAsync<ReadingPlanStubDto>();
            archived!.Status.Should().Be("Archived");
        }
    }
}

internal sealed record ReadingPlanStubDto(
    Guid Id,
    string Title,
    string Status,
    bool IsPublic,
    IReadOnlyList<PlanParticipantStubDto> Participants
);

internal sealed record PlanParticipantStubDto(Guid UserId, string DisplayName);
