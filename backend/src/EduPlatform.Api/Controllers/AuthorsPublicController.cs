using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/authors")]
[AllowAnonymous]
public class AuthorsPublicController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuthorsPublicController(AppDbContext db)
    {
        _db = db;
    }

    public record AuthorProfileDto(
        Guid Id,
        string DisplayName,
        string? AvatarUrl,
        int CoursesCount,
        int StudentsTotal,
        double AverageRating,
        int ReviewCount,
        IReadOnlyList<AuthorCourseDto> Courses);

    public record AuthorCourseDto(
        Guid Id, string Slug, string Title, string Description,
        CourseLanguage Language, decimal? PriceMonthlyPln,
        double AverageRating, int ReviewCount);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProfile(Guid id, CancellationToken ct)
    {
        var author = await _db.Users
            .Where(u => u.Id == id && !u.IsDeleted)
            .Select(u => new { u.Id, u.DisplayName, u.AvatarUrl })
            .FirstOrDefaultAsync(ct);
        if (author is null) return NotFound();

        // Tylko publiczne kursy autora w response (nie pokazujemy draftów anonimom).
        var courses = await _db.Courses
            .Where(c => c.AuthorId == id && c.Visibility == CourseVisibility.Public)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new AuthorCourseDto(
                c.Id, c.Slug, c.Title, c.Description, c.Language, c.PriceMonthlyPln,
                _db.CourseReviews.Where(r => r.CourseId == c.Id).Average(r => (double?)r.Rating) ?? 0d,
                _db.CourseReviews.Count(r => r.CourseId == c.Id)))
            .ToListAsync(ct);

        var courseIds = courses.Select(c => c.Id).ToList();
        var studentsTotal = await _db.CourseEnrollments
            .Where(e => courseIds.Contains(e.CourseId))
            .Select(e => e.UserId)
            .Distinct()
            .CountAsync(ct);

        var avgAcrossCourses = courses.Where(c => c.ReviewCount > 0).ToList();
        var avg = avgAcrossCourses.Count == 0 ? 0d : avgAcrossCourses.Average(c => c.AverageRating);
        var reviewCount = courses.Sum(c => c.ReviewCount);

        return Ok(new AuthorProfileDto(
            author.Id, author.DisplayName, author.AvatarUrl,
            courses.Count, studentsTotal, Math.Round(avg, 2), reviewCount,
            courses));
    }
}
