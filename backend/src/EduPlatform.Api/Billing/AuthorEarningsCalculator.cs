using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Billing;

/// <summary>
/// Liczy zarobki autorów za podany okres. Model:
///   - Platform MRR z aktywnych Pro subscriptions × 30 zł = total revenue
///   - 50% dla autorów (PlatformShareRatio = 0.5 default)
///   - Per autor: jego_active_students_on_his_courses / total_active_students × author_pool
///
/// Idempotentne — jeśli AuthorEarning dla (AuthorId, PeriodStart) istnieje, zwraca istniejący.
/// </summary>
public class AuthorEarningsCalculator
{
    private readonly AppDbContext _db;
    private readonly ILogger<AuthorEarningsCalculator> _logger;
    private readonly IConfiguration _config;

    /// <summary>Domyślnie 50% przychodów dla autorów. Konfigurowalne przez Earnings:AuthorShareRatio.</summary>
    private const decimal DefaultAuthorShareRatio = 0.5m;

    /// <summary>Cena Pro w PLN/miesiąc — twardo, taka sama jak w admin metrics.</summary>
    private const decimal ProMonthlyPln = 30m;

    public AuthorEarningsCalculator(AppDbContext db, ILogger<AuthorEarningsCalculator> logger, IConfiguration config)
    {
        _db = db;
        _logger = logger;
        _config = config;
    }

    public record CalculationSummary(int AuthorsCount, long TotalRevenueGr, long TotalAuthorsShareGr);

    public async Task<CalculationSummary> CalculateForPeriodAsync(DateTime periodStart, DateTime periodEnd, CancellationToken ct = default)
    {
        var ratio = _config.GetValue<decimal?>("Earnings:AuthorShareRatio") ?? DefaultAuthorShareRatio;

        // Aktywni Pro w tym okresie — uproszczone: subskrypcje aktywne na koniec okresu.
        // Dla lepszej precyzji można liczyć dni-aktywne-w-okresie, ale to overkill na MVP.
        var activeAtEnd = await _db.Subscriptions
            .Where(s => (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trialing)
                && (s.CurrentPeriodEnd == null || s.CurrentPeriodEnd >= periodEnd))
            .Select(s => s.UserId)
            .ToListAsync(ct);
        var activeUserIds = activeAtEnd.ToHashSet();

        if (activeUserIds.Count == 0)
        {
            _logger.LogInformation("No active Pro subscribers in period {Start}-{End}; skipping earnings calc.", periodStart, periodEnd);
            return new CalculationSummary(0, 0, 0);
        }

        var totalRevenueGr = (long)(activeUserIds.Count * ProMonthlyPln * 100m);
        var totalAuthorsShareGr = (long)(totalRevenueGr * ratio);

        // Autorzy + ich kursy + studenci na każdym kursie (z aktywnych Pro).
        var authorEnrollments = await _db.CourseEnrollments
            .Where(e => activeUserIds.Contains(e.UserId))
            .Select(e => new { e.UserId, AuthorId = e.Course!.AuthorId })
            .Distinct()
            .ToListAsync(ct);

        var authorActiveStudents = authorEnrollments
            .GroupBy(x => x.AuthorId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.UserId).Distinct().Count());

        if (authorActiveStudents.Count == 0)
        {
            _logger.LogInformation("Active Pro subscribers exist but none enrolled w czyimkolwiek kursie; brak earnings.");
            return new CalculationSummary(0, totalRevenueGr, 0);
        }

        // Mianownik: suma student-podpięć (jeden student liczony tyle razy ilu autorów ma jego kursy).
        // Dlatego współczynniki sumują się do >100% w pojedynczym przypadku gdy 1 student ma 2 autorów —
        // każdy autor bierze proporcjonalny ułamek tej osoby. Dla MVP OK.
        var totalEnrollmentsAcrossAuthors = authorActiveStudents.Values.Sum();

        long allocated = 0;
        var summaryCount = 0;
        foreach (var (authorId, students) in authorActiveStudents)
        {
            var ratio01 = (double)students / totalEnrollmentsAcrossAuthors;
            var shareGr = (long)Math.Floor(totalAuthorsShareGr * ratio01);
            allocated += shareGr;

            // Idempotentne: gdy istnieje rekord (AuthorId, PeriodStart), nadpisujemy wartości
            // (recalc w razie poprawek), ale tylko gdy NIE jest jeszcze transferred.
            var existing = await _db.AuthorEarnings
                .FirstOrDefaultAsync(e => e.AuthorId == authorId && e.PeriodStart == periodStart, ct);
            if (existing is not null)
            {
                if (existing.StripeTransferId is not null)
                {
                    _logger.LogInformation("Earning {AuthorId}/{PeriodStart} already transferred — skip recalc.", authorId, periodStart);
                    continue;
                }
                existing.PeriodEnd = periodEnd;
                existing.GrossPlatformRevenueGr = totalRevenueGr;
                existing.AuthorShareGr = shareGr;
                existing.ActiveStudentsOnAuthorCourses = students;
                existing.TotalActiveStudents = activeUserIds.Count;
                existing.CalculatedAt = DateTime.UtcNow;
            }
            else
            {
                _db.AuthorEarnings.Add(new AuthorEarning
                {
                    AuthorId = authorId,
                    PeriodStart = periodStart,
                    PeriodEnd = periodEnd,
                    GrossPlatformRevenueGr = totalRevenueGr,
                    AuthorShareGr = shareGr,
                    ActiveStudentsOnAuthorCourses = students,
                    TotalActiveStudents = activeUserIds.Count,
                });
            }
            summaryCount++;
        }
        await _db.SaveChangesAsync(ct);
        return new CalculationSummary(summaryCount, totalRevenueGr, allocated);
    }
}
