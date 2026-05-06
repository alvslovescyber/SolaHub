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

    Task<bool> DeleteUserAsync(Guid id, CancellationToken ct = default);

    Task<string?> ResetPasswordAsync(Guid id, CancellationToken ct = default);

    Task<bool> RevokeSessionsAsync(Guid id, CancellationToken ct = default);
}
