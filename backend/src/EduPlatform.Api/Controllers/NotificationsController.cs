using EduPlatform.Api.Services;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/me/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public NotificationsController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record NotificationDto(
        Guid Id, string Type, string Title, string? Body, string? Url,
        DateTime CreatedAt, DateTime? ReadAt);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int take = 20, CancellationToken ct = default)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        take = Math.Clamp(take, 1, 100);

        var list = await _db.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(take)
            .Select(n => new NotificationDto(n.Id, n.Type, n.Title, n.Body, n.Url, n.CreatedAt, n.ReadAt))
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var count = await _db.Notifications
            .CountAsync(n => n.UserId == userId && n.ReadAt == null, ct);
        return Ok(new { count });
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
        if (n is null) return NotFound();
        if (n.ReadAt is null)
        {
            n.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var unread = await _db.Notifications
            .Where(n => n.UserId == userId && n.ReadAt == null)
            .ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var n in unread) n.ReadAt = now;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
