using SolaHub.Core.Entities;
using SolaHub.Core.Enums;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Core.Interfaces.Repositories;

public interface ICommunityPostRepository
{
    Task<CommunityPost?> GetByIdAsync(CommunityPostId id, CancellationToken ct = default);
    Task<IReadOnlyList<CommunityPost>> GetFeedAsync(
        UserId requestingUserId,
        CommunityFeed feed,
        int take,
        DateTimeOffset? before,
        CancellationToken ct = default
    );
    Task<IReadOnlySet<CommunityPostId>> GetReportedPostIdsAsync(
        UserId userId,
        IEnumerable<CommunityPostId> postIds,
        CancellationToken ct = default
    );
    Task<bool> HasReportAsync(
        CommunityPostId postId,
        UserId userId,
        CancellationToken ct = default
    );
    Task AddAsync(CommunityPost post, CancellationToken ct = default);
    Task UpdateAsync(CommunityPost post, CancellationToken ct = default);
    Task DeleteAsync(CommunityPostId id, CancellationToken ct = default);
    Task AddReportAsync(CommunityPostReport report, CancellationToken ct = default);
}
