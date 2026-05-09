using EduPlatform.AiService;
using EduPlatform.Api.Services;
using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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

    public record CreateCourseDto(string Title, string Description, CourseLanguage Language, List<string>? Tags = null);
    public record UpdateCourseDto(string Title, string Description, CourseLanguage Language, CourseVisibility Visibility, decimal? PriceMonthlyPln, List<string>? Tags = null);
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
            Tags = NormalizeTags(dto.Tags),
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
        if (dto.Tags is not null)
        {
            course.Tags = NormalizeTags(dto.Tags);
        }
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
    [EnableRateLimiting("ai")]
    public async Task<IActionResult> GenerateLesson([FromBody] GenerateLessonRequest request, CancellationToken ct)
    {
        var generated = await _ai.GenerateLessonAsync(request, ct);
        return Ok(generated);
    }

    [HttpPost("generate-from-text")]
    [EnableRateLimiting("ai")]
    public async Task<IActionResult> GenerateFromText([FromBody] GenerateFromTextDto dto, CancellationToken ct)
    {
        var snippet = dto.SourceText.Length > 4000 ? dto.SourceText[..4000] : dto.SourceText;
        var topic = $"Kurs na podstawie materiału użytkownika ({dto.TargetLanguage})";
        var lesson = await _ai.GenerateLessonAsync(
            new GenerateLessonRequest(topic, snippet, dto.TargetLanguage), ct);
        return Ok(new { proposedLesson = lesson });
    }

    public record CourseOutlineDto(string SourceText, string TargetLanguage = "Python", string? CourseTitleHint = null);

    [HttpPost("extract-pdf")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20MB
    public async Task<IActionResult> ExtractPdf([FromForm] IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "Brak pliku." });
        if (!file.ContentType.Contains("pdf", StringComparison.OrdinalIgnoreCase) &&
            !file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Tylko pliki PDF." });
        }

        await using var stream = file.OpenReadStream();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        ms.Position = 0;

        var sb = new System.Text.StringBuilder();
        using (var doc = UglyToad.PdfPig.PdfDocument.Open(ms))
        {
            foreach (var page in doc.GetPages())
            {
                sb.AppendLine(page.Text);
                sb.AppendLine();
            }
        }

        var text = sb.ToString();
        return Ok(new { text, length = text.Length, fileName = file.FileName });
    }

    [HttpPost("extract-pptx")]
    [RequestSizeLimit(40 * 1024 * 1024)] // 40MB — PPTX bywa większy od PDF (obrazki)
    public async Task<IActionResult> ExtractPptx([FromForm] IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "Brak pliku." });
        if (!file.FileName.EndsWith(".pptx", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Tylko pliki PPTX (PowerPoint 2007+)." });
        }

        await using var stream = file.OpenReadStream();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        ms.Position = 0;

        var sb = new System.Text.StringBuilder();
        try
        {
            using var pres = DocumentFormat.OpenXml.Packaging.PresentationDocument.Open(ms, isEditable: false);
            var slidePart = pres.PresentationPart;
            if (slidePart?.Presentation?.SlideIdList is { } slideIds)
            {
                int slideIdx = 0;
                foreach (var slideId in slideIds.Elements<DocumentFormat.OpenXml.Presentation.SlideId>())
                {
                    slideIdx++;
                    if (slideId.RelationshipId is not { } relId) continue;
                    var slide = (DocumentFormat.OpenXml.Packaging.SlidePart)slidePart.GetPartById(relId.Value!);

                    sb.AppendLine($"# Slajd {slideIdx}");
                    if (slide.Slide is { } slideRoot)
                    {
                        foreach (var t in slideRoot.Descendants<DocumentFormat.OpenXml.Drawing.Text>())
                        {
                            if (!string.IsNullOrWhiteSpace(t.Text))
                            {
                                sb.AppendLine(t.Text);
                            }
                        }
                    }

                    // Notatki prelegenta — czesto wartościowe dla AI
                    if (slide.NotesSlidePart?.NotesSlide is { } notes)
                    {
                        var noteTexts = notes
                            .Descendants<DocumentFormat.OpenXml.Drawing.Text>()
                            .Select(x => x.Text)
                            .Where(x => !string.IsNullOrWhiteSpace(x))
                            .ToList();
                        if (noteTexts.Count > 0)
                        {
                            sb.AppendLine("## Notatki prelegenta");
                            foreach (var n in noteTexts) sb.AppendLine(n);
                        }
                    }
                    sb.AppendLine();
                }
            }
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = $"Nie mogę odczytać PPTX: {ex.Message}" });
        }

        var text = sb.ToString();
        return Ok(new { text, length = text.Length, fileName = file.FileName });
    }

    [HttpPost("outline")]
    [EnableRateLimiting("ai")]
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

    private static List<string> NormalizeTags(IEnumerable<string>? tags) =>
        (tags ?? Array.Empty<string>())
            .Select(t => t.Trim())
            .Where(t => t.Length is > 0 and <= 32)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(10)
            .ToList();

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

    [HttpPost("courses/{id:guid}/duplicate")]
    public async Task<IActionResult> DuplicateCourse(Guid id, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();

        var source = await _db.Courses
            .Include(c => c.Modules).ThenInclude(m => m.Lessons).ThenInclude(l => l.Exercise)
            .FirstOrDefaultAsync(c => c.Id == id && c.AuthorId == userId, ct);
        if (source is null) return NotFound();

        var slug = await UniqueSlugAsync(source.Slug + "-kopia", ct);
        var copy = new Course
        {
            Title = source.Title + " (kopia)",
            Slug = slug,
            Description = source.Description,
            Language = source.Language,
            Visibility = CourseVisibility.Draft,  // kopia zawsze startuje jako draft
            PriceMonthlyPln = source.PriceMonthlyPln,
            AuthorId = userId,
            Tags = source.Tags.ToList(),
            Modules = source.Modules.OrderBy(m => m.Order).Select(m => new Module
            {
                Title = m.Title,
                Order = m.Order,
                Lessons = m.Lessons.OrderBy(l => l.Order).Select(l => new Lesson
                {
                    Title = l.Title,
                    Order = l.Order,
                    Type = l.Type,
                    ContentMarkdown = l.ContentMarkdown,
                    Exercise = l.Exercise is null ? null : new Exercise
                    {
                        Prompt = l.Exercise.Prompt,
                        StarterCode = l.Exercise.StarterCode,
                        SolutionCode = l.Exercise.SolutionCode,
                        TestsCode = l.Exercise.TestsCode,
                        Hints = l.Exercise.Hints.ToList(),
                    },
                }).ToList(),
            }).ToList(),
        };

        _db.Courses.Add(copy);
        await _db.SaveChangesAsync(ct);
        return Ok(new { copy.Id, copy.Slug });
    }

    public record ReorderModulesDto(Guid CourseId, Guid[] ModuleIds);
    public record ReorderLessonsDto(Guid ModuleId, Guid[] LessonIds);

    [HttpPatch("modules/reorder")]
    public async Task<IActionResult> ReorderModules([FromBody] ReorderModulesDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var ownsCourse = await _db.Courses.AnyAsync(c => c.Id == dto.CourseId && c.AuthorId == userId, ct);
        if (!ownsCourse) return NotFound();

        var modules = await _db.Modules
            .Where(m => m.CourseId == dto.CourseId)
            .ToListAsync(ct);
        // Reset order według podanej kolejności; zignoruj moduły spoza listy.
        var idx = 1;
        foreach (var moduleId in dto.ModuleIds)
        {
            var m = modules.FirstOrDefault(x => x.Id == moduleId);
            if (m is not null) m.Order = idx++;
        }
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPatch("lessons/reorder")]
    public async Task<IActionResult> ReorderLessons([FromBody] ReorderLessonsDto dto, CancellationToken ct)
    {
        if (_currentUser.Id is not { } userId) return Unauthorized();
        var ownsModule = await _db.Modules
            .AnyAsync(m => m.Id == dto.ModuleId && m.Course!.AuthorId == userId, ct);
        if (!ownsModule) return NotFound();

        var lessons = await _db.Lessons
            .Where(l => l.ModuleId == dto.ModuleId)
            .ToListAsync(ct);
        var idx = 1;
        foreach (var lessonId in dto.LessonIds)
        {
            var l = lessons.FirstOrDefault(x => x.Id == lessonId);
            if (l is not null) l.Order = idx++;
        }
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<string> UniqueSlugAsync(string baseSlug, CancellationToken ct)
    {
        var slug = Slugify(baseSlug);
        var n = 1;
        while (await _db.Courses.AnyAsync(c => c.Slug == slug, ct))
        {
            n++;
            slug = $"{Slugify(baseSlug)}-{n}";
        }
        return slug;
    }
}
