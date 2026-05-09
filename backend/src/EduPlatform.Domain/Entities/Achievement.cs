namespace EduPlatform.Domain.Entities;

/// <summary>
/// Stałe typy odznak. Dodawanie nowych: dorzucasz wartość + meta w
/// <see cref="AchievementMeta.For"/>; warunek w AchievementService.
/// </summary>
public enum AchievementType
{
    FirstLesson = 1,
    TenLessons = 2,
    FirstCourseCompleted = 3,
    Streak7 = 4,
    Streak30 = 5,
    FirstCertificate = 6,
    FirstReview = 7,
    FirstQuestion = 8,
    FirstAcceptedAnswer = 9,
}

public record AchievementMeta(string Name, string Description, string Icon)
{
    public static AchievementMeta For(AchievementType t) => t switch
    {
        AchievementType.FirstLesson => new("Pierwsza lekcja", "Ukończona pierwsza lekcja na Kursy.pl.", "🎯"),
        AchievementType.TenLessons => new("Dziesięć lekcji", "Ukończonych 10 lekcji — łapiesz tempo!", "🚀"),
        AchievementType.FirstCourseCompleted => new("Pierwszy kurs ukończony", "Ukończony cały kurs — wszystkie lekcje.", "🎓"),
        AchievementType.Streak7 => new("7-dniowy streak", "7 dni z rzędu z aktywnością.", "🔥"),
        AchievementType.Streak30 => new("30-dniowy streak", "30 dni nauki bez przerwy. Maszyna.", "🌋"),
        AchievementType.FirstCertificate => new("Pierwszy certyfikat", "Wygenerowany certyfikat ukończenia kursu.", "📜"),
        AchievementType.FirstReview => new("Recenzent", "Pierwsza recenzja kursu.", "⭐"),
        AchievementType.FirstQuestion => new("Pytajnik", "Pierwsze pytanie w sekcji Q&A.", "❓"),
        AchievementType.FirstAcceptedAnswer => new("Pomocna dłoń", "Twoja odpowiedź została zaakceptowana.", "🤝"),
        _ => new("?", string.Empty, "🏅"),
    };
}

public class UserAchievement : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public AchievementType Type { get; set; }
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;
}
