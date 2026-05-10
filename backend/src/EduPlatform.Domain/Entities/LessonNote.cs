namespace EduPlatform.Domain.Entities;

/// <summary>
/// Prywatna notatka studenta do konkretnej lekcji. Jeden user → jedna notatka per lekcja
/// (upsert). Notatka jest widoczna tylko dla autora.
/// </summary>
public class LessonNote : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid LessonId { get; set; }
    public Lesson? Lesson { get; set; }

    public string Content { get; set; } = string.Empty;
}
