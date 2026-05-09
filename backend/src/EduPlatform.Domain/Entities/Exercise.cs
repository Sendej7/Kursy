namespace EduPlatform.Domain.Entities;

public class Exercise : Entity
{
    public string Prompt { get; set; } = string.Empty;
    public string StarterCode { get; set; } = string.Empty;
    public string SolutionCode { get; set; } = string.Empty;
    public string TestsCode { get; set; } = string.Empty;
    public List<string> Hints { get; set; } = new();

    public Guid LessonId { get; set; }
    public Lesson? Lesson { get; set; }

    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
