using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class AuthorEarningConfiguration : IEntityTypeConfiguration<AuthorEarning>
{
    public void Configure(EntityTypeBuilder<AuthorEarning> builder)
    {
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => new { e.AuthorId, e.PeriodStart }).IsUnique();
        builder.Property(e => e.StripeTransferId).HasMaxLength(64);
        builder.Property(e => e.TransferError).HasMaxLength(2000);

        builder.HasOne(e => e.Author)
               .WithMany()
               .HasForeignKey(e => e.AuthorId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
