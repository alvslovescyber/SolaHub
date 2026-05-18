using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using SolaHub.Tests.Integration.Fixtures;

namespace SolaHub.Tests.Integration.Api;

/// <summary>
/// Regression suite for the Windows "network error" bug.
///
/// Root cause: Tauri 2 WebViews send different Origin headers per platform.
///   macOS  WKWebView  → tauri://localhost
///   Windows WebView2  → https://tauri.localhost
///
/// If a deployment env var (Cors__AllowedOrigins on Railway) only lists one of
/// them, the other platform's preflight fails with no ACAO header — Axios sees
/// a network error instead of the real HTTP status for EVERY request.
///
/// ResolveCorsOrigins() now auto-pairs the two Tauri origins. These tests lock
/// that behaviour so it cannot regress.
/// </summary>
[Collection(nameof(ApiCollection))]
public sealed class CorsOriginTests(ApiFactory factory)
{
    // ─── 1. Preflight (OPTIONS) — both platforms must receive ACAO header ───────

    [Theory]
    [InlineData("tauri://localhost",       "macOS WKWebView")]
    [InlineData("https://tauri.localhost", "Windows WebView2")]
    public async Task Preflight_ReturnsSuccessWithAcaoHeader_ForBothPlatforms(
        string origin, string platform)
    {
        using var req = BuildPreflight(origin, HttpMethod.Post, "/api/auth/login");
        var response = await Client().SendAsync(req);

        response.StatusCode.Should().BeOneOf(
            [HttpStatusCode.OK, HttpStatusCode.NoContent],
            $"preflight from {platform} must not be blocked");

        GetAcao(response).Should().Be(origin,
            $"missing ACAO on preflight is what makes every API call appear as a network error on {platform}");
    }

    // ─── 2. Actual requests — ACAO must echo the requesting origin ─────────────

    [Theory]
    [InlineData("tauri://localhost",       "macOS")]
    [InlineData("https://tauri.localhost", "Windows")]
    public async Task ActualRequest_IncludesAcaoHeader_ForBothPlatforms(
        string origin, string platform)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        req.Headers.Add("Origin", origin);

        var response = await Client().SendAsync(req);

