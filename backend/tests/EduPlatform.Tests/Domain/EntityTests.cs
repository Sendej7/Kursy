using EduPlatform.Domain.Entities;
using EduPlatform.Domain.Enums;
using FluentAssertions;
using Xunit;

namespace EduPlatform.Tests.Domain;

public class EntityTests
{
    [Fact]
    public void NewUser_HasFreshIdAndTimestamps()
    {
        var user = new User
        {
            Email = "test@example.com",
            DisplayName = "Test",
            PasswordHash = "hash"
        };

        user.Id.Should().NotBe(Guid.Empty);
        user.Role.Should().Be(UserRole.Student);
        user.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
    }

    [Fact]
    public void NewCourse_DefaultsToDraftVisibility()
    {
        var course = new Course
        {
            Title = "Python od zera",
            AuthorId = Guid.NewGuid(),
            Language = CourseLanguage.Python
        };

        course.Visibility.Should().Be(CourseVisibility.Draft);
    }
}
