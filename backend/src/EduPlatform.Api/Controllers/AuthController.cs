using System.ComponentModel.DataAnnotations;
using EduPlatform.Api.Auth;
using EduPlatform.Api.Email;
using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;
    private readonly RefreshTokenService _refresh;
    private readonly ICurrentUser _currentUser;
    private readonly GoogleAuthOptions _googleOptions;
    private readonly GitHubAuthService _github;
    private readonly GitHubAuthOptions _githubOptions;
    private readonly IEmailSender _email;
    private readonly IConfiguration _config;
    private readonly TotpService _totp;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext db,
        JwtTokenService jwt,
        RefreshTokenService refresh,
        ICurrentUser currentUser,
        IOptions<GoogleAuthOptions> googleOptions,
        GitHubAuthService github,
        IOptions<GitHubAuthOptions> githubOptions,
        IEmailSender email,
        IConfiguration config,
        TotpService totp,
        ILogger<AuthController> logger)
    {
        _db = db;
        _jwt = jwt;
        _refresh = refresh;
        _currentUser = currentUser;
        _googleOptions = googleOptions.Value;
        _github = github;
        _githubOptions = githubOptions.Value;
        _email = email;
        _config = config;
        _totp = totp;
        _logger = logger;
    }

    private string AppBaseUrl =>
        (_config.GetValue<string>("App:BaseUrl") ?? "http://localhost:5173").TrimEnd('/');

    public record RegisterDto(
        [Required, EmailAddress] string Email,
        [Required, MinLength(8)] string Password,
        [Required, MinLength(2), MaxLength(128)] string DisplayName,
        bool BecomeAuthor = false);

    public record LoginDto(
        [Required, EmailAddress] string Email,
        [Required] string Password);

    public record RefreshDto([Required] string RefreshToken);
    public record GoogleLoginDto([Required] string IdToken);
    public record GitHubLoginDto([Required] string Code);
    public record ForgotPasswordDto([Required, EmailAddress] string Email);
    public record ResetPasswordDto([Required] string Code, [Required, MinLength(8)] string NewPassword);
    public record VerifyEmailDto([Required] string Code);
    public record TotpVerifyDto([Required] string Code);
    public record TwoFactorLoginDto([Required, EmailAddress] string Email, [Required] string PendingToken, [Required] string Code);

    public record AuthResponse(string Token, DateTime ExpiresAt, string RefreshToken, UserDto User);
    public record UserDto(Guid Id, string Email, string DisplayName, UserRole Role, bool EmailConfirmed, bool TwoFactorEnabled);
    public record TwoFactorChallengeResponse(bool Pending2fa, string PendingToken, string Email);

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterDto dto, CancellationToken ct)
    {
        var emailLower = dto.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == emailLower, ct))
        {
            return Conflict(new { error = "Konto z tym adresem email już istnieje." });
        }

        var user = new User
        {
            Email = emailLower,
            DisplayName = dto.DisplayName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = dto.BecomeAuthor ? UserRole.Author : UserRole.Student,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        await SafeSendWelcomeAsync(user, ct);
        return Ok(await IssueResponseAsync(user, ct));
    }

    private async Task SafeSendWelcomeAsync(User user, CancellationToken ct)
    {
        try
        {
            string? verifyUrl = null;
            if (!user.EmailConfirmed)
            {
                var raw = await IssueEmailVerifyTokenAsync(user.Id, ct);
                verifyUrl = $"{AppBaseUrl}/verify-email?code={Uri.EscapeDataString(raw)}";
            }
            await _email.SendAsync(EmailTemplates.Welcome(user.Email, user.DisplayName, AppBaseUrl, verifyUrl), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send welcome email to {Email}", user.Email);
        }
    }

    private async Task<string> IssueEmailVerifyTokenAsync(Guid userId, CancellationToken ct)
    {
        var raw = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(24));
        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(raw)));
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = "EMAILVERIFY:" + hash,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            UserAgent = "email-verify",
        });
        await _db.SaveChangesAsync(ct);
        return raw;
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto, CancellationToken ct)
    {
        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(dto.Code)));
        var token = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == "EMAILVERIFY:" + hash, ct);

        if (token is null || token.User is null
            || token.RevokedAt is not null
            || token.ExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { error = "Link wygasł lub jest nieprawidłowy." });
        }

        token.User.EmailConfirmed = true;
        token.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    [HttpPost("resend-verification")]
    [Authorize]
    public async Task<IActionResult> ResendVerification(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Unauthorized();
        if (user.EmailConfirmed) return NoContent();

        var raw = await IssueEmailVerifyTokenAsync(user.Id, ct);
        var verifyUrl = $"{AppBaseUrl}/verify-email?code={Uri.EscapeDataString(raw)}";
        try
        {
            await _email.SendAsync(EmailTemplates.VerifyEmail(user.Email, user.DisplayName, verifyUrl), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", user.Email);
        }
        return Ok(new { ok = true });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken ct)
    {
        var emailLower = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == emailLower, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { error = "Niepoprawny email lub hasło." });
        }

        if (user.TwoFactorEnabled)
        {
            // Hasło OK, ale wymagamy też kodu TOTP. Wystawiamy krótki "pending token" (5 min);
            // klient pokaże prompt, ponowi wywołanie z kodem przez /auth/login-2fa.
            var pending = await IssuePendingTwoFactorTokenAsync(user.Id, ct);
            return Ok(new TwoFactorChallengeResponse(true, pending, user.Email));
        }

        return Ok(await IssueResponseAsync(user, ct));
    }

    private async Task<string> IssuePendingTwoFactorTokenAsync(Guid userId, CancellationToken ct)
    {
        var raw = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(24));
        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(raw)));
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = "2FAPENDING:" + hash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            UserAgent = "2fa-pending",
        });
        await _db.SaveChangesAsync(ct);
        return raw;
    }

    [HttpPost("login-2fa")]
    public async Task<IActionResult> LoginTwoFactor([FromBody] TwoFactorLoginDto dto, CancellationToken ct)
    {
        var emailLower = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == emailLower, ct);
        if (user is null || !user.TwoFactorEnabled || string.IsNullOrEmpty(user.TotpSecret))
        {
            return Unauthorized(new { error = "Niepoprawne dane." });
        }

        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(dto.PendingToken)));
        var pending = await _db.RefreshTokens.FirstOrDefaultAsync(
            t => t.TokenHash == "2FAPENDING:" + hash && t.UserId == user.Id, ct);
        if (pending is null || pending.RevokedAt is not null || pending.ExpiresAt < DateTime.UtcNow)
        {
            return Unauthorized(new { error = "Sesja 2FA wygasła — zaloguj się ponownie." });
        }

        if (!_totp.Verify(user.TotpSecret, dto.Code))
        {
            return Unauthorized(new { error = "Nieprawidłowy kod 2FA." });
        }

        pending.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(await IssueResponseAsync(user, ct));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshDto dto, CancellationToken ct)
    {
        var token = await _refresh.ValidateAsync(dto.RefreshToken, ct);
        if (token?.User is null)
        {
            return Unauthorized(new { error = "Refresh token nieważny." });
        }

        var ua = Request.Headers.UserAgent.ToString();
        var (newRaw, _) = await _refresh.RotateAsync(token, ua, ct);
        var (access, expires) = _jwt.IssueAccessToken(token.User);

        return Ok(new AuthResponse(
            access, expires, newRaw,
            new UserDto(token.User.Id, token.User.Email, token.User.DisplayName, token.User.Role, token.User.EmailConfirmed, token.User.TwoFactorEnabled)));
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> Google([FromBody] GoogleLoginDto dto, CancellationToken ct)
    {
        if (!_googleOptions.IsConfigured)
        {
            return StatusCode(503, new { error = "Logowanie Google nie jest skonfigurowane." });
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(dto.IdToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _googleOptions.ClientId },
            });
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning(ex, "Google ID token validation failed.");
            return Unauthorized(new { error = "Nieprawidłowy token Google." });
        }

        if (payload.EmailVerified != true)
        {
            return Unauthorized(new { error = "Email Google nie jest zweryfikowany." });
        }

        var emailLower = payload.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == emailLower || u.GoogleId == payload.Subject, ct);
        var isNew = user is null;

        if (isNew)
        {
            user = new User
            {
                Email = emailLower,
                DisplayName = payload.Name ?? emailLower.Split('@')[0],
                PasswordHash = string.Empty,
                GoogleId = payload.Subject,
                AvatarUrl = payload.Picture,
                Role = UserRole.Student,
                // OAuth = email już potwierdzony przez providera (sprawdzone payload.EmailVerified powyżej).
                EmailConfirmed = true,
            };
            _db.Users.Add(user);
        }
        else
        {
            // Link Google to existing email account on first Google sign-in.
            user!.GoogleId ??= payload.Subject;
            user.AvatarUrl ??= payload.Picture;
        }
        await _db.SaveChangesAsync(ct);

        if (isNew) await SafeSendWelcomeAsync(user!, ct);
        return Ok(await IssueResponseAsync(user, ct));
    }

    [HttpPost("github")]
    public async Task<ActionResult<AuthResponse>> GitHub([FromBody] GitHubLoginDto dto, CancellationToken ct)
    {
        if (!_githubOptions.IsConfigured)
        {
            return StatusCode(503, new { error = "Logowanie GitHub nie jest skonfigurowane." });
        }

        var profile = await _github.ExchangeCodeAsync(dto.Code, ct);
        if (profile is null)
        {
            return Unauthorized(new { error = "Wymiana code → token w GitHub nie powiodła się." });
        }
        if (string.IsNullOrEmpty(profile.Email))
        {
            return Unauthorized(new { error = "Konto GitHub nie udostępnia zweryfikowanego emaila." });
        }

        var emailLower = profile.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == emailLower || u.GitHubId == profile.Id, ct);
        var isNew = user is null;

        if (isNew)
        {
            user = new User
            {
                Email = emailLower,
                DisplayName = profile.Name ?? profile.Login,
                PasswordHash = string.Empty,
                GitHubId = profile.Id,
                AvatarUrl = profile.AvatarUrl,
                Role = UserRole.Student,
                // GitHub potwierdza primary verified email (sprawdzone wyżej).
                EmailConfirmed = true,
            };
            _db.Users.Add(user);
        }
        else
        {
            user!.GitHubId ??= profile.Id;
            user.AvatarUrl ??= profile.AvatarUrl;
        }
        await _db.SaveChangesAsync(ct);

        if (isNew) await SafeSendWelcomeAsync(user!, ct);
        return Ok(await IssueResponseAsync(user!, ct));
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto, CancellationToken ct)
    {
        var emailLower = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == emailLower, ct);
        if (user is null)
        {
            // Nie ujawniamy istnienia konta — odpowiedź zawsze "ok".
            return Ok(new { ok = true });
        }

        // Token: krótki, jednorazowy. Prosta implementacja — refresh token z label "reset".
        var raw = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(24));
        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(raw)));
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = "PWRESET:" + hash,
            ExpiresAt = DateTime.UtcNow.AddHours(2),
            UserAgent = "password-reset",
        });
        await _db.SaveChangesAsync(ct);

        var resetUrl = $"{AppBaseUrl}/reset-password?code={Uri.EscapeDataString(raw)}";
        try
        {
            await _email.SendAsync(EmailTemplates.PasswordReset(user.Email, user.DisplayName, resetUrl), ct);
        }
        catch (Exception ex)
        {
            // Email failure nie ujawniamy klientowi — log + zwracamy ok (token i tak istnieje w DB).
            _logger.LogError(ex, "Failed to send password-reset email to {Email}", user.Email);
        }
        return Ok(new { ok = true });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto, CancellationToken ct)
    {
        var hash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(dto.Code)));
        var resetToken = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == "PWRESET:" + hash, ct);

        if (resetToken is null || resetToken.User is null
            || resetToken.RevokedAt is not null
            || resetToken.ExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { error = "Link wygasł lub jest nieprawidłowy." });
        }

        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        resetToken.RevokedAt = DateTime.UtcNow;
        // Wyloguj wszędzie po resecie hasła
        var others = await _db.RefreshTokens
            .Where(t => t.UserId == resetToken.UserId && t.RevokedAt == null && t.Id != resetToken.Id)
            .ToListAsync(ct);
        foreach (var t in others) t.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new { ok = true });
    }

    [HttpGet("2fa/status")]
    [Authorize]
    public async Task<IActionResult> TwoFactorStatus(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Unauthorized();
        return Ok(new { enabled = user.TwoFactorEnabled });
    }

    /// <summary>Generuje świeży secret + URI do QR. Włączenie wymaga osobnego /enable z kodem.</summary>
    [HttpPost("2fa/setup")]
    [Authorize]
    public async Task<IActionResult> TwoFactorSetup(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Unauthorized();
        if (user.TwoFactorEnabled)
        {
            return Conflict(new { error = "2FA jest już włączone — wyłącz wcześniej, by wygenerować nowy sekret." });
        }

        var secret = _totp.GenerateSecret();
        user.TotpSecret = secret;
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            secret,
            otpAuthUri = _totp.BuildOtpAuthUri(secret, user.Email),
        });
    }

    [HttpPost("2fa/enable")]
    [Authorize]
    public async Task<IActionResult> TwoFactorEnable([FromBody] TotpVerifyDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || string.IsNullOrEmpty(user.TotpSecret))
        {
            return BadRequest(new { error = "Najpierw wywołaj /2fa/setup." });
        }

        if (!_totp.Verify(user.TotpSecret, dto.Code))
        {
            return BadRequest(new { error = "Nieprawidłowy kod — sprawdź apkę autoryzacyjną i czas systemu." });
        }

        user.TwoFactorEnabled = true;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("2fa/disable")]
    [Authorize]
    public async Task<IActionResult> TwoFactorDisable([FromBody] TotpVerifyDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || !user.TwoFactorEnabled || string.IsNullOrEmpty(user.TotpSecret))
        {
            return NoContent();
        }
        if (!_totp.Verify(user.TotpSecret, dto.Code))
        {
            return BadRequest(new { error = "Nieprawidłowy kod." });
        }

        user.TwoFactorEnabled = false;
        user.TotpSecret = null;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        if (_currentUser.Id is { } userId)
        {
            await _refresh.RevokeAllForUserAsync(userId, ct);
        }
        return NoContent();
    }

    private async Task<AuthResponse> IssueResponseAsync(User user, CancellationToken ct)
    {
        var (access, expires) = _jwt.IssueAccessToken(user);
        var ua = Request.Headers.UserAgent.ToString();
        var (raw, _) = await _refresh.IssueAsync(user.Id, ua, ct);
        return new AuthResponse(access, expires, raw,
            new UserDto(user.Id, user.Email, user.DisplayName, user.Role, user.EmailConfirmed, user.TwoFactorEnabled));
    }
}
