using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class CertificateConfiguration : IEntityTypeConfiguration<Certificate>
{
    public void Configure(EntityTypeBuilder<Certificate> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Code).IsRequired().HasMaxLength(32);
        builder.HasIndex(c => c.Code).IsUnique();
        builder.HasIndex(c => new { c.UserId, c.CourseId }).IsUnique();

        builder.HasOne(c => c.User)
               .WithMany(u => u.Certificates)
               .HasForeignKey(c => c.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Course)
               .WithMany(co => co.Certificates)
               .HasForeignKey(c => c.CourseId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
