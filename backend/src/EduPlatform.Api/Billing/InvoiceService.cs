using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EduPlatform.Api.Billing;

public class InvoiceService
{
    private readonly AppDbContext _db;
    private readonly ILogger<InvoiceService> _logger;
    private static readonly SemaphoreSlim NumberLock = new(1, 1);

    public InvoiceService(AppDbContext db, ILogger<InvoiceService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Wywoływane z webhooka invoice.paid Stripe. Idempotentne po StripeInvoiceId.
    /// Snapshot'uje BillingProfile w momencie wystawienia (faktur się nie modyfikuje).
    /// </summary>
    public async Task<Invoice?> CreateFromStripePaidAsync(
        Guid userId,
        string stripeInvoiceId,
        string? stripePaymentIntentId,
        long amountPaidGr,
        string currency,
        DateTime paidAt,
        CancellationToken ct = default)
    {
        var existing = await _db.Invoices.FirstOrDefaultAsync(i => i.StripeInvoiceId == stripeInvoiceId, ct);
        if (existing is not null) return existing;

        var user = await _db.Users
            .Include(u => u.BillingProfile)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            _logger.LogWarning("Invoice creation skipped — unknown user {UserId}", userId);
            return null;
        }

        // Stripe podaje gross — z 23% VAT wyciągamy net.
        var grossGr = (int)amountPaidGr;
        const int vatRatePct = 23;
        var netGr = (int)Math.Round(grossGr * 100m / (100m + vatRatePct));
        var vatGr = grossGr - netGr;

        var profile = user.BillingProfile;
        var buyerName = profile?.CompanyName ?? user.DisplayName;

        await NumberLock.WaitAsync(ct);
        string number;
        try
        {
            number = await NextNumberAsync(paidAt, ct);
        }
        finally
        {
            NumberLock.Release();
        }

        var invoice = new Invoice
        {
            UserId = userId,
            Number = number,
            IssuedAt = paidAt,
            PaidAt = paidAt,
            BuyerName = buyerName,
            BuyerNip = profile?.Nip,
            BuyerAddressLine = profile?.AddressLine,
            BuyerPostalCode = profile?.PostalCode,
            BuyerCity = profile?.City,
            BuyerCountry = profile?.Country ?? "PL",
            Description = "Subskrypcja Pro — Kursy.pl",
            NetAmountGr = netGr,
            VatRatePct = vatRatePct,
            VatAmountGr = vatGr,
            GrossAmountGr = grossGr,
            Currency = currency.ToUpperInvariant(),
            StripeInvoiceId = stripeInvoiceId,
            StripePaymentIntentId = stripePaymentIntentId,
        };

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync(ct);
        return invoice;
    }

    /// <summary>Numer w formacie FV/{rok}/{miesiąc}/{seq}, sekwencyjny w obrębie miesiąca.</summary>
    private async Task<string> NextNumberAsync(DateTime issuedAt, CancellationToken ct)
    {
        var year = issuedAt.Year;
        var month = issuedAt.Month;
        var prefix = $"FV/{year:0000}/{month:00}/";

        var lastInMonth = await _db.Invoices
            .Where(i => i.Number.StartsWith(prefix))
            .OrderByDescending(i => i.Number)
            .Select(i => i.Number)
            .FirstOrDefaultAsync(ct);

        var nextSeq = 1;
        if (lastInMonth is not null)
        {
            var lastSeqStr = lastInMonth[prefix.Length..];
            if (int.TryParse(lastSeqStr, out var lastSeq))
            {
                nextSeq = lastSeq + 1;
            }
        }
        return $"{prefix}{nextSeq:0000}";
    }
}
