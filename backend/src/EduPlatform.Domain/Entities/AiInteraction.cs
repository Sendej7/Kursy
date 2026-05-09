namespace EduPlatform.Domain.Entities;

public class AiInteraction : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid LessonId { get; set; }
    public Lesson? Lesson { get; set; }

    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string? StudentCodeAtAsk { get; set; }
    public string? ErrorContext { get; set; }
    public bool? WasHelpful { get; set; }
    public int TokensIn { get; set; }
    public int TokensOut { get; set; }
}
