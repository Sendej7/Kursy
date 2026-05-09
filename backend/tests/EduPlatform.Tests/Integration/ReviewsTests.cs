using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace EduPlatform.Tests.Integration;

public class ReviewsTests : IClassFixture<TestApp>
{
    private readonly TestApp _app;

    public ReviewsTests(TestApp app) => _app = app;

    [Fact]
    public async Task Anon_can_list_reviews_empty()
    {
        var (courseId, _, _) = await _app.SeedCourseAsync();
        var anon = _app.CreateClient();

        var resp = await anon.GetAsync($"/api/courses/{courseId}/reviews");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ReviewsResponse>(TestHelpers.Json);
        body!.Summary.Count.Should().Be(0);
        body.Reviews.Should().BeEmpty();
    }

    [Fact]
    public async Task Non_enrolled_cannot_post_review()
    {
        var (courseId, _, _) = await _app.SeedCourseAsync();
        var (client, _) = await _app.RegisterAsync();

        var resp = await client.PostAsJsonAsync($"/api/courses/{courseId}/reviews",
            new { rating = 5, comment = "super" });
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Enrolled_can_upsert_and_then_appears_in_list_with_summary()
    {
        var (courseId, _, _) = await _app.SeedCourseAsync();
        var (client, userId) = await _app.RegisterAsync();
        await _app.EnrollAsync(userId, courseId);

        var post = await client.PostAsJsonAsync($"/api/courses/{courseId}/reviews",
            new { rating = 4, comment = "ok" });
        post.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Druga próba — upsert (edit), nie 409
        var update = await client.PostAsJsonAsync($"/api/courses/{courseId}/reviews",
            new { rating = 5, comment = "po przemyśleniu super" });
        update.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var list = await client.GetFromJsonAsync<ReviewsResponse>(
            $"/api/courses/{courseId}/reviews", TestHelpers.Json);
        list!.Summary.Count.Should().Be(1);
        list.Summary.Average.Should().Be(5);
        list.Reviews.Should().HaveCount(1);
        list.Reviews[0].Rating.Should().Be(5);
    }

    private record ReviewsResponse(Summary Summary, List<ReviewItem> Reviews);
    private record Summary(int Count, double Average);
    private record ReviewItem(Guid Id, Guid UserId, string UserDisplayName, int Rating, string? Comment);
}
