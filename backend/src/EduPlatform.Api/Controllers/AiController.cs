using EduPlatform.AiService;
using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("ai")]
public class AiController : ControllerBase
{
    private readonly IAiMentor _mentor;
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public AiController(IAiMentor mentor, AppDbContext db, ICurrentUser currentUser)
    {
        _mentor = mentor;
        _db = db;
        _currentUser = currentUser;
    }

    public record AskDto(
        Guid? LessonId,
        string Question,
        string LessonContext,
        string? StudentCode,
        string? ErrorMessage);

    [Authorize]
    [HttpPost("help")]
    public async Task<IActionResult> Help([FromBody] AskDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var response = await _mentor.AskAsync(
            new MentorRequest(dto.Question, dto.LessonContext, dto.StudentCode, dto.ErrorMessage),
            ct);

        if (dto.LessonId is { } lessonId)
        {
            _db.AiInteractions.Add(new AiInteraction
            {
                UserId = userId,
                LessonId = lessonId,
                Question = dto.Question,
                Answer = response.Answer,
                StudentCodeAtAsk = dto.StudentCode,
                ErrorContext = dto.ErrorMessage,
                TokensIn = response.TokensIn,
                TokensOut = response.TokensOut,
            });
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new { response.Answer, response.TokensIn, response.TokensOut });
    }

    public record HistoryItemDto(
        Guid Id, Guid? LessonId, string? LessonTitle, string? CourseSlug, string? CourseTitle,
        string Question, string Answer, DateTime CreatedAt);

    [Authorize]
    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] int take = 30, CancellationToken ct = default)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        take = Math.Clamp(take, 1, 100);

        var items = await _db.AiInteractions
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(take)
            .Select(a => new HistoryItemDto(
                a.Id,
                a.LessonId,
                a.Lesson != null ? a.Lesson.Title : null,
                a.Lesson != null && a.Lesson.Module != null && a.Lesson.Module.Course != null
                    ? a.Lesson.Module.Course.Slug : null,
                a.Lesson != null && a.Lesson.Module != null && a.Lesson.Module.Course != null
                    ? a.Lesson.Module.Course.Title : null,
                a.Question,
                a.Answer,
                a.CreatedAt))
            .ToListAsync(ct);

        return Ok(items);
    }
}
