namespace EduPlatform.Domain.Entities;

public class Submission : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid ExerciseId { get; set; }
    public Exercise? Exercise { get; set; }

    public string Code { get; set; } = string.Empty;
    public bool Passed { get; set; }
    public int AttemptNumber { get; set; }
    public TimeSpan TimeSpent { get; set; }
    public string? ErrorMessage { get; set; }
    public string? Stdout { get; set; }
}
