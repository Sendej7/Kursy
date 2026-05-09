using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Type).IsRequired().HasMaxLength(64);
        builder.Property(n => n.Title).IsRequired().HasMaxLength(256);
        builder.Property(n => n.Body).HasMaxLength(2000);
        builder.Property(n => n.Url).HasMaxLength(512);
        builder.HasIndex(n => new { n.UserId, n.ReadAt });
        builder.HasIndex(n => new { n.UserId, n.CreatedAt });

        builder.HasOne(n => n.User)
               .WithMany()
               .HasForeignKey(n => n.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
