using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Services;

/// <summary>
/// Sprawdza warunki odznak i przyznaje brakujące. Idempotentne — unikalny index na
/// (UserId, Type) blokuje duplikaty po stronie DB nawet przy race condition.
/// </summary>
public class AchievementService
{
    private readonly AppDbContext _db;
    private readonly NotificationService _notifications;

    public AchievementService(AppDbContext db, NotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    /// <summary>
    /// Sprawdza wszystkie warunki dla usera i dorzuca brakujące odznaki + notyfikacje.
    /// Caller robi SaveChangesAsync (transakcja razem z czynnością wyzwalającą).
    /// </summary>
    public async Task CheckAndAwardAsync(Guid userId, CancellationToken ct = default)
    {
        var existing = await _db.UserAchievements
            .Where(a => a.UserId == userId)
            .Select(a => a.Type)
            .ToListAsync(ct);
        var have = existing.ToHashSet();

        var user = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => new { u.Id, u.CurrentStreakDays, u.LongestStreakDays })
            .FirstOrDefaultAsync(ct);
        if (user is null) return;

        var lessonsCompleted = await _db.LessonProgresses
            .CountAsync(p => p.UserId == userId && p.Completed, ct);

        // FirstCourseCompleted — kurs uznajemy za ukończony, gdy student ma progres na każdej
        // lekcji. Wystarczy znaleźć choć jeden taki kurs.
        var hasAnyFullCourse = false;
        if (!have.Contains(AchievementType.FirstCourseCompleted))
        {
            var courses = await _db.CourseEnrollments
                .Where(e => e.UserId == userId)
                .Select(e => new
                {
                    e.CourseId,
                    Total = e.Course!.Modules.SelectMany(m => m.Lessons).Count(),
                    Done = e.Course.Modules.SelectMany(m => m.Lessons)
                        .Count(l => _db.LessonProgresses.Any(p =>
                            p.UserId == userId && p.LessonId == l.Id && p.Completed)),
                })
                .ToListAsync(ct);
            hasAnyFullCourse = courses.Any(c => c.Total > 0 && c.Done >= c.Total);
        }

        var hasCert = !have.Contains(AchievementType.FirstCertificate)
            && await _db.Certificates.AnyAsync(c => c.UserId == userId, ct);
        var hasReview = !have.Contains(AchievementType.FirstReview)
            && await _db.CourseReviews.AnyAsync(r => r.UserId == userId, ct);
        var hasQuestion = !have.Contains(AchievementType.FirstQuestion)
            && await _db.LessonQuestions.AnyAsync(q => q.AuthorId == userId, ct);
        var hasAcceptedAnswer = !have.Contains(AchievementType.FirstAcceptedAnswer)
            && await _db.LessonAnswers.AnyAsync(a => a.AuthorId == userId
                && _db.LessonQuestions.Any(q => q.AcceptedAnswerId == a.Id));

        Award(userId, AchievementType.FirstLesson, lessonsCompleted >= 1, have);
        Award(userId, AchievementType.TenLessons, lessonsCompleted >= 10, have);
        Award(userId, AchievementType.FirstCourseCompleted, hasAnyFullCourse, have);
        Award(userId, AchievementType.Streak7, user.LongestStreakDays >= 7, have);
        Award(userId, AchievementType.Streak30, user.LongestStreakDays >= 30, have);
        Award(userId, AchievementType.FirstCertificate, hasCert, have);
        Award(userId, AchievementType.FirstReview, hasReview, have);
        Award(userId, AchievementType.FirstQuestion, hasQuestion, have);
        Award(userId, AchievementType.FirstAcceptedAnswer, hasAcceptedAnswer, have);
    }

    private void Award(Guid userId, AchievementType type, bool condition, HashSet<AchievementType> have)
    {
        if (!condition || have.Contains(type)) return;

        _db.UserAchievements.Add(new UserAchievement
        {
            UserId = userId,
            Type = type,
            EarnedAt = DateTime.UtcNow,
        });
        have.Add(type);

        var meta = AchievementMeta.For(type);
        _notifications.Notify(
            userId,
            type: "achievement.earned",
            title: $"{meta.Icon} Odznaka zdobyta: {meta.Name}",
            body: meta.Description,
            url: "/account#achievements");
    }
}
