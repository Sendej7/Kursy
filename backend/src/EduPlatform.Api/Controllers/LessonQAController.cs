using System.ComponentModel.DataAnnotations;
using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
public class LessonQAController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly NotificationService _notifications;

    public LessonQAController(AppDbContext db, ICurrentUser currentUser, NotificationService notifications)
    {
        _db = db;
        _currentUser = currentUser;
        _notifications = notifications;
    }

    public record QuestionListItemDto(
        Guid Id, string Title, string AuthorDisplayName, string? AuthorAvatarUrl,
        DateTime CreatedAt, int AnswerCount, bool IsResolved);

    public record AnswerDto(
        Guid Id, Guid AuthorId, string AuthorDisplayName, string? AuthorAvatarUrl,
        string Body, int Upvotes, bool VotedByMe, bool IsAccepted, DateTime CreatedAt);

    public record QuestionDetailDto(
        Guid Id, Guid LessonId, Guid AuthorId, string AuthorDisplayName, string? AuthorAvatarUrl,
        string Title, string? Body, DateTime CreatedAt, Guid? AcceptedAnswerId,
        IReadOnlyList<AnswerDto> Answers);

    public record CreateQuestionDto(
        [Required, MaxLength(256), MinLength(5)] string Title,
        [MaxLength(8000)] string? Body);

    public record CreateAnswerDto([Required, MaxLength(8000), MinLength(2)] string Body);

    [HttpGet("api/lessons/{lessonId:guid}/questions")]
    [AllowAnonymous]
    public async Task<IActionResult> ListForLesson(Guid lessonId, CancellationToken ct)
    {
        var exists = await _db.Lessons.AnyAsync(l => l.Id == lessonId, ct);
        if (!exists) return NotFound();

        var list = await _db.LessonQuestions
            .Where(q => q.LessonId == lessonId)
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new QuestionListItemDto(
                q.Id,
                q.Title,
                q.Author != null ? q.Author.DisplayName : "(usunięty)",
                q.Author != null ? q.Author.AvatarUrl : null,
                q.CreatedAt,
                q.Answers.Count,
                q.AcceptedAnswerId != null))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost("api/lessons/{lessonId:guid}/questions")]
    [Authorize]
    public async Task<IActionResult> CreateQuestion(Guid lessonId, [FromBody] CreateQuestionDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var lesson = await _db.Lessons
            .Where(l => l.Id == lessonId)
            .Select(l => new { l.Id, l.Title, CourseId = l.Module!.CourseId })
            .FirstOrDefaultAsync(ct);
        if (lesson is null) return NotFound();

        var enrolled = await _db.CourseEnrollments
            .AnyAsync(e => e.UserId == userId && e.CourseId == lesson.CourseId, ct);
        if (!enrolled)
        {
            return StatusCode(403, new { error = "Tylko zapisani na kurs mogą zadawać pytania." });
        }

        var question = new LessonQuestion
        {
            LessonId = lessonId,
            AuthorId = userId,
            Title = dto.Title.Trim(),
            Body = string.IsNullOrWhiteSpace(dto.Body) ? null : dto.Body.Trim(),
        };
        _db.LessonQuestions.Add(question);
        await _db.SaveChangesAsync(ct);
        return Ok(new { question.Id });
    }

    [HttpGet("api/questions/{questionId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid questionId, CancellationToken ct)
    {
        var userId = _currentUser.Id;
        var q = await _db.LessonQuestions
            .Include(x => x.Author)
            .Include(x => x.Answers).ThenInclude(a => a.Author)
            .FirstOrDefaultAsync(x => x.Id == questionId, ct);
        if (q is null) return NotFound();

        var myVotes = userId is null
            ? new HashSet<Guid>()
            : (await _db.LessonAnswerVotes
                .Where(v => v.UserId == userId && q.Answers.Select(a => a.Id).Contains(v.AnswerId))
                .Select(v => v.AnswerId)
                .ToListAsync(ct)).ToHashSet();

        var answers = q.Answers
            .OrderByDescending(a => a.Id == q.AcceptedAnswerId)
            .ThenByDescending(a => a.Upvotes)
            .ThenBy(a => a.CreatedAt)
            .Select(a => new AnswerDto(
                a.Id, a.AuthorId,
                a.Author?.DisplayName ?? "(usunięty)",
                a.Author?.AvatarUrl,
                a.Body, a.Upvotes,
                myVotes.Contains(a.Id),
                a.Id == q.AcceptedAnswerId,
                a.CreatedAt))
            .ToList();

        return Ok(new QuestionDetailDto(
            q.Id, q.LessonId, q.AuthorId,
            q.Author?.DisplayName ?? "(usunięty)",
            q.Author?.AvatarUrl,
            q.Title, q.Body, q.CreatedAt, q.AcceptedAnswerId,
            answers));
    }

    [HttpPost("api/questions/{questionId:guid}/answers")]
    [Authorize]
    public async Task<IActionResult> CreateAnswer(Guid questionId, [FromBody] CreateAnswerDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var q = await _db.LessonQuestions
            .Where(x => x.Id == questionId)
            .Select(x => new { x.Id, x.AuthorId, x.Title })
            .FirstOrDefaultAsync(ct);
        if (q is null) return NotFound();

        var answer = new LessonAnswer
        {
            QuestionId = questionId,
            AuthorId = userId,
            Body = dto.Body.Trim(),
        };
        _db.LessonAnswers.Add(answer);

        if (q.AuthorId != userId)
        {
            _notifications.Notify(
                q.AuthorId,
                type: "qa.answer",
                title: $"Nowa odpowiedź: {Truncate(q.Title, 80)}",
                body: Truncate(dto.Body, 160),
                url: $"/questions/{q.Id}");
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { answer.Id });
    }

    [HttpPost("api/questions/{questionId:guid}/accept-answer/{answerId:guid}")]
    [Authorize]
    public async Task<IActionResult> AcceptAnswer(Guid questionId, Guid answerId, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var q = await _db.LessonQuestions
            .FirstOrDefaultAsync(x => x.Id == questionId, ct);
        if (q is null) return NotFound();
        if (q.AuthorId != userId)
        {
            return StatusCode(403, new { error = "Tylko autor pytania może zaakceptować odpowiedź." });
        }
        var answer = await _db.LessonAnswers
            .FirstOrDefaultAsync(a => a.Id == answerId && a.QuestionId == questionId, ct);
        if (answer is null) return NotFound();

        var wasAccepted = q.AcceptedAnswerId == answerId;
        q.AcceptedAnswerId = wasAccepted ? null : answerId;

        if (!wasAccepted && answer.AuthorId != userId)
        {
            _notifications.Notify(
                answer.AuthorId,
                type: "qa.accepted",
                title: "Twoja odpowiedź została zaakceptowana ✓",
                body: Truncate(q.Title, 160),
                url: $"/questions/{q.Id}");
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("api/answers/{answerId:guid}/upvote")]
    [Authorize]
    public async Task<IActionResult> ToggleUpvote(Guid answerId, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var answer = await _db.LessonAnswers.FirstOrDefaultAsync(a => a.Id == answerId, ct);
        if (answer is null) return NotFound();
        if (answer.AuthorId == userId)
        {
            return StatusCode(403, new { error = "Nie można polajkować własnej odpowiedzi." });
        }

        var existing = await _db.LessonAnswerVotes
            .FirstOrDefaultAsync(v => v.AnswerId == answerId && v.UserId == userId, ct);
        if (existing is null)
        {
            _db.LessonAnswerVotes.Add(new LessonAnswerVote { AnswerId = answerId, UserId = userId });
            answer.Upvotes++;
        }
        else
        {
            _db.LessonAnswerVotes.Remove(existing);
            answer.Upvotes = Math.Max(0, answer.Upvotes - 1);
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { upvotes = answer.Upvotes, votedByMe = existing is null });
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
}
