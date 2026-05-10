using System.Security.Cryptography;
using EduPlatform.Api.Email;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Services;

public class CertificateService
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly IConfiguration _config;
    private readonly ILogger<CertificateService> _logger;

    public CertificateService(AppDbContext db, IEmailSender email, IConfiguration config, ILogger<CertificateService> logger)
    {
        _db = db;
        _email = email;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Wystawia certyfikat, jeśli student ukończył 100% lekcji w kursie. Idempotentne.
    /// Zwraca utworzony lub istniejący certyfikat, lub null jeśli kurs nieukończony.
    /// </summary>
    public async Task<Certificate?> IssueIfEligibleAsync(Guid userId, Guid courseId, CancellationToken ct = default)
    {
        var existing = await _db.Certificates.FirstOrDefaultAsync(c => c.UserId == userId && c.CourseId == courseId, ct);
        if (existing is not null) return existing;

        var totalLessons = await _db.Lessons.CountAsync(l => l.Module!.CourseId == courseId, ct);
        if (totalLessons == 0) return null;

        var completedLessons = await _db.LessonProgresses
            .CountAsync(p => p.UserId == userId && p.Completed && p.Lesson!.Module!.CourseId == courseId, ct);

        if (completedLessons < totalLessons) return null;

        var cert = new Certificate
        {
            UserId = userId,
            CourseId = courseId,
            Code = GenerateCode(),
            IssuedAt = DateTime.UtcNow,
        };
        _db.Certificates.Add(cert);

        // Wykryj czy to PIERWSZY certyfikat usera — wtedy wyślij celebracyjny email.
        var isFirstCert = !await _db.Certificates.AnyAsync(c => c.UserId == userId, ct);

        await _db.SaveChangesAsync(ct);

        if (isFirstCert)
        {
            try
            {
                var user = await _db.Users.Where(u => u.Id == userId)
                    .Select(u => new { u.Email, u.DisplayName }).FirstOrDefaultAsync(ct);
                var courseTitle = await _db.Courses.Where(c => c.Id == courseId)
                    .Select(c => c.Title).FirstOrDefaultAsync(ct);
                if (user is not null && courseTitle is not null)
                {
                    var appUrl = (_config.GetValue<string>("App:BaseUrl") ?? "http://localhost:5173").TrimEnd('/');
                    await _email.SendAsync(
                        EmailTemplates.FirstCertificate(user.Email, user.DisplayName, courseTitle, cert.Code, appUrl),
                        ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send first-certificate email to {UserId}", userId);
            }
        }

        return cert;
    }

    private static string GenerateCode()
    {
        var bytes = new byte[12];
        RandomNumberGenerator.Fill(bytes);
        return "KU-" + Convert.ToHexString(bytes); // np. KU-3F1A...
    }
}
