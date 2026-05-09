using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

namespace EduPlatform.Api.Hubs;

/// <summary>
/// Hub do live presence w lekcji: ile osób ją teraz robi, kto skończył.
/// In-memory liczniki — wystarczające na MVP, do skalowania użyjemy backplane (Redis).
/// </summary>
public class LessonHub : Hub
{
    private static readonly ConcurrentDictionary<Guid, int> Presence = new();

    public async Task JoinLesson(Guid lessonId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(lessonId));
        var count = Presence.AddOrUpdate(lessonId, 1, (_, c) => c + 1);
        await Clients.Group(GroupName(lessonId)).SendAsync("presence", new { lessonId, count });
    }

    public async Task LeaveLesson(Guid lessonId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(lessonId));
        var count = Presence.AddOrUpdate(lessonId, 0, (_, c) => Math.Max(0, c - 1));
        await Clients.Group(GroupName(lessonId)).SendAsync("presence", new { lessonId, count });
    }

    public Task NotifyCompleted(Guid lessonId, string displayName) =>
        Clients.Group(GroupName(lessonId)).SendAsync("completed", new { lessonId, displayName });

    private static string GroupName(Guid lessonId) => $"lesson:{lessonId}";
}
