using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduPlatform.AiService;

/// <summary>
/// Wrapper na Claude API. System prompt po polsku, mentor "naprowadza, nie daje gotowca".
/// Lesson context idzie z cache_control żeby gryźć cenę powtórnych pytań w tej samej lekcji.
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

    private const string LessonGenSystemPrompt = """
        Jesteś dydaktykiem programowania z 10-letnim doświadczeniem. Tworzysz
        interaktywne lekcje po polsku dla początkujących. Zasady:
        - Wyjaśnienia konkretne, krótkie, z przykładem.
        - Każde nowe pojęcie wprowadzasz raz, nie zakładasz wiedzy spoza poprzednich lekcji.
        - Zadanie testuje DOKŁADNIE to czego uczy lekcja.
        - Język polski, naturalny, "tykasz" studenta.
        Zwracasz wyłącznie poprawny JSON wg podanego schematu, bez komentarza.
        """;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _httpClient;
    private readonly ClaudeOptions _options;
    private readonly ILogger<ClaudeAiMentor> _logger;

    public ClaudeAiMentor(HttpClient httpClient, IOptions<ClaudeOptions> options, ILogger<ClaudeAiMentor> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<MentorResponse> AskAsync(MentorRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_options.ApiKey))
        {
            _logger.LogWarning("Claude API key not configured — returning stub answer.");
            return new MentorResponse(
                "[AI mentor wyłączony] Skonfiguruj klucz Claude w appsettings/secrets, by dostać prawdziwą odpowiedź.",
                0, 0);
        }

        var contextBlocks = new List<object>
        {
            new
            {
                type = "text",
                text = $"Treść lekcji:\n{request.LessonContext}",
                cache_control = new { type = "ephemeral" },
            },
        };

        if (!string.IsNullOrWhiteSpace(request.StudentCode))
        {
            contextBlocks.Add(new { type = "text", text = $"Aktualny kod studenta:\n```python\n{request.StudentCode}\n```" });
        }
        if (!string.IsNullOrWhiteSpace(request.ErrorMessage))
        {
            contextBlocks.Add(new { type = "text", text = $"Błąd jaki dostał student:\n{request.ErrorMessage}" });
        }
        contextBlocks.Add(new { type = "text", text = $"Pytanie studenta: {request.Question}" });

        var body = new
        {
            model = _options.Model,
            max_tokens = _options.MaxTokens,
            system = MentorSystemPrompt,
            messages = new[]
            {
                new { role = "user", content = contextBlocks },
            },
        };

        var (text, usage) = await CallClaudeAsync(body, cancellationToken);
        return new MentorResponse(text, usage.InputTokens, usage.OutputTokens);
    }

    public async Task<GeneratedLesson> GenerateLessonAsync(GenerateLessonRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_options.ApiKey))
        {
            return StubLesson(request);
        }

        var userPrompt = $$"""
            Stwórz lekcję na temat: {{request.Topic}}.
            Język programowania: {{request.TargetLanguage}}.
            Kontekst poprzednich lekcji: {{request.PreviousLessonsContext}}.

            Zwróć WYŁĄCZNIE JSON o schemacie:
            {
              "title": string,
              "theory": string (markdown),
              "starterCode": string,
              "solutionCode": string,
              "testsCode": string,
              "hints": string[]
            }
            """;

        var body = new
        {
            model = _options.Model,
            max_tokens = Math.Max(_options.MaxTokens, 2048),
            system = LessonGenSystemPrompt,
            messages = new[]
            {
                new { role = "user", content = userPrompt },
            },
        };

        var (text, _) = await CallClaudeAsync(body, cancellationToken);

        try
        {
            // Claude często owija JSON w ``` lub doda preambułę — wytnij pierwszy obiekt.
            var json = ExtractJsonObject(text);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            return new GeneratedLesson(
                Title: root.GetProperty("title").GetString() ?? request.Topic,
                Theory: root.GetProperty("theory").GetString() ?? string.Empty,
                StarterCode: root.GetProperty("starterCode").GetString() ?? string.Empty,
                SolutionCode: root.GetProperty("solutionCode").GetString() ?? string.Empty,
                TestsCode: root.GetProperty("testsCode").GetString() ?? string.Empty,
                Hints: root.TryGetProperty("hints", out var h) && h.ValueKind == JsonValueKind.Array
                    ? h.EnumerateArray().Select(e => e.GetString() ?? string.Empty).ToArray()
                    : Array.Empty<string>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse generated lesson JSON. Raw: {Raw}", text);
            return StubLesson(request);
        }
    }

    private async Task<(string Text, ClaudeUsage Usage)> CallClaudeAsync(object body, CancellationToken ct)
    {
        var resp = await _httpClient.PostAsJsonAsync("/v1/messages", body, JsonOpts, ct);
        resp.EnsureSuccessStatusCode();

        var payload = await resp.Content.ReadFromJsonAsync<ClaudeResponse>(JsonOpts, ct)
            ?? throw new InvalidOperationException("Empty response from Claude.");

        var text = string.Join("", payload.Content?.Where(c => c.Type == "text").Select(c => c.Text) ?? Array.Empty<string>());
        return (text, payload.Usage ?? new ClaudeUsage());
    }

    private static string ExtractJsonObject(string text)
    {
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end < 0 || end <= start)
        {
            throw new InvalidOperationException("No JSON object found in model output.");
        }
        return text.Substring(start, end - start + 1);
    }

    private static GeneratedLesson StubLesson(GenerateLessonRequest req) => new(
        Title: req.Topic,
        Theory: $"## {req.Topic}\n\n[AI generation off — skonfiguruj Claude API key.]",
        StarterCode: "# napisz kod tutaj\n",
        SolutionCode: string.Empty,
        TestsCode: "def test_placeholder():\n    assert True\n",
        Hints: new[] { "Zacznij od małego kroku." });

    private sealed record ClaudeResponse(
        [property: JsonPropertyName("content")] ClaudeContent[]? Content,
        [property: JsonPropertyName("usage")] ClaudeUsage? Usage);

    private sealed record ClaudeContent(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("text")] string Text);

    public sealed record ClaudeUsage(
        [property: JsonPropertyName("input_tokens")] int InputTokens = 0,
        [property: JsonPropertyName("output_tokens")] int OutputTokens = 0);
}
