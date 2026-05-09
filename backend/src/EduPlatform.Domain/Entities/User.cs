using EduPlatform.Domain.Enums;

namespace EduPlatform.Domain.Entities;

public class User : Entity
{
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public required string PasswordHash { get; set; }
    public UserRole Role { get; set; } = UserRole.Student;
    public DateTime? SubscriptionUntil { get; set; }

    /// <summary>Suma XP zdobytych za ukończone lekcje.</summary>
    public int TotalXp { get; set; }
    /// <summary>Aktualna seria dni z aktywnością (ukończenie lekcji).</summary>
    public int CurrentStreakDays { get; set; }
    /// <summary>Najdłuższa kiedykolwiek osiągnięta seria.</summary>
    public int LongestStreakDays { get; set; }
    /// <summary>Data ostatniego dnia z aktywnością (UTC, bez godziny).</summary>
    public DateTime? LastActiveDay { get; set; }

    public ICollection<Course> AuthoredCourses { get; set; } = new List<Course>();
    public ICollection<CourseEnrollment> Enrollments { get; set; } = new List<CourseEnrollment>();
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
    public ICollection<LessonProgress> LessonProgresses { get; set; } = new List<LessonProgress>();
    public ICollection<AiInteraction> AiInteractions { get; set; } = new List<AiInteraction>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<Certificate> Certificates { get; set; } = new List<Certificate>();
    public Subscription? Subscription { get; set; }
    public BillingProfile? BillingProfile { get; set; }
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
}
