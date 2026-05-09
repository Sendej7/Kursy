using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class CourseConfiguration : IEntityTypeConfiguration<Course>
{
    public void Configure(EntityTypeBuilder<Course> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Title).IsRequired().HasMaxLength(256);
        builder.Property(c => c.Slug).HasMaxLength(256);
        builder.Property(c => c.Description).HasMaxLength(4096);
        builder.HasIndex(c => c.Slug).IsUnique();

        builder.HasOne(c => c.Author)
               .WithMany(u => u.AuthoredCourses)
               .HasForeignKey(c => c.AuthorId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(c => c.Modules)
               .WithOne(m => m.Course)
               .HasForeignKey(m => m.CourseId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
