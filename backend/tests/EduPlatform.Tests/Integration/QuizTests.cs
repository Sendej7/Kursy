using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EduPlatform.Tests.Integration;

public class QuizTests : IClassFixture<TestApp>
{
    private readonly TestApp _app;

    public QuizTests(TestApp app) => _app = app;

    private async Task<Guid> SeedQuizLessonAsync(string quizJson)
    {
        var (_, _, lessonId) = await _app.SeedCourseAsync();
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lesson = await db.Lessons.FirstAsync(l => l.Id == lessonId);
        lesson.Type = LessonType.Quiz;
        lesson.ContentMarkdown = quizJson;
        await db.SaveChangesAsync();
        return lessonId;
    }

    private const string SampleQuiz = """
    {
      "intro": "Test intro",
      "passingPercentage": 70,
      "questions": [
        { "id": "q1", "prompt": "2+2?", "options": ["3", "4", "5"], "correctIndex": 1, "explanation": "Basic math." },
        { "id": "q2", "prompt": "Capital of Poland?", "options": ["Krakow", "Warsaw"], "correctIndex": 1 }
      ]
    }
    """;

    [Fact]
    public async Task GetQuiz_returns_questions_without_correct_index()
    {
        var lessonId = await SeedQuizLessonAsync(SampleQuiz);
        var client = _app.CreateClient();

        var resp = await client.GetAsync($"/api/lessons/{lessonId}/quiz");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var raw = await resp.Content.ReadAsStringAsync();
        raw.Should().NotContain("correctIndex");
        raw.Should().NotContain("explanation");

        var body = await resp.Content.ReadFromJsonAsync<QuizDto>(TestHelpers.Json);
        body!.Intro.Should().Be("Test intro");
        body.PassingPercentage.Should().Be(70);
        body.Questions.Should().HaveCount(2);
        body.Questions[0].Prompt.Should().Be("2+2?");
        body.Questions[0].Options.Should().Equal("3", "4", "5");
    }

    [Fact]
    public async Task GetQuiz_returns_400_for_non_quiz_lesson()
    {
        var (_, _, lessonId) = await _app.SeedCourseAsync();
        var client = _app.CreateClient();

        var resp = await client.GetAsync($"/api/lessons/{lessonId}/quiz");
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetQuiz_returns_404_for_missing_lesson()
    {
        var client = _app.CreateClient();
        var resp = await client.GetAsync($"/api/lessons/{Guid.NewGuid()}/quiz");
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SubmitQuiz_requires_auth()
    {
        var lessonId = await SeedQuizLessonAsync(SampleQuiz);
        var client = _app.CreateClient();

        var resp = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/quiz/submit", new
        {
            answers = new[] { new { questionId = "q1", selectedIndex = 1 } },
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SubmitQuiz_all_correct_passes_and_completes_lesson()
    {
        var lessonId = await SeedQuizLessonAsync(SampleQuiz);
        var (client, _) = await _app.RegisterAsync();

        var resp = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/quiz/submit", new
        {
            answers = new[]
            {
                new { questionId = "q1", selectedIndex = 1 },
                new { questionId = "q2", selectedIndex = 1 },
            },
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<QuizSubmitResult>(TestHelpers.Json);
        body!.Score.Should().Be(2);
        body.Total.Should().Be(2);
        body.Percentage.Should().Be(100);
        body.Passed.Should().BeTrue();
        body.PerQuestion.Should().HaveCount(2);
        body.PerQuestion.Should().OnlyContain(p => p.Correct);
        body.PerQuestion[0].CorrectIndex.Should().Be(1);
        body.PerQuestion[0].Explanation.Should().Be("Basic math.");

        // Lesson should now be marked complete in GET /api/lessons/{id}
        var lesson = await client.GetFromJsonAsync<LessonDetail>($"/api/lessons/{lessonId}", TestHelpers.Json);
        lesson!.IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task SubmitQuiz_partial_fails_threshold_and_does_not_complete()
    {
        var lessonId = await SeedQuizLessonAsync(SampleQuiz);
        var (client, _) = await _app.RegisterAsync();

        var resp = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/quiz/submit", new
        {
            answers = new[]
            {
                new { questionId = "q1", selectedIndex = 1 },     // correct
                new { questionId = "q2", selectedIndex = 0 },     // wrong
            },
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<QuizSubmitResult>(TestHelpers.Json);
        body!.Score.Should().Be(1);
        body.Percentage.Should().Be(50);
        body.Passed.Should().BeFalse();
        body.PerQuestion.Single(p => p.Id == "q2").Correct.Should().BeFalse();

        var lesson = await client.GetFromJsonAsync<LessonDetail>($"/api/lessons/{lessonId}", TestHelpers.Json);
        lesson!.IsCompleted.Should().BeFalse();
    }

    [Fact]
    public async Task SubmitQuiz_missing_answer_counts_as_wrong()
    {
        var lessonId = await SeedQuizLessonAsync(SampleQuiz);
        var (client, _) = await _app.RegisterAsync();

        var resp = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/quiz/submit", new
        {
            answers = new[] { new { questionId = "q1", selectedIndex = 1 } },
        });

        var body = await resp.Content.ReadFromJsonAsync<QuizSubmitResult>(TestHelpers.Json);
        body!.Score.Should().Be(1);
        body.Total.Should().Be(2);
        body.Passed.Should().BeFalse();
        body.PerQuestion.Single(p => p.Id == "q2").Correct.Should().BeFalse();
    }

    [Fact]
    public async Task SubmitQuiz_returns_400_when_quiz_has_no_questions()
    {
        var lessonId = await SeedQuizLessonAsync("""{ "passingPercentage": 70, "questions": [] }""");
        var (client, _) = await _app.RegisterAsync();

        var resp = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/quiz/submit", new
        {
            answers = Array.Empty<object>(),
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private record QuizDto(string? Intro, int PassingPercentage, List<QuizQuestion> Questions);
    private record QuizQuestion(string Id, string Prompt, List<string> Options);
    private record QuizSubmitResult(
        int Score,
        int Total,
        int Percentage,
        bool Passed,
        List<QuizPerQuestion> PerQuestion);
    private record QuizPerQuestion(string Id, bool Correct, int CorrectIndex, string? Explanation);
    private record LessonDetail(Guid Id, string Title, string Type, bool IsCompleted);
}
