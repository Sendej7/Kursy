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

    public static EmailMessage Welcome(string toEmail, string toName, string appUrl, string? verifyUrl = null)
    {
        var verifyBlock = verifyUrl is null ? string.Empty : $$"""
          <div style="margin: 16px 0; padding: 16px; background: #fff8e1; border-left: 3px solid #f59e0b; font-size: 14px;">
            <strong>Potwierdź email</strong> klikając w link, żeby aktywować pełen dostęp:<br>
            <a href="{{verifyUrl}}">{{verifyUrl}}</a>
          </div>
        """;
        var html = $$"""
        <!doctype html>
        <html lang="pl">
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="font-size: 22px;">Witaj na Kursy.pl 👋</h1>
          <p>Cześć {{toName}},</p>
          <p>Cieszymy się, że dołączasz! Kursy.pl to <strong>polska platforma do nauki kodowania</strong> z interaktywnymi ćwiczeniami i mentorem AI po polsku.</p>
          {{verifyBlock}}
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

    public static EmailMessage DailyGoalReminder(string toEmail, string toName, int goal, int doneToday, string appUrl)
    {
        var remaining = Math.Max(0, goal - doneToday);
        var html = $$"""
        <!doctype html>
        <html lang="pl">
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="font-size: 18px;">🎯 Dziś została jeszcze nauka do celu</h1>
          <p>Cześć {{toName}},</p>
          <p>Twój cel to <strong>{{goal}} lekcji dziennie</strong>. Dziś przeszedłeś {{doneToday}}; pozostało {{remaining}}.</p>
          <p style="margin: 24px 0;">
            <a href="{{appUrl}}/my-courses" style="display: inline-block; padding: 10px 16px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
              Wracam się uczyć
            </a>
          </p>
          <p style="font-size: 12px; color: #666;">
            Możesz wyłączyć przypomnienia w <a href="{{appUrl}}/account">Konto → Cel dzienny</a>.
          </p>
        </body>
        </html>
        """;
        var text = $"Cześć {toName}, dziś {doneToday}/{goal} lekcji — pozostało {remaining}. {appUrl}/my-courses";
        return new EmailMessage(toEmail, toName, "Dziś jeszcze nauka do celu — Kursy.pl", html, text);
    }

    public static EmailMessage VerifyEmail(string toEmail, string toName, string verifyUrl)
    {
        var html = $$"""
        <!doctype html>
        <html lang="pl">
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="font-size: 18px;">Potwierdź swój email</h1>
          <p>Cześć {{toName}},</p>
          <p>Kliknij w link poniżej, żeby potwierdzić, że ten adres email należy do Ciebie:</p>
          <p style="margin: 24px 0;">
            <a href="{{verifyUrl}}" style="display: inline-block; padding: 10px 16px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">
              Potwierdź email
            </a>
          </p>
          <p style="font-size: 12px; color: #666;">Link wygasa za 7 dni.</p>
        </body>
        </html>
        """;
        var text = $"Cześć {toName}, potwierdź email klikając: {verifyUrl}";
        return new EmailMessage(toEmail, toName, "Potwierdź email — Kursy.pl", html, text);
    }
}
