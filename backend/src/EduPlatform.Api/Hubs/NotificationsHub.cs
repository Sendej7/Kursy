using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace EduPlatform.Api.Hubs;

/// <summary>
/// Hub do push-owania notyfikacji per-user. Każdy zalogowany klient otwiera trwałe połączenie;
/// backend wysyła event 'notification' do grupy user-{userId} po SaveChanges (interceptor).
/// </summary>
[Authorize]
public class NotificationsHub : Hub
{
    public static string GroupForUser(Guid userId) => $"user-{userId:N}";

    public override async Task OnConnectedAsync()
    {
        var userId = ExtractUserId();
        if (userId is { } id)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupForUser(id));
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = ExtractUserId();
        if (userId is { } id)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupForUser(id));
        }
        await base.OnDisconnectedAsync(exception);
    }

    private Guid? ExtractUserId()
    {
        var raw = Context.User?.FindFirst("sub")?.Value
                 ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
