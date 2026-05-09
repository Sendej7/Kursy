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

public interface IAiMentor
{
    Task<MentorResponse> AskAsync(MentorRequest request, CancellationToken cancellationToken = default);
    Task<GeneratedLesson> GenerateLessonAsync(GenerateLessonRequest request, CancellationToken cancellationToken = default);
}
