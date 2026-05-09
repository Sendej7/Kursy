using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class BillingProfileConfiguration : IEntityTypeConfiguration<BillingProfile>
{
    public void Configure(EntityTypeBuilder<BillingProfile> builder)
    {
        builder.HasKey(b => b.Id);
        builder.HasIndex(b => b.UserId).IsUnique();
        builder.Property(b => b.CompanyName).HasMaxLength(256);
        builder.Property(b => b.Nip).HasMaxLength(16);
        builder.Property(b => b.AddressLine).HasMaxLength(256);
        builder.Property(b => b.PostalCode).HasMaxLength(16);
        builder.Property(b => b.City).HasMaxLength(128);
        builder.Property(b => b.Country).HasMaxLength(2);

        builder.HasOne(b => b.User)
               .WithOne(u => u.BillingProfile!)
               .HasForeignKey<BillingProfile>(b => b.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(b => b.IsCompany);
    }
}
