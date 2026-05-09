using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/search")]
[AllowAnonymous]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _db;

    public SearchController(AppDbContext db)
    {
        _db = db;
    }

    public record CourseHit(Guid Id, string Slug, string Title, string Description, CourseLanguage Language);
    public record LessonHit(Guid Id, string Title, Guid CourseId, string CourseSlug, string CourseTitle, string Snippet);
    public record QuestionHit(Guid Id, string Title, Guid LessonId, string CourseSlug, int AnswerCount, bool IsResolved);

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int take = 10, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
        {
            return Ok(new { courses = Array.Empty<CourseHit>(), lessons = Array.Empty<LessonHit>(), questions = Array.Empty<QuestionHit>() });
        }
        take = Math.Clamp(take, 1, 50);
        var pattern = $"%{q.Trim()}%";

        var courses = await _db.Courses
            .Where(c => c.Visibility == CourseVisibility.Public
                && (EF.Functions.ILike(c.Title, pattern)
                    || EF.Functions.ILike(c.Description, pattern)))
            .OrderByDescending(c => c.CreatedAt)
            .Take(take)
            .Select(c => new CourseHit(c.Id, c.Slug, c.Title, c.Description, c.Language))
            .ToListAsync(ct);

        // Tylko lekcje w publicznych kursach — niepublikowanych nie pokazujemy w wynikach.
        var lessons = await _db.Lessons
            .Where(l => l.Module!.Course!.Visibility == CourseVisibility.Public
                && (EF.Functions.ILike(l.Title, pattern)
                    || EF.Functions.ILike(l.ContentMarkdown, pattern)))
            .OrderByDescending(l => l.CreatedAt)
            .Take(take)
            .Select(l => new LessonHit(
                l.Id, l.Title,
                l.Module!.CourseId,
                l.Module!.Course!.Slug,
                l.Module!.Course!.Title,
                l.ContentMarkdown.Length > 200 ? l.ContentMarkdown.Substring(0, 200) + "…" : l.ContentMarkdown))
            .ToListAsync(ct);

        var questions = await _db.LessonQuestions
            .Where(qq => EF.Functions.ILike(qq.Title, pattern)
                || (qq.Body != null && EF.Functions.ILike(qq.Body, pattern)))
            .OrderByDescending(qq => qq.CreatedAt)
            .Take(take)
            .Select(qq => new QuestionHit(
                qq.Id, qq.Title, qq.LessonId,
                qq.Lesson!.Module!.Course!.Slug,
                qq.Answers.Count,
                qq.AcceptedAnswerId != null))
            .ToListAsync(ct);

        return Ok(new { courses, lessons, questions });
    }
}
