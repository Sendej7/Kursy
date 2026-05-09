namespace EduPlatform.Domain.Entities;

public class Module : Entity
{
    public required string Title { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Order { get; set; }

    public Guid CourseId { get; set; }
    public Course? Course { get; set; }

    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}
