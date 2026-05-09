using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/me/achievements")]
[Authorize]
public class AchievementsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public AchievementsController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record AchievementDto(string Type, string Name, string Description, string Icon, DateTime? EarnedAt, bool Earned);

    /// <summary>
    /// Zwraca WSZYSTKIE odznaki (zarówno zdobyte z EarnedAt, jak i nieodblokowane z Earned=false)
    /// — żeby UI mógł pokazać pasek postępu.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var earned = await _db.UserAchievements
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Type, a => a.EarnedAt, ct);

        var all = Enum.GetValues<AchievementType>()
            .Select(t =>
            {
                var meta = AchievementMeta.For(t);
                var has = earned.TryGetValue(t, out var when);
                return new AchievementDto(t.ToString(), meta.Name, meta.Description, meta.Icon,
                    has ? when : null, has);
            })
            .ToList();
        return Ok(all);
    }
}
