using System.Net;
using SolaHub.Tests.Integration.Fixtures;

namespace SolaHub.Tests.Integration.Api;

/// <summary>
/// Smoke-test that the application host starts cleanly and the health endpoint
/// is reachable.  Any startup panic — e.g. a missing plugin config, a failed
/// migration, or an unresolvable DI dependency — surfaces here before all other
/// integration tests run.
/// </summary>
[Collection(nameof(ApiCollection))]
public sealed class HealthEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Health_ReturnsWithinOneSecond()
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        await _client.GetAsync("/health");
        sw.Stop();

        sw.ElapsedMilliseconds.Should().BeLessThan(1_000);
    }
}
