using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EduPlatform.Tests.Integration;

/// <summary>
/// Pełen flow interaktywnej ścieżki: autor tworzy lekcję + ćwiczenie → uczeń pobiera
/// szczegóły lekcji → zapisuje submission → kończy lekcję → dostaje XP.
/// Pokrywa też bugfix UpsertExercise (Add() vs Modified).
/// </summary>
public class ExerciseFlowTests : IClassFixture<TestApp>
{
    private readonly TestApp _app;

    public ExerciseFlowTests(TestApp app) => _app = app;

    // ──────────────── helpers ────────────────
    private async Task<(HttpClient client, Guid authorId)> AuthorClientAsync()
    {
        // Rejestracja → promocja w DB → relogin (żeby JWT zawierał nową rolę Author).
        var email = $"author-{Guid.NewGuid():N}@example.com";
        const string password = "very-secret";

        var c = _app.CreateClient();
        var regResp = await c.PostAsJsonAsync("/api/auth/register", new
        {
            email, password, displayName = "Autor",
        });
        regResp.EnsureSuccessStatusCode();
        var regBody = await regResp.Content.ReadFromJsonAsync<TestHelpers.AuthBody>(TestHelpers.Json);
        var userId = regBody!.User.Id;

        // Promocja Student → Author w DB
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            user.Role = UserRole.Author;
            await db.SaveChangesAsync();
        }

