using MediatR;
using SolaHub.Core.Common;

namespace SolaHub.Application.Common;

/// <summary>Marker for commands returning a typed result.</summary>
public interface ICommand<TResponse> : IRequest<Result<TResponse>> { }

/// <summary>Marker for commands with no return value.</summary>
public interface ICommand : IRequest<Result> { }

public interface ICommandHandler<TCommand, TResponse> : IRequestHandler<TCommand, Result<TResponse>>
    where TCommand : ICommand<TResponse> { }

public interface ICommandHandler<TCommand> : IRequestHandler<TCommand, Result>
    where TCommand : ICommand { }
