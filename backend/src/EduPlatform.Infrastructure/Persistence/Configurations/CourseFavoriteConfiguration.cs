using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class CourseFavoriteConfiguration : IEntityTypeConfiguration<CourseFavorite>
{
    public void Configure(EntityTypeBuilder<CourseFavorite> builder)
    {
        builder.HasKey(f => f.Id);
        builder.HasIndex(f => new { f.UserId, f.CourseId }).IsUnique();
        builder.HasIndex(f => f.UserId);

        builder.HasOne(f => f.Course)
               .WithMany()
               .HasForeignKey(f => f.CourseId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(f => f.User)
               .WithMany()
               .HasForeignKey(f => f.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
