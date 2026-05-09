using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace EduPlatform.Api.Auth;

public class GitHubAuthService
{
    private readonly HttpClient _http;
    private readonly GitHubAuthOptions _options;

    public GitHubAuthService(HttpClient http, IOptions<GitHubAuthOptions> options)
    {
        _http = http;
        _options = options.Value;
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("KursyPlatform/1.0");
    }

    public record GitHubProfile(string Id, string Login, string? Email, string? Name, string? AvatarUrl);

    public async Task<GitHubProfile?> ExchangeCodeAsync(string code, CancellationToken ct)
    {
        if (!_options.IsConfigured) return null;

        // 1. Code → access token.
        var tokenReq = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/oauth/access_token")
        {
            Content = JsonContent.Create(new
            {
                client_id = _options.ClientId,
                client_secret = _options.ClientSecret,
                code,
                redirect_uri = _options.RedirectUri,
            }),
        };
        tokenReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        var tokenResp = await _http.SendAsync(tokenReq, ct);
        if (!tokenResp.IsSuccessStatusCode) return null;
        var token = await tokenResp.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct);
        if (token?.AccessToken is null) return null;

        // 2. Token → /user (profil).
        var userReq = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user");
        userReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
        userReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        var userResp = await _http.SendAsync(userReq, ct);
        if (!userResp.IsSuccessStatusCode) return null;
        var user = await userResp.Content.ReadFromJsonAsync<GitHubUser>(cancellationToken: ct);
        if (user is null) return null;

        // 3. Email może być prywatny — dociągamy z /user/emails.
        var email = user.Email;
        if (string.IsNullOrEmpty(email))
        {
            var emailReq = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
            emailReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
            emailReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            var emailResp = await _http.SendAsync(emailReq, ct);
            if (emailResp.IsSuccessStatusCode)
            {
                var emails = await emailResp.Content.ReadFromJsonAsync<List<GitHubEmail>>(cancellationToken: ct);
                email = emails?.FirstOrDefault(e => e.Primary && e.Verified)?.Email
                        ?? emails?.FirstOrDefault(e => e.Verified)?.Email;
            }
        }

        return new GitHubProfile(
            Id: user.Id.ToString(),
            Login: user.Login,
            Email: email,
            Name: user.Name,
            AvatarUrl: user.AvatarUrl);
    }

    private record TokenResponse(
        [property: JsonPropertyName("access_token")] string? AccessToken,
        [property: JsonPropertyName("token_type")] string? TokenType,
        [property: JsonPropertyName("scope")] string? Scope);

    private record GitHubUser(
        [property: JsonPropertyName("id")] long Id,
        [property: JsonPropertyName("login")] string Login,
        [property: JsonPropertyName("email")] string? Email,
        [property: JsonPropertyName("name")] string? Name,
        [property: JsonPropertyName("avatar_url")] string? AvatarUrl);

    private record GitHubEmail(
        [property: JsonPropertyName("email")] string Email,
        [property: JsonPropertyName("primary")] bool Primary,
        [property: JsonPropertyName("verified")] bool Verified);
}
