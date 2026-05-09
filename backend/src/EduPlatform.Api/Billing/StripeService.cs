using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace EduPlatform.Api.Billing;

public class StripeService
{
    private readonly AppDbContext _db;
    private readonly StripeOptions _options;
    private readonly ILogger<StripeService> _logger;
    private readonly InvoiceService _invoices;
    private readonly EduPlatform.Api.Services.NotificationService _notifications;

    public StripeService(AppDbContext db, IOptions<StripeOptions> options, ILogger<StripeService> logger, InvoiceService invoices, EduPlatform.Api.Services.NotificationService notifications)
    {
        _db = db;
        _options = options.Value;
        _logger = logger;
        _invoices = invoices;
        _notifications = notifications;
        if (!string.IsNullOrEmpty(_options.SecretKey))
        {
            StripeConfiguration.ApiKey = _options.SecretKey;
        }
    }

    /// <summary>
    /// Tworzy Stripe Checkout Session dla planu Pro. Akceptuje BLIK i Przelewy24
    /// dla użytkowników z PL — Stripe automatycznie pokazuje dostępne metody.
    /// </summary>
    public async Task<string> CreateCheckoutSessionAsync(User user, CancellationToken ct = default)
    {
        if (!_options.IsConfigured)
        {
            throw new InvalidOperationException("Stripe is not configured (set SecretKey + ProPriceId).");
        }

        var subscription = await GetOrCreateLocalSubscriptionAsync(user, ct);

        var sessionOpts = new SessionCreateOptions
        {
            Mode = "subscription",
            Customer = subscription.StripeCustomerId,
            ClientReferenceId = user.Id.ToString(),
            LineItems = new List<SessionLineItemOptions>
            {
                new() { Price = _options.ProPriceId, Quantity = 1 },
            },
            // Stripe sam doda BLIK / Przelewy24 / karty bo z UI-em obsługi PL.
            PaymentMethodTypes = new List<string> { "card", "blik", "p24" },
            SuccessUrl = _options.SuccessUrl,
            CancelUrl = _options.CancelUrl,
            Locale = "pl",
            AllowPromotionCodes = true,
        };

        var service = new SessionService();
        var session = await service.CreateAsync(sessionOpts, cancellationToken: ct);
        return session.Url;
    }

