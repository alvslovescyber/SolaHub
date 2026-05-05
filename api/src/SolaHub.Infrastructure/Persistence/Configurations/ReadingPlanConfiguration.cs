using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Infrastructure.Persistence.Configurations;

internal sealed class ReadingPlanConfiguration : IEntityTypeConfiguration<ReadingPlan>
{
    public void Configure(EntityTypeBuilder<ReadingPlan> builder)
    {
        builder.ToTable("reading_plans");

        builder.HasKey(p => p.Id);

        builder
            .Property(p => p.Id)
            .HasConversion(id => id.Value, value => ReadingPlanId.From(value))
            .ValueGeneratedNever();

        builder
            .Property(p => p.CreatedBy)
            .HasConversion(id => id.Value, value => UserId.From(value))
            .IsRequired();

        builder
            .Property(p => p.ChurchId)
            .HasConversion(
                id => id.HasValue ? id.Value.Value : (Guid?)null,
                value => value.HasValue ? ChurchId.From(value.Value) : (ChurchId?)null
            );

        builder.Property(p => p.Title).HasMaxLength(200).IsRequired();
        builder.Property(p => p.Description).HasMaxLength(2000);
        builder.Property(p => p.IsPublic).IsRequired();
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(p => p.CreatedAt).IsRequired();
        builder.Property(p => p.UpdatedAt).IsRequired();

        // Owned collection: plan days
        builder.OwnsMany(
            p => p.Days,
            days =>
            {
                days.ToTable("reading_plan_days");
                days.WithOwner().HasForeignKey("plan_id");
                days.HasKey("plan_id", nameof(ReadingPlanDay.DayNumber));

                days.Property(d => d.DayNumber).IsRequired().ValueGeneratedNever();
                days.Property(d => d.Title).HasMaxLength(200).IsRequired();

                // VerseRefs is a computed property from _verseRefKeys — not a navigation
                days.Ignore(d => d.VerseRefs);

                // Store verse ref keys as JSONB array via backing field
                days.Property<List<string>>("_verseRefKeys")
                    .HasColumnName("verse_refs")
                    .HasColumnType("jsonb")
                    .UsePropertyAccessMode(PropertyAccessMode.Field);
            }
        );

        // Owned collection: participants
        builder.OwnsMany(
            p => p.Participants,
            participants =>
            {
                participants.ToTable("plan_participants");
                participants.WithOwner().HasForeignKey("plan_id");
                participants.HasKey("plan_id", nameof(PlanParticipant.UserId));

                participants
                    .Property(pp => pp.UserId)
                    .HasConversion(id => id.Value, value => UserId.From(value))
                    .IsRequired();

                participants
                    .HasOne<User>()
                    .WithMany()
                    .HasForeignKey(pp => pp.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                participants.Property(pp => pp.CurrentDay).IsRequired();
                participants.Property(pp => pp.JoinedAt).IsRequired();
            }
        );

        builder.HasIndex(p => p.CreatedBy);
        builder.HasIndex(p => p.ChurchId).HasFilter("church_id IS NOT NULL");
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.IsPublic).HasFilter("is_public = true");

        builder
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(p => p.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne<Church>()
            .WithMany()
            .HasForeignKey(p => p.ChurchId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Ignore(p => p.DomainEvents);
    }
}
