using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

/// <summary>
/// Public endpointy do embed widgetu — autor może wstawić &lt;iframe&gt; z lekcją na swoim blogu.
/// Zwraca tylko publiczne pola, bez progres-tracking'u i bez Stripe-gated kursów.
/// </summary>
[ApiController]
[Route("api/embed")]
[AllowAnonymous]
public class EmbedController : ControllerBase
{
    private readonly AppDbContext _db;

    public EmbedController(AppDbContext db)
    {
        _db = db;
    }

    public record EmbedLessonDto(
        Guid Id,
        string Title,
        string ContentMarkdown,
        Guid CourseId,
        string CourseSlug,
        string CourseTitle,
        string AuthorDisplayName);

    [HttpGet("lessons/{id:guid}")]
    public async Task<IActionResult> GetLesson(Guid id, CancellationToken ct)
    {
        var lesson = await _db.Lessons
            .Where(l => l.Id == id)
            .Where(l => l.Module!.Course!.Visibility == CourseVisibility.Public)
            .Where(l => l.Module!.Course!.PriceMonthlyPln == null || l.Module.Course.PriceMonthlyPln == 0)
            .Select(l => new EmbedLessonDto(
                l.Id,
                l.Title,
                l.ContentMarkdown,
                l.Module!.CourseId,
                l.Module!.Course!.Slug,
                l.Module.Course.Title,
                l.Module.Course.Author!.DisplayName))
            .FirstOrDefaultAsync(ct);
        if (lesson is null) return NotFound(new { error = "Lekcja niedostępna do embedowania (płatna lub niepubliczna)." });

        // Pozwalamy iframe'om — opcjonalnie zwracamy CSP że dowolny origin może embedować.
        Response.Headers["X-Frame-Options"] = "ALLOWALL";
        Response.Headers["Content-Security-Policy"] = "frame-ancestors *";
        return Ok(lesson);
    }
}
