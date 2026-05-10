using EduPlatform.Api.Billing;

namespace EduPlatform.Api.Services;

/// <summary>
/// Co godzinę sprawdza, czy nadszedł 1. dzień miesiąca o godz. (config Earnings:SettleHourUtc, default 03:00).
/// Wtedy liczy AuthorEarnings za POPRZEDNI miesiąc. Idempotentne — kalkulacja tworzy lub aktualizuje
/// rekordy per (AuthorId, PeriodStart). Faktyczny Stripe Transfer NIE jest wywoływany automatycznie —
/// admin/autor wykonuje go ręcznie przez endpoint.
/// </summary>
public class MonthlySettlementJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<MonthlySettlementJob> _logger;
    private readonly IConfiguration _config;

    public MonthlySettlementJob(IServiceProvider services, ILogger<MonthlySettlementJob> logger, IConfiguration config)
    {
        _services = services;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var hour = _config.GetValue<int?>("Earnings:SettleHourUtc") ?? 3;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                if (now.Day == 1 && now.Hour == hour)
                {
                    await TickAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MonthlySettlementJob tick failed");
            }
            await Task.Delay(TimeSpan.FromMinutes(60), stoppingToken);
        }
    }

    private async Task TickAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var prevMonthStart = thisMonthStart.AddMonths(-1);

        using var scope = _services.CreateScope();
        var calc = scope.ServiceProvider.GetRequiredService<AuthorEarningsCalculator>();
        var summary = await calc.CalculateForPeriodAsync(prevMonthStart, thisMonthStart, ct);
        _logger.LogInformation(
            "Monthly settlement: period {Start:yyyy-MM} → {Authors} autorów, {RevenueGr} gr revenue, {ShareGr} gr authors share",
            prevMonthStart, summary.AuthorsCount, summary.TotalRevenueGr, summary.TotalAuthorsShareGr);
    }
}
