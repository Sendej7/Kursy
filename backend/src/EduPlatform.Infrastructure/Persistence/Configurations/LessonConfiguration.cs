using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class LessonConfiguration : IEntityTypeConfiguration<Lesson>
{
    public void Configure(EntityTypeBuilder<Lesson> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Title).IsRequired().HasMaxLength(256);
        builder.Property(l => l.ContentMarkdown).HasColumnType("text");

        builder.HasOne(l => l.Module)
               .WithMany(m => m.Lessons)
               .HasForeignKey(l => l.ModuleId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(l => l.Exercise)
               .WithOne(e => e.Lesson)
               .HasForeignKey<Exercise>(e => e.LessonId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
