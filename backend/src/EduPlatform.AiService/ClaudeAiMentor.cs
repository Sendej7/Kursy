using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduPlatform.AiService;

/// <summary>
/// Wrapper na Claude API. MVP-stub — implementacja właściwego callu do
/// /v1/messages (z prompt cachingiem) zostanie dorzucona, jak będziemy mieć
/// klucz w env. System prompt jest po polsku, mentor "naprowadza, nie daje gotowca".
/// </summary>
public class ClaudeAiMentor : IAiMentor
{
    private const string MentorSystemPrompt = """
        Jesteś polskim mentorem programowania. Pomagasz studentom uczącym się
        programowania, ale NIGDY nie podajesz gotowego rozwiązania zadania.
        Naprowadzasz pytaniami, wskazujesz konkretne miejsce w kodzie do
        sprawdzenia, tłumaczysz pojęcia prosto i konkretnie. Zwracasz się do
        studenta na "ty". Jeśli pytanie nie dotyczy lekcji, grzecznie zawracasz
        do tematu.
        """;

    private readonly HttpClient _httpClient;
    private readonly ClaudeOptions _options;
    private readonly ILogger<ClaudeAiMentor> _logger;

    public ClaudeAiMentor(HttpClient httpClient, IOptions<ClaudeOptions> options, ILogger<ClaudeAiMentor> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public Task<MentorResponse> AskAsync(MentorRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("AI mentor asked (lesson context length: {Length})", request.LessonContext.Length);
        // TODO: wywołanie /v1/messages z system promptem MentorSystemPrompt + cache_control na lesson context.
        var stub = "[AI mentor stub] Zapamiętam Twoje pytanie. Implementacja Claude API w kolejnym commicie.";
        return Task.FromResult(new MentorResponse(stub, 0, 0));
    }

    public Task<GeneratedLesson> GenerateLessonAsync(GenerateLessonRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Generating lesson for topic '{Topic}'", request.Topic);
        // TODO: prompt z PLAN.md sekcja 6, format JSON.
        var stub = new GeneratedLesson(
            Title: request.Topic,
            Theory: "TODO: AI-generated lesson body.",
            StarterCode: "# napisz kod tutaj\n",
            SolutionCode: string.Empty,
            TestsCode: "def test_placeholder():\n    assert True\n",
            Hints: new[] { "Zacznij od małego kroku.", "Sprawdź, co zwraca funkcja." });
        return Task.FromResult(stub);
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrEmpty(_options.ApiKey))
        {
            throw new InvalidOperationException("Claude:ApiKey is not configured.");
        }
    }
}
