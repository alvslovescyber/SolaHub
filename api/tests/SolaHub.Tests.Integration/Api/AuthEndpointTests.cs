using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
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
        body.User.Id.Should().NotBe(Guid.Empty);
        body.User.Email.Should().Be(body.User.Email.ToLowerInvariant());
        GetRefreshCookie(response).Should().NotBeNullOrEmpty();
        response
            .Headers.GetValues("Set-Cookie")
            .Should()
            .Contain(h => h.Contains("HttpOnly", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Register_IssuesTokenWithUuidSubjectAndRoleClaim()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email = $"claims_{Guid.NewGuid():N}@example.com",
                password = "SecureP@ss1",
                displayName = "Claims User",
            }
        );
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<AuthResponseBodyDto>();

        var token = new JwtSecurityTokenHandler().ReadJwtToken(body!.AccessToken);
        token
            .Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub)
            .Value.Should()
            .Be(body.User.Id.ToString());
        token
            .Claims.First(c => c.Type == JwtRegisteredClaimNames.Email)
            .Value.Should()
            .Be(body.User.Email);
        token.Claims.First(c => c.Type == "role").Value.Should().Be("Member");
        token.Claims.First(c => c.Type == "session_version").Value.Should().Be("0");
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
        var tokens = await ReadAuthResponseAsync(registerResponse);

        var response = await _client.PostAsJsonAsync("/api/auth/refresh", new { });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var newTokens = await ReadAuthResponseAsync(response);
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
        var tokens = await ReadAuthResponseAsync(registerResponse);

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

    [Fact]
    public async Task Refresh_WithTwoActiveLoginSessions_BothCanRefresh()
    {
        var email = $"multi_session_{Guid.NewGuid():N}@example.com";
        const string password = "SecureP@ss1";

        await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password,
                displayName = "Multi Session User",
            }
        );

        var firstLogin = await _client.PostAsJsonAsync("/api/auth/login", new { email, password });
        firstLogin.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstSession = await ReadAuthResponseAsync(firstLogin);

        var secondLogin = await _client.PostAsJsonAsync("/api/auth/login", new { email, password });
        secondLogin.StatusCode.Should().Be(HttpStatusCode.OK);
        var secondSession = await ReadAuthResponseAsync(secondLogin);
        secondSession.RefreshToken.Should().NotBe(firstSession.RefreshToken);

        var firstRefresh = await _client.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = firstSession.RefreshToken }
        );
        firstRefresh.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstRotated = await ReadAuthResponseAsync(firstRefresh);
        firstRotated.RefreshToken.Should().NotBe(firstSession.RefreshToken);

        var secondRefresh = await _client.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = secondSession.RefreshToken }
        );
        secondRefresh.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ChangePassword_RevokesAllRefreshSessions()
    {
        var email = $"password_sessions_{Guid.NewGuid():N}@example.com";
        const string oldPassword = "SecureP@ss1";
        const string newPassword = "SecureP@ss2";

        var registerResponse = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password = oldPassword,
                displayName = "Password Session User",
            }
        );
        var firstSession = await ReadAuthResponseAsync(registerResponse);

        var secondLogin = await _client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password = oldPassword }
        );
        secondLogin.StatusCode.Should().Be(HttpStatusCode.OK);
        var secondSession = await ReadAuthResponseAsync(secondLogin);

        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/change-password");
        req.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            firstSession.AccessToken
        );
        req.Content = JsonContent.Create(new { currentPassword = oldPassword, newPassword });

        var changeResponse = await _client.SendAsync(req);
        changeResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var refreshAfterPasswordChange = await _client.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = secondSession.RefreshToken }
        );
        refreshAfterPasswordChange.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ─── Logout ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Logout_WithRefreshTokenFromAnotherUser_Returns403()
    {
        var userA = await RegisterAuthUser($"logout_a_{Guid.NewGuid():N}@example.com", "User A");
        var userB = await RegisterAuthUser($"logout_b_{Guid.NewGuid():N}@example.com", "User B");

        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userA.AccessToken);
        req.Content = JsonContent.Create(new { refreshToken = userB.RefreshToken });
        var response = await _client.SendAsync(req);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private async Task<AuthResponseDto> RegisterAuthUser(string email, string displayName)
    {
        var response = await _client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                email,
                password = "SecureP@ss1",
                displayName,
            }
        );
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return await ReadAuthResponseAsync(response);
    }

    private static async Task<AuthResponseDto> ReadAuthResponseAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadFromJsonAsync<AuthResponseBodyDto>();
        return new AuthResponseDto(
            body!.AccessToken,
            GetRefreshCookie(response),
            body.ExpiresAt,
            body.User
        );
    }

    private static string GetRefreshCookie(HttpResponseMessage response)
    {
        var setCookie = response
            .Headers.GetValues("Set-Cookie")
            .First(h => h.StartsWith("solahub_refresh=", StringComparison.Ordinal));
        var value = setCookie.Split(';', 2)[0].Split('=', 2)[1];
        return Uri.UnescapeDataString(value);
    }
}

internal sealed record AuthResponseBodyDto(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    AuthUserDto User
);

internal sealed record AuthUserDto(
    Guid Id,
    string DisplayName,
    string Email,
    string Role,
    Guid? ChurchId,
    bool IsEmailVerified,
    bool IsActive,
    DateTimeOffset CreatedAt
);

internal sealed record AuthResponseDto(
    string AccessToken,
    string RefreshToken = "",
    DateTimeOffset ExpiresAt = default,
    AuthUserDto User = default!
);
