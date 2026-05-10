namespace EduPlatform.AiService;

public record MentorRequest(
    string Question,
    string LessonContext,
    string? StudentCode = null,
    string? ErrorMessage = null,
    /// <summary>Opcjonalny dodatek do system promptu — autor kursu może spersonalizować
    /// styl/zachowanie mentora (np. „odpowiadaj zwięźle", „używaj analogii kuchennych").</summary>
    string? CourseInstructions = null);

public record MentorResponse(string Answer, int TokensIn, int TokensOut);

public record GenerateLessonRequest(
    string Topic,
    string PreviousLessonsContext,
    string TargetLanguage = "Python");

public record GeneratedLesson(
    string Title,
    string Theory,
    string StarterCode,
    string SolutionCode,
    string TestsCode,
    IReadOnlyList<string> Hints);

public record LessonImprovementContext(
    string CurrentTitle,
    string CurrentMarkdown,
    string CurrentStarterCode,
    string CurrentTestsCode,
    double CompletionRate,
    double AvgAttempts,
    IReadOnlyList<(string Description, int Occurrences)> TopErrors,
    IReadOnlyList<(string Question, int Occurrences)> TopQuestions);

public record LessonImprovement(
    string Diagnosis,
    IReadOnlyList<string> Suggestions,
    GeneratedLesson? RewrittenLesson);

public record CourseOutlineRequest(string SourceText, string TargetLanguage = "Python", string? CourseTitleHint = null);

public record CourseOutline(
    string Title,
    string Description,
    string TargetLanguage,
    IReadOnlyList<ModuleOutline> Modules);

public record ModuleOutline(
    string Title,
    string Description,
    IReadOnlyList<LessonOutline> Lessons);

public record LessonOutline(
    string Title,
    string Summary,
    string Topic);

public interface IAiMentor
{
    Task<MentorResponse> AskAsync(MentorRequest request, CancellationToken cancellationToken = default);
    Task<GeneratedLesson> GenerateLessonAsync(GenerateLessonRequest request, CancellationToken cancellationToken = default);
    Task<LessonImprovement> ProposeImprovementAsync(LessonImprovementContext context, CancellationToken cancellationToken = default);
    Task<CourseOutline> ProposeCourseOutlineAsync(CourseOutlineRequest request, CancellationToken cancellationToken = default);
}
