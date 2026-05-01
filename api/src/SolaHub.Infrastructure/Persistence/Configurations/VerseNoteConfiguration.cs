using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Infrastructure.Persistence.Configurations;

internal sealed class VerseNoteConfiguration : IEntityTypeConfiguration<VerseNote>
{
    public void Configure(EntityTypeBuilder<VerseNote> builder)
    {
        builder.ToTable("verse_notes");

        builder.HasKey(n => n.Id);

        builder
            .Property(n => n.Id)
            .HasConversion(id => id.Value, value => VerseNoteId.From(value))
            .ValueGeneratedNever();

        builder
            .Property(n => n.UserId)
            .HasConversion(id => id.Value, value => UserId.From(value))
            .IsRequired();

        builder.OwnsOne(
            n => n.VerseRef,
            vr =>
            {
                vr.Property(v => v.BookShort)
                    .HasColumnName("verse_book")
                    .HasMaxLength(10)
                    .IsRequired();
                vr.Property(v => v.Chapter).HasColumnName("verse_chapter").IsRequired();
                vr.Property(v => v.Verse).HasColumnName("verse_number").IsRequired();
            }
        );

        builder.Property(n => n.Content).IsRequired();
        builder.Property(n => n.IsShared).IsRequired();
        builder.Property(n => n.CreatedAt).IsRequired();
        builder.Property(n => n.UpdatedAt).IsRequired();

        // Tags stored as JSON array
        builder
            .Property<List<string>>("_tags")
            .HasColumnName("tags")
            .HasColumnType("jsonb")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(n => n.UserId);
        builder.HasIndex(n => new { n.IsShared }).HasFilter("is_shared = true");

        builder.Ignore(n => n.DomainEvents);
    }
}
