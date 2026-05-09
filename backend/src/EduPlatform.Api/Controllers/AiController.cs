using EduPlatform.AiService;
using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IAiMentor _mentor;
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public AiController(IAiMentor mentor, AppDbContext db, ICurrentUser currentUser)
    {
        _mentor = mentor;
        _db = db;
        _currentUser = currentUser;
    }

    public record AskDto(
        Guid? LessonId,
        string Question,
        string LessonContext,
        string? StudentCode,
        string? ErrorMessage);

    [Authorize]
    [HttpPost("help")]
    public async Task<IActionResult> Help([FromBody] AskDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var response = await _mentor.AskAsync(
            new MentorRequest(dto.Question, dto.LessonContext, dto.StudentCode, dto.ErrorMessage),
            ct);

        if (dto.LessonId is { } lessonId)
        {
            _db.AiInteractions.Add(new AiInteraction
            {
                UserId = userId,
                LessonId = lessonId,
                Question = dto.Question,
                Answer = response.Answer,
                StudentCodeAtAsk = dto.StudentCode,
                ErrorContext = dto.ErrorMessage,
                TokensIn = response.TokensIn,
                TokensOut = response.TokensOut,
            });
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new { response.Answer, response.TokensIn, response.TokensOut });
    }
}
