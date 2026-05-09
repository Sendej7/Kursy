using System.ComponentModel.DataAnnotations;
using EduPlatform.Api.Auth;
using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;

    public AuthController(AppDbContext db, JwtTokenService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public record RegisterDto(
        [Required, EmailAddress] string Email,
        [Required, MinLength(8)] string Password,
        [Required, MinLength(2), MaxLength(128)] string DisplayName,
        bool BecomeAuthor = false);

    public record LoginDto(
        [Required, EmailAddress] string Email,
        [Required] string Password);

    public record AuthResponse(string Token, DateTime ExpiresAt, UserDto User);
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

        var (token, expires) = _jwt.IssueAccessToken(user);
        return Ok(new AuthResponse(token, expires, new UserDto(user.Id, user.Email, user.DisplayName, user.Role)));
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

        var (token, expires) = _jwt.IssueAccessToken(user);
        return Ok(new AuthResponse(token, expires, new UserDto(user.Id, user.Email, user.DisplayName, user.Role)));
    }
}
