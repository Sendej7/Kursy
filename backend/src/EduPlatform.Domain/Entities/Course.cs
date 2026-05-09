using EduPlatform.Domain.Enums;

namespace EduPlatform.Domain.Entities;

public class Course : Entity
{
    public required string Title { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CourseLanguage Language { get; set; }
    public CourseVisibility Visibility { get; set; } = CourseVisibility.Draft;
    public decimal? PriceMonthlyPln { get; set; }
    public string? CoverImageUrl { get; set; }

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public ICollection<Module> Modules { get; set; } = new List<Module>();
    public ICollection<CourseEnrollment> Enrollments { get; set; } = new List<CourseEnrollment>();
}
