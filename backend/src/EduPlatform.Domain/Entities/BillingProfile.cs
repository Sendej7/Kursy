namespace EduPlatform.Domain.Entities;

/// <summary>
/// Dane do faktury per użytkownik. Opcjonalne — jeśli puste, faktura wystawiana jest na osobę fizyczną
/// (DisplayName z konta), bez NIP-u.
/// </summary>
public class BillingProfile : Entity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string? CompanyName { get; set; }
    public string? Nip { get; set; }            // 10 cyfr (PL VAT ID)
    public string? AddressLine { get; set; }    // ulica + numer
    public string? PostalCode { get; set; }     // 00-000
    public string? City { get; set; }
    public string Country { get; set; } = "PL";

    public bool IsCompany => !string.IsNullOrWhiteSpace(CompanyName) && !string.IsNullOrWhiteSpace(Nip);
}
