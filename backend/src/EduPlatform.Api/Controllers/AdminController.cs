using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("courses/pending")]
    public async Task<IActionResult> PendingCourses(CancellationToken ct)
    {
        var list = await _db.Courses
            .Where(c => c.Visibility == CourseVisibility.PendingReview)
            .OrderByDescending(c => c.UpdatedAt)
            .Select(c => new
            {
                c.Id, c.Title, c.Slug, c.Description, c.Language,
                authorEmail = c.Author!.Email,
                authorName = c.Author.DisplayName,
                modules = c.Modules.Count,
                lessons = c.Modules.SelectMany(m => m.Lessons).Count(),
            })
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost("courses/{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course is null) return NotFound();
        course.Visibility = CourseVisibility.Public;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("courses/{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course is null) return NotFound();
        course.Visibility = CourseVisibility.Private;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
