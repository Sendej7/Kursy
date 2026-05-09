import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-10 prose prose-sm">
      <h1 className="text-2xl font-bold mb-4">Polityka prywatności Kursy.pl</h1>
      <p className="text-xs text-gray-500 mb-6">Ostatnia aktualizacja: 9 maja 2026</p>

      <p>
        <strong>Uwaga:</strong> ta polityka to placeholder zgodny z duchem RODO. Przed
        komercyjnym uruchomieniem należy ją skonsultować z prawnikiem.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Administrator danych</h2>
      <p>
        Administratorem danych osobowych jest [Nazwa firmy], [adres], NIP [NIP]. Kontakt:{' '}
        <a href="mailto:rodo@kursy.pl">rodo@kursy.pl</a>.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Jakie dane zbieramy</h2>
      <ul>
        <li>Dane konta: email, imię (DisplayName), hash hasła</li>
        <li>Dane logowania zewnętrznego (Google/GitHub): identyfikator providera, avatar URL</li>
        <li>Aktywność: ukończone lekcje, XP, recenzje, pytania, odpowiedzi</li>
        <li>Płatności: Stripe customer ID, faktury (NIP firmy jeśli podany)</li>
        <li>Pytania do AI: treść pytań i odpowiedzi (przechowywane do uczenia/poprawy treści)</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">Cel przetwarzania</h2>
      <ul>
        <li>Świadczenie Usługi (art. 6 ust. 1 lit. b RODO — wykonanie umowy)</li>
        <li>Wystawianie faktur (art. 6 ust. 1 lit. c RODO — obowiązek prawny)</li>
        <li>Wsparcie i bezpieczeństwo (art. 6 ust. 1 lit. f RODO — uzasadniony interes)</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">Przekazywanie danych</h2>
      <ul>
        <li>Stripe (płatności) — Irlandia/USA, na podstawie SCC</li>
        <li>Anthropic (Claude API) — USA, na podstawie SCC</li>
        <li>Google / GitHub — tylko gdy używasz logowania zewnętrznego</li>
        <li>SMTP provider — wyłącznie do wysłania maili transakcyjnych</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6 mb-2">Twoje prawa</h2>
      <p>
        Masz prawo do dostępu, sprostowania, usunięcia, ograniczenia, przenoszenia oraz sprzeciwu.
        W panelu konta („Dane osobowe (RODO)") możesz pobrać kopię swoich danych w JSON oraz
        usunąć konto. Skargę możesz wnieść do PUODO.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Ciasteczka</h2>
      <p>
        Używamy tylko niezbędnych ciasteczek (sesja, JWT). Brak analityki, brak trackerów reklamowych.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">Bezpieczeństwo</h2>
      <p>
        Hasła są hashowane (BCrypt). Sesje można zarządzać w panelu konta. Wspieramy logowanie 2FA
        (TOTP) z kodami awaryjnymi.
      </p>

      <p className="mt-8 text-xs text-gray-500">
        <Link to="/terms" className="underline">
          Regulamin
        </Link>
      </p>
    </article>
  );
}
