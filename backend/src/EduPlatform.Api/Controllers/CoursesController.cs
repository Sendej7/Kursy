using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly NotificationService _notifications;

    public CoursesController(AppDbContext db, ICurrentUser currentUser, NotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
        _currentUser = currentUser;
    }

    public record CourseListItem(
        Guid Id, string Title, string Slug, string Description, CourseLanguage Language,
        decimal? PriceMonthlyPln, IReadOnlyList<string> Tags,
        double AverageRating, int ReviewCount);
    public record CourseDetailDto(
        Guid Id,
        string Title,
        string Slug,
        string Description,
        CourseLanguage Language,
        decimal? PriceMonthlyPln,
        IReadOnlyList<string> Tags,
        IReadOnlyList<ModuleDto> Modules,
        bool IsEnrolled,
        double AverageRating,
        int ReviewCount,
        bool IsFavorited);
    public record ModuleDto(Guid Id, string Title, int Order, IReadOnlyList<LessonSummaryDto> Lessons);
    public record LessonSummaryDto(Guid Id, string Title, int Order, LessonType Type, bool IsCompleted);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourseListItem>>> List(
        [FromQuery] string? q,
        [FromQuery] CourseLanguage? language,
        [FromQuery] string? tag,
        CancellationToken ct = default)
    {
        var query = _db.Courses.Where(c => c.Visibility == CourseVisibility.Public);

        if (language is not null)
        {
            query = query.Where(c => c.Language == language);
        }
        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = $"%{q.Trim()}%";
            query = query.Where(c =>
                EF.Functions.ILike(c.Title, pattern) ||
                EF.Functions.ILike(c.Description, pattern));
        }

        var courses = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CourseListItem(
                c.Id, c.Title, c.Slug, c.Description, c.Language, c.PriceMonthlyPln, c.Tags,
                _db.CourseReviews.Where(r => r.CourseId == c.Id).Average(r => (double?)r.Rating) ?? 0d,
                _db.CourseReviews.Count(r => r.CourseId == c.Id)))
            .ToListAsync(ct);

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var t = tag.Trim().ToLowerInvariant();
            courses = courses.Where(c => c.Tags.Any(tg => tg.ToLowerInvariant() == t)).ToList();
        }
        return Ok(courses);
    }

    [HttpGet("tags")]
    public async Task<IActionResult> Tags(CancellationToken ct)
    {
        var allTags = await _db.Courses
            .Where(c => c.Visibility == CourseVisibility.Public)
            .Select(c => c.Tags)
            .ToListAsync(ct);

        var grouped = allTags
            .SelectMany(t => t)
            .GroupBy(t => t.Trim().ToLowerInvariant())
            .Where(g => !string.IsNullOrEmpty(g.Key))
            .Select(g => new { tag = g.First().Trim(), count = g.Count() })
            .OrderByDescending(g => g.count)
            .Take(50)
            .ToList();
        return Ok(grouped);
    }

    [HttpGet("{slug}")]
    public async Task<ActionResult<CourseDetailDto>> Get(string slug, CancellationToken ct)
    {
        var course = await _db.Courses
            .Include(c => c.Modules.OrderBy(m => m.Order))
                .ThenInclude(m => m.Lessons.OrderBy(l => l.Order))
            .FirstOrDefaultAsync(c => c.Slug == slug, ct);

        if (course is null) return NotFound();

        HashSet<Guid> completedLessons = new();
        bool enrolled = false;
        bool favorited = false;
        if (_currentUser.Id is { } userId)
        {
            enrolled = await _db.CourseEnrollments
                .AnyAsync(e => e.UserId == userId && e.CourseId == course.Id, ct);
            favorited = await _db.CourseFavorites
                .AnyAsync(f => f.UserId == userId && f.CourseId == course.Id, ct);
            completedLessons = (await _db.LessonProgresses
                .Where(p => p.UserId == userId && p.Completed && p.Lesson!.Module!.CourseId == course.Id)
                .Select(p => p.LessonId)
                .ToListAsync(ct))
                .ToHashSet();
        }

        var reviewStats = await _db.CourseReviews
            .Where(r => r.CourseId == course.Id)
            .GroupBy(r => 1)
            .Select(g => new { Avg = g.Average(r => (double)r.Rating), Count = g.Count() })
            .FirstOrDefaultAsync(ct);

        return Ok(new CourseDetailDto(
            course.Id,
            course.Title,
            course.Slug,
            course.Description,
            course.Language,
            course.PriceMonthlyPln,
            course.Tags,
            course.Modules.Select(m => new ModuleDto(
                m.Id,
                m.Title,
                m.Order,
                m.Lessons.Select(l => new LessonSummaryDto(
                    l.Id, l.Title, l.Order, l.Type, completedLessons.Contains(l.Id))).ToList())).ToList(),
            enrolled,
            reviewStats?.Avg ?? 0d,
            reviewStats?.Count ?? 0,
            favorited));
    }

    public record EnrollByCodeDto(string AccessCode);

    [Authorize]
    [HttpGet("favorites/mine")]
    public async Task<IActionResult> MyFavorites(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var favs = await _db.CourseFavorites
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new
            {
                f.CourseId,
                f.Course!.Slug,
                f.Course.Title,
                f.Course.Description,
                f.Course.Language,
                f.Course.PriceMonthlyPln,
                f.Course.Tags,
                averageRating = _db.CourseReviews.Where(r => r.CourseId == f.CourseId).Average(r => (double?)r.Rating) ?? 0d,
                reviewCount = _db.CourseReviews.Count(r => r.CourseId == f.CourseId),
            })
            .ToListAsync(ct);
        return Ok(favs);
    }

    [Authorize]
    [HttpPost("{id:guid}/favorite")]
    public async Task<IActionResult> ToggleFavorite(Guid id, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var courseExists = await _db.Courses.AnyAsync(c => c.Id == id, ct);
        if (!courseExists) return NotFound();

        var existing = await _db.CourseFavorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.CourseId == id, ct);
        if (existing is null)
        {
            _db.CourseFavorites.Add(new CourseFavorite { UserId = userId, CourseId = id });
            await _db.SaveChangesAsync(ct);
            return Ok(new { favorited = true });
        }
        _db.CourseFavorites.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return Ok(new { favorited = false });
    }

    [Authorize]
    [HttpPost("{id:guid}/enroll")]
    public async Task<IActionResult> Enroll(Guid id, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course is null) return NotFound();
        if (course.Visibility != CourseVisibility.Public)
        {
            return BadRequest(new { error = "Kurs nie jest publiczny — wymagany kod dostępu." });
        }

        if (course.PriceMonthlyPln is not null and > 0)
        {
            var sub = await _db.Subscriptions.FirstOrDefaultAsync(s => s.UserId == userId, ct);
            if (sub is null || !sub.IsActive)
            {
                return StatusCode(402, new { error = "Ten kurs wymaga aktywnej subskrypcji.", needsSubscription = true });
            }
        }

        var exists = await _db.CourseEnrollments.AnyAsync(e => e.UserId == userId && e.CourseId == id, ct);
        if (exists) return NoContent();

        _db.CourseEnrollments.Add(new CourseEnrollment { UserId = userId, CourseId = id });

        if (course.AuthorId != userId)
        {
            var studentName = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(ct);
            _notifications.Notify(
                course.AuthorId,
                type: "enrolment.new",
                title: $"Nowy student na kursie {course.Title}",
                body: $"{studentName ?? "Ktoś"} zapisał się na Twój kurs.",
                url: $"/author/courses/{course.Id}/analytics");
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("enroll-by-code")]
    public async Task<IActionResult> EnrollByCode([FromBody] EnrollByCodeDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        // MVP: kod dostępu = slug kursu prywatnego. W iteracji 2 zrobimy oddzielną tabelę kodów.
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Slug == dto.AccessCode.Trim(), ct);
        if (course is null) return NotFound(new { error = "Kod nie pasuje do żadnego kursu." });

        var exists = await _db.CourseEnrollments.AnyAsync(e => e.UserId == userId && e.CourseId == course.Id, ct);
        if (!exists)
        {
            _db.CourseEnrollments.Add(new CourseEnrollment
            {
                UserId = userId,
                CourseId = course.Id,
                AccessCode = dto.AccessCode,
            });
            await _db.SaveChangesAsync(ct);
        }
        return Ok(new { course.Slug, course.Id });
    }
}
