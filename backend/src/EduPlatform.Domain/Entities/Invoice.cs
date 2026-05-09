namespace EduPlatform.Domain.Entities;

public class Invoice : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Numer faktury w stylu PL: FV/2025/01/0001 — generowany sekwencyjnie per miesiąc.</summary>
    public required string Number { get; set; }
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }

    /// <summary>Snapshot danych nabywcy w momencie wystawienia (faktur się nie modyfikuje).</summary>
    public string BuyerName { get; set; } = string.Empty;
    public string? BuyerNip { get; set; }
    public string? BuyerAddressLine { get; set; }
    public string? BuyerPostalCode { get; set; }
    public string? BuyerCity { get; set; }
    public string BuyerCountry { get; set; } = "PL";

    public string Description { get; set; } = "Subskrypcja Pro — Kursy.pl";

    /// <summary>Wartości w groszach (int) — żeby nie tracić precyzji.</summary>
    public int NetAmountGr { get; set; }
    public int VatRatePct { get; set; } = 23; // domyślny VAT w PL
    public int VatAmountGr { get; set; }
    public int GrossAmountGr { get; set; }
    public string Currency { get; set; } = "PLN";

    public string? StripeInvoiceId { get; set; }
    public string? StripePaymentIntentId { get; set; }

    public decimal NetAmount => NetAmountGr / 100m;
    public decimal VatAmount => VatAmountGr / 100m;
    public decimal GrossAmount => GrossAmountGr / 100m;
}
