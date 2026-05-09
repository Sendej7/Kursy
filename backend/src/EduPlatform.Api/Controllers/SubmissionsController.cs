using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubmissionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SubmissionsController(AppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public record SubmissionDto(
        Guid ExerciseId,
        string Code,
        bool Passed,
        int TimeSpentSeconds,
        string? ErrorMessage,
        string? Stdout);

    [HttpPost]
    public async Task<IActionResult> Record([FromBody] SubmissionDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var exists = await _db.Exercises.AnyAsync(e => e.Id == dto.ExerciseId, ct);
        if (!exists) return NotFound(new { error = "Exercise not found." });

        var attempt = await _db.Submissions
            .Where(s => s.UserId == userId && s.ExerciseId == dto.ExerciseId)
            .CountAsync(ct);

        var sub = new Submission
        {
            UserId = userId,
            ExerciseId = dto.ExerciseId,
            Code = dto.Code,
            Passed = dto.Passed,
            AttemptNumber = attempt + 1,
            TimeSpent = TimeSpan.FromSeconds(dto.TimeSpentSeconds),
            ErrorMessage = dto.ErrorMessage,
            Stdout = dto.Stdout,
        };

        _db.Submissions.Add(sub);
        await _db.SaveChangesAsync(ct);
        return Ok(new { sub.Id, sub.AttemptNumber });
    }

    [HttpGet("mine/{exerciseId:guid}")]
    public async Task<IActionResult> Mine(Guid exerciseId, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var list = await _db.Submissions
            .Where(s => s.UserId == userId && s.ExerciseId == exerciseId)
            .OrderByDescending(s => s.CreatedAt)
            .Take(50)
            .Select(s => new { s.Id, s.Passed, s.AttemptNumber, s.CreatedAt, s.ErrorMessage })
            .ToListAsync(ct);
        return Ok(list);
    }
}
