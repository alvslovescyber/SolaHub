namespace SolaHub.API.Middleware;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
        context.Response.Headers.Append(
            "Permissions-Policy",
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
        );
        // Restricts JS execution to same-origin only, blocks inline scripts and eval.
        // Adjust script-src if you add a CDN; update connect-src for external API integrations.
        context.Response.Headers.Append(
            "Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline' https://rsms.me; " +
            "font-src 'self' https://rsms.me; " +
            "img-src 'self' data:; " +
            "connect-src 'self' wss: https://bible-api.com; " +
            "frame-ancestors 'none';"
        );
        return next(context);
    }
}
