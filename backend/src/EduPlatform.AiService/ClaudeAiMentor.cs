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

    private const string OutlineSystemPrompt = """
        Jesteś dydaktykiem programowania. Z dostarczonego materiału (notatki,
        fragment skryptu, wykład) tworzysz strukturę interaktywnego kursu
        po polsku. Dziel na 2–6 modułów, każdy ma 2–6 lekcji. Każda lekcja
        ma temat („topic") opisujący CO uczy — po nim AI w drugim kroku
        wygeneruje treść. Tytuły zwięzłe, opisy 1 zdanie. Zwracasz
        WYŁĄCZNIE JSON.
        """;

    private const string ImprovementSystemPrompt = """
        Jesteś dydaktykiem programowania, który ulepsza istniejące lekcje na
        podstawie realnych danych: gdzie studenci się zacinają, jakie błędy
        popełniają najczęściej, o co pytają mentora AI. Diagnozujesz problem
        konkretnie ("brakuje wyjaśnienia X przed zadaniem"), proponujesz
        listę krótkich, wykonalnych zmian, a potem przepisujesz lekcję.
        Zachowujesz styl: po polsku, "tykasz" studenta, konkretnie.
        Zwracasz WYŁĄCZNIE JSON.
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

        // Dodatek autora kursu (opcjonalny) — appendowany do default system promptu.
        // Przycięty do 2000 znaków żeby nie dolatywał do limitu tokenów.
        var systemPrompt = MentorSystemPrompt;
        if (!string.IsNullOrWhiteSpace(request.CourseInstructions))
        {
            var trimmed = request.CourseInstructions.Trim();
            if (trimmed.Length > 2000) trimmed = trimmed[..2000];
            systemPrompt = MentorSystemPrompt
                + "\n\n## Dodatkowe instrukcje od autora tego kursu:\n"
                + trimmed;
        }

        var body = new
        {
            model = _options.Model,
            max_tokens = _options.MaxTokens,
            system = systemPrompt,
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

    public async Task<LessonImprovement> ProposeImprovementAsync(LessonImprovementContext context, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_options.ApiKey))
        {
            return new LessonImprovement(
                Diagnosis: "[AI off] Skonfiguruj Claude API key, by dostać prawdziwą diagnozę.",
                Suggestions: Array.Empty<string>(),
                RewrittenLesson: null);
        }

        var errorList = string.Join("\n", context.TopErrors.Select(e => $"- {e.Occurrences}× {e.Description}"));
        var questionList = string.Join("\n", context.TopQuestions.Select(q => $"- {q.Occurrences}× {q.Question}"));

        var userPrompt = $$"""
            Aktualna lekcja:
            ## {{context.CurrentTitle}}
            {{context.CurrentMarkdown}}

            Kod startowy:
            ```python
            {{context.CurrentStarterCode}}
            ```

            Testy:
            ```python
            {{context.CurrentTestsCode}}
            ```

            Dane analityczne:
            - % ukończenia: {{(context.CompletionRate * 100):F0}}%
            - średnia liczba prób: {{context.AvgAttempts:F1}}
            - najczęstsze błędy:
            {{(string.IsNullOrEmpty(errorList) ? "(brak)" : errorList)}}
            - najczęstsze pytania do mentora:
            {{(string.IsNullOrEmpty(questionList) ? "(brak)" : questionList)}}

            Zadanie: zdiagnozuj co jest źle, zaproponuj 3–5 konkretnych zmian
            i przepisz całą lekcję z poprawkami.

            Zwróć WYŁĄCZNIE JSON:
            {
              "diagnosis": string,
              "suggestions": string[],
              "rewrittenLesson": {
                "title": string,
                "theory": string (markdown),
                "starterCode": string,
                "solutionCode": string,
                "testsCode": string,
                "hints": string[]
              }
            }
            """;

        var body = new
        {
            model = _options.Model,
            max_tokens = Math.Max(_options.MaxTokens, 3072),
            system = ImprovementSystemPrompt,
            messages = new[] { new { role = "user", content = userPrompt } },
        };

        var (text, _) = await CallClaudeAsync(body, cancellationToken);

        try
        {
            var json = ExtractJsonObject(text);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            GeneratedLesson? rewritten = null;
            if (root.TryGetProperty("rewrittenLesson", out var rl) && rl.ValueKind == JsonValueKind.Object)
            {
                rewritten = new GeneratedLesson(
                    Title: rl.GetProperty("title").GetString() ?? context.CurrentTitle,
                    Theory: rl.GetProperty("theory").GetString() ?? string.Empty,
                    StarterCode: rl.GetProperty("starterCode").GetString() ?? string.Empty,
                    SolutionCode: rl.GetProperty("solutionCode").GetString() ?? string.Empty,
                    TestsCode: rl.GetProperty("testsCode").GetString() ?? string.Empty,
                    Hints: rl.TryGetProperty("hints", out var h) && h.ValueKind == JsonValueKind.Array
                        ? h.EnumerateArray().Select(e => e.GetString() ?? string.Empty).ToArray()
                        : Array.Empty<string>());
            }

            return new LessonImprovement(
                Diagnosis: root.TryGetProperty("diagnosis", out var d) ? d.GetString() ?? string.Empty : string.Empty,
                Suggestions: root.TryGetProperty("suggestions", out var s) && s.ValueKind == JsonValueKind.Array
                    ? s.EnumerateArray().Select(e => e.GetString() ?? string.Empty).ToArray()
                    : Array.Empty<string>(),
                RewrittenLesson: rewritten);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse improvement JSON. Raw: {Raw}", text);
            return new LessonImprovement("Nie udało się zinterpretować odpowiedzi AI.", Array.Empty<string>(), null);
        }
    }

    public async Task<CourseOutline> ProposeCourseOutlineAsync(CourseOutlineRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_options.ApiKey))
        {
            return new CourseOutline(
                Title: request.CourseTitleHint ?? "Kurs (AI off)",
                Description: "[AI off] Skonfiguruj Claude API key.",
                TargetLanguage: request.TargetLanguage,
                Modules: Array.Empty<ModuleOutline>());
        }

        var snippet = request.SourceText.Length > 8000 ? request.SourceText[..8000] : request.SourceText;
        var titleHint = request.CourseTitleHint is null ? string.Empty : $"\nTytuł sugerowany: {request.CourseTitleHint}";

        var userPrompt = $$"""
            Materiał źródłowy (fragment, do 8000 znaków):
            ---
            {{snippet}}
            ---

            Cel: stworzyć strukturę kursu uczącego programowania w {{request.TargetLanguage}}.{{titleHint}}

            Zwróć WYŁĄCZNIE JSON o schemacie:
            {
              "title": string,
              "description": string,
              "modules": [
                {
                  "title": string,
                  "description": string,
                  "lessons": [
                    { "title": string, "summary": string, "topic": string }
                  ]
                }
              ]
            }
            """;

        var body = new
        {
            model = _options.Model,
            max_tokens = Math.Max(_options.MaxTokens, 2048),
            system = OutlineSystemPrompt,
            messages = new[] { new { role = "user", content = userPrompt } },
        };

        var (text, _) = await CallClaudeAsync(body, cancellationToken);

        try
        {
            var json = ExtractJsonObject(text);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var modules = root.TryGetProperty("modules", out var modsEl) && modsEl.ValueKind == JsonValueKind.Array
                ? modsEl.EnumerateArray().Select(m => new ModuleOutline(
                    Title: m.GetProperty("title").GetString() ?? string.Empty,
                    Description: m.TryGetProperty("description", out var d) ? d.GetString() ?? string.Empty : string.Empty,
                    Lessons: m.TryGetProperty("lessons", out var ls) && ls.ValueKind == JsonValueKind.Array
                        ? ls.EnumerateArray().Select(l => new LessonOutline(
                            Title: l.GetProperty("title").GetString() ?? string.Empty,
                            Summary: l.TryGetProperty("summary", out var s) ? s.GetString() ?? string.Empty : string.Empty,
                            Topic: l.TryGetProperty("topic", out var t) ? t.GetString() ?? string.Empty : string.Empty))
                            .ToArray()
                        : Array.Empty<LessonOutline>())).ToArray()
                : Array.Empty<ModuleOutline>();

            return new CourseOutline(
                Title: root.TryGetProperty("title", out var tt) ? tt.GetString() ?? "Kurs" : "Kurs",
                Description: root.TryGetProperty("description", out var dd) ? dd.GetString() ?? string.Empty : string.Empty,
                TargetLanguage: request.TargetLanguage,
                Modules: modules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse course outline JSON. Raw: {Raw}", text);
            return new CourseOutline("Kurs", "Nie udało się sparsować odpowiedzi AI.", request.TargetLanguage, Array.Empty<ModuleOutline>());
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
