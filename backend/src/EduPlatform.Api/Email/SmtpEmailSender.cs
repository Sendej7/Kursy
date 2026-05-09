using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace EduPlatform.Api.Email;

public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        if (!_options.IsConfigured)
        {
            _logger.LogWarning("SMTP not configured — skipping email to {Email}.", message.ToEmail);
            return;
        }

        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
        mime.To.Add(new MailboxAddress(message.ToName, message.ToEmail));
        mime.Subject = message.Subject;

        var builder = new BodyBuilder
        {
            HtmlBody = message.HtmlBody,
            TextBody = message.PlainTextBody ?? StripHtml(message.HtmlBody),
        };
        mime.Body = builder.ToMessageBody();

        using var smtp = new SmtpClient();
        try
        {
            await smtp.ConnectAsync(_options.Host, _options.Port,
                _options.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto, ct);
            if (!string.IsNullOrEmpty(_options.Username))
            {
                await smtp.AuthenticateAsync(_options.Username, _options.Password, ct);
            }
            await smtp.SendAsync(mime, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", message.ToEmail);
            throw;
        }
        finally
        {
            await smtp.DisconnectAsync(true, ct);
        }
    }

    private static string StripHtml(string html)
    {
        // Brutalnie prosty fallback do plain-text body — wystarczy dla maili transakcyjnych.
        return System.Text.RegularExpressions.Regex.Replace(html, "<.*?>", string.Empty);
    }
}

/// <summary>
/// Fallback dev sender — loguje treść maila do konsoli zamiast wysyłać. Pozwala na development
/// bez SMTP. W prod zarejestrowany jest SmtpEmailSender.
/// </summary>
public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        _logger.LogInformation(
            """
            ========== EMAIL (dev) ==========
            To: {ToName} <{ToEmail}>
            Subject: {Subject}

            {Body}
            =================================
            """,
            message.ToName, message.ToEmail, message.Subject, message.PlainTextBody ?? message.HtmlBody);
        return Task.CompletedTask;
    }
}
