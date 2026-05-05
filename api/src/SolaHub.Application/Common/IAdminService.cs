using SolaHub.Application.DTOs;

namespace SolaHub.Application.Common;

public interface IAdminService
{
    Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default);
}
