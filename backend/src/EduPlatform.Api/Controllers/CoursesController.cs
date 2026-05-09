using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CoursesController(AppDbContext db)
    {
        _db = db;
    }

    public record CourseListItem(Guid Id, string Title, string Slug, string Description, CourseLanguage Language, decimal? PriceMonthlyPln);

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
    public async Task<IActionResult> Get(string slug, CancellationToken ct)
    {
        var course = await _db.Courses
            .Include(c => c.Modules)
                .ThenInclude(m => m.Lessons)
            .FirstOrDefaultAsync(c => c.Slug == slug, ct);

        if (course is null) return NotFound();
        return Ok(course);
    }
}
