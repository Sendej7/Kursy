using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class LessonQuestionConfiguration : IEntityTypeConfiguration<LessonQuestion>
{
    public void Configure(EntityTypeBuilder<LessonQuestion> builder)
    {
        builder.HasKey(q => q.Id);
        builder.Property(q => q.Title).IsRequired().HasMaxLength(256);
        builder.Property(q => q.Body).HasMaxLength(8000);
        builder.HasIndex(q => new { q.LessonId, q.CreatedAt });

        builder.HasOne(q => q.Lesson)
               .WithMany()
               .HasForeignKey(q => q.LessonId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(q => q.Author)
               .WithMany()
               .HasForeignKey(q => q.AuthorId)
               .OnDelete(DeleteBehavior.Restrict);

        // AcceptedAnswerId zostawiamy bez FK constraint — relacja jest miękka, żeby uniknąć
        // cyklu (Question → Answer → Question) przy delete.
        builder.Property(q => q.AcceptedAnswerId);

        builder.HasMany(q => q.Answers)
               .WithOne(a => a.Question)
               .HasForeignKey(a => a.QuestionId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class LessonAnswerConfiguration : IEntityTypeConfiguration<LessonAnswer>
{
    public void Configure(EntityTypeBuilder<LessonAnswer> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Body).IsRequired().HasMaxLength(8000);
        builder.HasIndex(a => new { a.QuestionId, a.Upvotes });

        builder.HasOne(a => a.Author)
               .WithMany()
               .HasForeignKey(a => a.AuthorId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}

public class LessonAnswerVoteConfiguration : IEntityTypeConfiguration<LessonAnswerVote>
{
    public void Configure(EntityTypeBuilder<LessonAnswerVote> builder)
    {
        builder.HasKey(v => v.Id);
        builder.HasIndex(v => new { v.AnswerId, v.UserId }).IsUnique();

        builder.HasOne(v => v.Answer)
               .WithMany()
               .HasForeignKey(v => v.AnswerId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.User)
               .WithMany()
               .HasForeignKey(v => v.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
