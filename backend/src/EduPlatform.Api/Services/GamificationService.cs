using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Services;

public class GamificationService
{
    private const int XpPerLesson = 10;

    private readonly AppDbContext _db;

    public GamificationService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Wywoływane przy POST /lessons/{id}/complete (tylko gdy lekcja faktycznie
    /// została ukończona po raz pierwszy). Aktualizuje XP, streak i LastActiveDay.
    /// </summary>
    public async Task<GamificationDelta> RecordLessonCompletionAsync(Guid userId, bool firstTime, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return new GamificationDelta(false, 0, 0, 0);

        var today = DateTime.UtcNow.Date;
        var xpGained = firstTime ? XpPerLesson : 0;

        var streakBumped = false;
        if (user.LastActiveDay is null || user.LastActiveDay.Value.Date < today)
        {
            // Nowy dzień aktywności
            if (user.LastActiveDay is { } last && last.Date == today.AddDays(-1))
            {
                user.CurrentStreakDays += 1;
                streakBumped = true;
            }
            else
            {
                user.CurrentStreakDays = 1;
                streakBumped = true;
            }
            user.LastActiveDay = today;
            if (user.CurrentStreakDays > user.LongestStreakDays)
            {
                user.LongestStreakDays = user.CurrentStreakDays;
            }
        }

        user.TotalXp += xpGained;
        await _db.SaveChangesAsync(ct);

        return new GamificationDelta(streakBumped, xpGained, user.CurrentStreakDays, user.TotalXp);
    }
}

public record GamificationDelta(bool StreakBumped, int XpGained, int CurrentStreak, int TotalXp);
