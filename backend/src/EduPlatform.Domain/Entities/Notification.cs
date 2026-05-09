namespace EduPlatform.Domain.Entities;

/// <summary>
/// In-app powiadomienie dla użytkownika. ReadAt = null oznacza "nieprzeczytane" — z tego liczymy
/// badge w headerze.
/// </summary>
public class Notification : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Typ techniczny — pomocny do filtrowania / ikon w UI (np. "review.new", "enrolment.new").</summary>
    public required string Type { get; set; }
    public required string Title { get; set; }
    public string? Body { get; set; }
    /// <summary>Opcjonalny deep-link; klik w notyfikację robi mark-read + navigate.</summary>
    public string? Url { get; set; }

    public DateTime? ReadAt { get; set; }
}
