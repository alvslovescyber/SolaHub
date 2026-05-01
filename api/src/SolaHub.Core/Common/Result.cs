namespace SolaHub.Core.Common;

/// <summary>
/// Discriminated union representing either a success value or a domain error.
/// Use this instead of throwing exceptions for expected failure cases.
/// </summary>
public sealed class Result<TValue>
{
    private readonly TValue? _value;
    private readonly Error? _error;

    private Result(TValue value)
    {
        _value = value;
        IsSuccess = true;
    }

    private Result(Error error)
    {
        _error = error;
        IsSuccess = false;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;

    public TValue Value =>
        IsSuccess
            ? _value!
            : throw new InvalidOperationException("Cannot access Value on a failed Result.");

    public Error Error =>
        IsFailure
            ? _error!
            : throw new InvalidOperationException("Cannot access Error on a successful Result.");

    public static Result<TValue> Success(TValue value) => new(value);

    public static Result<TValue> Failure(Error error) => new(error);

    public TOut Match<TOut>(Func<TValue, TOut> onSuccess, Func<Error, TOut> onFailure) =>
        IsSuccess ? onSuccess(_value!) : onFailure(_error!);

    public Result<TOut> Map<TOut>(Func<TValue, TOut> mapper) =>
        IsSuccess ? Result<TOut>.Success(mapper(_value!)) : Result<TOut>.Failure(_error!);

    public Result<TOut> Bind<TOut>(Func<TValue, Result<TOut>> binder) =>
        IsSuccess ? binder(_value!) : Result<TOut>.Failure(_error!);

    public static implicit operator Result<TValue>(TValue value) => Success(value);

    public static implicit operator Result<TValue>(Error error) => Failure(error);
}

/// <summary>Non-generic result for void operations.</summary>
public sealed class Result
{
    private readonly Error? _error;

    private Result()
    {
        IsSuccess = true;
    }

    private Result(Error error)
    {
        _error = error;
        IsSuccess = false;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error =>
        IsFailure ? _error! : throw new InvalidOperationException("Result is successful.");

    public static readonly Result Ok = new();

    public static Result Success() => new();

    public static Result Failure(Error error) => new(error);

    public TOut Match<TOut>(Func<TOut> onSuccess, Func<Error, TOut> onFailure) =>
        IsSuccess ? onSuccess() : onFailure(_error!);

    public static implicit operator Result(Error error) => Failure(error);
}
