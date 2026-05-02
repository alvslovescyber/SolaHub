using System.Security.Claims;
using System.Text;
using HealthChecks.NpgSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;
using StackExchange.Redis;
using SolaHub.API.Hubs;
using SolaHub.API.Middleware;
using SolaHub.Application;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure;
using SolaHub.Infrastructure.Auth;
using SolaHub.Infrastructure.Persistence;

// ─── Bootstrap Logger ──────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting SolaHub API");

    var builder = WebApplication.CreateBuilder(args);

    // ─── Serilog ───────────────────────────────────────────────────────────────
    builder.Host.UseSerilog(
        (ctx, services, config) =>
            config
                .ReadFrom.Configuration(ctx.Configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext()
                .Enrich.WithMachineName()
                .Enrich.WithThreadId()
                .WriteTo.Console(
                    outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}"
                )
                .WriteTo.File(
                    "logs/solahub-.log",
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 30,
                    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}"
                )
    );

    // ─── Application + Infrastructure ─────────────────────────────────────────
    // Infrastructure registers JwtOptions and validates it at startup.
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

    builder
        .Services.AddResponseCompression(opts =>
        {
            // Avoid compressing secret-bearing JSON responses over HTTPS.
            opts.EnableForHttps = false;
            opts.Providers.Add<BrotliCompressionProvider>();
            opts.Providers.Add<GzipCompressionProvider>();
        });

    builder.Services.Configure<ForwardedHeadersOptions>(opts =>
    {
        opts.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        opts.KnownIPNetworks.Clear();
        opts.KnownProxies.Clear();
    });

    // ─── JWT Authentication ────────────────────────────────────────────────────
    // Bind a snapshot of JwtOptions so JwtBearer middleware sees the same source
    // of truth as the rest of the auth stack (handlers, refresh-hasher, token svc).
    var jwtOptions =
        builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
        ?? throw new InvalidOperationException(
            $"Configuration section '{JwtOptions.SectionName}' is missing."
        );
    var secretValidation = jwtOptions.ValidateSecret();
    if (
        secretValidation is not null
        && secretValidation != System.ComponentModel.DataAnnotations.ValidationResult.Success
    )
        throw new InvalidOperationException(secretValidation.ErrorMessage);

    builder
        .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opts =>
        {
            opts.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtOptions.SecretKey)
                ),
                ValidateIssuer = true,
                ValidIssuer = jwtOptions.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtOptions.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30), // tight clock skew
            };

            // Allow SignalR to receive token via query string
            opts.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                },
                OnTokenValidated = async context =>
                {
                    var principal = context.Principal;
                    var sub =
                        principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? principal?.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub);
                    if (!Guid.TryParse(sub, out var userGuid))
                    {
                        context.Fail("Missing or invalid user identifier.");
                        return;
                    }

                    var sessionVersionClaim = principal?.FindFirstValue("session_version");
                    if (!int.TryParse(sessionVersionClaim, out var tokenSessionVersion))
                    {
                        context.Fail("Missing session version.");
                        return;
                    }

                    var repo = context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
                    var user = await repo.GetByIdAsync(
                        UserId.From(userGuid),
                        context.HttpContext.RequestAborted
                    );

                    if (user is null || !user.IsActive || user.SessionVersion != tokenSessionVersion)
                        context.Fail("Token has been revoked.");
                },
            };
        });

    builder.Services.AddAuthorization();

    // ─── Controllers + SignalR ─────────────────────────────────────────────────
    builder.Services.AddControllers();
    var signalRBuilder = builder.Services.AddSignalR(opts =>
    {
        opts.EnableDetailedErrors = builder.Environment.IsDevelopment();
        opts.MaximumReceiveMessageSize = 64 * 1024; // 64 KB
    });

    var redisConnForSignalR = builder.Configuration.GetConnectionString("Redis");
    if (!string.IsNullOrWhiteSpace(redisConnForSignalR))
    {
        signalRBuilder.AddStackExchangeRedis(
            redisConnForSignalR,
            opts => opts.Configuration.ChannelPrefix = RedisChannel.Literal("solahub")
        );
    }

    // ─── OpenAPI / Scalar ──────────────────────────────────────────────────────
    builder.Services.AddOpenApi();

    // ─── CORS (origins from Cors:AllowedOrigins or dev defaults) ─────────────────
    var corsOrigins = ResolveCorsOrigins(builder.Configuration, builder.Environment);
    builder.Services.AddCors(opts =>
        opts.AddPolicy(
            "TauriApp",
            policy =>
                policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()
        )
    );

    // ─── Health Checks ─────────────────────────────────────────────────────────
    var connStr = builder.Configuration.GetConnectionString("DefaultConnection")!;
    builder.Services.AddHealthChecks().AddNpgSql(connStr, name: "postgres", tags: ["db", "ready"]);

    var app = builder.Build();

    // ─── Middleware Pipeline ───────────────────────────────────────────────────
    app.UseForwardedHeaders();
    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseMiddleware<SecurityHeadersMiddleware>();
    app.UseMiddleware<AuthRateLimitMiddleware>();
    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        // RequestPath does not include query string — avoids logging SignalR access_token.
        opts.GetLevel = (ctx, _, ex) =>
            ex is not null || ctx.Response.StatusCode >= 500 ? LogEventLevel.Error
            : ctx.Request.Path.StartsWithSegments("/hubs") ? LogEventLevel.Debug
            : LogEventLevel.Information;
    });

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
        app.MapScalarApiReference(opts =>
        {
            opts.Title = "SolaHub API";
            opts.Theme = Scalar.AspNetCore.ScalarTheme.Purple;
        });
    }

    if (!app.Environment.IsDevelopment())
    {
        app.UseHsts();
        app.UseHttpsRedirection();
    }

    app.UseCors("TauriApp");
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseResponseCompression();

    // ─── Database migrations (dev/test by default; prod opt-in via config) ─────
    var applyMigrations =
        app.Environment.IsDevelopment()
        || app.Environment.IsEnvironment("Test")
        || app.Configuration.GetValue("Database:ApplyMigrationsOnStartup", false);

    if (applyMigrations)
        await MigrateWithRetryAsync(app);

    app.MapControllers();
    app.MapHub<CollaborationHub>("/hubs/collaboration");
    app.MapHealthChecks("/health");
    app.MapHealthChecks(
        "/health/ready",
        new() { Predicate = check => check.Tags.Contains("ready") }
    );

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    return 1;
}
finally
{
    await Log.CloseAndFlushAsync();
}

