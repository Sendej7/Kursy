using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(256);
        builder.Property(u => u.DisplayName).IsRequired().HasMaxLength(128);
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.GoogleId).HasMaxLength(64);
        builder.HasIndex(u => u.GoogleId).IsUnique().HasFilter("\"GoogleId\" IS NOT NULL");
        builder.Property(u => u.AvatarUrl).HasMaxLength(512);
    }
}
