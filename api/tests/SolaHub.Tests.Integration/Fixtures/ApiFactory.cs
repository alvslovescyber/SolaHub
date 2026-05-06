using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using SolaHub.Infrastructure.Persistence;
using SolaHub.Infrastructure.Persistence.Interceptors;
using Testcontainers.PostgreSql;

namespace SolaHub.Tests.Integration.Fixtures;

/// <summary>
/// Spins up a real PostgreSQL container via Testcontainers and bootstraps the
/// ASP.NET Core host with it. Shared across all tests in the collection.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string AppRolePassword = "app-test-password";

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("solahub_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        _ = Server;
    }

    public new async Task DisposeAsync()
    {
        await _postgres.StopAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Test");
        builder.ConfigureAppConfiguration(
            (_, config) =>
            {
                config.AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["ConnectionStrings:DefaultConnection"] = AppConnectionString,
                        ["ConnectionStrings:MigrationConnection"] = _postgres.GetConnectionString(),
                        ["Database:AppRolePassword"] = AppRolePassword,
                    }
                );
            }
        );

        builder.ConfigureServices(services =>
        {
            // Replace the real DB with the test container
            var descriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<AppDbContext>)
            );
            if (descriptor is not null)
                services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(
                (sp, opts) =>
                    opts.UseNpgsql(AppConnectionString)
                        .UseSnakeCaseNamingConvention()
                        .AddInterceptors(sp.GetRequiredService<AppDbRlsInterceptor>())
            );
        });
    }

    private string AppConnectionString
    {
        get
        {
            var builder = new NpgsqlConnectionStringBuilder(_postgres.GetConnectionString())
            {
                Username = "solahub_app",
                Password = AppRolePassword,
            };
            return builder.ConnectionString;
        }
    }
}

[CollectionDefinition(nameof(ApiCollection))]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>;
