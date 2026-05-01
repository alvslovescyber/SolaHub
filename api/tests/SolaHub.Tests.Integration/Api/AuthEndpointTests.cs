using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SolaHub.Tests.Integration.Fixtures;

namespace SolaHub.Tests.Integration.Api;

[Collection(nameof(ApiCollection))]
public sealed class AuthEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    // ─── Register ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_WithValidPayload_Returns201()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email = $"test_{Guid.NewGuid():N}@example.com",
                password = "SecureP@ss1",
                displayName = "Test User",
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        body!.AccessToken.Should().NotBeNullOrEmpty();
        body.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_Returns409()
    {
        var email = $"dup_{Guid.NewGuid():N}@example.com";

        await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password = "SecureP@ss1",
                displayName = "First User",
            }
        );

        var response = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password = "SecureP@ss1",
                displayName = "Second User",
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_WithWeakPassword_Returns422()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email = $"weak_{Guid.NewGuid():N}@example.com",
                password = "weak",
                displayName = "Test User",
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_WithValidCredentials_Returns200WithTokens()
    {
        var email = $"login_{Guid.NewGuid():N}@example.com";
        const string password = "SecureP@ss1";

        await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password,
                displayName = "Login User",
            }
        );

        var response = await _client.PostAsJsonAsync("/api/auth/login", new { email, password });

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        body!.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        var email = $"wrong_{Guid.NewGuid():N}@example.com";

        await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password = "SecureP@ss1",
                displayName = "Test User",
            }
        );

        var response = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password = "WrongPassword1!" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_WithNonExistentEmail_Returns401()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = "nobody@example.com", password = "SecureP@ss1" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─── Refresh ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Refresh_WithValidToken_ReturnsNewTokenPair()
    {
        var email = $"refresh_{Guid.NewGuid():N}@example.com";
        const string password = "SecureP@ss1";

        var registerResponse = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password,
                displayName = "Refresh User",
            }
        );
        var tokens = await registerResponse.Content.ReadFromJsonAsync<AuthResponseDto>();

        var response = await _client.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = tokens!.RefreshToken }
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var newTokens = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        newTokens!.AccessToken.Should().NotBe(tokens.AccessToken);
        newTokens.RefreshToken.Should().NotBe(tokens.RefreshToken);
    }

    [Fact]
    public async Task Refresh_WithSameTokenTwice_SecondReturns401()
    {
        var email = $"reuse_{Guid.NewGuid():N}@example.com";

        var registerResponse = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password = "SecureP@ss1",
                displayName = "Reuse User",
            }
        );
        var tokens = await registerResponse.Content.ReadFromJsonAsync<AuthResponseDto>();

        // Use once — success
        await _client.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = tokens!.RefreshToken }
        );

        // Reuse — should fail (token was rotated)
        var second = await _client.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = tokens.RefreshToken }
        );

        second.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

internal sealed record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset ExpiresAt
);
