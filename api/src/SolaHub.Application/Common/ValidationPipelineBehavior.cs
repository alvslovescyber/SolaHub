using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;
using SolaHub.Core.Common;

namespace SolaHub.Application.Common;

/// <summary>
/// MediatR pipeline behavior that runs FluentValidation before the handler.
/// Aggregates all validation failures into a single error response.
/// Short-circuits if any rule fails — handler is never invoked.
/// </summary>
public sealed class ValidationPipelineBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators,
    ILogger<ValidationPipelineBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);

        var failures = (await Task.WhenAll(
                validators.Select(v => v.ValidateAsync(context, cancellationToken))))
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count == 0)
            return await next();

        var errorMessage = string.Join("; ", failures.Select(f => $"{f.PropertyName}: {f.ErrorMessage}"));
        logger.LogWarning("Validation failed for {RequestType}: {Errors}", typeof(TRequest).Name, errorMessage);

        var error = new Error("Validation.Failed", errorMessage, ErrorType.Validation);
        return CreateFailureResult<TResponse>(error);
    }

    private static T CreateFailureResult<T>(Error error)
    {
        var type = typeof(T);

        if (type == typeof(Result))
            return (T)(object)Result.Failure(error);

        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Result<>))
        {
            var innerType = type.GetGenericArguments()[0];
            var failureMethod = typeof(Result<>)
                .MakeGenericType(innerType)
                .GetMethod(nameof(Result<object>.Failure))!;
            return (T)failureMethod.Invoke(null, [error])!;
        }

        throw new InvalidOperationException(
            $"ValidationPipelineBehavior expects Result or Result<T> response, got {type.Name}.");
    }
}
