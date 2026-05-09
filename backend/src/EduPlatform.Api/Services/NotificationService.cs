using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;

namespace EduPlatform.Api.Services;

public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Dodaje notyfikację (nie zapisuje — caller robi SaveChanges, by wpiąć w transakcję).</summary>
    public void Notify(Guid userId, string type, string title, string? body = null, string? url = null)
    {
        _db.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Body = body,
            Url = url,
        });
    }
}
