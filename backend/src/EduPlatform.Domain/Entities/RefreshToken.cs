namespace EduPlatform.Domain.Entities;

public class RefreshToken : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public required string TokenHash { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public Guid? ReplacedByTokenId { get; set; }
    public string? UserAgent { get; set; }

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}
