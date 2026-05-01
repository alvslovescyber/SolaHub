using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using SolaHub.Tests.Integration.Fixtures;

namespace SolaHub.Tests.Integration.Api;

[Collection(nameof(ApiCollection))]
public sealed class NotesEndpointTests(ApiFactory factory)
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
    public async Task GetVerseNotes_OtherUsersPrivateNote_IsNotVisible()
    {
        var emailA = $"note_a_{Guid.NewGuid():N}@example.com";
        var emailB = $"note_b_{Guid.NewGuid():N}@example.com";

        var userA = await RegisterUser(_client, emailA, "User A");
        var userB = await RegisterUser(_client, emailB, "User B");

        const string verseRef = "JHN.3.16";
        using (var req = new HttpRequestMessage(HttpMethod.Post, "/api/notes"))
        {
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userA.AccessToken);
            req.Content = JsonContent.Create(
                new
                {
                    verseRef,
                    content = "Private from A",
                    tags = Array.Empty<string>(),
                    isShared = false,
                }
            );
            var createResp = await _client.SendAsync(req);
            createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        using (var req = new HttpRequestMessage(
            HttpMethod.Get,
            $"/api/notes/verse/{verseRef}?sharedOnly=false"
        ))
        {
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userB.AccessToken);
            var listResp = await _client.SendAsync(req);
            listResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var notes = await listResp.Content.ReadFromJsonAsync<List<NoteListItemDto>>();
            notes.Should().NotBeNull();
            notes!.Should().BeEmpty();
        }
    }

    [Fact]
    public async Task GetVerseNotes_SharedNoteFromOtherUser_IsVisibleWhenNotSharedOnlyFilter()
    {
        var emailA = $"note_shared_a_{Guid.NewGuid():N}@example.com";
        var emailB = $"note_shared_b_{Guid.NewGuid():N}@example.com";

        var userA = await RegisterUser(_client, emailA, "User A");
        var userB = await RegisterUser(_client, emailB, "User B");

        const string verseRef = "ROM.8.28";
        using (var req = new HttpRequestMessage(HttpMethod.Post, "/api/notes"))
        {
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userA.AccessToken);
            req.Content = JsonContent.Create(
                new
                {
                    verseRef,
                    content = "Shared insight",
                    tags = Array.Empty<string>(),
                    isShared = true,
                }
            );
            var createResp = await _client.SendAsync(req);
            createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        using (var req = new HttpRequestMessage(
            HttpMethod.Get,
            $"/api/notes/verse/{verseRef}?sharedOnly=false"
        ))
        {
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userB.AccessToken);
            var listResp = await _client.SendAsync(req);
            listResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var notes = await listResp.Content.ReadFromJsonAsync<List<NoteListItemDto>>();
            notes.Should().ContainSingle(n => n.Content == "Shared insight" && n.IsShared);
        }
    }

    [Fact]
    public async Task GetVerseNotes_SharedOnly_ReturnsOnlyShared()
    {
        var email = $"note_mix_{Guid.NewGuid():N}@example.com";
        var user = await RegisterUser(_client, email, "Solo User");
        const string verseRef = "PSA.23.1";

        foreach (var (content, shared) in new[] { ("Private", false), ("Public", true) })
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "/api/notes");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", user.AccessToken);
            req.Content = JsonContent.Create(
                new
                {
                    verseRef,
                    content,
                    tags = Array.Empty<string>(),
                    isShared = shared,
                }
            );
            var createResp = await _client.SendAsync(req);
            createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        using (var req = new HttpRequestMessage(
            HttpMethod.Get,
            $"/api/notes/verse/{verseRef}?sharedOnly=true"
        ))
        {
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", user.AccessToken);
            var listResp = await _client.SendAsync(req);
            listResp.StatusCode.Should().Be(HttpStatusCode.OK);
            var notes = await listResp.Content.ReadFromJsonAsync<List<NoteListItemDto>>();
            notes.Should().ContainSingle(n => n.Content == "Public");
        }
    }
}

internal sealed record NoteListItemDto(
    Guid Id,
    string VerseRef,
    string Content,
    bool IsShared,
    IReadOnlyList<string> Tags,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
