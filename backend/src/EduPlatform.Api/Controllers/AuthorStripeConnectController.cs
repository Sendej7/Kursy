using EduPlatform.Api.Billing;
using EduPlatform.Api.Services;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Stripe;

namespace EduPlatform.Api.Controllers;

/// <summary>
/// Stripe Connect Express dla autorów — onboarding + status + login link do ich dashboardu.
/// Nie obsługujemy transferów w tej iteracji; to wymaga monthly settlement job + revenue model.
/// </summary>
[ApiController]
[Route("api/author/stripe-connect")]
[Authorize(Roles = "Author,Admin")]
public class AuthorStripeConnectController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StripeOptions _options;
    private readonly ICurrentUser _currentUser;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthorStripeConnectController> _logger;
    private readonly EduPlatform.Api.Billing.AuthorEarningsCalculator _calc;

    public AuthorStripeConnectController(
        AppDbContext db,
        IOptions<StripeOptions> options,
        ICurrentUser currentUser,
        IConfiguration config,
        ILogger<AuthorStripeConnectController> logger,
        EduPlatform.Api.Billing.AuthorEarningsCalculator calc)
    {
        _db = db;
        _options = options.Value;
        _currentUser = currentUser;
        _config = config;
        _logger = logger;
        _calc = calc;
        if (!string.IsNullOrEmpty(_options.SecretKey))
        {
            StripeConfiguration.ApiKey = _options.SecretKey;
        }
    }

    private string AppBaseUrl =>
        (_config.GetValue<string>("App:BaseUrl") ?? "http://localhost:5173").TrimEnd('/');

    public record StatusDto(bool Configured, bool Connected, bool PayoutsEnabled, bool DetailsSubmitted, string[]? RequirementsDue);

    /// <summary>Stan konta autor-Stripe (lazy-fetch z API gdy connected).</summary>
    [HttpGet("status")]
    public async Task<IActionResult> Status(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        if (!_options.IsConfigured)
        {
            return Ok(new StatusDto(false, false, false, false, null));
        }

        var user = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => new { u.StripeAccountId })
            .FirstOrDefaultAsync(ct);
        if (user is null) return Unauthorized();
        if (string.IsNullOrEmpty(user.StripeAccountId))
        {
            return Ok(new StatusDto(true, false, false, false, null));
        }

        try
        {
            var acct = await new AccountService().GetAsync(user.StripeAccountId, cancellationToken: ct);
            return Ok(new StatusDto(
                Configured: true,
                Connected: true,
                PayoutsEnabled: acct.PayoutsEnabled,
                DetailsSubmitted: acct.DetailsSubmitted,
                RequirementsDue: acct.Requirements?.CurrentlyDue?.ToArray()));
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Stripe account fetch failed");
            return Ok(new StatusDto(true, false, false, false, null));
        }
    }

    /// <summary>Tworzy konto (jeśli brak) i zwraca AccountLink do onboarding'u (URL do redirect'a).</summary>
    [HttpPost("onboard")]
    public async Task<IActionResult> Onboard(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        if (!_options.IsConfigured) return StatusCode(503, new { error = "Stripe nieskonfigurowany." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Unauthorized();

        try
        {
            if (string.IsNullOrEmpty(user.StripeAccountId))
            {
                var account = await new AccountService().CreateAsync(new AccountCreateOptions
                {
                    Type = "express",
                    Email = user.Email,
                    Country = "PL",
                    DefaultCurrency = "pln",
                    BusinessType = "individual",
                    Capabilities = new AccountCapabilitiesOptions
                    {
                        Transfers = new AccountCapabilitiesTransfersOptions { Requested = true },
                    },
                    Metadata = new Dictionary<string, string> { ["user_id"] = userId.ToString() },
                }, cancellationToken: ct);
                user.StripeAccountId = account.Id;
                await _db.SaveChangesAsync(ct);
            }

            var link = await new AccountLinkService().CreateAsync(new AccountLinkCreateOptions
            {
                Account = user.StripeAccountId,
                RefreshUrl = $"{AppBaseUrl}/author/payouts?refresh=1",
                ReturnUrl = $"{AppBaseUrl}/author/payouts?return=1",
                Type = "account_onboarding",
            }, cancellationToken: ct);

            return Ok(new { url = link.Url });
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Stripe onboarding failed");
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Login link do Express dashboard'u — autor zarządza wypłatami w UI Stripe.</summary>
    [HttpPost("dashboard-link")]
    public async Task<IActionResult> DashboardLink(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        if (!_options.IsConfigured) return StatusCode(503, new { error = "Stripe nieskonfigurowany." });

        var user = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => new { u.StripeAccountId })
            .FirstOrDefaultAsync(ct);
        if (user is null || string.IsNullOrEmpty(user.StripeAccountId))
        {
            return BadRequest(new { error = "Najpierw onboard'uj konto Stripe." });
        }

        try
        {
            var link = await new AccountLoginLinkService().CreateAsync(user.StripeAccountId, cancellationToken: ct);
            return Ok(new { url = link.Url });
        }
        catch (StripeException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    public record EarningDto(
        Guid Id, DateTime PeriodStart, DateTime PeriodEnd,
        long AuthorShareGr, decimal AuthorSharePln,
        int ActiveStudents, int TotalActive,
        bool Transferred, DateTime? TransferredAt, string? StripeTransferId);

    /// <summary>Lista zarobków autora (od najnowszego). Zwraca grosze i PLN, żeby UI nie liczyło.</summary>
    [HttpGet("earnings")]
    public async Task<IActionResult> Earnings(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var rows = await _db.AuthorEarnings
            .Where(e => e.AuthorId == userId)
            .OrderByDescending(e => e.PeriodStart)
            .Select(e => new EarningDto(
                e.Id, e.PeriodStart, e.PeriodEnd,
                e.AuthorShareGr, e.AuthorShareGr / 100m,
                e.ActiveStudentsOnAuthorCourses, e.TotalActiveStudents,
                e.StripeTransferId != null, e.TransferredAt, e.StripeTransferId))
            .ToListAsync(ct);
        return Ok(rows);
    }

    /// <summary>Wykonuje Stripe Transfer dla wskazanego zarobku — autor musi mieć aktywne Connect.</summary>
    [HttpPost("earnings/{id:guid}/transfer")]
    public async Task<IActionResult> TransferEarning(Guid id, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        if (!_options.IsConfigured) return StatusCode(503, new { error = "Stripe nieskonfigurowany." });

        var earning = await _db.AuthorEarnings
            .Include(e => e.Author)
            .FirstOrDefaultAsync(e => e.Id == id && e.AuthorId == userId, ct);
        if (earning is null) return NotFound();
        if (earning.StripeTransferId is not null)
        {
            return BadRequest(new { error = "Ten zarobek jest już wytransferowany." });
        }
        if (string.IsNullOrEmpty(earning.Author?.StripeAccountId))
        {
            return BadRequest(new { error = "Brak konta Stripe Connect — najpierw onboard'uj." });
        }
        if (earning.AuthorShareGr <= 0)
        {
            return BadRequest(new { error = "Kwota 0 zł — nic do transferu." });
        }

        try
        {
            var transfer = await new TransferService().CreateAsync(new TransferCreateOptions
            {
                Amount = earning.AuthorShareGr,
                Currency = "pln",
                Destination = earning.Author.StripeAccountId,
                Description = $"Zarobki Kursy.pl za {earning.PeriodStart:yyyy-MM}",
                Metadata = new Dictionary<string, string>
                {
                    ["earning_id"] = earning.Id.ToString(),
                    ["author_id"] = earning.AuthorId.ToString(),
                    ["period"] = earning.PeriodStart.ToString("yyyy-MM"),
                },
            }, cancellationToken: ct);
            earning.StripeTransferId = transfer.Id;
            earning.TransferredAt = DateTime.UtcNow;
            earning.TransferError = null;
            await _db.SaveChangesAsync(ct);
            return Ok(new { earning.StripeTransferId, earning.TransferredAt });
        }
        catch (StripeException ex)
        {
            earning.TransferError = ex.Message;
            await _db.SaveChangesAsync(ct);
            _logger.LogWarning(ex, "Stripe transfer failed for earning {Id}", id);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Admin-only: wymuś przeliczenie earnings dla wskazanego okresu (np. recalc po dorzuceniu kursu).</summary>
    [HttpPost("earnings/recalc")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Recalc([FromQuery] DateTime periodStart, [FromQuery] DateTime periodEnd, CancellationToken ct)
    {
        var summary = await _calc.CalculateForPeriodAsync(periodStart, periodEnd, ct);
        return Ok(summary);
    }
}
