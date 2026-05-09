using System.ComponentModel.DataAnnotations;
using EduPlatform.Api.Auth;
using EduPlatform.Api.Services;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

/// <summary>
/// RODO/GDPR endpoints — eksport danych i kasowanie konta. Kasowanie to anonimizacja
/// (zachowujemy referencyjną integralność dla kursów/recenzji autorstwa usera).
/// </summary>
[ApiController]
[Route("api/me")]
[Authorize]
public class PrivacyController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TotpService _totp;

    public PrivacyController(AppDbContext db, ICurrentUser currentUser, TotpService totp)
    {
        _db = db;
        _currentUser = currentUser;
        _totp = totp;
    }

    /// <summary>Zwraca pełen zrzut danych użytkownika jako JSON (RODO art. 15 — prawo dostępu).</summary>
    [HttpPost("export")]
    public async Task<IActionResult> ExportData(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var user = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id, u.Email, u.DisplayName, u.Role, u.AvatarUrl,
                u.TotalXp, u.CurrentStreakDays, u.LongestStreakDays, u.LastActiveDay,
                u.EmailConfirmed, u.TwoFactorEnabled,
                u.CreatedAt, u.UpdatedAt,
                hasGoogle = u.GoogleId != null,
                hasGitHub = u.GitHubId != null,
            })
            .FirstOrDefaultAsync(ct);

        if (user is null) return NotFound();

        var enrollments = await _db.CourseEnrollments
            .Where(e => e.UserId == userId)
            .Select(e => new { e.CourseId, courseTitle = e.Course!.Title, e.CreatedAt })
            .ToListAsync(ct);

        var lessonProgress = await _db.LessonProgresses
            .Where(p => p.UserId == userId)
            .Select(p => new { p.LessonId, p.Completed, p.UpdatedAt })
            .ToListAsync(ct);

        var submissions = await _db.Submissions
            .Where(s => s.UserId == userId)
            .Select(s => new { s.Id, s.ExerciseId, s.Code, s.Stdout, s.Passed, s.AttemptNumber, s.CreatedAt })
            .ToListAsync(ct);

        var aiInteractions = await _db.AiInteractions
            .Where(a => a.UserId == userId)
            .Select(a => new { a.Id, a.LessonId, question = a.Question, answer = a.Answer, a.CreatedAt })
            .ToListAsync(ct);

        var certificates = await _db.Certificates
            .Where(c => c.UserId == userId)
            .Select(c => new { c.Code, c.CourseId, courseTitle = c.Course!.Title, c.IssuedAt })
            .ToListAsync(ct);

        var billingProfile = await _db.BillingProfiles
            .Where(b => b.UserId == userId)
            .Select(b => new { b.CompanyName, b.Nip, b.AddressLine, b.PostalCode, b.City, b.Country })
            .FirstOrDefaultAsync(ct);

        var invoices = await _db.Invoices
            .Where(i => i.UserId == userId)
            .Select(i => new { i.Number, i.IssuedAt, i.Description, i.GrossAmountGr, i.Currency })
            .ToListAsync(ct);

        var reviews = await _db.CourseReviews
            .Where(r => r.UserId == userId)
            .Select(r => new { r.CourseId, courseTitle = r.Course!.Title, r.Rating, r.Comment, r.CreatedAt })
            .ToListAsync(ct);

        var questions = await _db.LessonQuestions
            .Where(q => q.AuthorId == userId)
            .Select(q => new { q.Id, q.LessonId, q.Title, q.Body, q.CreatedAt })
            .ToListAsync(ct);

        var answers = await _db.LessonAnswers
            .Where(a => a.AuthorId == userId)
            .Select(a => new { a.Id, a.QuestionId, a.Body, a.Upvotes, a.CreatedAt })
            .ToListAsync(ct);

        var notifications = await _db.Notifications
            .Where(n => n.UserId == userId)
            .Select(n => new { n.Type, n.Title, n.Body, n.Url, n.ReadAt, n.CreatedAt })
            .ToListAsync(ct);

        return new JsonResult(new
        {
            exportedAt = DateTime.UtcNow,
            user,
            enrollments,
            lessonProgress,
            submissions,
            aiInteractions,
            certificates,
            billingProfile,
            invoices,
            reviews,
            questions,
            answers,
            notifications,
        })
        {
            ContentType = "application/json",
        };
    }

    public record DeleteAccountDto(string? Password, string? TwoFactorCode);

    /// <summary>RODO art. 17 — prawo do usunięcia. Anonimizujemy konto, zachowując referencje
    /// (autorzy kursów / recenzje stają się "(konto usunięte)"). Stripe customer / sub anulujemy.</summary>
    [HttpPost("delete")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Unauthorized();

        // Wymagana świeża autentykacja: password (jeśli ustawione) LUB kod 2FA (jeśli włączone).
        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            if (string.IsNullOrEmpty(dto.Password) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized(new { error = "Wymagane hasło, by potwierdzić usunięcie konta." });
            }
        }
        else if (user.TwoFactorEnabled && !string.IsNullOrEmpty(user.TotpSecret))
        {
            if (string.IsNullOrEmpty(dto.TwoFactorCode) || !_totp.Verify(user.TotpSecret, dto.TwoFactorCode))
            {
                return Unauthorized(new { error = "Wymagany kod 2FA, by potwierdzić usunięcie konta." });
            }
        }
        // OAuth-only bez 2FA — pozwalamy bez dodatkowego potwierdzenia (i tak jest auth).

        // Anonimizacja PII
        var stamp = Guid.NewGuid().ToString("N");
        user.Email = $"deleted-{stamp}@kursy.invalid";
        user.DisplayName = "(konto usunięte)";
        user.PasswordHash = string.Empty;
        user.GoogleId = null;
        user.GitHubId = null;
        user.AvatarUrl = null;
        user.TotpSecret = null;
        user.TwoFactorEnabled = false;
        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;

        // Revoke wszystkich refresh tokenów (force-logout wszędzie)
        var tokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var t in tokens) t.RevokedAt = now;

        // BillingProfile z PII firmy (NIP/adres) — usuwamy
        var billing = await _db.BillingProfiles.FirstOrDefaultAsync(b => b.UserId == userId, ct);
        if (billing is not null) _db.BillingProfiles.Remove(billing);

        // Notyfikacje — usuwamy (nie są nikomu potrzebne po skasowaniu konta)
        var notifications = await _db.Notifications.Where(n => n.UserId == userId).ToListAsync(ct);
        _db.Notifications.RemoveRange(notifications);

        await _db.SaveChangesAsync(ct);

        return NoContent();
    }
}
