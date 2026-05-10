using EduPlatform.Domain.Enums;

namespace EduPlatform.Domain.Entities;

public class Lesson : Entity
{
    public required string Title { get; set; }
    public int Order { get; set; }
    public LessonType Type { get; set; } = LessonType.Theory;
    public string ContentMarkdown { get; set; } = string.Empty;
    /// <summary>
    /// Wersja robocza, edytowana przez autora po publikacji kursu. Studenci wciąż widzą
    /// ContentMarkdown (live). Publish-draft kopiuje Draft → Live; Discard-draft zeruje Draft.
    /// </summary>
    public string? DraftContentMarkdown { get; set; }

    public Guid ModuleId { get; set; }
    public Module? Module { get; set; }

    public Exercise? Exercise { get; set; }

    public ICollection<LessonProgress> Progresses { get; set; } = new List<LessonProgress>();
    public ICollection<AiInteraction> AiInteractions { get; set; } = new List<AiInteraction>();
}
