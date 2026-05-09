namespace EduPlatform.Domain.Entities;

public class LessonProgress : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid LessonId { get; set; }
    public Lesson? Lesson { get; set; }

    public bool Completed { get; set; }
    public DateTime? CompletedAt { get; set; }
    public TimeSpan TimeSpent { get; set; }
}
