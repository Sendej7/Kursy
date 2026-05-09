using EduPlatform.AiService;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IAiMentor _mentor;

    public AiController(IAiMentor mentor)
    {
        _mentor = mentor;
    }

    public record AskDto(string Question, string LessonContext, string? StudentCode, string? ErrorMessage);

    [HttpPost("help")]
    public async Task<IActionResult> Help([FromBody] AskDto dto, CancellationToken ct)
    {
        var response = await _mentor.AskAsync(
            new MentorRequest(dto.Question, dto.LessonContext, dto.StudentCode, dto.ErrorMessage),
            ct);
        return Ok(response);
    }
}
