using EduPlatform.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EduPlatform.Infrastructure.Persistence.Configurations;

public class ExerciseConfiguration : IEntityTypeConfiguration<Exercise>
{
    public void Configure(EntityTypeBuilder<Exercise> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Prompt).HasColumnType("text");
        builder.Property(e => e.StarterCode).HasColumnType("text");
        builder.Property(e => e.SolutionCode).HasColumnType("text");
        builder.Property(e => e.TestsCode).HasColumnType("text");

        builder.Property(e => e.Hints)
               .HasColumnType("jsonb")
               .HasConversion(
                   v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                   v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? new List<string>(),
                   new ValueComparer<List<string>>(
                       (a, b) => a!.SequenceEqual(b!),
                       v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
                       v => v.ToList()));
    }
}
