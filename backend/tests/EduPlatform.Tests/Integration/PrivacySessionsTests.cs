using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EduPlatform.Tests.Integration;

public class PrivacySessionsTests : IClassFixture<TestApp>
{
    private readonly TestApp _app;

    public PrivacySessionsTests(TestApp app) => _app = app;

    [Fact]
    public async Task Sessions_list_contains_current_login()
    {
        var (client, _) = await _app.RegisterAsync();

        var sessions = await client.GetFromJsonAsync<List<SessionDto>>("/api/me/sessions", TestHelpers.Json);
        sessions!.Should().ContainSingle()
            .Which.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task Privacy_export_returns_user_payload()
    {
        var (client, _) = await _app.RegisterAsync("Eksporter");

        var resp = await client.PostAsync("/api/me/export", null);
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await resp.Content.ReadAsStringAsync();
        json.Should().Contain("\"displayName\"");
        json.Should().Contain("Eksporter");
    }

    [Fact]
    public async Task Account_delete_anonymizes_email()
    {
        var (client, userId) = await _app.RegisterAsync("DoUsuniecia");

        // Confirm wymaga password (gdy ustawione) — w teście podajemy poprawne.
        var resp = await client.PostAsJsonAsync("/api/me/delete", new { password = "very-secret" });
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Po anonimizacji e-mail w bazie powinien wyglądać "deleted-...@kursy.invalid"
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EduPlatform.Infrastructure.Persistence.AppDbContext>();
        var user = await db.Users.FindAsync(userId);
        user!.IsDeleted.Should().BeTrue();
        user.Email.Should().StartWith("deleted-").And.EndWith("@kursy.invalid");
        user.DisplayName.Should().Be("(konto usunięte)");
    }

    private record SessionDto(Guid Id, string? UserAgent, DateTime CreatedAt, DateTime ExpiresAt);
}
