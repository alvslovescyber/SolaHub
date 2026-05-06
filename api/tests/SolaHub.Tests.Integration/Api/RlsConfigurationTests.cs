using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SolaHub.Infrastructure.Persistence;
using SolaHub.Tests.Integration.Fixtures;

namespace SolaHub.Tests.Integration.Api;

[Collection(nameof(ApiCollection))]
public sealed class RlsConfigurationTests(ApiFactory factory)
{
    [Fact]
    public async Task ApiConnection_UsesNonSuperuserRole()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await db.Database.OpenConnectionAsync();
        try
        {
            var conn = db.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT current_user, current_setting('is_superuser')";
            await using var reader = await cmd.ExecuteReaderAsync();
            (await reader.ReadAsync()).Should().BeTrue();

            reader.GetString(0).Should().Be("solahub_app");
            reader.GetString(1).Should().Be("off");
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    [Fact]
    public async Task SensitiveTables_HaveForcedRowLevelSecurity()
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rows = await db
            .Database.SqlQueryRaw<RlsTableState>(
                """
                SELECT relname AS name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
                FROM pg_class
                WHERE relname IN (
                  'verse_notes',
                  'reading_plans',
                  'reading_plan_days',
                  'plan_participants',
                  'community_posts',
                  'community_post_reports',
                  'users',
                  'churches'
                )
                """
            )
            .ToListAsync();

        rows.Should().HaveCount(8);
        rows.Should().OnlyContain(row => row.RlsEnabled && row.RlsForced);
    }

    private sealed class RlsTableState
    {
        public string Name { get; init; } = string.Empty;
        public bool RlsEnabled { get; init; }
        public bool RlsForced { get; init; }
    }
}
