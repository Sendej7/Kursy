using EduPlatform.Api.Services;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/certificates")]
public class CertificatesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public CertificatesController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record CertificateDto(
        string Code,
        DateTime IssuedAt,
        Guid CourseId,
        string CourseTitle,
        string CourseSlug,
        string LearnerName);

    /// <summary>Publiczny widok po kodzie — do udostępniania w CV/LinkedIn.</summary>
    [HttpGet("{code}")]
    public async Task<ActionResult<CertificateDto>> Get(string code, CancellationToken ct)
    {
        var cert = await _db.Certificates
            .Include(c => c.Course)
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Code == code, ct);
        if (cert?.Course is null || cert.User is null) return NotFound();

        return Ok(new CertificateDto(
            cert.Code,
            cert.IssuedAt,
            cert.CourseId,
            cert.Course.Title,
            cert.Course.Slug,
            cert.User.DisplayName));
    }

    [Authorize]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var list = await _db.Certificates
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.IssuedAt)
            .Select(c => new
            {
                c.Code,
                c.IssuedAt,
                c.CourseId,
                courseTitle = c.Course!.Title,
                courseSlug = c.Course.Slug,
            })
            .ToListAsync(ct);
        return Ok(list);
    }
}
