using Scalar.AspNetCore;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;
using SolaHub.API.Hubs;
using SolaHub.API.Middleware;
using SolaHub.Application;
using SolaHub.Infrastructure;

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
    builder.Host.UseSerilog((ctx, services, config) =>
        config
            .ReadFrom.Configuration(ctx.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithMachineName()
            .Enrich.WithThreadId()
            .WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                "logs/solahub-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 30,
                outputTemplate:
                "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}"));

    // ─── Application + Infrastructure ─────────────────────────────────────────
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);

    // ─── JWT Authentication ────────────────────────────────────────────────────
    var jwtKey = builder.Configuration["Jwt:SecretKey"]
        ?? throw new InvalidOperationException("Jwt:SecretKey is required.");

    if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
        throw new InvalidOperationException("Jwt:SecretKey must be at least 32 bytes.");

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(opts =>
        {
            opts.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ValidateIssuer = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = builder.Configuration["Jwt:Audience"],
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
                    if (!string.IsNullOrEmpty(accessToken) &&
                        path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                },
            };
        });

    builder.Services.AddAuthorization();

    // ─── Controllers + SignalR ─────────────────────────────────────────────────
    builder.Services.AddControllers();
    builder.Services.AddSignalR(opts =>
    {
        opts.EnableDetailedErrors = builder.Environment.IsDevelopment();
        opts.MaximumReceiveMessageSize = 64 * 1024; // 64 KB
    });

    // ─── OpenAPI / Scalar ──────────────────────────────────────────────────────
    builder.Services.AddOpenApi();

    // ─── CORS (Tauri desktop app uses tauri:// scheme) ─────────────────────────
    builder.Services.AddCors(opts =>
        opts.AddPolicy("TauriApp", policy =>
            policy
                .WithOrigins(
                    "tauri://localhost",
                    "https://tauri.localhost",
                    "http://localhost:1420",  // Vite dev server
                    "http://localhost:5173")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()));

    // ─── Health Checks ─────────────────────────────────────────────────────────
    builder.Services.AddHealthChecks();

    var app = builder.Build();

    // ─── Middleware Pipeline ───────────────────────────────────────────────────
    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
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

    app.UseHttpsRedirection();
    app.UseCors("TauriApp");
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHub<CollaborationHub>("/hubs/collaboration");
    app.MapHealthChecks("/health");

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

// Expose Program for WebApplicationFactory in integration tests
public partial class Program { }
