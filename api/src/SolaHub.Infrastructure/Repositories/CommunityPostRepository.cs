using Microsoft.EntityFrameworkCore;
using SolaHub.Core.Entities;
using SolaHub.Core.Enums;
using SolaHub.Core.Interfaces.Repositories;
using SolaHub.Core.ValueObjects;
using SolaHub.Infrastructure.Persistence;

namespace SolaHub.Infrastructure.Repositories;

public sealed class CommunityPostRepository(AppDbContext db) : ICommunityPostRepository
{
    public Task<CommunityPost?> GetByIdAsync(CommunityPostId id, CancellationToken ct = default) =>
        db.CommunityPosts.FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<IReadOnlyList<CommunityPost>> GetFeedAsync(
        UserId requestingUserId,
        CommunityFeed feed,
        int take,
        DateTimeOffset? before,
        CancellationToken ct = default
    )
    {
        var query = db.CommunityPosts.AsNoTracking();

        query =
            feed == CommunityFeed.Mine
                ? query.Where(p => p.AuthorId == requestingUserId)
                : query.Where(p => p.Visibility == CommunityVisibility.Public);

        if (feed == CommunityFeed.Everyone)
        {
            query = query.Where(p =>
                !db.CommunityPostReports.Any(r => r.PostId == p.Id && r.UserId == requestingUserId)
            );
        }

        if (before.HasValue)
            query = query.Where(p => p.CreatedAt < before.Value);

        var posts = await query.OrderByDescending(p => p.CreatedAt).Take(take).ToListAsync(ct);
        return posts.AsReadOnly();
    }

    public async Task<IReadOnlySet<CommunityPostId>> GetReportedPostIdsAsync(
        UserId userId,
        IEnumerable<CommunityPostId> postIds,
        CancellationToken ct = default
    )
    {
        var ids = postIds.Distinct().ToList();
        if (ids.Count == 0)
            return new HashSet<CommunityPostId>();

        var reported = await db
            .CommunityPostReports.AsNoTracking()
            .Where(r => r.UserId == userId && ids.Contains(r.PostId))
            .Select(r => r.PostId)
            .ToListAsync(ct);

        return reported.ToHashSet();
    }

    public Task<bool> HasReportAsync(
        CommunityPostId postId,
        UserId userId,
        CancellationToken ct = default
    ) => db.CommunityPostReports.AnyAsync(r => r.PostId == postId && r.UserId == userId, ct);

    public async Task AddAsync(CommunityPost post, CancellationToken ct = default)
    {
        await db.CommunityPosts.AddAsync(post, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(CommunityPost post, CancellationToken ct = default)
    {
        if (db.Entry(post).State == EntityState.Detached)
            db.CommunityPosts.Update(post);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(CommunityPostId id, CancellationToken ct = default)
    {
        await db.CommunityPosts.Where(p => p.Id == id).ExecuteDeleteAsync(ct);
    }

    public async Task AddReportAsync(CommunityPostReport report, CancellationToken ct = default)
    {
        await db.CommunityPostReports.AddAsync(report, ct);
        await db.SaveChangesAsync(ct);
    }
}
