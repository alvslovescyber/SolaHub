using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using SolaHub.Tests.Integration.Fixtures;

namespace SolaHub.Tests.Integration.Api;

/// <summary>
/// Regression tests ensuring rate-limited responses always include CORS headers.
///
/// Bug: AuthRateLimitMiddleware was registered before UseCors(), so 429 responses
/// had no Access-Control-Allow-Origin header — WebView2/WebKit treated them as
/// CORS failures and Axios reported "Network Error" instead of the real status.
/// </summary>
[Collection(nameof(ApiCollection))]
public sealed class CorsRateLimitTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly IDistributedCache _cache =
        factory.Services.GetRequiredService<IDistributedCache>();

    [Fact]
    public async Task RateLimited_Login_IncludesCorsHeader()
    {
        var key = BuildRateLimitKey("/api/auth/login");
        await _cache.SetStringAsync(key, "60", ShortTtl());

        try
        {
            using var req = LoginRequest();
            var response = await _client.SendAsync(req);

            response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
            response
                .Headers.Contains("access-control-allow-origin")
                .Should()
                .BeTrue(
                    "rate-limited responses must carry CORS headers so WebView2 can read the 429 status"
                );
        }
        finally
        {
            await _cache.RemoveAsync(key);
        }
    }

    [Fact]
    public async Task RateLimited_Register_IncludesCorsHeader()
    {
        var key = BuildRateLimitKey("/api/auth/register");
        await _cache.SetStringAsync(key, "60", ShortTtl());

        try
        {
            using var req = RegisterRequest();
            var response = await _client.SendAsync(req);

            response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
            response
                .Headers.Contains("access-control-allow-origin")
                .Should()
                .BeTrue(
                    "rate-limited responses must carry CORS headers so WebView2 can read the 429 status"
                );
        }
        finally
        {
            await _cache.RemoveAsync(key);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    // In-process WebApplicationFactory requests have no remote IP → middleware uses "unknown"
    private static string BuildRateLimitKey(string path)
    {
        var minuteBucket = DateTime.UtcNow.Ticks / TimeSpan.TicksPerMinute;
        return $"solahub:ratelimit:auth:ip:unknown:{path}:{minuteBucket}";
    }

    private static DistributedCacheEntryOptions ShortTtl() =>
        new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(10) };

    private static HttpRequestMessage LoginRequest()
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login");
        req.Headers.Add("Origin", "https://tauri.localhost");
        req.Content = JsonContent.Create(
            new { email = "cors_test@example.com", password = "P@ss1234!" }
        );
        return req;
    }

    private static HttpRequestMessage RegisterRequest()
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/auth/register");
        req.Headers.Add("Origin", "https://tauri.localhost");
        req.Content = JsonContent.Create(
            new
            {
                email = $"cors_{Guid.NewGuid():N}@example.com",
                password = "P@ss1234!",
                displayName = "CORS Test",
            }
        );
        return req;
    }
}
