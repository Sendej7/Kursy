using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace EduPlatform.Tests.Integration;

public class FavoritesAchievementsTests : IClassFixture<TestApp>
{
    private readonly TestApp _app;

    public FavoritesAchievementsTests(TestApp app) => _app = app;

    [Fact]
    public async Task Favorite_toggle_round_trip()
    {
        var (courseId, _, _) = await _app.SeedCourseAsync();
        var (client, _) = await _app.RegisterAsync();

        var on = await client.PostAsync($"/api/courses/{courseId}/favorite", null);
        on.StatusCode.Should().Be(HttpStatusCode.OK);
        var onBody = await on.Content.ReadFromJsonAsync<FavResp>(TestHelpers.Json);
        onBody!.Favorited.Should().BeTrue();

        var mine = await client.GetFromJsonAsync<List<FavCourse>>("/api/courses/favorites/mine", TestHelpers.Json);
        mine!.Should().ContainSingle().Which.CourseId.Should().Be(courseId);

        var off = await client.PostAsync($"/api/courses/{courseId}/favorite", null);
        var offBody = await off.Content.ReadFromJsonAsync<FavResp>(TestHelpers.Json);
        offBody!.Favorited.Should().BeFalse();

        var emptied = await client.GetFromJsonAsync<List<FavCourse>>("/api/courses/favorites/mine", TestHelpers.Json);
        emptied!.Should().BeEmpty();
    }

    [Fact]
    public async Task Achievements_list_returns_all_types_unearned_for_fresh_user()
    {
        var (client, _) = await _app.RegisterAsync();

        var resp = await client.GetFromJsonAsync<List<AchievementDto>>("/api/me/achievements", TestHelpers.Json);
        resp!.Should().HaveCountGreaterThan(0);
        resp.Should().OnlyContain(a => !a.Earned);
    }

    [Fact]
    public async Task Lesson_complete_awards_FirstLesson_achievement()
    {
        var (courseId, _, lessonId) = await _app.SeedCourseAsync();
        var (client, userId) = await _app.RegisterAsync();
        await _app.EnrollAsync(userId, courseId);

        var done = await client.PostAsJsonAsync($"/api/lessons/{lessonId}/complete",
            new { timeSpentSeconds = 30 });
        done.StatusCode.Should().Be(HttpStatusCode.OK);

        var resp = await client.GetFromJsonAsync<List<AchievementDto>>("/api/me/achievements", TestHelpers.Json);
        resp!.Should().Contain(a => a.Type == "FirstLesson" && a.Earned);
    }

    private record FavResp(bool Favorited);
    private record FavCourse(Guid CourseId, string Slug, string Title);
    private record AchievementDto(string Type, string Name, string Description, string Icon, DateTime? EarnedAt, bool Earned);
}
