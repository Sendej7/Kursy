using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Number).IsRequired().HasMaxLength(32);
        builder.HasIndex(i => i.Number).IsUnique();
        builder.HasIndex(i => i.StripeInvoiceId);
        builder.Property(i => i.Currency).HasMaxLength(8);
        builder.Property(i => i.BuyerCountry).HasMaxLength(2);

        builder.HasOne(i => i.User)
               .WithMany(u => u.Invoices)
               .HasForeignKey(i => i.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(i => i.NetAmount);
        builder.Ignore(i => i.VatAmount);
        builder.Ignore(i => i.GrossAmount);
    }
}
