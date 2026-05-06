using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SolaHub.Application.Common;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.Interfaces.Services;
using SolaHub.Infrastructure.Auth;
using SolaHub.Infrastructure.Persistence;
using SolaHub.Infrastructure.Persistence.Interceptors;
using SolaHub.Infrastructure.Repositories;
using SolaHub.Infrastructure.Services;
using StackExchange.Redis;

namespace SolaHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment environment
    )
    {
        // ─── JWT Options (validated at startup, fail-fast on misconfig) ────────
        services
            .AddOptions<JwtOptions>()
            .Bind(config.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .Validate(
                o =>
                    o.ValidateSecret()
                    == System.ComponentModel.DataAnnotations.ValidationResult.Success,
                "Jwt:SecretKey must be at least 32 bytes for HMAC-SHA256."
            )
            .ValidateOnStart();

        // ─── Database ──────────────────────────────────────────────────────────
        var connectionString =
            config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is required.");

        services.AddHttpContextAccessor();
        services.AddSingleton<AppDbRlsInterceptor>();

        void ConfigureNpgsql(IServiceProvider sp, DbContextOptionsBuilder opts)
        {
            opts.UseNpgsql(
                    connectionString,
                    pg =>
                    {
                        pg.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                        pg.EnableRetryOnFailure(
                            maxRetryCount: 3,
                            maxRetryDelay: TimeSpan.FromSeconds(5),
                            errorCodesToAdd: null
                        );
                        pg.CommandTimeout(30);
                    }
                )
                .UseSnakeCaseNamingConvention()
                .AddInterceptors(sp.GetRequiredService<AppDbRlsInterceptor>());
        }

        // Pool contexts in real deployments — cuts allocation churn under concurrent requests.
        // Integration tests run as environment "Test" and keep a plain DbContext for WebApplicationFactory swaps.
        if (environment.IsEnvironment("Test"))
            services.AddDbContext<AppDbContext>(ConfigureNpgsql);
        else
            services.AddDbContextPool<AppDbContext>(ConfigureNpgsql);

        // ─── Repositories ──────────────────────────────────────────────────────
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IUserSessionRepository, UserSessionRepository>();
        services.AddScoped<IVerseNoteRepository, VerseNoteRepository>();
        services.AddScoped<IReadingPlanRepository, ReadingPlanRepository>();
        services.AddScoped<ICommunityPostRepository, CommunityPostRepository>();

        // ─── Domain Services ───────────────────────────────────────────────────
        services.AddScoped<IAdminService, AdminService>();

        // ─── Auth Services ─────────────────────────────────────────────────────
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<IRefreshTokenHasher, RefreshTokenHasher>();

        // ─── Distributed Cache ─────────────────────────────────────────────────
        var redisConn = config.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redisConn))
        {
            services.AddSingleton<IConnectionMultiplexer>(_ =>
                ConnectionMultiplexer.Connect(redisConn)
            );
            services.AddStackExchangeRedisCache(opts => opts.Configuration = redisConn);
        }
        else
            services.AddDistributedMemoryCache(); // Fallback for local dev without Redis

        return services;
    }

    /// <summary>
    /// Returns the resolved <see cref="JwtOptions"/> from a built service provider.
    /// Used by the API host to feed JWT bearer validation parameters from the same
    /// source-of-truth as the rest of the auth stack.
    /// </summary>
    public static JwtOptions ResolveJwtOptions(this IServiceProvider services) =>
        services.GetRequiredService<IOptions<JwtOptions>>().Value;
}
