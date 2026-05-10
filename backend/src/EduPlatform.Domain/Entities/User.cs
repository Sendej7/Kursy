using EduPlatform.Domain.Enums;

namespace EduPlatform.Domain.Entities;

public class User : Entity
{
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    /// <summary>Hash hasła. Pusty string dla kont założonych przez Google OAuth.</summary>
    public required string PasswordHash { get; set; }
    /// <summary>True gdy user kliknął w link weryfikacyjny w mailu (lub założył konto przez OAuth).</summary>
    public bool EmailConfirmed { get; set; }

    /// <summary>Tajny base32 dla TOTP — null gdy 2FA nieskonfigurowane / wyłączone.</summary>
    public string? TotpSecret { get; set; }
    /// <summary>True dopiero po pierwszym poprawnym potwierdzeniu kodu (Setup → Enable).</summary>
    public bool TwoFactorEnabled { get; set; }

    /// <summary>JSON array BCrypt-hashed backup codes (każdy 8-znakowy, jednorazowy).
    /// Null = brak; każde użycie usuwa hash z tablicy.</summary>
    public string? BackupCodesHashJson { get; set; }

    /// <summary>RODO: konto zanonimizowane na żądanie usera. Zachowujemy entity dla integralności
    /// referencji (kursy/recenzje/odpowiedzi), ale czyścimy PII (email/displayName/avatar/secrets).</summary>
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    /// <summary>Google sub (stable user id). Null dla kont email/hasło.</summary>
    public string? GoogleId { get; set; }
    /// <summary>GitHub user id (stable). Null dla kont email/hasło / Google.</summary>
    public string? GitHubId { get; set; }
    public string? AvatarUrl { get; set; }
    public UserRole Role { get; set; } = UserRole.Student;
    public DateTime? SubscriptionUntil { get; set; }

    /// <summary>Suma XP zdobytych za ukończone lekcje.</summary>
    public int TotalXp { get; set; }
    /// <summary>Aktualna seria dni z aktywnością (ukończenie lekcji).</summary>
    public int CurrentStreakDays { get; set; }
    /// <summary>Cel dzienny — ile lekcji student chce przejść każdego dnia. 0 = wyłączony.</summary>
    public int DailyGoalLessons { get; set; }
    /// <summary>True = wysyłaj email-przypomnienia o niedokończonym dziennym celu. Domyślnie ON dla nowych celów.</summary>
    public bool DailyGoalReminderEnabled { get; set; } = true;
    /// <summary>Data ostatnio wysłanej notyfikacji (anti-double-send).</summary>
    public DateTime? DailyGoalReminderLastSent { get; set; }

    /// <summary>True = wysyłaj wieczorne przypomnienie "wracaj nie strać streaka" gdy active streak ≥ 3 dni.</summary>
    public bool StreakReminderEnabled { get; set; } = true;
    public DateTime? StreakReminderLastSent { get; set; }

    /// <summary>Stripe Connect Express account ID — gdy autor onboard'uje się żeby otrzymywać wypłaty.</summary>
    public string? StripeAccountId { get; set; }
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
