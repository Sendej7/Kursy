using System.Security.Cryptography;
using System.Text.Json;
using EduPlatform.Domain.Entities;

namespace EduPlatform.Api.Auth;

public class BackupCodesService
{
    public const int CodeCount = 10;
    public const int CodeLength = 8;
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bez 0/O/1/I — czytelność

    /// <summary>Generuje 10 nowych kodów (raw) i zwraca równolegle hashowane wartości do zapisu.</summary>
    public (string[] Raw, string Json) GenerateAndHash()
    {
        var raw = new string[CodeCount];
        var hashes = new string[CodeCount];
        for (var i = 0; i < CodeCount; i++)
        {
            var sb = new System.Text.StringBuilder(CodeLength);
            for (var c = 0; c < CodeLength; c++)
            {
                sb.Append(Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)]);
            }
            raw[i] = sb.ToString();
            hashes[i] = BCrypt.Net.BCrypt.HashPassword(raw[i]);
        }
        return (raw, JsonSerializer.Serialize(hashes));
    }

    /// <summary>Sprawdza kod; jeśli pasuje, USUWA go z tablicy (jednorazowy) i zwraca zaktualizowany JSON.</summary>
    public bool TryConsume(User user, string code, out string? updatedJson)
    {
        updatedJson = null;
        if (string.IsNullOrEmpty(user.BackupCodesHashJson) || string.IsNullOrEmpty(code)) return false;

        List<string>? hashes;
        try
        {
            hashes = JsonSerializer.Deserialize<List<string>>(user.BackupCodesHashJson);
        }
        catch
        {
            return false;
        }
        if (hashes is null || hashes.Count == 0) return false;

        var normalized = code.Trim().ToUpperInvariant().Replace(" ", "").Replace("-", "");

        for (var i = 0; i < hashes.Count; i++)
        {
            if (BCrypt.Net.BCrypt.Verify(normalized, hashes[i]))
            {
                hashes.RemoveAt(i);
                updatedJson = JsonSerializer.Serialize(hashes);
                return true;
            }
        }
        return false;
    }

    /// <summary>Zwraca ile kodów zostało jeszcze do użycia (do pokazania w UI).</summary>
    public int RemainingCount(string? json)
    {
        if (string.IsNullOrEmpty(json)) return 0;
        try
        {
            var hashes = JsonSerializer.Deserialize<List<string>>(json);
            return hashes?.Count ?? 0;
        }
        catch
        {
            return 0;
        }
    }
}
