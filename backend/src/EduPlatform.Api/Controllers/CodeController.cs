using EduPlatform.CodeRunner;
using EduPlatform.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CodeController : ControllerBase
{
    private readonly ICodeRunner _runner;

    public CodeController(ICodeRunner runner)
    {
        _runner = runner;
    }

    public record RunDto(CourseLanguage Language, string Code, string? Stdin);
    public record SubmitDto(CourseLanguage Language, string Code, string TestsCode);

    [HttpPost("run")]
    public async Task<IActionResult> Run([FromBody] RunDto dto, CancellationToken ct)
    {
        var result = await _runner.RunAsync(new RunRequest(dto.Language, dto.Code, dto.Stdin), ct);
        return Ok(result);
    }

    [HttpPost("submit")]
    public async Task<IActionResult> Submit([FromBody] SubmitDto dto, CancellationToken ct)
    {
        var result = await _runner.SubmitAsync(new SubmitRequest(dto.Language, dto.Code, dto.TestsCode), ct);
        return Ok(result);
    }
}
