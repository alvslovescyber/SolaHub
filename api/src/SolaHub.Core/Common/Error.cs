namespace SolaHub.Core.Common;

public sealed record Error(string Code, string Description, ErrorType Type = ErrorType.Failure)
{
    public static readonly Error None = new(string.Empty, string.Empty, ErrorType.Failure);
    public static readonly Error NullValue = new("Error.NullValue", "A null value was provided.");

    public static Error NotFound(string resource, object id) =>
        new(
            $"{resource}.NotFound",
            $"{resource} with id '{id}' was not found.",
            ErrorType.NotFound
        );

    public static Error Unauthorized(string message = "Unauthorized access.") =>
        new("Error.Unauthorized", message, ErrorType.Unauthorized);

    public static Error Unauthorized(string code, string description) =>
        new(code, description, ErrorType.Unauthorized);

    public static Error Forbidden(string message = "Access forbidden.") =>
        new("Error.Forbidden", message, ErrorType.Forbidden);

    public static Error Forbidden(string code, string description) =>
        new(code, description, ErrorType.Forbidden);

    public static Error Conflict(string resource, string reason) =>
        new($"{resource}.Conflict", reason, ErrorType.Conflict);

    public static Error Validation(string field, string message) =>
        new($"Validation.{field}", message, ErrorType.Validation);
}

public enum ErrorType
{
    Failure,
    Validation,
    NotFound,
    Conflict,
    Unauthorized,
    Forbidden,
}
