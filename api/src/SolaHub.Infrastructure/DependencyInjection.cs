using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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

        // ─── Distributed Cache ─────────────────────────────────────────────────
        var redisConn = config.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redisConn))
            services.AddStackExchangeRedisCache(opts => opts.Configuration = redisConn);
        else
            services.AddDistributedMemoryCache(); // Fallback for local dev without Redis

        return services;
    }
}
