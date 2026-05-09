namespace EduPlatform.Domain.Entities;

/// <summary>
/// Pytanie zadane przez studenta w kontekście konkretnej lekcji. Społeczność (lub autor) odpowiada.
/// Autor pytania może oznaczyć jedną odpowiedź jako zaakceptowaną.
/// </summary>
public class LessonQuestion : Entity
{
    public Guid LessonId { get; set; }
    public Lesson? Lesson { get; set; }

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public required string Title { get; set; }
    public string? Body { get; set; }

    /// <summary>FK do LessonAnswer.Id (nullable). Jeśli ustawione — pytanie uznaje się za rozwiązane.</summary>
    public Guid? AcceptedAnswerId { get; set; }
    public LessonAnswer? AcceptedAnswer { get; set; }

    public ICollection<LessonAnswer> Answers { get; set; } = new List<LessonAnswer>();
}

public class LessonAnswer : Entity
{
    public Guid QuestionId { get; set; }
    public LessonQuestion? Question { get; set; }

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public required string Body { get; set; }

    /// <summary>Liczba upvote'ów — denormalizowana dla szybkiego sortowania.</summary>
    public int Upvotes { get; set; }
}

/// <summary>
/// Łącząca tabela — kto polajkował którą odpowiedź. Unique (UserId, AnswerId), żeby jeden user nie głosował dwa razy.
/// </summary>
public class LessonAnswerVote : Entity
{
    public Guid AnswerId { get; set; }
    public LessonAnswer? Answer { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }
}
