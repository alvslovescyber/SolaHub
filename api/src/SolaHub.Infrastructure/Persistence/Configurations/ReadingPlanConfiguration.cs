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

        // Owned collection: plan days.
        // We map the navigation against the backing list field rather than the
        // read-only `Days` property so EF Core's change tracker can correctly
        // distinguish new vs existing children. Going through the property would
        // re-wrap `_days` in a fresh ReadOnlyCollection<T> on every access, which
        // confuses owned-collection snapshotting and causes new entries to be
        // emitted as UPDATE (0 rows) instead of INSERT.
        builder
            .OwnsMany(
                p => p.Days,
                days =>
                {
                    days.ToTable("reading_plan_days");
                    days.WithOwner().HasForeignKey("plan_id");
                    days.HasKey("plan_id", nameof(ReadingPlanDay.DayNumber));

                    days.Property(d => d.DayNumber).IsRequired();
                    days.Property(d => d.Title).HasMaxLength(200).IsRequired();

                    days.Ignore(d => d.VerseRefs);

                    days.Property<List<string>>("_verseRefKeys")
                        .HasColumnName("verse_refs")
                        .HasColumnType("jsonb")
                        .UsePropertyAccessMode(PropertyAccessMode.Field);
                }
            )
            .Navigation(p => p.Days)
            .HasField("_days")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder
            .OwnsMany(
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

                    participants.Property(pp => pp.CurrentDay).IsRequired();
                    participants.Property(pp => pp.JoinedAt).IsRequired();
                }
            )
            .Navigation(p => p.Participants)
            .HasField("_participants")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(p => p.CreatedBy);
        builder.HasIndex(p => p.ChurchId).HasFilter("church_id IS NOT NULL");
        builder.HasIndex(p => p.Status);

        builder.Ignore(p => p.DomainEvents);
    }
}
