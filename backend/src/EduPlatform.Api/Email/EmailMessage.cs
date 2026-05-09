namespace EduPlatform.Api.Email;

public record EmailMessage(string ToEmail, string ToName, string Subject, string HtmlBody, string? PlainTextBody = null);

public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
