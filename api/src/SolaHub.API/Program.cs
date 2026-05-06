using System.Net;
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
using SolaHub.API.Hubs;
using SolaHub.API.Middleware;
using SolaHub.Application;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure;
using SolaHub.Infrastructure.Auth;
using SolaHub.Infrastructure.Persistence;
using StackExchange.Redis;

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

    // Explicit Kestrel port from $PORT env var so Railway healthchecks reach the right port.
    var port = int.TryParse(Environment.GetEnvironmentVariable("PORT"), out var p) ? p : 3000;
    builder.WebHost.ConfigureKestrel(opts => opts.ListenAnyIP(port));

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

    builder.Services.AddResponseCompression(opts =>
    {
        // Avoid compressing secret-bearing JSON responses over HTTPS.
        opts.EnableForHttps = false;
        opts.Providers.Add<BrotliCompressionProvider>();
        opts.Providers.Add<GzipCompressionProvider>();
    });

    if (!args.Contains("--migrate"))
        ValidateForwardedHeadersConfiguration(builder.Configuration, builder.Environment);
    builder.Services.Configure<ForwardedHeadersOptions>(opts =>
        ConfigureForwardedHeaders(opts, builder.Configuration, builder.Environment)
    );

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
                        ?? principal?.FindFirstValue(
                            System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub
                        );
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

                    var repo =
                        context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
                    var user = await repo.GetByIdForAuthenticationAsync(
                        UserId.From(userGuid),
                        context.HttpContext.RequestAborted
                    );

                    if (
                        user is null
                        || !user.IsActive
                        || user.SessionVersion != tokenSessionVersion
                    )
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
    // CORS must run before any short-circuiting middleware (rate limiters, etc.)
    // so that 429 / 4xx responses still carry Access-Control-Allow-Origin headers.
    // Without this, WebView2 / browsers treat early-exit responses as CORS failures.
    app.UseCors("TauriApp");
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

    // HTTPS termination happens at the Railway edge; container traffic is HTTP-only.
    // UseHttpsRedirection would cause 301s that fail Railway's HTTP health checks.
    if (app.Environment.IsDevelopment())
    {
        // nothing — Kestrel handles HTTPS in dev via dev certs
    }

    app.UseAuthentication();
    app.UseMiddleware<CommunityWriteRateLimitMiddleware>();
    app.UseAuthorization();
    app.UseResponseCompression();

    // ─── --migrate mode: run migrations then exit (Railway releaseCommand) ──────
    if (args.Contains("--migrate"))
    {
        await MigrateWithRetryAsync(app);
        Log.Information("Migrations complete.");
        return 0;
    }

    // ─── Database migrations (dev/test by default; prod opt-in via config) ─────
    var applyMigrations =
        app.Environment.IsDevelopment()
        || app.Environment.IsEnvironment("Test")
        || app.Configuration.GetValue("Database:ApplyMigrationsOnStartup", false);

    if (applyMigrations)
        await MigrateWithRetryAsync(app);

    // ─── Admin bootstrap: promote a specific account to Admin role ────────────
    // Set Admin__Email env var on Railway to the account that should be promoted.
    await SeedAdminUserAsync(app);

    app.MapControllers();
    app.MapHub<CollaborationHub>("/hubs/collaboration");
    // Liveness: always 200 when the process is alive (Railway healthcheck target).
    app.MapHealthChecks("/health", new() { Predicate = _ => false });
    // Readiness: includes DB check — used for deeper monitoring.
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
/// Promotes the account identified by Admin:Email to the Admin role on every startup.
/// Safe to run repeatedly — exits silently if the env var is absent or the user is
/// already an admin.
/// </summary>
static async Task SeedAdminUserAsync(WebApplication app)
{
    var adminEmail = app.Configuration["Admin:Email"];
    if (string.IsNullOrWhiteSpace(adminEmail))
        return;

    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await using var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var user = await db.Users.FirstOrDefaultAsync(u => u.Email.Value == adminEmail);
    if (user is null)
    {
        logger.LogWarning("Admin seed: no account found for {Email}", adminEmail);
        return;
    }

    if (user.Role == SolaHub.Core.Enums.UserRole.Admin)
        return;

    user.UpdateRole(SolaHub.Core.Enums.UserRole.Admin);
    await db.SaveChangesAsync();
    logger.LogInformation("Admin seed: promoted {Email} to Admin role.", adminEmail);
}

