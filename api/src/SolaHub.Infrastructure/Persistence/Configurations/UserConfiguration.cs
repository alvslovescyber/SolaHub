using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SolaHub.Core.Entities;
using SolaHub.Core.ValueObjects;

namespace SolaHub.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);

        builder
            .Property(u => u.Id)
            .HasConversion(id => id.Value, value => UserId.From(value))
            .ValueGeneratedNever();

        builder.OwnsOne(
            u => u.Email,
            email =>
            {
                email.Property(e => e.Value).HasColumnName("email").HasMaxLength(254).IsRequired();

                email.HasIndex(e => e.Value).IsUnique().HasDatabaseName("ix_users_email");
            }
        );

        builder.Property(u => u.DisplayName).HasMaxLength(100).IsRequired();
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.Role).HasConversion<string>().HasMaxLength(20).IsRequired();

        builder
            .Property(u => u.ChurchId)
            .HasConversion(
                id => id.HasValue ? id.Value.Value : (Guid?)null,
                value => value.HasValue ? ChurchId.From(value.Value) : (ChurchId?)null
            );

        builder.Property(u => u.RefreshToken).HasMaxLength(500);
        builder.Property(u => u.RefreshTokenExpiry);
        builder.Property(u => u.IsEmailVerified).IsRequired();
        builder.Property(u => u.IsActive).IsRequired();
        builder.Property(u => u.CreatedAt).IsRequired();
        builder.Property(u => u.UpdatedAt).IsRequired();

        // Indexes for common lookups
        builder.HasIndex(u => u.RefreshToken).HasFilter("refresh_token IS NOT NULL");
        builder.HasIndex(u => u.ChurchId).HasFilter("church_id IS NOT NULL");

        builder.Ignore(u => u.DomainEvents);
    }
}
