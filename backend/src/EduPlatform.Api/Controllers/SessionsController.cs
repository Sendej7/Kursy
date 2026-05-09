using EduPlatform.Api.Services;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

/// <summary>
/// Lista aktywnych "sesji" usera = aktywne refresh tokeny (poza specjalnymi PWRESET/EMAILVERIFY/2FAPENDING).
/// Pozwala zobaczyć "zalogowane urządzenia" i wylogować pojedyncze lub wszystkie poza bieżącym.
/// </summary>
[ApiController]
[Route("api/me/sessions")]
[Authorize]
public class SessionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    private const string ResetPrefix = "PWRESET:";
    private const string VerifyPrefix = "EMAILVERIFY:";
    private const string TwoFactorPendingPrefix = "2FAPENDING:";

    public SessionsController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record SessionDto(Guid Id, string? UserAgent, DateTime CreatedAt, DateTime ExpiresAt);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var now = DateTime.UtcNow;

        var sessions = await _db.RefreshTokens
            .Where(t => t.UserId == userId
                && t.RevokedAt == null
                && t.ExpiresAt > now
                && !t.TokenHash.StartsWith(ResetPrefix)
                && !t.TokenHash.StartsWith(VerifyPrefix)
                && !t.TokenHash.StartsWith(TwoFactorPendingPrefix))
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new SessionDto(t.Id, t.UserAgent, t.CreatedAt, t.ExpiresAt))
            .ToListAsync(ct);

        return Ok(sessions);
    }

    [HttpPost("{id:guid}/revoke")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var token = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct);
        if (token is null) return NotFound();
        if (token.RevokedAt is null)
        {
            token.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpPost("revoke-others")]
    public async Task<IActionResult> RevokeOthers(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        // Bez znajomości current refresh token (front nie wysyła go w GET) — nie da się
        // zachować "tej sesji". Pragmatyczne rozwiązanie: rewoke wszystkich; user dostanie
        // 401 na refresh i zaloguje się ponownie. To bezpieczniej niż zachować nie-zidentyfikowaną sesję.
        var tokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId
                && t.RevokedAt == null
                && !t.TokenHash.StartsWith(ResetPrefix)
                && !t.TokenHash.StartsWith(VerifyPrefix)
                && !t.TokenHash.StartsWith(TwoFactorPendingPrefix))
            .ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var t in tokens) t.RevokedAt = now;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
