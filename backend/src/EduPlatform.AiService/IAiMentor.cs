namespace EduPlatform.AiService;

public record MentorRequest(
    string Question,
    string LessonContext,
    string? StudentCode = null,
    string? ErrorMessage = null);

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

public interface IAiMentor
{
    Task<MentorResponse> AskAsync(MentorRequest request, CancellationToken cancellationToken = default);
    Task<GeneratedLesson> GenerateLessonAsync(GenerateLessonRequest request, CancellationToken cancellationToken = default);
    Task<LessonImprovement> ProposeImprovementAsync(LessonImprovementContext context, CancellationToken cancellationToken = default);
}
