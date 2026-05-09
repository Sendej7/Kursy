using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.StripeCustomerId).IsRequired().HasMaxLength(64);
        builder.HasIndex(s => s.UserId).IsUnique();
        builder.HasIndex(s => s.StripeCustomerId).IsUnique();
        builder.HasIndex(s => s.StripeSubscriptionId);

        builder.HasOne(s => s.User)
               .WithOne(u => u.Subscription!)
               .HasForeignKey<Subscription>(s => s.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(s => s.IsActive);
    }
}
