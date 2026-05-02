using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.Interfaces.Services;
using SolaHub.Infrastructure.Auth;
using SolaHub.Infrastructure.Persistence;
using SolaHub.Infrastructure.Repositories;

namespace SolaHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration config
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

        services.AddDbContext<AppDbContext>(opts =>
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
        );

        // ─── Repositories ──────────────────────────────────────────────────────
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IVerseNoteRepository, VerseNoteRepository>();
        services.AddScoped<IReadingPlanRepository, ReadingPlanRepository>();

        // ─── Auth Services ─────────────────────────────────────────────────────
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<IRefreshTokenHasher, RefreshTokenHasher>();

        // ─── Distributed Cache ─────────────────────────────────────────────────
        var redisConn = config.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redisConn))
            services.AddStackExchangeRedisCache(opts => opts.Configuration = redisConn);
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