        // Relogin → JWT z nową rolą
        var loginResp = await c.PostAsJsonAsync("/api/auth/login", new { email, password });
        loginResp.EnsureSuccessStatusCode();
        var loginBody = await loginResp.Content.ReadFromJsonAsync<TestHelpers.AuthBody>(TestHelpers.Json);
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginBody!.Token);

        return (c, userId);
    }

    private async Task<(Guid courseId, Guid moduleId)> CreateOwnedCourseAsync(HttpClient authorClient)
    {
        var resp = await authorClient.PostAsJsonAsync("/api/author/courses", new
        {
            title = "Test JS Course",
            description = "Testowy",
            language = "JavaScript",
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var c = await resp.Content.ReadFromJsonAsync<IdSlugResp>(TestHelpers.Json);

        var modResp = await authorClient.PostAsJsonAsync("/api/author/modules", new
        {
            courseId = c!.Id,
            title = "Module 1",
            description = "",
            order = 1,
        });
        var mod = await modResp.Content.ReadFromJsonAsync<IdResp>(TestHelpers.Json);
        return (c.Id, mod!.Id);
    }

    private async Task<Guid> CreateLessonAsync(HttpClient authorClient, Guid moduleId, string type = "Exercise")
    {
        var resp = await authorClient.PostAsJsonAsync("/api/author/lessons", new
        {
            moduleId,
            title = "Test Lesson",
            order = 1,
            type,
            contentMarkdown = "# Test",
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var l = await resp.Content.ReadFromJsonAsync<IdResp>(TestHelpers.Json);
        return l!.Id;
    }

    private async Task PublishCourseAsync(Guid courseId)
    {
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var c = await db.Courses.FirstAsync(x => x.Id == courseId);
        c.Visibility = CourseVisibility.Public;
        await db.SaveChangesAsync();
    }

    // ──────────────── UpsertExercise — bugfix coverage ────────────────

    [Fact]
    public async Task UpsertExercise_creates_new_exercise_on_first_call()
    {
        var (authorClient, _) = await AuthorClientAsync();
        var (_, moduleId) = await CreateOwnedCourseAsync(authorClient);
        var lessonId = await CreateLessonAsync(authorClient, moduleId);

        // Bez fixu (??= bez Add()) ten request dawał 500 DbUpdateConcurrencyException
        var resp = await authorClient.PutAsJsonAsync($"/api/author/lessons/{lessonId}/exercise", new
        {
            prompt = "Wypisz Hello World",
            starterCode = "// twój kod",
            solutionCode = "console.log('Hello World');",
            testsCode = "function test_x() { assertContains(__stdout__, 'Hello'); }",
            hints = new[] { "Użyj console.log" },
        });

        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify że ćwiczenie faktycznie istnieje w bazie
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ex = await db.Exercises.FirstOrDefaultAsync(e => e.LessonId == lessonId);
        ex.Should().NotBeNull();
        ex!.Prompt.Should().Be("Wypisz Hello World");
        ex.SolutionCode.Should().Contain("Hello World");
        ex.Hints.Should().ContainSingle().Which.Should().Be("Użyj console.log");
    }

    [Fact]
    public async Task UpsertExercise_updates_existing_exercise_on_second_call()
    {
        var (authorClient, _) = await AuthorClientAsync();
        var (_, moduleId) = await CreateOwnedCourseAsync(authorClient);
        var lessonId = await CreateLessonAsync(authorClient, moduleId);

        // Pierwsze wywołanie — create
        var r1 = await authorClient.PutAsJsonAsync($"/api/author/lessons/{lessonId}/exercise", new
        {
            prompt = "Pierwsza wersja",
            starterCode = "v1",
            solutionCode = "v1",
            testsCode = "// v1",
            hints = new[] { "h1" },
        });
        r1.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Drugie wywołanie — update
        var r2 = await authorClient.PutAsJsonAsync($"/api/author/lessons/{lessonId}/exercise", new
        {
            prompt = "Druga wersja",
            starterCode = "v2",
            solutionCode = "v2",
            testsCode = "// v2",
            hints = new[] { "h2", "h3" },
        });
        r2.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var exercises = await db.Exercises.Where(e => e.LessonId == lessonId).ToListAsync();
        exercises.Should().HaveCount(1);  // ten sam wpis, nie duplikat
        exercises[0].Prompt.Should().Be("Druga wersja");
        exercises[0].Hints.Should().HaveCount(2);
    }

    [Fact]
    public async Task UpsertExercise_returns_404_for_lesson_owned_by_someone_else()
    {
        var (authorClient, _) = await AuthorClientAsync();
        var (_, moduleId) = await CreateOwnedCourseAsync(authorClient);
        var lessonId = await CreateLessonAsync(authorClient, moduleId);

        // Inny autor próbuje
        var (otherClient, _) = await AuthorClientAsync();
        var resp = await otherClient.PutAsJsonAsync($"/api/author/lessons/{lessonId}/exercise", new
        {
            prompt = "Hack",
            starterCode = "",
            solutionCode = "",
            testsCode = "",
            hints = Array.Empty<string>(),
        });

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ──────────────── Lesson endpoint zwraca exercise ────────────────

    [Fact]
    public async Task GetLesson_returns_exercise_after_upsert()
    {
        var (authorClient, _) = await AuthorClientAsync();
        var (courseId, moduleId) = await CreateOwnedCourseAsync(authorClient);
        var lessonId = await CreateLessonAsync(authorClient, moduleId);
        await PublishCourseAsync(courseId);

        await authorClient.PutAsJsonAsync($"/api/author/lessons/{lessonId}/exercise", new
        {
            prompt = "Add two numbers",
            starterCode = "function add(a, b) {\n  // your code\n}",
            solutionCode = "function add(a, b) { return a + b; }",
            testsCode = "function test_basic() { assertEqual(add(2, 3), 5); }",
            hints = new[] { "Use +" },
        });

        var client = _app.CreateClient();
        var resp = await client.GetAsync($"/api/lessons/{lessonId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var lesson = await resp.Content.ReadFromJsonAsync<LessonDetail>(TestHelpers.Json);
        lesson!.Exercise.Should().NotBeNull();
        lesson.Exercise!.Prompt.Should().Be("Add two numbers");
        lesson.Exercise.StarterCode.Should().Contain("function add");
        lesson.Exercise.Hints.Should().ContainSingle().Which.Should().Be("Use +");
    }

    // ──────────────── Submission flow ────────────────

    [Fact]
    public async Task RecordSubmission_requires_auth()
    {
        var client = _app.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/submissions", new
        {
            exerciseId = Guid.NewGuid(),
            code = "x",
            passed = true,
            timeSpentSeconds = 1,
            errorMessage = (string?)null,
            stdout = "",
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RecordSubmission_returns_404_for_missing_exercise()
    {
        var (student, _) = await _app.RegisterAsync();
        var resp = await student.PostAsJsonAsync("/api/submissions", new
        {
            exerciseId = Guid.NewGuid(),
            code = "x",
            passed = true,
            timeSpentSeconds = 1,
            errorMessage = (string?)null,
            stdout = "",
        });
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task RecordSubmission_increments_attempt_number()
    {
        var (authorClient, _) = await AuthorClientAsync();
        var (courseId, moduleId) = await CreateOwnedCourseAsync(authorClient);
        var lessonId = await CreateLessonAsync(authorClient, moduleId);
        await PublishCourseAsync(courseId);

        await authorClient.PutAsJsonAsync($"/api/author/lessons/{lessonId}/exercise", new
        {
            prompt = "p", starterCode = "s", solutionCode = "sol",
            testsCode = "// t", hints = Array.Empty<string>(),
        });

        Guid exerciseId;
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            exerciseId = (await db.Exercises.FirstAsync(e => e.LessonId == lessonId)).Id;
        }

        var (student, _) = await _app.RegisterAsync();

        async Task<int> Submit(bool passed)
        {
            var resp = await student.PostAsJsonAsync("/api/submissions", new
            {
                exerciseId,
                code = "// attempt",
                passed,
                timeSpentSeconds = 10,
                errorMessage = (string?)null,
                stdout = "ok",
            });
            resp.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await resp.Content.ReadFromJsonAsync<SubmissionResp>(TestHelpers.Json);
            return body!.AttemptNumber;
        }

        (await Submit(false)).Should().Be(1);
        (await Submit(false)).Should().Be(2);
        (await Submit(true)).Should().Be(3);
    }

    // ──────────────── Complete lesson flow ────────────────

    [Fact]
    public async Task CompleteLesson_awards_xp_first_time_only()
    {
        var (authorClient, _) = await AuthorClientAsync();
        var (courseId, moduleId) = await CreateOwnedCourseAsync(authorClient);
        var lessonId = await CreateLessonAsync(authorClient, moduleId);
        await PublishCourseAsync(courseId);

        var (student, _) = await _app.RegisterAsync();

        // Pierwsze ukończenie — przyznaje XP
        var first = await student.PostAsJsonAsync(
            $"/api/lessons/{lessonId}/complete", new { timeSpentSeconds = 60 });
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        var firstBody = await first.Content.ReadFromJsonAsync<CompletionResp>(TestHelpers.Json);
        firstBody!.XpGained.Should().BeGreaterThan(0);

        // Drugie ukończenie — XP NIE przyznane (firstTimeCompletion = false)
        var second = await student.PostAsJsonAsync(
            $"/api/lessons/{lessonId}/complete", new { timeSpentSeconds = 60 });
        var secondBody = await second.Content.ReadFromJsonAsync<CompletionResp>(TestHelpers.Json);
        secondBody!.XpGained.Should().Be(0);
    }

    [Fact]
    public async Task CompleteLesson_sets_isCompleted_in_GetLesson_response()
    {
        var (authorClient, _) = await AuthorClientAsync();
        var (courseId, moduleId) = await CreateOwnedCourseAsync(authorClient);
        var lessonId = await CreateLessonAsync(authorClient, moduleId);
        await PublishCourseAsync(courseId);

        var (student, _) = await _app.RegisterAsync();

        var before = await student.GetFromJsonAsync<LessonDetail>($"/api/lessons/{lessonId}", TestHelpers.Json);
        before!.IsCompleted.Should().BeFalse();

        await student.PostAsJsonAsync($"/api/lessons/{lessonId}/complete", new { timeSpentSeconds = 30 });

        var after = await student.GetFromJsonAsync<LessonDetail>($"/api/lessons/{lessonId}", TestHelpers.Json);
        after!.IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task CompleteLesson_requires_auth()
    {
        var client = _app.CreateClient();
        var resp = await client.PostAsJsonAsync(
            $"/api/lessons/{Guid.NewGuid()}/complete", new { timeSpentSeconds = 1 });
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task FullFlow_author_creates_lesson_with_exercise_student_completes()
    {
        // Pełen happy-path test: author robi lekcję z ćwiczeniem, publikuje,
        // student wchodzi, dostaje exercise, robi submission, oznacza ukończoną.
        var (author, _) = await AuthorClientAsync();
        var (courseId, moduleId) = await CreateOwnedCourseAsync(author);
        var lessonId = await CreateLessonAsync(author, moduleId);
        await PublishCourseAsync(courseId);

        // 1. Autor dodaje ćwiczenie
        await author.PutAsJsonAsync($"/api/author/lessons/{lessonId}/exercise", new
        {
            prompt = "Sum array",
            starterCode = "function sum(arr) { /* TODO */ }",
            solutionCode = "function sum(arr) { return arr.reduce((a,b)=>a+b,0); }",
            testsCode = "function test_basic() { assertEqual(sum([1,2,3]), 6); }",
            hints = new[] { "Use reduce" },
        });

        // 2. Student pobiera lekcję — widzi exercise
        var (student, _) = await _app.RegisterAsync();
        var lesson = await student.GetFromJsonAsync<LessonDetail>(
            $"/api/lessons/{lessonId}", TestHelpers.Json);
        lesson!.Exercise.Should().NotBeNull();
        var exerciseId = lesson.Exercise!.Id;

        // 3. Student zapisuje 2 nieudane próby
        var r1 = await student.PostAsJsonAsync("/api/submissions", new
        {
            exerciseId, code = "broken", passed = false,
            timeSpentSeconds = 20, errorMessage = "TypeError",
            stdout = "",
        });
        r1.EnsureSuccessStatusCode();
        var r2 = await student.PostAsJsonAsync("/api/submissions", new
        {
            exerciseId, code = "still broken", passed = false,
            timeSpentSeconds = 30, errorMessage = "TypeError",
            stdout = "",
        });
        r2.EnsureSuccessStatusCode();

        // 4. Student zapisuje udaną próbę
        var passResp = await student.PostAsJsonAsync("/api/submissions", new
        {
            exerciseId,
            code = "function sum(arr) { return arr.reduce((a,b)=>a+b,0); }",
            passed = true,
            timeSpentSeconds = 45,
            errorMessage = (string?)null,
            stdout = "ok",
        });
        passResp.EnsureSuccessStatusCode();
        var passBody = await passResp.Content.ReadFromJsonAsync<SubmissionResp>(TestHelpers.Json);
        passBody!.AttemptNumber.Should().Be(3);

        // 5. Student oznacza lekcję ukończoną
        var done = await student.PostAsJsonAsync(
            $"/api/lessons/{lessonId}/complete", new { timeSpentSeconds = 45 });
        var doneBody = await done.Content.ReadFromJsonAsync<CompletionResp>(TestHelpers.Json);
        doneBody!.XpGained.Should().BeGreaterThan(0);

        // 6. Verify w bazie
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var submissions = await db.Submissions
            .Where(s => s.ExerciseId == exerciseId).ToListAsync();
        submissions.Should().HaveCount(3);
        submissions.Count(s => s.Passed).Should().Be(1);
    }

    // ──────────────── DTOs ────────────────
    private record IdResp(Guid Id);
    private record IdSlugResp(Guid Id, string Slug);
    private record SubmissionResp(Guid Id, int AttemptNumber);
    private record CompletionResp(
        bool CertificateIssued, string? CertificateCode,
        int XpGained, int CurrentStreak, int TotalXp, bool StreakBumped);
    private record ExerciseDetail(
        Guid Id, string Prompt, string StarterCode,
        string SolutionCode, string TestsCode, List<string> Hints);
    private record LessonDetail(
        Guid Id, string Title, int Order, string Type, string ContentMarkdown,
        string? DraftContentMarkdown, string? VideoUrl, Guid ModuleId,
        string CourseLanguage, ExerciseDetail? Exercise, bool IsCompleted);
}
