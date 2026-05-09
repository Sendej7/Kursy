namespace EduPlatform.Domain.Entities;

/// <summary>
/// Wishlist studenta — kursy, do których chce wrócić. Jeden user → jedno wpis na kurs.
/// Niezależne od Enrollment (ulubiony nie znaczy zapisany).
/// </summary>
public class CourseFavorite : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
}
