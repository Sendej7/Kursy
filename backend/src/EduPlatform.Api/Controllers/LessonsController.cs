using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LessonsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public LessonsController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record LessonDetailDto(
        Guid Id,
        string Title,
        int Order,
        string ContentMarkdown,
        Guid ModuleId,
        ExerciseDto? Exercise,
        bool IsCompleted);

    public record ExerciseDto(Guid Id, string Prompt, string StarterCode, string TestsCode, IReadOnlyList<string> Hints);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LessonDetailDto>> Get(Guid id, CancellationToken ct)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Exercise)
            .FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lesson is null) return NotFound();

        bool completed = false;
        if (_currentUser.Id is { } userId)
        {
            completed = await _db.LessonProgresses
                .AnyAsync(p => p.UserId == userId && p.LessonId == id && p.Completed, ct);
        }

        return Ok(new LessonDetailDto(
            lesson.Id,
            lesson.Title,
            lesson.Order,
            lesson.ContentMarkdown,
            lesson.ModuleId,
            lesson.Exercise is null
                ? null
                : new ExerciseDto(
                    lesson.Exercise.Id,
                    lesson.Exercise.Prompt,
                    lesson.Exercise.StarterCode,
                    lesson.Exercise.TestsCode,
                    lesson.Exercise.Hints),
            completed));
    }

    public record CompleteDto(int TimeSpentSeconds);

    [Authorize]
    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id, [FromBody] CompleteDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var lessonExists = await _db.Lessons.AnyAsync(l => l.Id == id, ct);
        if (!lessonExists) return NotFound();

        var existing = await _db.LessonProgresses
            .FirstOrDefaultAsync(p => p.UserId == userId && p.LessonId == id, ct);

        if (existing is null)
        {
            _db.LessonProgresses.Add(new LessonProgress
            {
                UserId = userId,
                LessonId = id,
                Completed = true,
                CompletedAt = DateTime.UtcNow,
                TimeSpent = TimeSpan.FromSeconds(dto.TimeSpentSeconds),
            });
        }
        else
        {
            existing.Completed = true;
            existing.CompletedAt ??= DateTime.UtcNow;
            existing.TimeSpent += TimeSpan.FromSeconds(dto.TimeSpentSeconds);
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
