using EduPlatform.Api.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace EduPlatform.Api.Controllers;

/// <summary>
/// Cienki proxy do Stripe — nie trzymamy kuponów we własnej bazie.
/// Source of truth = Stripe dashboard. My tylko ułatwiamy szybkie utworzenie/listing/dezaktywację.
/// </summary>
[ApiController]
[Route("api/admin/promo-codes")]
[Authorize(Roles = "Admin")]
public class PromoCodesController : ControllerBase
{
    private readonly StripeOptions _options;
    private readonly ILogger<PromoCodesController> _logger;

    public PromoCodesController(IOptions<StripeOptions> options, ILogger<PromoCodesController> logger)
    {
        _options = options.Value;
        _logger = logger;
        if (!string.IsNullOrEmpty(_options.SecretKey))
        {
            Stripe.StripeConfiguration.ApiKey = _options.SecretKey;
        }
    }

    public record PromoCodeDto(
        string Id, string Code, string CouponId, int? PercentOff, long? AmountOffGr,
        bool Active, int? MaxRedemptions, long TimesRedeemed, DateTime? ExpiresAt);

    public record CreateDto(
        string Code,
        int? PercentOff,
        int? AmountOffPln,
        int? MaxRedemptions,
        DateTime? ExpiresAt,
        string? Description);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!_options.IsConfigured) return StatusCode(503, new { error = "Stripe nieskonfigurowany." });

        var service = new Stripe.PromotionCodeService();
        var list = await service.ListAsync(new Stripe.PromotionCodeListOptions
        {
            Limit = 100,
            Expand = new List<string> { "data.coupon" },
        }, cancellationToken: ct);

        var dtos = list.Data.Select(p => new PromoCodeDto(
            p.Id,
            p.Code,
            p.Coupon.Id,
            p.Coupon.PercentOff is null ? null : (int)p.Coupon.PercentOff,
            p.Coupon.AmountOff,
            p.Active,
            p.MaxRedemptions is null ? null : (int)p.MaxRedemptions,
            p.TimesRedeemed,
            p.ExpiresAt));
        return Ok(dtos);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDto dto, CancellationToken ct)
    {
        if (!_options.IsConfigured) return StatusCode(503, new { error = "Stripe nieskonfigurowany." });
        if (dto.PercentOff is null && dto.AmountOffPln is null)
        {
            return BadRequest(new { error = "Podaj PercentOff (1-100) lub AmountOffPln." });
        }
        if (dto.PercentOff is not null and (< 1 or > 100))
        {
            return BadRequest(new { error = "PercentOff musi być w zakresie 1..100." });
        }
        var code = dto.Code?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(code) || code.Length is < 3 or > 32)
        {
            return BadRequest(new { error = "Code musi mieć 3..32 znaków." });
        }

        try
        {
            // Stripe wymaga osobno Coupon (rabat) i PromotionCode (alias-string do wpisania w UI Checkout).
            var coupon = await new Stripe.CouponService().CreateAsync(new Stripe.CouponCreateOptions
            {
                Duration = "once",
                PercentOff = dto.PercentOff,
                AmountOff = dto.AmountOffPln is null ? null : dto.AmountOffPln * 100,
                Currency = dto.AmountOffPln is null ? null : "PLN",
                Name = dto.Description ?? code,
                MaxRedemptions = dto.MaxRedemptions,
                RedeemBy = dto.ExpiresAt,
            }, cancellationToken: ct);

            var promo = await new Stripe.PromotionCodeService().CreateAsync(new Stripe.PromotionCodeCreateOptions
            {
                Coupon = coupon.Id,
                Code = code,
                MaxRedemptions = dto.MaxRedemptions,
                ExpiresAt = dto.ExpiresAt,
            }, cancellationToken: ct);

            return Ok(new { promo.Id, promo.Code });
        }
        catch (Stripe.StripeException ex)
        {
            _logger.LogWarning(ex, "Stripe rejected promo code create");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(string id, CancellationToken ct)
    {
        if (!_options.IsConfigured) return StatusCode(503, new { error = "Stripe nieskonfigurowany." });
        try
        {
            await new Stripe.PromotionCodeService().UpdateAsync(id,
                new Stripe.PromotionCodeUpdateOptions { Active = false }, cancellationToken: ct);
            return NoContent();
        }
        catch (Stripe.StripeException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
