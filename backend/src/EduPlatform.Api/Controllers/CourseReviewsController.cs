using System.ComponentModel.DataAnnotations;
using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/courses/{courseId:guid}/reviews")]
public class CourseReviewsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly NotificationService _notifications;

    public CourseReviewsController(AppDbContext db, ICurrentUser currentUser, NotificationService notifications)
    {
        _db = db;
        _currentUser = currentUser;
        _notifications = notifications;
    }

    public record ReviewDto(
        Guid Id, Guid UserId, string UserDisplayName, string? UserAvatarUrl,
        int Rating, string? Comment, DateTime CreatedAt, DateTime UpdatedAt);

    public record UpsertReviewDto([Range(1, 5)] int Rating, [MaxLength(2000)] string? Comment);

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(Guid courseId, CancellationToken ct)
    {
        var courseExists = await _db.Courses.AnyAsync(c => c.Id == courseId, ct);
        if (!courseExists) return NotFound();

        var reviews = await _db.CourseReviews
            .Where(r => r.CourseId == courseId)
            .OrderByDescending(r => r.UpdatedAt)
            .Select(r => new ReviewDto(
                r.Id, r.UserId,
                r.User != null ? r.User.DisplayName : "(usunięty)",
                r.User != null ? r.User.AvatarUrl : null,
                r.Rating, r.Comment, r.CreatedAt, r.UpdatedAt))
            .ToListAsync(ct);

        var summary = reviews.Count > 0
            ? new { count = reviews.Count, average = Math.Round(reviews.Average(r => r.Rating), 2) }
            : new { count = 0, average = 0d };

        return Ok(new { summary, reviews });
    }

    /// <summary>Tworzy lub aktualizuje recenzję (upsert) — endpoint POST jest zarówno create i update.</summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Upsert(Guid courseId, [FromBody] UpsertReviewDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var courseExists = await _db.Courses.AnyAsync(c => c.Id == courseId, ct);
        if (!courseExists) return NotFound();

        var enrolled = await _db.CourseEnrollments
            .AnyAsync(e => e.UserId == userId && e.CourseId == courseId, ct);
        if (!enrolled)
        {
            return StatusCode(403, new { error = "Tylko zapisani na kurs mogą dodać recenzję." });
        }

        var existing = await _db.CourseReviews
            .FirstOrDefaultAsync(r => r.CourseId == courseId && r.UserId == userId, ct);

        var trimmedComment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
        var isNew = existing is null;

        if (isNew)
        {
            _db.CourseReviews.Add(new CourseReview
            {
                CourseId = courseId,
                UserId = userId,
                Rating = dto.Rating,
                Comment = trimmedComment,
            });
        }
        else
        {
            existing!.Rating = dto.Rating;
            existing.Comment = trimmedComment;
        }

        // Notyfikacja autora kursu — tylko dla nowych recenzji (nie spam'uj przy edycji).
        if (isNew)
        {
            var course = await _db.Courses
                .Where(c => c.Id == courseId)
                .Select(c => new { c.AuthorId, c.Title, c.Slug })
                .FirstOrDefaultAsync(ct);
            if (course is not null && course.AuthorId != userId)
            {
                _notifications.Notify(
                    course.AuthorId,
                    type: "review.new",
                    title: $"Nowa recenzja kursu: {course.Title}",
                    body: $"Ocena: {dto.Rating}/5 gwiazdek"
                          + (trimmedComment is null ? string.Empty : $" — {Truncate(trimmedComment, 120)}"),
                    url: $"/courses/{course.Slug}");
            }
        }

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s[..max] + "…";

    [HttpDelete("me")]
    [Authorize]
    public async Task<IActionResult> DeleteMine(Guid courseId, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var existing = await _db.CourseReviews
            .FirstOrDefaultAsync(r => r.CourseId == courseId && r.UserId == userId, ct);
        if (existing is null) return NoContent();
        _db.CourseReviews.Remove(existing);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Mine(Guid courseId, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var review = await _db.CourseReviews
            .Where(r => r.CourseId == courseId && r.UserId == userId)
            .Select(r => new { r.Rating, r.Comment, r.UpdatedAt })
            .FirstOrDefaultAsync(ct);
        if (review is null) return NoContent();
        return Ok(review);
    }
}
