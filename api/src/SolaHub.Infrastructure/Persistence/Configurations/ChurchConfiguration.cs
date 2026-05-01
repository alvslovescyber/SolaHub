using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Infrastructure.Persistence.Configurations;

internal sealed class ChurchConfiguration : IEntityTypeConfiguration<Church>
{
    public void Configure(EntityTypeBuilder<Church> builder)
    {
        builder.ToTable("churches");

        builder.HasKey(c => c.Id);

        builder
            .Property(c => c.Id)
            .HasConversion(id => id.Value, value => ChurchId.From(value))
            .ValueGeneratedNever();

        builder
            .Property(c => c.AdminId)
            .HasConversion(id => id.Value, value => UserId.From(value))
            .IsRequired();

        builder.Property(c => c.Name).HasMaxLength(200).IsRequired();
        builder.Property(c => c.Description).HasMaxLength(2000);
        builder.Property(c => c.LogoUrl).HasMaxLength(500);
        builder.Property(c => c.Website).HasMaxLength(500);
        builder.Property(c => c.Location).HasMaxLength(200);
        builder.Property(c => c.IsActive).IsRequired();
        builder.Property(c => c.CreatedAt).IsRequired();
        builder.Property(c => c.UpdatedAt).IsRequired();

        builder.HasIndex(c => c.AdminId);

        builder.Ignore(c => c.DomainEvents);
    }
}
