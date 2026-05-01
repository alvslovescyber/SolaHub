using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace SolaHub.Application.Common;

/// <summary>
/// Logs request execution time. Warns if a handler takes longer than the slow threshold.
/// </summary>
public sealed class LoggingPipelineBehavior<TRequest, TResponse>(
    ILogger<LoggingPipelineBehavior<TRequest, TResponse>> logger
) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private static readonly TimeSpan SlowRequestThreshold = TimeSpan.FromMilliseconds(500);

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken
    )
    {
        var requestName = typeof(TRequest).Name;
        var sw = Stopwatch.StartNew();

        try
        {
            logger.LogDebug("Handling {RequestName}", requestName);
            var response = await next();
            sw.Stop();

            if (sw.Elapsed > SlowRequestThreshold)
                logger.LogWarning(
                    "Slow request {RequestName} completed in {ElapsedMs}ms",
                    requestName,
                    sw.ElapsedMilliseconds
                );
            else
                logger.LogDebug(
                    "Handled {RequestName} in {ElapsedMs}ms",
                    requestName,
                    sw.ElapsedMilliseconds
                );

            return response;
        }
        catch (Exception ex)
        {
            sw.Stop();
            logger.LogError(
                ex,
                "Request {RequestName} failed after {ElapsedMs}ms",
                requestName,
                sw.ElapsedMilliseconds
            );
            throw;
        }
    }
}
