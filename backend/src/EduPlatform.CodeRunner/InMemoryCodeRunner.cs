using Microsoft.Extensions.Logging;

namespace EduPlatform.CodeRunner;

/// <summary>
/// MVP-stub. Backend nie wykonuje kodu studenta — robi to Pyodide w przeglądarce.
/// Później zastąpimy Judge0/Docker dla języków innych niż Python.
/// </summary>
public class InMemoryCodeRunner : ICodeRunner
{
    private readonly ILogger<InMemoryCodeRunner> _logger;

    public InMemoryCodeRunner(ILogger<InMemoryCodeRunner> logger)
    {
        _logger = logger;
    }

    public Task<RunResult> RunAsync(RunRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("RunAsync called for language {Language}", request.Language);
        return Task.FromResult(new RunResult(
            Stdout: string.Empty,
            Stderr: "Server-side code execution not implemented yet. Use the in-browser Pyodide runner.",
            ExitCode: -1,
            TimedOut: false,
            Duration: TimeSpan.Zero));
    }

    public Task<SubmitResult> SubmitAsync(SubmitRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("SubmitAsync called for language {Language}", request.Language);
        return Task.FromResult(new SubmitResult(
            Passed: false,
            Stdout: string.Empty,
            Stderr: "Server-side code execution not implemented yet. Use the in-browser Pyodide runner.",
            Tests: Array.Empty<TestResult>(),
            Duration: TimeSpan.Zero));
    }
}
