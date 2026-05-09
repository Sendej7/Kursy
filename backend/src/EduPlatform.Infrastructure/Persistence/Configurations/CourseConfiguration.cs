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

        builder.Property(c => c.Tags)
               .HasColumnType("jsonb")
               .HasConversion(
                   v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                   v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>(),
                   new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<string>>(
                       (a, b) => a!.SequenceEqual(b!),
                       v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
                       v => v.ToList()));

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
