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

    public CoursesController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record CourseListItem(Guid Id, string Title, string Slug, string Description, CourseLanguage Language, decimal? PriceMonthlyPln);
    public record CourseDetailDto(
        Guid Id,
        string Title,
        string Slug,
        string Description,
        CourseLanguage Language,
        decimal? PriceMonthlyPln,
        IReadOnlyList<ModuleDto> Modules,
        bool IsEnrolled);
    public record ModuleDto(Guid Id, string Title, int Order, IReadOnlyList<LessonSummaryDto> Lessons);
    public record LessonSummaryDto(Guid Id, string Title, int Order, LessonType Type, bool IsCompleted);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourseListItem>>> List(CancellationToken ct)
    {
        var courses = await _db.Courses
            .Where(c => c.Visibility == CourseVisibility.Public)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new CourseListItem(c.Id, c.Title, c.Slug, c.Description, c.Language, c.PriceMonthlyPln))
            .ToListAsync(ct);
        return Ok(courses);
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
        if (_currentUser.Id is { } userId)
        {
            enrolled = await _db.CourseEnrollments
                .AnyAsync(e => e.UserId == userId && e.CourseId == course.Id, ct);
            completedLessons = (await _db.LessonProgresses
                .Where(p => p.UserId == userId && p.Completed && p.Lesson!.Module!.CourseId == course.Id)
                .Select(p => p.LessonId)
                .ToListAsync(ct))
                .ToHashSet();
        }

        return Ok(new CourseDetailDto(
            course.Id,
            course.Title,
            course.Slug,
            course.Description,
            course.Language,
            course.PriceMonthlyPln,
            course.Modules.Select(m => new ModuleDto(
                m.Id,
                m.Title,
                m.Order,
                m.Lessons.Select(l => new LessonSummaryDto(
                    l.Id, l.Title, l.Order, l.Type, completedLessons.Contains(l.Id))).ToList())).ToList(),
            enrolled));
    }

    public record EnrollByCodeDto(string AccessCode);

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

        var exists = await _db.CourseEnrollments.AnyAsync(e => e.UserId == userId && e.CourseId == id, ct);
        if (exists) return NoContent();

        _db.CourseEnrollments.Add(new CourseEnrollment { UserId = userId, CourseId = id });
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
