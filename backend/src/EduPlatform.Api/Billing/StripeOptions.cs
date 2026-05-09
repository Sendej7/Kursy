namespace EduPlatform.Api.Billing;

public class StripeOptions
{
    public const string SectionName = "Stripe";

    public string SecretKey { get; set; } = string.Empty;
    public string PublishableKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>Cena (Stripe Price ID) dla planu Pro — np. price_xxx; po stronie Stripe ustawiona w PLN, recurring monthly.</summary>
    public string ProPriceId { get; set; } = string.Empty;

    public string SuccessUrl { get; set; } = "http://localhost:5173/account?status=success";
    public string CancelUrl { get; set; } = "http://localhost:5173/pricing?status=cancel";

    public bool IsConfigured =>
        !string.IsNullOrEmpty(SecretKey)
        && !string.IsNullOrEmpty(ProPriceId);
}
