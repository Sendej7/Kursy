using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace EduPlatform.Tests.Integration;

public class QandATests : IClassFixture<TestApp>
{
    private readonly TestApp _app;

    public QandATests(TestApp app) => _app = app;

    [Fact]
    public async Task Non_enrolled_cannot_post_question()
    {
        var (_, _, lessonId) = await _app.SeedCourseAsync();
        var (client, _) = await _app.RegisterAsync();

        var resp = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/questions",
            new { title = "Czemu range zaczyna od 0?" });
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Enrolled_can_post_then_other_user_can_answer_and_owner_can_accept()
    {
        var (courseId, _, lessonId) = await _app.SeedCourseAsync();

        var (asker, askerId) = await _app.RegisterAsync("Asker");
        await _app.EnrollAsync(askerId, courseId);
        var (answerer, _) = await _app.RegisterAsync("Helper");

        var qResp = await asker.PostAsJsonAsync($"/api/lessons/{lessonId}/questions",
            new { title = "Tytuł pytania o range", body = "Szczegóły…" });
        qResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var qBody = await qResp.Content.ReadFromJsonAsync<IdResponse>(TestHelpers.Json);
        qBody!.Id.Should().NotBeEmpty();

        // Druga osoba odpowiada (nie wymaga enrolu)
        var aResp = await answerer.PostAsJsonAsync($"/api/questions/{qBody.Id}/answers",
            new { body = "range(n) idzie 0..n-1." });
        aResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var aBody = await aResp.Content.ReadFromJsonAsync<IdResponse>(TestHelpers.Json);

        // Helper nie może akceptować swojej odpowiedzi do swojego pytania (nie jest autorem pytania)
        var bad = await answerer.PostAsync(
            $"/api/questions/{qBody.Id}/accept-answer/{aBody!.Id}", null);
        bad.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // Autor pytania akceptuje
        var accept = await asker.PostAsync(
            $"/api/questions/{qBody.Id}/accept-answer/{aBody.Id}", null);
        accept.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // GET pokazuje IsResolved + accepted answer
        var detail = await asker.GetFromJsonAsync<QuestionDetailDto>(
            $"/api/questions/{qBody.Id}", TestHelpers.Json);
        detail!.AcceptedAnswerId.Should().Be(aBody.Id);
    }

    [Fact]
    public async Task Cannot_upvote_own_answer()
    {
        var (courseId, _, lessonId) = await _app.SeedCourseAsync();
        var (asker, askerId) = await _app.RegisterAsync();
        await _app.EnrollAsync(askerId, courseId);

        var q = await asker.PostAsJsonAsync($"/api/lessons/{lessonId}/questions",
            new { title = "Pytanie o coś" });
        var qId = (await q.Content.ReadFromJsonAsync<IdResponse>(TestHelpers.Json))!.Id;

        var a = await asker.PostAsJsonAsync($"/api/questions/{qId}/answers",
            new { body = "Sam sobie odpowiadam." });
        var aId = (await a.Content.ReadFromJsonAsync<IdResponse>(TestHelpers.Json))!.Id;

        var upvote = await asker.PostAsync($"/api/answers/{aId}/upvote", null);
        upvote.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private record IdResponse(Guid Id);
    private record QuestionDetailDto(Guid Id, Guid LessonId, Guid AuthorId, string Title, Guid? AcceptedAnswerId);
}
