using System.ComponentModel.DataAnnotations;
using EduPlatform.Api.Auth;
using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

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

    public AuthController(AppDbContext db, JwtTokenService jwt, RefreshTokenService refresh, ICurrentUser currentUser)
    {
        _db = db;
        _jwt = jwt;
        _refresh = refresh;
        _currentUser = currentUser;
    }

    public record RegisterDto(
        [Required, EmailAddress] string Email,
        [Required, MinLength(8)] string Password,
        [Required, MinLength(2), MaxLength(128)] string DisplayName,
        bool BecomeAuthor = false);

    public record LoginDto(
        [Required, EmailAddress] string Email,
        [Required] string Password);

    public record RefreshDto([Required] string RefreshToken);

    public record AuthResponse(string Token, DateTime ExpiresAt, string RefreshToken, UserDto User);
    public record UserDto(Guid Id, string Email, string DisplayName, UserRole Role);

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

        return Ok(await IssueResponseAsync(user, ct));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginDto dto, CancellationToken ct)
    {
        var emailLower = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == emailLower, ct);
        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { error = "Niepoprawny email lub hasło." });
        }

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
            new UserDto(token.User.Id, token.User.Email, token.User.DisplayName, token.User.Role)));
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
            new UserDto(user.Id, user.Email, user.DisplayName, user.Role));
    }
}
