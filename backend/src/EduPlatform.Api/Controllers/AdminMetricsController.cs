using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

/// <summary>
/// Agregacje dla panelu admina — DAU/WAU/MAU, MRR z aktywnych subskrypcji, nowe konta, ukończone
/// lekcje, recenzje. Wszystko w jednym roundtrip'ie żeby strona ładowała się szybko.
/// </summary>
[ApiController]
[Route("api/admin/metrics")]
[Authorize(Roles = "Admin")]
public class AdminMetricsController : ControllerBase
{
    private readonly AppDbContext _db;

    /// <summary>Cena subskrypcji Pro w PLN/mies — twardo zakodowana, bo nie pobieramy z Stripe (drogo).</summary>
    private const decimal ProMonthlyPln = 30m;

    public AdminMetricsController(AppDbContext db)
    {
        _db = db;
    }

    public record MetricsDto(
        UserMetrics Users,
        SubscriptionMetrics Subscriptions,
        ContentMetrics Content,
        EngagementMetrics Engagement);

    public record UserMetrics(int Total, int New7d, int New30d, int Deleted);
    public record SubscriptionMetrics(int ActiveCount, decimal MrrPln, int CanceledLast30d);
    public record ContentMetrics(int CoursesPublic, int CoursesPending, int CoursesDraft, int LessonsTotal, int ReviewsTotal);
    public record EngagementMetrics(
        int LessonsCompletedLast7d,
        int LessonsCompletedLast30d,
        int CertificatesIssued,
        int Dau,  // distinct users z LessonProgress.UpdatedAt last 24h
        int Wau,  // last 7d
        int QuestionsLast7d);

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var d1 = now.AddDays(-1);
        var d7 = now.AddDays(-7);
        var d30 = now.AddDays(-30);

        var users = new UserMetrics(
            Total: await _db.Users.CountAsync(u => !u.IsDeleted, ct),
            New7d: await _db.Users.CountAsync(u => u.CreatedAt >= d7, ct),
            New30d: await _db.Users.CountAsync(u => u.CreatedAt >= d30, ct),
            Deleted: await _db.Users.CountAsync(u => u.IsDeleted, ct));

        var activeSubs = await _db.Subscriptions
            .CountAsync(s => (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trialing)
                && (s.CurrentPeriodEnd == null || s.CurrentPeriodEnd > now), ct);
        var canceled30d = await _db.Subscriptions
            .CountAsync(s => s.Status == SubscriptionStatus.Canceled && s.UpdatedAt >= d30, ct);

        var subs = new SubscriptionMetrics(
            ActiveCount: activeSubs,
            MrrPln: activeSubs * ProMonthlyPln,
            CanceledLast30d: canceled30d);

        var content = new ContentMetrics(
            CoursesPublic: await _db.Courses.CountAsync(c => c.Visibility == CourseVisibility.Public, ct),
            CoursesPending: await _db.Courses.CountAsync(c => c.Visibility == CourseVisibility.PendingReview, ct),
            CoursesDraft: await _db.Courses.CountAsync(c => c.Visibility == CourseVisibility.Draft, ct),
            LessonsTotal: await _db.Lessons.CountAsync(ct),
            ReviewsTotal: await _db.CourseReviews.CountAsync(ct));

        var engagement = new EngagementMetrics(
            LessonsCompletedLast7d: await _db.LessonProgresses
                .CountAsync(p => p.Completed && p.CompletedAt != null && p.CompletedAt >= d7, ct),
            LessonsCompletedLast30d: await _db.LessonProgresses
                .CountAsync(p => p.Completed && p.CompletedAt != null && p.CompletedAt >= d30, ct),
            CertificatesIssued: await _db.Certificates.CountAsync(ct),
            Dau: await _db.LessonProgresses
                .Where(p => p.UpdatedAt >= d1)
                .Select(p => p.UserId)
                .Distinct()
                .CountAsync(ct),
            Wau: await _db.LessonProgresses
                .Where(p => p.UpdatedAt >= d7)
                .Select(p => p.UserId)
                .Distinct()
                .CountAsync(ct),
            QuestionsLast7d: await _db.LessonQuestions.CountAsync(q => q.CreatedAt >= d7, ct));

        return Ok(new MetricsDto(users, subs, content, engagement));
    }
}
