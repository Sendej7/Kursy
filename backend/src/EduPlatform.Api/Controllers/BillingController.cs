using EduPlatform.Api.Billing;
using EduPlatform.Api.Services;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/billing")]
public class BillingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly StripeService _stripe;
    private readonly StripeOptions _options;
    private readonly ICurrentUser _currentUser;

    public BillingController(
        AppDbContext db,
        StripeService stripe,
        IOptions<StripeOptions> options,
        ICurrentUser currentUser)
    {
        _db = db;
        _stripe = stripe;
        _options = options.Value;
        _currentUser = currentUser;
    }

    [HttpGet("status")]
    [Authorize]
    public async Task<IActionResult> Status(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var sub = await _db.Subscriptions.FirstOrDefaultAsync(s => s.UserId == userId, ct);
        return Ok(new
        {
            configured = _options.IsConfigured,
            hasSubscription = sub is not null,
            isActive = sub?.IsActive ?? false,
            status = sub?.Status.ToString() ?? "None",
            currentPeriodEnd = sub?.CurrentPeriodEnd,
            cancelAtPeriodEnd = sub?.CancelAtPeriodEnd ?? false,
        });
    }

    [HttpPost("checkout")]
    [Authorize]
    public async Task<IActionResult> CreateCheckout(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Unauthorized();

        try
        {
            var url = await _stripe.CreateCheckoutSessionAsync(user, ct);
            return Ok(new { url });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    public record PortalDto(string ReturnUrl);

    [HttpPost("portal")]
    [Authorize]
    public async Task<IActionResult> CreatePortal([FromBody] PortalDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return Unauthorized();

        try
        {
            var url = await _stripe.CreatePortalSessionAsync(user, dto.ReturnUrl, ct);
            return Ok(new { url });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = ex.Message });
        }
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook(CancellationToken ct)
    {
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync(ct);
        var sig = Request.Headers["Stripe-Signature"].ToString();

        try
        {
            await _stripe.HandleWebhookAsync(payload, sig, ct);
            return Ok();
        }
        catch
        {
            return BadRequest();
        }
    }
}
