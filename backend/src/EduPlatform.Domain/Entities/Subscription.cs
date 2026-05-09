namespace EduPlatform.Domain.Entities;

public enum SubscriptionStatus
{
    None = 0,
    Trialing = 1,
    Active = 2,
    PastDue = 3,
    Canceled = 4,
    Unpaid = 5,
    Incomplete = 6,
}

public class Subscription : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public required string StripeCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public string? StripePriceId { get; set; }

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.None;
    public DateTime? CurrentPeriodEnd { get; set; }
    public bool CancelAtPeriodEnd { get; set; }

    public bool IsActive =>
        (Status == SubscriptionStatus.Active || Status == SubscriptionStatus.Trialing)
        && (CurrentPeriodEnd is null || CurrentPeriodEnd > DateTime.UtcNow);
}
