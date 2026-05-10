namespace EduPlatform.Domain.Entities;

/// <summary>
/// Snapshot zarobków autora za jeden okres rozliczeniowy (zwykle 1 miesiąc).
/// Jeden rekord per (AuthorId, PeriodStart) — uniqueness w EF config.
/// </summary>
public class AuthorEarning : Entity
{
    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    /// <summary>Początek okresu (inclusive, UTC, zwykle 1. dnia miesiąca).</summary>
    public DateTime PeriodStart { get; set; }
    /// <summary>Koniec okresu (exclusive, UTC, 1. dnia kolejnego miesiąca).</summary>
    public DateTime PeriodEnd { get; set; }

    /// <summary>Łączny przychód platformy z subskrypcji w tym okresie (w groszach).</summary>
    public long GrossPlatformRevenueGr { get; set; }

    /// <summary>Udział autora w przychodach (w groszach). Liczony z proporcji enrollment'ów.</summary>
    public long AuthorShareGr { get; set; }

    /// <summary>Aktywni Pro subskrybenci zapisani na CHOĆ JEDEN kurs autora.</summary>
    public int ActiveStudentsOnAuthorCourses { get; set; }
    /// <summary>Total aktywni Pro w tym okresie (mianownik proporcji).</summary>
    public int TotalActiveStudents { get; set; }

    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Stripe Transfer ID gdy faktycznie przelano. Null = pending.</summary>
    public string? StripeTransferId { get; set; }
    public DateTime? TransferredAt { get; set; }
    public string? TransferError { get; set; }
}
