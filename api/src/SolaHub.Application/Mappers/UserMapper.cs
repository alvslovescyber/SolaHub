using SolaHub.Application.DTOs;
using SolaHub.Core.Entities;

namespace SolaHub.Application.Mappers;

/// <summary>
/// Maps <see cref="User"/> domain entities to API-facing <see cref="UserDto"/>s.
/// Centralizing this avoids the previous cross-handler reach into
/// <c>RegisterCommandHandler.MapToUserDto</c> and keeps the projection in one place.
/// </summary>
public static class UserMapper
{
    public static UserDto ToDto(User user) =>
        new(
            user.Id.Value,
            user.DisplayName,
            user.Email.Value,
            user.Role.ToString(),
            user.ChurchId?.Value,
            user.IsEmailVerified,
            user.IsActive,
            user.CreatedAt
        );
}
