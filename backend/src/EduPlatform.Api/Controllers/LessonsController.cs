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
    private readonly CertificateService _certificates;
    private readonly GamificationService _gamification;
    private readonly AchievementService _achievements;

    public LessonsController(
        AppDbContext db,
        ICurrentUser currentUser,
        CertificateService certificates,
        GamificationService gamification,
        AchievementService achievements)
    {
        _db = db;
        _currentUser = currentUser;
        _certificates = certificates;
        _gamification = gamification;
        _achievements = achievements;
    }

    public record LessonDetailDto(
        Guid Id,
        string Title,
        int Order,
        EduPlatform.Domain.Enums.LessonType Type,
        string ContentMarkdown,
        string? DraftContentMarkdown,
        string? VideoUrl,
        Guid ModuleId,
        EduPlatform.Domain.Enums.CourseLanguage CourseLanguage,
        ExerciseDto? Exercise,
        bool IsCompleted);

    public record ExerciseDto(Guid Id, string Prompt, string StarterCode, string TestsCode, IReadOnlyList<string> Hints);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LessonDetailDto>> Get(Guid id, CancellationToken ct)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Exercise)
            .Include(l => l.Module).ThenInclude(m => m!.Course)
            .FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lesson is null) return NotFound();

        bool completed = false;
        var isAuthorOrAdmin = false;
        if (_currentUser.Id is { } userId)
        {
            completed = await _db.LessonProgresses
                .AnyAsync(p => p.UserId == userId && p.LessonId == id && p.Completed, ct);
            isAuthorOrAdmin = lesson.Module?.Course?.AuthorId == userId || User.IsInRole("Admin");
        }

        return Ok(new LessonDetailDto(
            lesson.Id,
            lesson.Title,
            lesson.Order,
            lesson.Type,
            lesson.ContentMarkdown,
            isAuthorOrAdmin ? lesson.DraftContentMarkdown : null,
            lesson.VideoUrl,
            lesson.ModuleId,
            lesson.Module?.Course?.Language ?? EduPlatform.Domain.Enums.CourseLanguage.Python,
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

    public record LessonNavDto(
        Guid? PrevLessonId,
        string? PrevTitle,
        Guid? NextLessonId,
        string? NextTitle,
        Guid CourseId,
        string CourseSlug,
        string CourseTitle,
        int IndexInCourse,
        int CourseTotalLessons);

    [HttpGet("{id:guid}/nav")]
    public async Task<ActionResult<LessonNavDto>> Navigation(Guid id, CancellationToken ct)
    {
        var current = await _db.Lessons
            .Include(l => l.Module)
                .ThenInclude(m => m!.Course)
            .FirstOrDefaultAsync(l => l.Id == id, ct);
        if (current?.Module?.Course is null) return NotFound();

        var courseId = current.Module.CourseId;
        var allLessons = await _db.Lessons
            .Where(l => l.Module!.CourseId == courseId)
            .OrderBy(l => l.Module!.Order).ThenBy(l => l.Order)
            .Select(l => new { l.Id, l.Title })
            .ToListAsync(ct);

        var index = allLessons.FindIndex(x => x.Id == id);
        var prev = index > 0 ? allLessons[index - 1] : null;
        var next = index < allLessons.Count - 1 ? allLessons[index + 1] : null;

        return Ok(new LessonNavDto(
            prev?.Id, prev?.Title,
            next?.Id, next?.Title,
            courseId, current.Module.Course.Slug, current.Module.Course.Title,
            index + 1, allLessons.Count));
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

        var firstTimeCompletion = existing is null || !existing.Completed;
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

        var gamification = await _gamification.RecordLessonCompletionAsync(userId, firstTimeCompletion, ct);

        var lessonForCourse = await _db.Lessons
            .Where(l => l.Id == id)
            .Select(l => new { l.Module!.CourseId })
            .FirstOrDefaultAsync(ct);

        Certificate? issued = null;
        if (lessonForCourse is not null)
        {
            issued = await _certificates.IssueIfEligibleAsync(userId, lessonForCourse.CourseId, ct);
        }

        // Po wszystkich update'ach (lesson progress + gamification + cert) — sprawdź odznaki.
        await _achievements.CheckAndAwardAsync(userId, ct);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            certificateIssued = issued is not null,
            certificateCode = issued?.Code,
            xpGained = gamification.XpGained,
            currentStreak = gamification.CurrentStreak,
            totalXp = gamification.TotalXp,
            streakBumped = gamification.StreakBumped,
        });
    }

    public record NoteDto(string Content);

    [Authorize]
    [HttpGet("{id:guid}/note")]
    public async Task<IActionResult> GetNote(Guid id, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var note = await _db.LessonNotes
            .Where(n => n.UserId == userId && n.LessonId == id)
            .Select(n => new NoteDto(n.Content))
            .FirstOrDefaultAsync(ct);
        return Ok(note ?? new NoteDto(string.Empty));
    }

    [Authorize]
    [HttpPut("{id:guid}/note")]
    public async Task<IActionResult> UpsertNote(Guid id, [FromBody] NoteDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var lessonExists = await _db.Lessons.AnyAsync(l => l.Id == id, ct);
        if (!lessonExists) return NotFound();

        var content = dto.Content?.Trim() ?? string.Empty;
        if (content.Length > 20_000) content = content[..20_000];

        var existing = await _db.LessonNotes
            .FirstOrDefaultAsync(n => n.UserId == userId && n.LessonId == id, ct);

        if (string.IsNullOrEmpty(content))
        {
            // Pusta notatka = usuwamy. Nie trzymamy "" w bazie.
            if (existing is not null) _db.LessonNotes.Remove(existing);
        }
        else if (existing is null)
        {
            _db.LessonNotes.Add(new Domain.Entities.LessonNote
            {
                UserId = userId,
                LessonId = id,
                Content = content,
            });
        }
        else
        {
            existing.Content = content;
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
