namespace SolaHub.Application.DTOs;

public sealed record AdminUserDto(
    Guid Id,
    string DisplayName,
    string Email,
    string Role,
    bool IsActive,
    bool IsEmailVerified,
    Guid? ChurchId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastLoginAt
);

public sealed record AdminUsersResponse(
    IReadOnlyList<AdminUserDto> Users,
    int Total,
    int Page,
    int PageSize
);

public sealed record AdminStatsDto(
    int TotalUsers,
    int ActiveUsers,
    int AdminUsers,
    int TotalNotes,
    int TotalPlans,
    int TotalChurches,
    int TotalCommunityPosts
);
