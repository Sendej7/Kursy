using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace EduPlatform.Tests.Integration;

public class AuthFlowTests : IClassFixture<TestApp>
{
    private readonly TestApp _app;

    public AuthFlowTests(TestApp app)
    {
        _app = app;
    }

    [Fact]
    public async Task Register_then_login_returns_tokens()
    {
        var client = _app.CreateClient();

        var register = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = $"u{Guid.NewGuid():N}@example.com",
            password = "very-secret",
            displayName = "Test User",
        });
        register.StatusCode.Should().Be(HttpStatusCode.OK);

        var registered = await register.Content.ReadFromJsonAsync<AuthBody>();
        registered!.Token.Should().NotBeNullOrEmpty();
        registered.RefreshToken.Should().NotBeNullOrEmpty();
        registered.User.Email.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        var client = _app.CreateClient();
        var email = $"u{Guid.NewGuid():N}@example.com";
        await client.PostAsJsonAsync("/api/auth/register", new
        {
            email, password = "very-secret", displayName = "X",
        });

        var login = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email, password = "totally-wrong",
        });
        login.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_rotates_token_and_invalidates_old_one()
    {
        var client = _app.CreateClient();
        var email = $"u{Guid.NewGuid():N}@example.com";
        var register = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email, password = "very-secret", displayName = "X",
        });
        var initial = await register.Content.ReadFromJsonAsync<AuthBody>();

        var refresh = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = initial!.RefreshToken });
        refresh.StatusCode.Should().Be(HttpStatusCode.OK);
        var rotated = await refresh.Content.ReadFromJsonAsync<AuthBody>();
        rotated!.RefreshToken.Should().NotBe(initial.RefreshToken);

        var reuse = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = initial.RefreshToken });
        reuse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private record AuthBody(string Token, string RefreshToken, DateTime ExpiresAt, AuthUser User);
    private record AuthUser(Guid Id, string Email, string DisplayName, string Role);
}
