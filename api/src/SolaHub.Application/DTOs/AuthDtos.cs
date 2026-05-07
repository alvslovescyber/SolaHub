namespace SolaHub.Application.DTOs;

public sealed record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset ExpiresAt,
    UserDto User
);

public sealed record UserDto(
    Guid Id,
    string DisplayName,
    string Email,
    string Role,
    Guid? ChurchId,
    bool IsEmailVerified,
    bool IsActive,
    DateTimeOffset CreatedAt
);
