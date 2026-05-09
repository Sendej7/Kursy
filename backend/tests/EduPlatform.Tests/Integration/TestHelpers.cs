using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using EduPlatform.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace EduPlatform.Tests.Integration;

public static class TestHelpers
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public record AuthBody(string Token, string RefreshToken, DateTime ExpiresAt, AuthUser User);
    public record AuthUser(Guid Id, string Email, string DisplayName, string Role);

    /// <summary>Rejestruje świeżego usera, zwraca authenticated HttpClient + jego id.</summary>
    public static async Task<(HttpClient client, Guid userId)> RegisterAsync(this TestApp app, string? displayName = null)
    {
        var client = app.CreateClient();
        var email = $"u{Guid.NewGuid():N}@example.com";
        var resp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "very-secret",
            displayName = displayName ?? "Tester",
        });
        if (!resp.IsSuccessStatusCode)
        {
            var raw = await resp.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Register failed {(int)resp.StatusCode}: {raw}");
        }
        var body = await resp.Content.ReadFromJsonAsync<AuthBody>(Json);
        if (body is null || string.IsNullOrEmpty(body.Token))
        {
            throw new InvalidOperationException("Register response missing Token");
        }
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.Token);
        return (client, body.User.Id);
    }

    /// <summary>Tworzy w bazie publiczny darmowy kurs z 1 modułem i 1 lekcją; zwraca id-y.</summary>
    public static async Task<(Guid courseId, Guid moduleId, Guid lessonId)> SeedCourseAsync(
        this TestApp app, Guid? authorId = null)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Brak autora? Stwórz jednego.
        if (authorId is null)
        {
            var author = new User
            {
                Email = $"author-{Guid.NewGuid():N}@example.com",
                DisplayName = "Author",
                PasswordHash = "x",
                Role = UserRole.Author,
            };
            db.Users.Add(author);
            await db.SaveChangesAsync();
            authorId = author.Id;
        }

        var course = new Course
        {
            Title = "Test Course",
            Slug = $"test-course-{Guid.NewGuid():N}",
            Description = "Testowy",
            Language = CourseLanguage.Python,
            Visibility = CourseVisibility.Public,
            AuthorId = authorId.Value,
            Modules = new List<Module>
            {
                new()
                {
                    Title = "M1",
                    Order = 1,
                    Lessons = new List<Lesson>
                    {
                        new()
                        {
                            Title = "L1",
                            Order = 1,
                            Type = LessonType.Theory,
                            ContentMarkdown = "# Hej",
                        },
                    },
                },
            },
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync();

        var module = course.Modules.First();
        var lesson = module.Lessons.First();
        return (course.Id, module.Id, lesson.Id);
    }

    /// <summary>Zapisuje danego usera na kurs (bezpośrednio w DB, bez 402-checków subskrypcji).</summary>
    public static async Task EnrollAsync(this TestApp app, Guid userId, Guid courseId)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.CourseEnrollments.Add(new CourseEnrollment { UserId = userId, CourseId = courseId });
        await db.SaveChangesAsync();
    }
}
