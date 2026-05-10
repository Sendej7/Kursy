using EduPlatform.Api.Email;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Services;

/// <summary>
/// Co godzinę sprawdza, czy nadszedł czas wysyłki dziennego przypomnienia (default 18:00 UTC).
/// Wysyła email do użytkowników, którzy mają DailyGoalLessons > 0, opt-in i nie spełnili dziennego
/// celu. Anti-double-send przez User.DailyGoalReminderLastSent — nigdy w ciągu tej samej doby UTC.
/// </summary>
public class DailyGoalReminderJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DailyGoalReminderJob> _logger;
    private readonly IConfiguration _config;

    public DailyGoalReminderJob(IServiceProvider services, ILogger<DailyGoalReminderJob> logger, IConfiguration config)
    {
        _services = services;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var hour = _config.GetValue<int?>("Reminders:DailyGoalHourUtc") ?? 18;

        // Loop co 60 min, sprawdza czy aktualna godzina UTC == hour. Niezależne od server timezone.
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (DateTime.UtcNow.Hour == hour)
                {
                    await TickAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DailyGoalReminderJob tick failed");
            }
            await Task.Delay(TimeSpan.FromMinutes(60), stoppingToken);
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var appUrl = (_config.GetValue<string>("App:BaseUrl") ?? "http://localhost:5173").TrimEnd('/');

        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        // Kandydaci: opt-in + cel > 0 + nie spełnili dziennego (lub fresh) + nie wysłaliśmy dziś
        var candidates = await db.Users
            .Where(u => !u.IsDeleted
                && u.DailyGoalLessons > 0
                && u.DailyGoalReminderEnabled
                && (u.DailyGoalReminderLastSent == null || u.DailyGoalReminderLastSent < today))
            .Select(u => new { u.Id, u.Email, u.DisplayName, u.DailyGoalLessons })
            .ToListAsync(ct);

        var sent = 0;
        foreach (var u in candidates)
        {
            var doneToday = await db.LessonProgresses
                .CountAsync(p => p.UserId == u.Id
                    && p.Completed
                    && p.CompletedAt != null
                    && p.CompletedAt >= today
                    && p.CompletedAt < tomorrow, ct);

            if (doneToday >= u.DailyGoalLessons) continue; // już osiągnął — nie spamujemy

            try
            {
                await email.SendAsync(EmailTemplates.DailyGoalReminder(
                    u.Email, u.DisplayName, u.DailyGoalLessons, doneToday, appUrl), ct);

                await db.Users
                    .Where(x => x.Id == u.Id)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.DailyGoalReminderLastSent, DateTime.UtcNow), ct);
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Daily reminder send failed for {UserId}", u.Id);
            }
        }

        _logger.LogInformation("Daily goal reminders: {Sent}/{Total} wysłanych", sent, candidates.Count);
    }
}
