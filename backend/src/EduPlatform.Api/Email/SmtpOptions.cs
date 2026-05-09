namespace EduPlatform.Api.Email;

public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool UseStartTls { get; set; } = true;

    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "Kursy.pl";

    public bool IsConfigured =>
        !string.IsNullOrEmpty(Host)
        && !string.IsNullOrEmpty(FromEmail);
}
