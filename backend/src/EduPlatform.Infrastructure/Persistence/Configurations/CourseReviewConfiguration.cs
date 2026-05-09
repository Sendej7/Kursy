using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class CourseReviewConfiguration : IEntityTypeConfiguration<CourseReview>
{
    public void Configure(EntityTypeBuilder<CourseReview> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Comment).HasMaxLength(2000);
        builder.HasIndex(r => new { r.CourseId, r.UserId }).IsUnique();
        builder.HasIndex(r => r.CourseId);

        builder.HasOne(r => r.Course)
               .WithMany()
               .HasForeignKey(r => r.CourseId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.User)
               .WithMany()
               .HasForeignKey(r => r.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
