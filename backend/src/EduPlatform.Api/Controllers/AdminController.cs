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

    public record AdminStatsDto(
        int Users,
        int Authors,
        int CoursesPublic,
        int CoursesPending,
        int CoursesDraft,
        int Submissions,
        int AiInteractions,
        int Certificates,
        int LessonsCompletedTotal);

    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> Stats(CancellationToken ct)
    {
        return Ok(new AdminStatsDto(
            Users: await _db.Users.CountAsync(ct),
            Authors: await _db.Users.CountAsync(u => u.Role == Domain.Enums.UserRole.Author, ct),
            CoursesPublic: await _db.Courses.CountAsync(c => c.Visibility == CourseVisibility.Public, ct),
            CoursesPending: await _db.Courses.CountAsync(c => c.Visibility == CourseVisibility.PendingReview, ct),
            CoursesDraft: await _db.Courses.CountAsync(c => c.Visibility == CourseVisibility.Draft, ct),
            Submissions: await _db.Submissions.CountAsync(ct),
            AiInteractions: await _db.AiInteractions.CountAsync(ct),
            Certificates: await _db.Certificates.CountAsync(ct),
            LessonsCompletedTotal: await _db.LessonProgresses.CountAsync(p => p.Completed, ct)));
    }

    public record AdminUserRow(
        Guid Id,
        string Email,
        string DisplayName,
        Domain.Enums.UserRole Role,
        DateTime CreatedAt,
        int AuthoredCourses,
        int Enrollments,
        int Certificates);

    [HttpGet("users")]
    public async Task<IActionResult> Users([FromQuery] string? q, CancellationToken ct)
    {
        var query = _db.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = $"%{q.Trim()}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.Email, pattern) ||
                EF.Functions.ILike(u.DisplayName, pattern));
        }
        var list = await query
            .OrderByDescending(u => u.CreatedAt)
            .Take(200)
            .Select(u => new AdminUserRow(
                u.Id,
                u.Email,
                u.DisplayName,
                u.Role,
                u.CreatedAt,
                u.AuthoredCourses.Count,
                u.Enrollments.Count,
                u.Certificates.Count))
            .ToListAsync(ct);
        return Ok(list);
    }

    public record SetRoleDto(Domain.Enums.UserRole Role);

    [HttpPut("users/{id:guid}/role")]
    public async Task<IActionResult> SetRole(Guid id, [FromBody] SetRoleDto dto, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();
        user.Role = dto.Role;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
