using SolaHub.Application.DTOs;

namespace SolaHub.Application.Common;

public interface IAdminService
{
    Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default);

    Task<AdminUsersResponse> GetUsersAsync(
        int page,
        int pageSize,
        string? search,
        string? role,
        CancellationToken ct = default
    );

    Task<AdminUserDto?> UpdateUserAsync(
        Guid id,
        UpdateUserRequest request,
        CancellationToken ct = default
    );
}
