using System.Security.Cryptography;
using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/admin/orgs")]
[Authorize(Roles = "Admin")]
public class OrganizationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public OrganizationsController(AppDbContext db)
    {
        _db = db;
    }

    public record CreateOrgDto(string Name, string? Nip, string? ContactEmail, Guid? OwnerUserId);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var list = await _db.Organizations
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id, o.Name, o.Nip, o.ContactEmail, o.OwnerUserId,
                ownerEmail = o.OwnerUser != null ? o.OwnerUser.Email : null,
                codes = o.Codes.Count,
                redemptions = o.Redemptions.Count,
            })
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrgDto dto, CancellationToken ct)
    {
        var org = new Organization
        {
            Name = dto.Name.Trim(),
            Nip = string.IsNullOrWhiteSpace(dto.Nip) ? null : dto.Nip.Trim(),
            ContactEmail = string.IsNullOrWhiteSpace(dto.ContactEmail) ? null : dto.ContactEmail.Trim().ToLowerInvariant(),
            OwnerUserId = dto.OwnerUserId,
        };
        _db.Organizations.Add(org);
        await _db.SaveChangesAsync(ct);
        return Ok(new { org.Id });
    }

    public record CreateCodeDto(int MaxSeats, int GrantsMonths = 12, DateTime? ExpiresAt = null);

    [HttpPost("{orgId:guid}/codes")]
    public async Task<IActionResult> CreateCode(Guid orgId, [FromBody] CreateCodeDto dto, CancellationToken ct)
    {
        var org = await _db.Organizations.FirstOrDefaultAsync(o => o.Id == orgId, ct);
        if (org is null) return NotFound();

        var code = new OrganizationCode
        {
            OrganizationId = orgId,
            Code = GenerateCode(),
            MaxSeats = Math.Max(1, dto.MaxSeats),
            GrantsMonths = Math.Clamp(dto.GrantsMonths, 1, 36),
            ExpiresAt = dto.ExpiresAt,
        };
        _db.OrganizationCodes.Add(code);
        await _db.SaveChangesAsync(ct);
        return Ok(new { code.Id, code.Code, code.MaxSeats, code.GrantsMonths, code.ExpiresAt });
    }

    [HttpGet("{orgId:guid}/codes")]
    public async Task<IActionResult> ListCodes(Guid orgId, CancellationToken ct)
    {
        var list = await _db.OrganizationCodes
            .Where(c => c.OrganizationId == orgId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id, c.Code, c.MaxSeats, c.RedeemedCount, c.GrantsMonths,
                c.ExpiresAt, c.RevokedAt,
                isUsable = c.RevokedAt == null
                    && (c.ExpiresAt == null || c.ExpiresAt > DateTime.UtcNow)
                    && c.RedeemedCount < c.MaxSeats,
            })
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost("{orgId:guid}/codes/{codeId:guid}/revoke")]
    public async Task<IActionResult> RevokeCode(Guid orgId, Guid codeId, CancellationToken ct)
    {
        var code = await _db.OrganizationCodes.FirstOrDefaultAsync(c => c.Id == codeId && c.OrganizationId == orgId, ct);
        if (code is null) return NotFound();
        code.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static string GenerateCode()
    {
        var bytes = new byte[8];
        RandomNumberGenerator.Fill(bytes);
        return "EDU-" + Convert.ToHexString(bytes); // np. EDU-3F1A...
    }
}

[ApiController]
[Route("api/me/redeem")]
[Authorize]
public class RedeemController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public RedeemController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record RedeemDto(string Code);

    [HttpPost]
    public async Task<IActionResult> Redeem([FromBody] RedeemDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var code = await _db.OrganizationCodes
            .Include(c => c.Organization)
            .FirstOrDefaultAsync(c => c.Code == dto.Code.Trim(), ct);

        if (code is null) return NotFound(new { error = "Kod nie istnieje." });
        if (code.RevokedAt is not null) return BadRequest(new { error = "Kod został unieważniony." });
        if (code.ExpiresAt is not null && code.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { error = "Kod wygasł." });
        if (code.RedeemedCount >= code.MaxSeats)
            return BadRequest(new { error = "Limit miejsc na ten kod wyczerpany." });

        var alreadyRedeemed = await _db.OrganizationCodeRedemptions
            .AnyAsync(r => r.OrganizationCodeId == code.Id && r.UserId == userId, ct);
        if (alreadyRedeemed)
        {
            return Conflict(new { error = "Ten kod już został wykorzystany przez Twoje konto." });
        }

        var accessUntil = DateTime.UtcNow.AddMonths(code.GrantsMonths);

        // Tworzymy lub przedłużamy lokalną subskrypcję bez Stripe (status Active, czas określony).
        var sub = await _db.Subscriptions.FirstOrDefaultAsync(s => s.UserId == userId, ct);
        if (sub is null)
        {
            sub = new Subscription
            {
                UserId = userId,
                StripeCustomerId = $"org-{code.OrganizationId:N}",
                Status = SubscriptionStatus.Active,
                CurrentPeriodEnd = accessUntil,
            };
            _db.Subscriptions.Add(sub);
        }
        else
        {
            // Przedłuż jeśli wprowadzony kod daje dłuższy dostęp niż obecny.
            sub.Status = SubscriptionStatus.Active;
            if (sub.CurrentPeriodEnd is null || accessUntil > sub.CurrentPeriodEnd)
            {
                sub.CurrentPeriodEnd = accessUntil;
            }
        }

        code.RedeemedCount++;
        _db.OrganizationCodeRedemptions.Add(new OrganizationCodeRedemption
        {
            OrganizationCodeId = code.Id,
            OrganizationId = code.OrganizationId,
            UserId = userId,
            AccessUntil = accessUntil,
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new
        {
            organizationName = code.Organization?.Name,
            accessUntil,
            grantsMonths = code.GrantsMonths,
        });
    }
}
