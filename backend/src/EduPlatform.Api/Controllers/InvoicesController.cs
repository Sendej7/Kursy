using EduPlatform.Api.Services;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public InvoicesController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record InvoiceListItem(
        Guid Id, string Number, DateTime IssuedAt, decimal GrossAmount, string Currency, string Description);

    public record InvoiceDetailDto(
        Guid Id, string Number, DateTime IssuedAt, DateTime? PaidAt,
        string BuyerName, string? BuyerNip, string? BuyerAddressLine,
        string? BuyerPostalCode, string? BuyerCity, string BuyerCountry,
        string Description,
        decimal NetAmount, int VatRatePct, decimal VatAmount, decimal GrossAmount, string Currency);

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var list = await _db.Invoices
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.IssuedAt)
            .Select(i => new InvoiceListItem(
                i.Id, i.Number, i.IssuedAt, i.GrossAmountGr / 100m, i.Currency, i.Description))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InvoiceDetailDto>> Get(Guid id, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var inv = await _db.Invoices.FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId, ct);
        if (inv is null) return NotFound();

        return Ok(new InvoiceDetailDto(
            inv.Id, inv.Number, inv.IssuedAt, inv.PaidAt,
            inv.BuyerName, inv.BuyerNip, inv.BuyerAddressLine,
            inv.BuyerPostalCode, inv.BuyerCity, inv.BuyerCountry,
            inv.Description,
            inv.NetAmountGr / 100m, inv.VatRatePct, inv.VatAmountGr / 100m, inv.GrossAmountGr / 100m, inv.Currency));
    }
}
