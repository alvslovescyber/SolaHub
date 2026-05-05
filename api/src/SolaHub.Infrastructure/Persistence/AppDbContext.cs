using Microsoft.EntityFrameworkCore;
using SolaHub.Core.Common;
using SolaHub.Core.Entities;

namespace SolaHub.Infrastructure.Persistence;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Church> Churches => Set<Church>();
    public DbSet<VerseNote> VerseNotes => Set<VerseNote>();
    public DbSet<ReadingPlan> ReadingPlans => Set<ReadingPlan>();
    public DbSet<CommunityPost> CommunityPosts => Set<CommunityPost>();
    public DbSet<CommunityPostReport> CommunityPostReports => Set<CommunityPostReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Collect entities with pending domain events across all entity types
        var entitiesWithEvents = ChangeTracker
            .Entries()
            .Select(e => e.Entity)
            .OfType<IHasDomainEvents>()
            .Where(e => e.DomainEvents.Any())
            .ToList();

        var result = await base.SaveChangesAsync(cancellationToken);

        foreach (var entity in entitiesWithEvents)
            entity.ClearDomainEvents();

        return result;
    }
}
