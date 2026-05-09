namespace EduPlatform.Api.Auth;

public class GoogleAuthOptions
{
    public const string SectionName = "GoogleAuth";

    /// <summary>OAuth Client ID z Google Cloud Console (typu "Web application").</summary>
    public string ClientId { get; set; } = string.Empty;

    public bool IsConfigured => !string.IsNullOrEmpty(ClientId);
}
