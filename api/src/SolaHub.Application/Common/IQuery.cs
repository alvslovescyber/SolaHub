using MediatR;
using SolaHub.Core.Common;

namespace SolaHub.Application.Common;

/// <summary>Marker for queries — pure reads with no side effects.</summary>
public interface IQuery<TResponse> : IRequest<Result<TResponse>> { }

public interface IQueryHandler<TQuery, TResponse> : IRequestHandler<TQuery, Result<TResponse>>
    where TQuery : IQuery<TResponse> { }
