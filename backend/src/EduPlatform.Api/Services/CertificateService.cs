using System.Security.Cryptography;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Services;

public class CertificateService
{
    private readonly AppDbContext _db;

    public CertificateService(AppDbContext db)
    {
        _db = db;
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
        await _db.SaveChangesAsync(ct);
        return cert;
    }

    private static string GenerateCode()
    {
        var bytes = new byte[12];
        RandomNumberGenerator.Fill(bytes);
        return "KU-" + Convert.ToHexString(bytes); // np. KU-3F1A...
    }
}