return 0;

/// <summary>
/// Applies EF Core migrations at startup with retry logic so the API
/// doesn't crash if the Docker PostgreSQL container is still initializing.
/// </summary>
static async Task MigrateWithRetryAsync(WebApplication app)
{
    const int maxRetries = 10;
    const int delayMs = 2_000;

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    for (var attempt = 1; attempt <= maxRetries; attempt++)
    {
        try
        {
            logger.LogInformation(
                "Applying database migrations (attempt {Attempt}/{Max})…",
                attempt,
                maxRetries
            );
            await db.Database.MigrateAsync();
            logger.LogInformation("Database migrations applied successfully.");
            return;
        }
        catch (Exception ex) when (attempt < maxRetries)
        {
            logger.LogWarning(ex, "Database not ready yet. Retrying in {Delay}ms…", delayMs);
            await Task.Delay(delayMs);
        }
    }

    // Final attempt — let it throw if still not ready
    await db.Database.MigrateAsync();
}

static string[] ResolveCorsOrigins(IConfiguration configuration, IHostEnvironment environment)
{
    var configured = configuration["Cors:AllowedOrigins"];
    if (!string.IsNullOrWhiteSpace(configured))
    {
        return configured.Split(
            ',',
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries
        );
    }

    if (environment.IsDevelopment() || environment.IsEnvironment("Test"))
    {
        return
        [
            "tauri://localhost",
            "https://tauri.localhost",
            "http://localhost:1420",
            "http://localhost:3000",
            "http://localhost:5173",
        ];
    }

    throw new InvalidOperationException(
        "Cors:AllowedOrigins must be configured (comma-separated) for this environment."
    );
}

// Expose Program for WebApplicationFactory in integration tests
public partial class Program { }
