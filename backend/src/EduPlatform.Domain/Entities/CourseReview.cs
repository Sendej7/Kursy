namespace EduPlatform.Domain.Entities;

/// <summary>
/// Recenzja kursu — gwiazdki 1..5 + opcjonalny komentarz. Jeden user → jedna recenzja na kurs
/// (PATCH/DELETE pozwala edytować/usunąć własną).
/// </summary>
public class CourseReview : Entity
{
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Gwiazdki 1..5.</summary>
    public int Rating { get; set; }

    /// <summary>Opcjonalny komentarz tekstowy.</summary>
    public string? Comment { get; set; }
}
