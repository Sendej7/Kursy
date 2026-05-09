using EduPlatform.Api.Services;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/me")]
[Authorize]
public class MeController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public MeController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record EnrolledCourse(
        Guid Id,
        string Slug,
        string Title,
        string Description,
        CourseLanguage Language,
        int LessonsTotal,
        int LessonsCompleted,
        double ProgressPercent,
        DateTime EnrolledAt,
        Guid? NextLessonId);

    public record MeStatsDto(
        int TotalXp,
        int CurrentStreakDays,
        int LongestStreakDays,
        DateTime? LastActiveDay,
        int LessonsCompleted,
        int CertificatesEarned);

    [HttpGet("stats")]
    public async Task<ActionResult<MeStatsDto>> Stats(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return NotFound();

        var lessonsDone = await _db.LessonProgresses.CountAsync(p => p.UserId == userId && p.Completed, ct);
        var certs = await _db.Certificates.CountAsync(c => c.UserId == userId, ct);

        return Ok(new MeStatsDto(
            user.TotalXp,
            user.CurrentStreakDays,
            user.LongestStreakDays,
            user.LastActiveDay,
            lessonsDone,
            certs));
    }

    [HttpGet("courses")]
    public async Task<IActionResult> MyCourses(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var enrollments = await _db.CourseEnrollments
            .Where(e => e.UserId == userId)
            .Include(e => e.Course)
                .ThenInclude(c => c!.Modules.OrderBy(m => m.Order))
                    .ThenInclude(m => m.Lessons.OrderBy(l => l.Order))
            .ToListAsync(ct);

        var completedIds = (await _db.LessonProgresses
            .Where(p => p.UserId == userId && p.Completed)
            .Select(p => p.LessonId)
            .ToListAsync(ct))
            .ToHashSet();

        var output = enrollments
            .Where(e => e.Course is not null)
            .Select(e =>
            {
                var lessons = e.Course!.Modules.SelectMany(m => m.Lessons).ToList();
                var total = lessons.Count;
                var done = lessons.Count(l => completedIds.Contains(l.Id));
                var nextLessonId = lessons.FirstOrDefault(l => !completedIds.Contains(l.Id))?.Id;
                return new EnrolledCourse(
                    e.Course.Id,
                    e.Course.Slug,
                    e.Course.Title,
                    e.Course.Description,
                    e.Course.Language,
                    total,
                    done,
                    total == 0 ? 0 : (double)done / total * 100.0,
                    e.EnrolledAt,
                    nextLessonId);
            })
            .OrderByDescending(c => c.EnrolledAt)
            .ToList();

        return Ok(output);
    }
}
