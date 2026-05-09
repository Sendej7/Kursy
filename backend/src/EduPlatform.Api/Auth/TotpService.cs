using OtpNet;

namespace EduPlatform.Api.Auth;

public class TotpService
{
    private const string Issuer = "Kursy.pl";

    /// <summary>Generuje nowy random base32 secret (160 bitów).</summary>
    public string GenerateSecret()
    {
        var bytes = KeyGeneration.GenerateRandomKey(20);
        return Base32Encoding.ToString(bytes);
    }

    /// <summary>Buduje otpauth:// URI dla apek autoryzacyjnych (Google Authenticator, 1Password, Bitwarden).</summary>
    public string BuildOtpAuthUri(string secret, string accountEmail)
    {
        var label = Uri.EscapeDataString($"{Issuer}:{accountEmail}");
        var issuer = Uri.EscapeDataString(Issuer);
        return $"otpauth://totp/{label}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30";
    }

    /// <summary>Weryfikuje 6-cyfrowy kod z 30-sekundowym oknem ± 1 step (zegary użytkowników bywają nieidealne).</summary>
    public bool Verify(string secret, string code)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(code)) return false;
        var bytes = Base32Encoding.ToBytes(secret);
        var totp = new Totp(bytes);
        return totp.VerifyTotp(code.Trim(), out _, new VerificationWindow(previous: 1, future: 1));
    }
}