    public async Task<string> CreatePortalSessionAsync(User user, string returnUrl, CancellationToken ct = default)
    {
        if (!_options.IsConfigured) throw new InvalidOperationException("Stripe not configured.");
        var subscription = await GetOrCreateLocalSubscriptionAsync(user, ct);
        var portalService = new Stripe.BillingPortal.SessionService();
        var session = await portalService.CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = subscription.StripeCustomerId,
            ReturnUrl = returnUrl,
        }, cancellationToken: ct);
        return session.Url;
    }

    /// <summary>Obsługa webhooków Stripe (subscription created / updated / deleted, invoice paid).</summary>
    public async Task HandleWebhookAsync(string payload, string signatureHeader, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_options.WebhookSecret))
        {
            _logger.LogWarning("Stripe webhook secret not configured.");
            return;
        }

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(payload, signatureHeader, _options.WebhookSecret);
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Invalid Stripe webhook signature.");
            throw;
        }

        switch (stripeEvent.Type)
        {
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
                if (stripeEvent.Data.Object is Stripe.Subscription stripeSub)
                {
                    await UpsertSubscriptionAsync(stripeSub, ct);
                }
                break;

            case "invoice.paid":
            case "invoice.payment_succeeded":
                if (stripeEvent.Data.Object is Stripe.Invoice paidInvoice)
                {
                    await GenerateInvoiceFromStripeAsync(paidInvoice, ct);
                }
                break;

            case "invoice.payment_failed":
                if (stripeEvent.Data.Object is Stripe.Invoice failedInvoice)
                {
                    await NotifyPaymentFailedAsync(failedInvoice, ct);
                }
                break;

            case "charge.refunded":
                if (stripeEvent.Data.Object is Stripe.Charge refundedCharge)
                {
                    await NotifyRefundedAsync(refundedCharge, ct);
                }
                break;

            case "charge.dispute.created":
                if (stripeEvent.Data.Object is Stripe.Dispute dispute)
                {
                    await NotifyDisputeAsync(dispute, ct);
                }
                break;

            default:
                _logger.LogInformation("Unhandled Stripe event: {Type}", stripeEvent.Type);
                break;
        }
    }

    private async Task NotifyPaymentFailedAsync(Stripe.Invoice invoice, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(invoice.CustomerId)) return;
        var local = await _db.Subscriptions.FirstOrDefaultAsync(s => s.StripeCustomerId == invoice.CustomerId, ct);
        if (local is null) return;

        local.Status = Domain.Entities.SubscriptionStatus.PastDue;
        _notifications.Notify(
            local.UserId,
            type: "billing.payment_failed",
            title: "Płatność nie powiodła się",
            body: "Nie udało się pobrać opłaty za subskrypcję. Zaktualizuj metodę płatności w panelu konta — Stripe spróbuje jeszcze raz.",
            url: "/account");
        await _db.SaveChangesAsync(ct);
    }

    private async Task NotifyRefundedAsync(Stripe.Charge charge, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(charge.CustomerId)) return;
        var local = await _db.Subscriptions.FirstOrDefaultAsync(s => s.StripeCustomerId == charge.CustomerId, ct);
        if (local is null) return;

        var amountZl = charge.AmountRefunded / 100m;
        _notifications.Notify(
            local.UserId,
            type: "billing.refunded",
            title: "Zwrot płatności",
            body: $"Zwrot {amountZl:F2} {charge.Currency?.ToUpperInvariant()} został zaksięgowany — środki wrócą na Twoją kartę w ciągu 5-10 dni.",
            url: "/account");
        await _db.SaveChangesAsync(ct);
    }

    private async Task NotifyDisputeAsync(Stripe.Dispute dispute, CancellationToken ct)
    {
        // Dispute idzie do adminów (nie do customera — z perspektywy customera wszystko OK).
        var adminIds = await _db.Users
            .Where(u => u.Role == Domain.Enums.UserRole.Admin)
            .Select(u => u.Id)
            .ToListAsync(ct);

        var amountZl = dispute.Amount / 100m;
        foreach (var adminId in adminIds)
        {
            _notifications.Notify(
                adminId,
                type: "billing.dispute",
                title: $"⚠️ Stripe dispute: {amountZl:F2} {dispute.Currency?.ToUpperInvariant()}",
                body: $"Powód: {dispute.Reason ?? "(brak)"}. Sprawdź Stripe Dashboard → Disputes i odpowiedz w terminie (zwykle 7-21 dni).",
                url: "https://dashboard.stripe.com/disputes/" + dispute.Id);
        }
        await _db.SaveChangesAsync(ct);
    }

    private async Task GenerateInvoiceFromStripeAsync(Stripe.Invoice paid, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(paid.CustomerId)) return;
        var local = await _db.Subscriptions.FirstOrDefaultAsync(s => s.StripeCustomerId == paid.CustomerId, ct);
        if (local is null)
        {
            _logger.LogWarning("invoice.paid for unknown customer {CustomerId}", paid.CustomerId);
            return;
        }

        var paidAt = paid.StatusTransitions?.PaidAt ?? DateTime.UtcNow;
        await _invoices.CreateFromStripePaidAsync(
            userId: local.UserId,
            stripeInvoiceId: paid.Id,
            stripePaymentIntentId: null,
            amountPaidGr: paid.AmountPaid,
            currency: paid.Currency ?? "PLN",
            paidAt: paidAt,
            ct);
    }

    private async Task<Domain.Entities.Subscription> GetOrCreateLocalSubscriptionAsync(User user, CancellationToken ct)
    {
        var existing = await _db.Subscriptions.FirstOrDefaultAsync(s => s.UserId == user.Id, ct);
        if (existing is not null) return existing;

        var customerService = new CustomerService();
        var customer = await customerService.CreateAsync(new CustomerCreateOptions
        {
            Email = user.Email,
            Name = user.DisplayName,
            Metadata = new Dictionary<string, string> { ["user_id"] = user.Id.ToString() },
        }, cancellationToken: ct);

        var sub = new Domain.Entities.Subscription
        {
            UserId = user.Id,
            StripeCustomerId = customer.Id,
            Status = Domain.Entities.SubscriptionStatus.None,
        };
        _db.Subscriptions.Add(sub);
        await _db.SaveChangesAsync(ct);
        return sub;
    }

    private async Task UpsertSubscriptionAsync(Stripe.Subscription stripeSub, CancellationToken ct)
    {
        var local = await _db.Subscriptions.FirstOrDefaultAsync(s => s.StripeCustomerId == stripeSub.CustomerId, ct);
        if (local is null)
        {
            _logger.LogWarning("Stripe subscription event for unknown customer {CustomerId}", stripeSub.CustomerId);
            return;
        }

        local.StripeSubscriptionId = stripeSub.Id;
        local.StripePriceId = stripeSub.Items?.Data?.FirstOrDefault()?.Price?.Id;
        local.Status = MapStatus(stripeSub.Status);
        local.CurrentPeriodEnd = stripeSub.CurrentPeriodEnd;
        local.CancelAtPeriodEnd = stripeSub.CancelAtPeriodEnd;

        await _db.SaveChangesAsync(ct);
    }

    private static Domain.Entities.SubscriptionStatus MapStatus(string stripeStatus) => stripeStatus switch
    {
        "trialing" => Domain.Entities.SubscriptionStatus.Trialing,
        "active" => Domain.Entities.SubscriptionStatus.Active,
        "past_due" => Domain.Entities.SubscriptionStatus.PastDue,
        "canceled" => Domain.Entities.SubscriptionStatus.Canceled,
        "unpaid" => Domain.Entities.SubscriptionStatus.Unpaid,
        "incomplete" => Domain.Entities.SubscriptionStatus.Incomplete,
        _ => Domain.Entities.SubscriptionStatus.None,
    };
}
