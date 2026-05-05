using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Infrastructure.Persistence.Configurations;

internal sealed class CommunityPostConfiguration : IEntityTypeConfiguration<CommunityPost>
{
    public void Configure(EntityTypeBuilder<CommunityPost> builder)
    {
        builder.ToTable("community_posts");

        builder.HasKey(p => p.Id);

        builder
            .Property(p => p.Id)
            .HasConversion(id => id.Value, value => CommunityPostId.From(value))
            .ValueGeneratedNever();

        builder
            .Property(p => p.AuthorId)
            .HasConversion(id => id.Value, value => UserId.From(value))
            .IsRequired();

        builder
            .Property(p => p.AuthorDisplayName)
            .HasMaxLength(CommunityPost.MaxAuthorDisplayNameLength)
            .IsRequired();

        builder.Property(p => p.Kind).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(p => p.Visibility).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(p => p.Title).HasMaxLength(CommunityPost.MaxTitleLength).IsRequired();
        builder.Property(p => p.Body).HasMaxLength(CommunityPost.MaxBodyLength).IsRequired();
        builder.Property(p => p.VerseRef).HasMaxLength(80);
        builder.Property(p => p.DeckJson).HasColumnType("text");
        builder.Property(p => p.CreatedAt).IsRequired();
        builder.Property(p => p.UpdatedAt).IsRequired();

        builder
            .Property<List<string>>("_tags")
            .HasColumnName("tags")
            .HasColumnType("jsonb")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(p => p.AuthorId);
        builder.HasIndex(p => p.CreatedAt);
        builder.HasIndex(p => p.Visibility).HasFilter("visibility = 'Public'");

        builder
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(p => p.AuthorId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(p => p.IsPublic);
        builder.Ignore(p => p.DomainEvents);
    }
}

internal sealed class CommunityPostReportConfiguration
    : IEntityTypeConfiguration<CommunityPostReport>
{
    public void Configure(EntityTypeBuilder<CommunityPostReport> builder)
    {
        builder.ToTable("community_post_reports");

        builder.HasKey(r => new { r.PostId, r.UserId });

        builder
            .Property(r => r.PostId)
            .HasConversion(id => id.Value, value => CommunityPostId.From(value))
            .IsRequired();

        builder
            .Property(r => r.UserId)
            .HasConversion(id => id.Value, value => UserId.From(value))
            .IsRequired();

        builder.Property(r => r.Reason).HasMaxLength(CommunityPostReport.MaxReasonLength);
        builder.Property(r => r.CreatedAt).IsRequired();

        builder.HasIndex(r => r.UserId);

        builder
            .HasOne<CommunityPost>()
            .WithMany()
            .HasForeignKey(r => r.PostId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
