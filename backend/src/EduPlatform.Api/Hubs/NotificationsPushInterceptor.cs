using EduPlatform.Domain.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace EduPlatform.Api.Hubs;

/// <summary>
/// Po SaveChanges wykrywa nowe wiersze Notification i pcha event 'notification' do grupy
/// user-{userId} przez SignalR. Działa transparentnie — caller wciąż używa NotificationService.Notify
/// + zwykłego SaveChangesAsync, bez ręcznego push'a.
/// </summary>
public class NotificationsPushInterceptor : SaveChangesInterceptor
{
    private readonly IHubContext<NotificationsHub> _hub;
    private readonly ILogger<NotificationsPushInterceptor> _logger;

    public NotificationsPushInterceptor(IHubContext<NotificationsHub> hub, ILogger<NotificationsPushInterceptor> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    private readonly record struct PendingPush(Guid UserId, Guid Id, string Type, string Title, string? Body, string? Url, DateTime CreatedAt);

    // Per-context bufor — zachowujemy listę nowych Notification z SavingChanges aż do SavedChanges,
    // bo po Save'ie entries są w stanie Unchanged i nie da się ich już odróżnić od starych.
    private readonly System.Runtime.CompilerServices.ConditionalWeakTable<DbContext, List<PendingPush>> _pending = new();

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
        {
            var pushes = eventData.Context.ChangeTracker.Entries<Notification>()
                .Where(e => e.State == EntityState.Added)
                .Select(e => new PendingPush(
                    e.Entity.UserId,
                    e.Entity.Id,
                    e.Entity.Type,
                    e.Entity.Title,
                    e.Entity.Body,
                    e.Entity.Url,
                    e.Entity.CreatedAt == default ? DateTime.UtcNow : e.Entity.CreatedAt))
                .ToList();
            if (pushes.Count > 0)
            {
                _pending.AddOrUpdate(eventData.Context, pushes);
            }
        }
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override async ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        if (eventData.Context is null) return await base.SavedChangesAsync(eventData, result, cancellationToken);

        if (_pending.TryGetValue(eventData.Context, out var pushes))
        {
            _pending.Remove(eventData.Context);
            foreach (var p in pushes)
            {
                try
                {
                    await _hub.Clients.Group(NotificationsHub.GroupForUser(p.UserId))
                        .SendAsync("notification", new { p.Id, p.Type, p.Title, p.Body, p.Url, createdAt = p.CreatedAt }, cancellationToken);
                }
                catch (Exception ex)
                {
                    // Push to best-effort — nie zatrzymujemy zwracanego wyniku.
                    _logger.LogWarning(ex, "Failed to push SignalR notification to user {UserId}", p.UserId);
                }
            }
        }
        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }
}