/// <summary>
/// Applies EF Core migrations at startup with retry logic so the API
/// doesn't crash if the Docker PostgreSQL container is still initializing.
/// </summary>
static async Task MigrateWithRetryAsync(WebApplication app)
{
    const int maxRetries = 10;
    const int delayMs = 2_000;

    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await using var db = CreateMigrationDbContext(app, scope.ServiceProvider);

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
            await SetAppRolePasswordIfConfiguredAsync(app, db);
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
    await SetAppRolePasswordIfConfiguredAsync(app, db);
}

static AppDbContext CreateMigrationDbContext(WebApplication app, IServiceProvider services)
{
    var migrationConnection = app.Configuration.GetConnectionString("MigrationConnection");
    if (string.IsNullOrWhiteSpace(migrationConnection))
        return services.GetRequiredService<AppDbContext>();

    var options = new DbContextOptionsBuilder<AppDbContext>()
        .UseNpgsql(migrationConnection, npgsql => npgsql.EnableRetryOnFailure(5))
        .UseSnakeCaseNamingConvention()
        .Options;

    return new AppDbContext(options);
}

static async Task SetAppRolePasswordIfConfiguredAsync(WebApplication app, AppDbContext db)
{
    var appRolePassword = app.Configuration["Database:AppRolePassword"];
    if (string.IsNullOrWhiteSpace(appRolePassword))
        return;

    await db.Database.OpenConnectionAsync();
    try
    {
        var conn = db.Database.GetDbConnection();
        using var cmd = conn.CreateCommand();
        var escapedPassword = appRolePassword.Replace("'", "''", StringComparison.Ordinal);
        cmd.CommandText = $"ALTER ROLE solahub_app WITH PASSWORD '{escapedPassword}'";
        await cmd.ExecuteNonQueryAsync();
    }
    finally
    {
        await db.Database.CloseConnectionAsync();
    }
}

static void ValidateForwardedHeadersConfiguration(
    IConfiguration configuration,
    IHostEnvironment environment
)
{
    if (environment.IsDevelopment() || environment.IsEnvironment("Test"))
        return;

    var proxies = configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [];
    var networks = configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? [];
    var allowUnknown = configuration.GetValue("ForwardedHeaders:AllowUnknownProxies", false);

    if (proxies.Length == 0 && networks.Length == 0 && !allowUnknown)
    {
        throw new InvalidOperationException(
            "Production forwarded headers must be restricted to trusted proxies/networks. "
                + "Configure ForwardedHeaders:KnownProxies or ForwardedHeaders:KnownNetworks, "
                + "or explicitly set ForwardedHeaders:AllowUnknownProxies=true only when the API "
                + "is not directly reachable except through a trusted platform edge."
        );
    }
}

static void ConfigureForwardedHeaders(
    ForwardedHeadersOptions opts,
    IConfiguration configuration,
    IHostEnvironment environment
)
{
    opts.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    opts.ForwardLimit = configuration.GetValue<int?>("ForwardedHeaders:ForwardLimit") ?? 1;

    opts.KnownProxies.Clear();
    opts.KnownIPNetworks.Clear();

    foreach (
        var proxy in configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? []
    )
    {
        if (!IPAddress.TryParse(proxy, out var address))
            throw new InvalidOperationException(
                $"Invalid ForwardedHeaders:KnownProxies entry '{proxy}'."
            );
        opts.KnownProxies.Add(address);
    }

    foreach (
        var network in configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>()
            ?? []
    )
        opts.KnownIPNetworks.Add(ParseKnownNetwork(network));

    if (
        configuration.GetValue("ForwardedHeaders:AllowUnknownProxies", false)
        && !environment.IsDevelopment()
        && !environment.IsEnvironment("Test")
    )
    {
        // Explicit production break-glass mode for platforms that do not publish stable edge IPs.
        opts.KnownProxies.Clear();
        opts.KnownIPNetworks.Clear();
    }
}

static System.Net.IPNetwork ParseKnownNetwork(string cidr)
{
    if (!System.Net.IPNetwork.TryParse(cidr, out var network))
    {
        throw new InvalidOperationException(
            $"Invalid ForwardedHeaders:KnownNetworks entry '{cidr}'. Use CIDR format, for example 10.0.0.0/8."
        );
    }

    return network;
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
            "http://127.0.0.1:1420",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ];
    }

    throw new InvalidOperationException(
        "Cors:AllowedOrigins must be configured (comma-separated) for this environment."
    );
}

// Expose Program for WebApplicationFactory in integration tests
public partial class Program { }