        GetAcao(response).Should().Be(origin,
            $"Axios on {platform} reads ACAO to decide whether to expose the response body; missing means network error");
    }

    // ─── 3. Unknown origin must be rejected ────────────────────────────────────

    [Fact]
    public async Task Request_FromUnknownOrigin_HasNoAcaoHeader()
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        req.Headers.Add("Origin", "https://evil.example.com");

        var response = await Client().SendAsync(req);

        HasAcao(response).Should().BeFalse(
            "CORS allowlist must only grant access to known Tauri origins");
    }

    // ─── 4. Auto-pairing: only macOS origin in config → Windows still works ────

    [Fact]
    public async Task AutoPairing_OnlyMacOriginConfigured_WindowsPreflightSucceeds()
    {
        // Simulates the exact Railway misconfiguration that caused the bug:
        // env var Cors__AllowedOrigins = tauri://localhost (added for macOS testing,
        // Windows was never tested, so its origin was never added).
        using var patchedFactory = WithSingleOriginConfig("tauri://localhost");
        using var req = BuildPreflight("https://tauri.localhost", HttpMethod.Post, "/api/auth/login");

        var response = await patchedFactory.CreateClient().SendAsync(req);

        GetAcao(response).Should().Be("https://tauri.localhost",
            "ResolveCorsOrigins must auto-add https://tauri.localhost when only tauri://localhost is configured");
    }

    [Fact]
    public async Task AutoPairing_OnlyMacOriginConfigured_WindowsActualRequestSucceeds()
    {
        using var patchedFactory = WithSingleOriginConfig("tauri://localhost");
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        req.Headers.Add("Origin", "https://tauri.localhost");

        var response = await patchedFactory.CreateClient().SendAsync(req);

        GetAcao(response).Should().Be("https://tauri.localhost");
    }

    // ─── 5. Auto-pairing: only Windows origin in config → macOS still works ────

    [Fact]
    public async Task AutoPairing_OnlyWindowsOriginConfigured_MacPreflightSucceeds()
    {
        using var patchedFactory = WithSingleOriginConfig("https://tauri.localhost");
        using var req = BuildPreflight("tauri://localhost", HttpMethod.Post, "/api/auth/login");

        var response = await patchedFactory.CreateClient().SendAsync(req);

        GetAcao(response).Should().Be("tauri://localhost",
            "ResolveCorsOrigins must auto-add tauri://localhost when only https://tauri.localhost is configured");
    }

    [Fact]
    public async Task AutoPairing_OnlyWindowsOriginConfigured_MacActualRequestSucceeds()
    {
        using var patchedFactory = WithSingleOriginConfig("https://tauri.localhost");
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        req.Headers.Add("Origin", "tauri://localhost");

        var response = await patchedFactory.CreateClient().SendAsync(req);

        GetAcao(response).Should().Be("tauri://localhost");
    }

    // ─── 6. Both origins explicit → no ACAO header duplication ─────────────────

    [Theory]
    [InlineData("tauri://localhost")]
    [InlineData("https://tauri.localhost")]
    public async Task BothOriginsConfigured_SingleAcaoHeader_NoDuplication(string origin)
    {
        using var patchedFactory = WithSingleOriginConfig(
            "tauri://localhost,https://tauri.localhost");
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/health");
        req.Headers.Add("Origin", origin);

        var response = await patchedFactory.CreateClient().SendAsync(req);

        var values = response.Headers.TryGetValues("Access-Control-Allow-Origin", out var v)
            ? v.ToList() : [];

        values.Should().ContainSingle(
            "duplicate ACAO headers cause browsers to reject the response as invalid");
        values[0].Should().Be(origin);
    }

    // ─── 7. Auth endpoint preflight — covers the most critical real-world path ──

    [Theory]
    [InlineData("tauri://localhost",       "macOS — login")]
    [InlineData("https://tauri.localhost", "Windows — login")]
    public async Task AuthLogin_Preflight_AllowsBothPlatforms(string origin, string _)
    {
        using var req = BuildPreflight(origin, HttpMethod.Post, "/api/auth/login",
            extraHeaders: "content-type,authorization");

        var response = await Client().SendAsync(req);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
        GetAcao(response).Should().Be(origin);
    }

    [Theory]
    [InlineData("tauri://localhost",       "macOS — register")]
    [InlineData("https://tauri.localhost", "Windows — register")]
    public async Task AuthRegister_Preflight_AllowsBothPlatforms(string origin, string _)
    {
        using var req = BuildPreflight(origin, HttpMethod.Post, "/api/auth/register",
            extraHeaders: "content-type");

        var response = await Client().SendAsync(req);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.NoContent);
        GetAcao(response).Should().Be(origin);
    }

    // ─── 8. Credentials flag (required for JWT cookies / auth state) ────────────

    [Theory]
    [InlineData("tauri://localhost")]
    [InlineData("https://tauri.localhost")]
    public async Task Preflight_IncludesAllowCredentials(string origin)
    {
        using var req = BuildPreflight(origin, HttpMethod.Post, "/api/auth/login");
        var response = await Client().SendAsync(req);

        response.Headers.TryGetValues("Access-Control-Allow-Credentials", out var vals)
            .Should().BeTrue();
        vals!.First().Should().Be("true",
            "AllowCredentials is required for the Tauri app to send auth headers");
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private HttpClient Client() => factory.CreateClient();

    private static HttpRequestMessage BuildPreflight(
        string origin,
        HttpMethod requestedMethod,
        string path,
        string? extraHeaders = "content-type,authorization")
    {
        var req = new HttpRequestMessage(HttpMethod.Options, path);
        req.Headers.Add("Origin", origin);
        req.Headers.Add("Access-Control-Request-Method", requestedMethod.Method);
        if (!string.IsNullOrEmpty(extraHeaders))
            req.Headers.Add("Access-Control-Request-Headers", extraHeaders);
        return req;
    }

    private static string? GetAcao(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Access-Control-Allow-Origin", out var vals)
            ? vals.FirstOrDefault()
            : null;

    private static bool HasAcao(HttpResponseMessage response) =>
        response.Headers.Contains("Access-Control-Allow-Origin");

    /// <summary>
    /// Creates a factory variant with Cors:AllowedOrigins overridden so we can
    /// exercise the auto-pairing logic with a deliberately partial config — the
    /// exact scenario that caused the Windows network error in production.
    /// </summary>
    private WebApplicationFactory<Program> WithSingleOriginConfig(string allowedOrigins) =>
        factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Cors:AllowedOrigins"] = allowedOrigins,
                })
            )
        );
}
