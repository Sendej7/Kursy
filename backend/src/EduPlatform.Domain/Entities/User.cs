using EduPlatform.Domain.Enums;

namespace EduPlatform.Domain.Entities;

public class User : Entity
{
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; } = UserRole.Student;
    public DateTime? SubscriptionUntil { get; set; }

    public ICollection<Course> AuthoredCourses { get; set; } = new List<Course>();
    public ICollection<CourseEnrollment> Enrollments { get; set; } = new List<CourseEnrollment>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();
    public ICollection<AiInteraction> AiInteractions { get; set; } = new List<AiInteraction>();
}
