using EduPlatform.AiService;
using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/author")]
[Authorize(Roles = "Author,Admin")]
public class AuthorController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IAiMentor _ai;

    public AuthorController(AppDbContext db, ICurrentUser currentUser, IAiMentor ai)
    {
        _db = db;
        _currentUser = currentUser;
        _ai = ai;
    }

    public record CreateCourseDto(string Title, string Description, CourseLanguage Language);
    public record UpdateCourseDto(string Title, string Description, CourseLanguage Language, CourseVisibility Visibility, decimal? PriceMonthlyPln);
    public record CreateModuleDto(Guid CourseId, string Title, string Description, int Order);
    public record CreateLessonDto(Guid ModuleId, string Title, int Order, LessonType Type, string ContentMarkdown);
    public record UpsertExerciseDto(string Prompt, string StarterCode, string SolutionCode, string TestsCode, List<string> Hints);
    public record GenerateFromTextDto(string SourceText, string TargetLanguage = "Python");

    [HttpGet("courses")]
    public async Task<IActionResult> ListMyCourses(CancellationToken ct)
    {
        if (_currentUser.Id is not { } authorId) return Unauthorized();
        var list = await _db.Courses
            .Where(c => c.AuthorId == authorId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new { c.Id, c.Title, c.Slug, c.Description, c.Language, c.Visibility, c.PriceMonthlyPln })
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpPost("courses")]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } authorId) return Unauthorized();
        var slug = Slugify(dto.Title);
        if (await _db.Courses.AnyAsync(c => c.Slug == slug, ct))
        {
            slug = $"{slug}-{Guid.NewGuid().ToString()[..6]}";
        }
        var course = new Course
        {
            Title = dto.Title,
            Description = dto.Description,
            Language = dto.Language,
            Slug = slug,
            AuthorId = authorId,
            Visibility = CourseVisibility.Draft,
        };
        _db.Courses.Add(course);
        await _db.SaveChangesAsync(ct);
        return Ok(new { course.Id, course.Slug });
    }

    [HttpPut("courses/{id:guid}")]
    public async Task<IActionResult> UpdateCourse(Guid id, [FromBody] UpdateCourseDto dto, CancellationToken ct)
    {
        var course = await GetOwnedCourse(id, ct);
        if (course is null) return NotFound();

        course.Title = dto.Title;
        course.Description = dto.Description;
        course.Language = dto.Language;
        course.PriceMonthlyPln = dto.PriceMonthlyPln;
        // Author can move between Draft/Private/PendingReview. Admin moves to Public.
        if (dto.Visibility != CourseVisibility.Public || _currentUser.Role == UserRole.Admin)
        {
            course.Visibility = dto.Visibility;
        }
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("modules")]
    public async Task<IActionResult> CreateModule([FromBody] CreateModuleDto dto, CancellationToken ct)
    {
        var course = await GetOwnedCourse(dto.CourseId, ct);
        if (course is null) return NotFound();
        var module = new Module
        {
            CourseId = course.Id,
            Title = dto.Title,
            Description = dto.Description,
            Order = dto.Order,
        };
        _db.Modules.Add(module);
        await _db.SaveChangesAsync(ct);
        return Ok(new { module.Id });
    }

    [HttpPost("lessons")]
    public async Task<IActionResult> CreateLesson([FromBody] CreateLessonDto dto, CancellationToken ct)
    {
        var module = await _db.Modules
            .Include(m => m.Course)
            .FirstOrDefaultAsync(m => m.Id == dto.ModuleId, ct);
        if (module is null || module.Course?.AuthorId != _currentUser.Id) return NotFound();

        var lesson = new Lesson
        {
            ModuleId = module.Id,
            Title = dto.Title,
            Order = dto.Order,
            Type = dto.Type,
            ContentMarkdown = dto.ContentMarkdown,
        };
        _db.Lessons.Add(lesson);
        await _db.SaveChangesAsync(ct);
        return Ok(new { lesson.Id });
    }

    [HttpPut("lessons/{id:guid}")]
    public async Task<IActionResult> UpdateLesson(Guid id, [FromBody] CreateLessonDto dto, CancellationToken ct)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Module)
                .ThenInclude(m => m!.Course)
            .FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lesson is null || lesson.Module?.Course?.AuthorId != _currentUser.Id) return NotFound();

        lesson.Title = dto.Title;
        lesson.Order = dto.Order;
        lesson.Type = dto.Type;
        lesson.ContentMarkdown = dto.ContentMarkdown;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("lessons/{id:guid}/exercise")]
    public async Task<IActionResult> UpsertExercise(Guid id, [FromBody] UpsertExerciseDto dto, CancellationToken ct)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Exercise)
            .Include(l => l.Module)
                .ThenInclude(m => m!.Course)
            .FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lesson is null || lesson.Module?.Course?.AuthorId != _currentUser.Id) return NotFound();

        lesson.Exercise ??= new Exercise { LessonId = lesson.Id };
        lesson.Exercise.Prompt = dto.Prompt;
        lesson.Exercise.StarterCode = dto.StarterCode;
        lesson.Exercise.SolutionCode = dto.SolutionCode;
        lesson.Exercise.TestsCode = dto.TestsCode;
        lesson.Exercise.Hints = dto.Hints;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("generate-lesson")]
    public async Task<IActionResult> GenerateLesson([FromBody] GenerateLessonRequest request, CancellationToken ct)
    {
        var generated = await _ai.GenerateLessonAsync(request, ct);
        return Ok(generated);
    }

    [HttpPost("generate-from-text")]
    public async Task<IActionResult> GenerateFromText([FromBody] GenerateFromTextDto dto, CancellationToken ct)
    {
        var snippet = dto.SourceText.Length > 4000 ? dto.SourceText[..4000] : dto.SourceText;
        var topic = $"Kurs na podstawie materiału użytkownika ({dto.TargetLanguage})";
        var lesson = await _ai.GenerateLessonAsync(
            new GenerateLessonRequest(topic, snippet, dto.TargetLanguage), ct);
        return Ok(new { proposedLesson = lesson });
    }

    public record CourseOutlineDto(string SourceText, string TargetLanguage = "Python", string? CourseTitleHint = null);

    [HttpPost("outline")]
    public async Task<IActionResult> ProposeOutline([FromBody] CourseOutlineDto dto, CancellationToken ct)
    {
        var outline = await _ai.ProposeCourseOutlineAsync(
            new CourseOutlineRequest(dto.SourceText, dto.TargetLanguage, dto.CourseTitleHint), ct);
        return Ok(outline);
    }

    public record ImportLessonOutlineDto(string Title, string Summary, string Topic);
    public record ImportModuleOutlineDto(string Title, string Description, List<ImportLessonOutlineDto> Lessons);
    public record ImportCourseOutlineDto(string Title, string Description, CourseLanguage Language, List<ImportModuleOutlineDto> Modules);

    /// <summary>
    /// Tworzy kurs (jako Draft) wraz z modułami i lekcjami. Każdą lekcję generuje
    /// osobnym wywołaniem do AI (lepsza jakość niż „zrób cały kurs naraz") na bazie topicu.
    /// Operacja jest długa — frontend pokazuje progress, backend uruchamia w transakcji.
    /// </summary>
    [HttpPost("import-outline")]
    public async Task<IActionResult> ImportOutline([FromBody] ImportCourseOutlineDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } authorId) return Unauthorized();

        var slug = Slugify(dto.Title);
        if (await _db.Courses.AnyAsync(c => c.Slug == slug, ct))
        {
            slug = $"{slug}-{Guid.NewGuid().ToString()[..6]}";
        }

        var course = new Course
        {
            AuthorId = authorId,
            Title = dto.Title,
            Slug = slug,
            Description = dto.Description,
            Language = dto.Language,
            Visibility = CourseVisibility.Draft,
        };
        _db.Courses.Add(course);

        var contextBuilder = new System.Text.StringBuilder();
        var moduleOrder = 1;
        foreach (var m in dto.Modules)
        {
            var module = new Module
            {
                Course = course,
                Title = m.Title,
                Description = m.Description,
                Order = moduleOrder++,
            };
            _db.Modules.Add(module);

            var lessonOrder = 1;
            foreach (var l in m.Lessons)
            {
                var generated = await _ai.GenerateLessonAsync(
                    new GenerateLessonRequest(l.Topic, contextBuilder.ToString(), dto.Language.ToString()), ct);

                var lesson = new Lesson
                {
                    Module = module,
                    Title = string.IsNullOrWhiteSpace(generated.Title) ? l.Title : generated.Title,
                    Order = lessonOrder++,
                    Type = LessonType.Exercise,
                    ContentMarkdown = generated.Theory,
                };
                _db.Lessons.Add(lesson);

                if (!string.IsNullOrWhiteSpace(generated.StarterCode) || !string.IsNullOrWhiteSpace(generated.TestsCode))
                {
                    _db.Exercises.Add(new Exercise
                    {
                        Lesson = lesson,
                        Prompt = l.Summary,
                        StarterCode = generated.StarterCode,
                        SolutionCode = generated.SolutionCode,
                        TestsCode = generated.TestsCode,
                        Hints = generated.Hints.ToList(),
                    });
                }

                contextBuilder.AppendLine($"- {lesson.Title}: {l.Summary}");
            }
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { course.Id, course.Slug, modules = dto.Modules.Count, lessons = dto.Modules.Sum(m => m.Lessons.Count) });
    }

    public record CommonError(string Description, int Occurrences);
    public record CommonQuestion(string Question, int Occurrences);
    public record LessonAnalyticsDto(
        Guid LessonId,
        string Title,
        int TotalAttempts,
        int Completions,
        double CompletionRate,
        double AvgAttempts,
        IReadOnlyList<CommonError> CommonErrors,
        IReadOnlyList<CommonQuestion> CommonQuestions);

    [HttpGet("courses/{courseId:guid}/analytics")]
    public async Task<IActionResult> Analytics(Guid courseId, CancellationToken ct)
    {
        var course = await GetOwnedCourse(courseId, ct);
        if (course is null) return NotFound();

        var lessons = await _db.Lessons
            .Where(l => l.Module!.CourseId == courseId)
            .Include(l => l.Exercise)
            .OrderBy(l => l.Module!.Order).ThenBy(l => l.Order)
            .ToListAsync(ct);

        var enrolled = await _db.CourseEnrollments.CountAsync(e => e.CourseId == courseId, ct);

        var output = new List<LessonAnalyticsDto>();
        foreach (var l in lessons)
        {
            var exerciseId = l.Exercise?.Id;
            var subs = exerciseId is null
                ? new List<Submission>()
                : await _db.Submissions
                    .Where(s => s.ExerciseId == exerciseId)
                    .ToListAsync(ct);

            var completions = await _db.LessonProgresses
                .CountAsync(p => p.LessonId == l.Id && p.Completed, ct);

            var attemptsByUser = subs.GroupBy(s => s.UserId).ToList();
            var avgAttempts = attemptsByUser.Count == 0 ? 0 : attemptsByUser.Average(g => g.Count());

            var errorBuckets = subs
                .Where(s => !s.Passed && !string.IsNullOrEmpty(s.ErrorMessage))
                .GroupBy(s => NormalizeError(s.ErrorMessage!))
                .Select(g => new CommonError(g.Key, g.Count()))
                .OrderByDescending(e => e.Occurrences)
                .Take(5)
                .ToList();

            var questions = await _db.AiInteractions
                .Where(a => a.LessonId == l.Id)
                .Select(a => a.Question)
                .ToListAsync(ct);

            var questionBuckets = questions
                .GroupBy(NormalizeQuestion)
                .Select(g => new CommonQuestion(g.Key, g.Count()))
                .OrderByDescending(q => q.Occurrences)
                .Take(5)
                .ToList();

            output.Add(new LessonAnalyticsDto(
                l.Id,
                l.Title,
                subs.Count,
                completions,
                enrolled == 0 ? 0 : (double)completions / enrolled,
                avgAttempts,
                errorBuckets,
                questionBuckets));
        }

        return Ok(new { courseId, enrolled, lessons = output });
    }

    [HttpPost("lessons/{id:guid}/improve")]
    public async Task<IActionResult> ProposeImprovement(Guid id, CancellationToken ct)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Exercise)
            .Include(l => l.Module)
                .ThenInclude(m => m!.Course)
            .FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lesson is null || lesson.Module?.Course?.AuthorId != _currentUser.Id) return NotFound();

        var courseId = lesson.Module!.CourseId;
        var enrolled = await _db.CourseEnrollments.CountAsync(e => e.CourseId == courseId, ct);
        var completions = await _db.LessonProgresses.CountAsync(p => p.LessonId == id && p.Completed, ct);

        var subs = lesson.Exercise is null
            ? new List<Submission>()
            : await _db.Submissions.Where(s => s.ExerciseId == lesson.Exercise.Id).ToListAsync(ct);

        var attemptsByUser = subs.GroupBy(s => s.UserId).ToList();
        var avgAttempts = attemptsByUser.Count == 0 ? 0 : attemptsByUser.Average(g => g.Count());

        var topErrors = subs
            .Where(s => !s.Passed && !string.IsNullOrEmpty(s.ErrorMessage))
            .GroupBy(s => NormalizeError(s.ErrorMessage!))
            .Select(g => (Description: g.Key, Occurrences: g.Count()))
            .OrderByDescending(e => e.Occurrences)
            .Take(5)
            .ToList();

        var questions = await _db.AiInteractions
            .Where(a => a.LessonId == id)
            .Select(a => a.Question)
            .ToListAsync(ct);

        var topQuestions = questions
            .GroupBy(NormalizeQuestion)
            .Select(g => (Question: g.Key, Occurrences: g.Count()))
            .OrderByDescending(q => q.Occurrences)
            .Take(5)
            .ToList();

        var ctx = new LessonImprovementContext(
            CurrentTitle: lesson.Title,
            CurrentMarkdown: lesson.ContentMarkdown,
            CurrentStarterCode: lesson.Exercise?.StarterCode ?? string.Empty,
            CurrentTestsCode: lesson.Exercise?.TestsCode ?? string.Empty,
            CompletionRate: enrolled == 0 ? 0 : (double)completions / enrolled,
            AvgAttempts: avgAttempts,
            TopErrors: topErrors,
            TopQuestions: topQuestions);

        var improvement = await _ai.ProposeImprovementAsync(ctx, ct);
        return Ok(improvement);
    }

    public record ApplyImprovementDto(string ContentMarkdown, string StarterCode, string SolutionCode, string TestsCode, List<string> Hints);

    [HttpPut("lessons/{id:guid}/apply-improvement")]
    public async Task<IActionResult> ApplyImprovement(Guid id, [FromBody] ApplyImprovementDto dto, CancellationToken ct)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Exercise)
            .Include(l => l.Module)
                .ThenInclude(m => m!.Course)
            .FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lesson is null || lesson.Module?.Course?.AuthorId != _currentUser.Id) return NotFound();

        lesson.ContentMarkdown = dto.ContentMarkdown;
        lesson.Exercise ??= new Exercise { LessonId = lesson.Id };
        lesson.Exercise.StarterCode = dto.StarterCode;
        lesson.Exercise.SolutionCode = dto.SolutionCode;
        lesson.Exercise.TestsCode = dto.TestsCode;
        lesson.Exercise.Hints = dto.Hints;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<Course?> GetOwnedCourse(Guid id, CancellationToken ct)
    {
        if (_currentUser.Id is not { } authorId) return null;
        return await _db.Courses.FirstOrDefaultAsync(c => c.Id == id && c.AuthorId == authorId, ct);
    }

    private static string NormalizeError(string raw)
    {
        var firstLine = raw.Split('\n').FirstOrDefault()?.Trim() ?? raw;
        return firstLine.Length > 120 ? firstLine[..120] : firstLine;
    }

    private static string NormalizeQuestion(string raw)
    {
        var trimmed = raw.Trim().ToLowerInvariant();
        // Lekka heurystyka: usuń znaki interpunkcji końcowe, zwiń whitespace.
        trimmed = System.Text.RegularExpressions.Regex.Replace(trimmed, @"\s+", " ");
        trimmed = trimmed.TrimEnd('?', '.', '!');
        return trimmed.Length > 120 ? trimmed[..120] : trimmed;
    }

    private static string Slugify(string input)
    {
        var lower = input.ToLowerInvariant();
        var sb = new System.Text.StringBuilder();
        foreach (var ch in lower)
        {
            if (ch is >= 'a' and <= 'z' or >= '0' and <= '9') sb.Append(ch);
            else if (ch is ' ' or '-' or '_') sb.Append('-');
        }
        var slug = sb.ToString().Trim('-');
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        return string.IsNullOrEmpty(slug) ? Guid.NewGuid().ToString()[..8] : slug;
    }
}
