namespace EduPlatform.Api.Auth;

public class GitHubAuthOptions
{
    public const string SectionName = "GitHubAuth";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = "http://localhost:5173/auth/github/callback";

    public bool IsConfigured => !string.IsNullOrEmpty(ClientId) && !string.IsNullOrEmpty(ClientSecret);
}
