namespace EduPlatform.Domain.Entities;

/// <summary>
/// Organizacja (uczelnia, firma) — kupuje hurtowo kody dostępu, rozdaje studentom.
/// Każdy zrealizowany kod daje użytkownikowi dostęp do planu Pro na X miesięcy.
/// </summary>
public class Organization : Entity
{
    public required string Name { get; set; }
    public string? Nip { get; set; }
    public string? ContactEmail { get; set; }

    /// <summary>Admin organizacji — zwykle login używany do generowania kodów.</summary>
    public Guid? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }

    public ICollection<OrganizationCode> Codes { get; set; } = new List<OrganizationCode>();
    public ICollection<OrganizationCodeRedemption> Redemptions { get; set; } = new List<OrganizationCodeRedemption>();
}

public class OrganizationCode : Entity
{
    public Guid OrganizationId { get; set; }
    public Organization? Organization { get; set; }

    public required string Code { get; set; }
    public int MaxSeats { get; set; }
    public int RedeemedCount { get; set; }
    public int GrantsMonths { get; set; } = 12;
    public DateTime? ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    public bool IsUsable =>
        RevokedAt is null
        && (ExpiresAt is null || ExpiresAt > DateTime.UtcNow)
        && RedeemedCount < MaxSeats;
}

public class OrganizationCodeRedemption : Entity
{
    public Guid OrganizationCodeId { get; set; }
    public OrganizationCode? OrganizationCode { get; set; }

    public Guid OrganizationId { get; set; }
    public Organization? Organization { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public DateTime RedeemedAt { get; set; } = DateTime.UtcNow;
    public DateTime AccessUntil { get; set; }
}
