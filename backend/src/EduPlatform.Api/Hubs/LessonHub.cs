using Microsoft.AspNetCore.SignalR;

namespace EduPlatform.Api.Hubs;

/// <summary>
/// Hub do live feedbacku w lekcji: postęp, status sprawdzania kodu, podpowiedzi AI.
/// </summary>
public class LessonHub : Hub
{
    public Task JoinLesson(Guid lessonId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, $"lesson:{lessonId}");

    public Task LeaveLesson(Guid lessonId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, $"lesson:{lessonId}");
}
