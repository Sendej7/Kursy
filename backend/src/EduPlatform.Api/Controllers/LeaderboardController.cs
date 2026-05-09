using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeaderboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public LeaderboardController(AppDbContext db)
    {
        _db = db;
    }

    public record LeaderEntry(string DisplayName, int TotalXp, int CurrentStreakDays);

    /// <summary>Top 10 użytkowników wg XP. Anonimowi tylko po imieniu (DisplayName).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LeaderEntry>>> Top(CancellationToken ct)
    {
        var top = await _db.Users
            .Where(u => u.TotalXp > 0)
            .OrderByDescending(u => u.TotalXp)
            .ThenByDescending(u => u.CurrentStreakDays)
            .Take(10)
            .Select(u => new LeaderEntry(u.DisplayName, u.TotalXp, u.CurrentStreakDays))
            .ToListAsync(ct);
        return Ok(top);
    }
}
