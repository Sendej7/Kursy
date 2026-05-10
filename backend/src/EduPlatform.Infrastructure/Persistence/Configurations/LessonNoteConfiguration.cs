using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class LessonNoteConfiguration : IEntityTypeConfiguration<LessonNote>
{
    public void Configure(EntityTypeBuilder<LessonNote> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Content).HasMaxLength(20_000);
        builder.HasIndex(n => new { n.UserId, n.LessonId }).IsUnique();

        builder.HasOne(n => n.User)
               .WithMany()
               .HasForeignKey(n => n.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(n => n.Lesson)
               .WithMany()
               .HasForeignKey(n => n.LessonId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
