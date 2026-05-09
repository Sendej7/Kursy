using EduPlatform.Domain.Enums;

namespace EduPlatform.CodeRunner;

public record RunRequest(CourseLanguage Language, string Code, string? Stdin = null, int TimeoutMs = 5000);

public record RunResult(string Stdout, string Stderr, int ExitCode, bool TimedOut, TimeSpan Duration);

public record SubmitRequest(CourseLanguage Language, string Code, string TestsCode, int TimeoutMs = 10000);

public record SubmitResult(bool Passed, string Stdout, string Stderr, IReadOnlyList<TestResult> Tests, TimeSpan Duration);

public record TestResult(string Name, bool Passed, string? Message);

public interface ICodeRunner
{
    Task<RunResult> RunAsync(RunRequest request, CancellationToken cancellationToken = default);
    Task<SubmitResult> SubmitAsync(SubmitRequest request, CancellationToken cancellationToken = default);
}
