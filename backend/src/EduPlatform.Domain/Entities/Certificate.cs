namespace EduPlatform.Domain.Entities;

public class Certificate : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid CourseId { get; set; }
    public Course? Course { get; set; }

    /// <summary>Publiczny, niezgadywalny kod certyfikatu (do udostępniania w CV/LinkedIn).</summary>
    public required string Code { get; set; }
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
}
