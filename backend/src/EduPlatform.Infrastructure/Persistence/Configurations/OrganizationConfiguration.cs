using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class OrganizationConfiguration : IEntityTypeConfiguration<Organization>
{
    public void Configure(EntityTypeBuilder<Organization> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Name).IsRequired().HasMaxLength(256);
        builder.Property(o => o.Nip).HasMaxLength(16);
        builder.Property(o => o.ContactEmail).HasMaxLength(256);

        builder.HasOne(o => o.OwnerUser)
               .WithMany()
               .HasForeignKey(o => o.OwnerUserId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}

public class OrganizationCodeConfiguration : IEntityTypeConfiguration<OrganizationCode>
{
    public void Configure(EntityTypeBuilder<OrganizationCode> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Code).IsRequired().HasMaxLength(32);
        builder.HasIndex(c => c.Code).IsUnique();

        builder.HasOne(c => c.Organization)
               .WithMany(o => o.Codes)
               .HasForeignKey(c => c.OrganizationId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Ignore(c => c.IsUsable);
    }
}

public class OrganizationCodeRedemptionConfiguration : IEntityTypeConfiguration<OrganizationCodeRedemption>
{
    public void Configure(EntityTypeBuilder<OrganizationCodeRedemption> builder)
    {
        builder.HasKey(r => r.Id);
        builder.HasIndex(r => new { r.OrganizationCodeId, r.UserId }).IsUnique();

        builder.HasOne(r => r.OrganizationCode)
               .WithMany()
               .HasForeignKey(r => r.OrganizationCodeId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.Organization)
               .WithMany(o => o.Redemptions)
               .HasForeignKey(r => r.OrganizationId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.User)
               .WithMany()
               .HasForeignKey(r => r.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
