namespace EduPlatform.Api.Email;

/// <summary>Proste szablony HTML dla maili transakcyjnych. Bez engine'u — string interpolation wystarczy.</summary>
public static class EmailTemplates
{
    public static EmailMessage PasswordReset(string toEmail, string toName, string resetUrl)
    {
        var html = $$"""
        <!doctype html>
        <html lang="pl">
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="font-size: 18px;">Resetowanie hasła</h1>
          <p>Cześć {{toName}},</p>
          <p>Otrzymaliśmy prośbę o reset hasła do konta na <strong>Kursy.pl</strong>. Kliknij w link poniżej, żeby ustawić nowe hasło:</p>
          <p style="margin: 24px 0;">
            <a href="{{resetUrl}}" style="display: inline-block; padding: 10px 16px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
              Ustaw nowe hasło
            </a>
          </p>
          <p style="font-size: 12px; color: #666;">Link wygasa za 2 godziny. Jeśli to nie Ty, zignoruj tego maila — Twoje hasło pozostanie bez zmian.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="font-size: 12px; color: #999;">Kursy.pl — polska platforma do nauki kodowania</p>
        </body>
        </html>
        """;

        var text = $"""
        Resetowanie hasła

        Cześć {toName},

        Otrzymaliśmy prośbę o reset hasła do konta na Kursy.pl.
        Otwórz ten link w przeglądarce, żeby ustawić nowe hasło:

        {resetUrl}

        Link wygasa za 2 godziny. Jeśli to nie Ty, zignoruj tego maila.

        — Kursy.pl
        """;

        return new EmailMessage(toEmail, toName, "Resetowanie hasła — Kursy.pl", html, text);
    }

    public static EmailMessage Welcome(string toEmail, string toName, string appUrl)
    {
        var html = $$"""
        <!doctype html>
        <html lang="pl">
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="font-size: 22px;">Witaj na Kursy.pl 👋</h1>
          <p>Cześć {{toName}},</p>
          <p>Cieszymy się, że dołączasz! Kursy.pl to <strong>polska platforma do nauki kodowania</strong> z interaktywnymi ćwiczeniami i mentorem AI po polsku.</p>
          <p>Co dalej?</p>
          <ul>
            <li>Przejrzyj <a href="{{appUrl}}/courses">katalog kursów</a> — najlepiej zacząć od „Python od zera"</li>
            <li>Pisz kod bezpośrednio w przeglądarce — wszystko działa lokalnie (zero instalacji)</li>
            <li>Pytaj AI mentora w każdej lekcji — odpowiada po polsku</li>
            <li>Zbieraj XP, utrzymuj streak i odbieraj certyfikaty</li>
          </ul>
          <p style="margin: 24px 0;">
            <a href="{{appUrl}}/courses" style="display: inline-block; padding: 10px 16px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
              Otwórz katalog
            </a>
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="font-size: 12px; color: #999;">Dostałeś tego maila bo zakładałeś konto na Kursy.pl. Powodzenia w nauce!</p>
        </body>
        </html>
        """;

        return new EmailMessage(toEmail, toName, "Witaj na Kursy.pl 👋", html);
    }
}
