namespace EduPlatform.Domain.Entities;

public class CourseEnrollment : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid CourseId { get; set; }
    public Course? Course { get; set; }

    public string? AccessCode { get; set; }
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastAccessedAt { get; set; }
}
