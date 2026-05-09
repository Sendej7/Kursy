export default function Terms() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-10 prose prose-sm">
      <h1 className="text-2xl font-bold mb-4">Regulamin Kursy.pl</h1>
      <p className="text-xs text-gray-500 mb-6">Ostatnia aktualizacja: 9 maja 2026</p>

      <p>
        <strong>Uwaga:</strong> ten regulamin to placeholder. Przed komercyjnym uruchomieniem usługi
        należy go zastąpić wersją zatwierdzoną przez prawnika z polskim KC i ustawą o świadczeniu
        usług drogą elektroniczną.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">1. Definicje</h2>
      <p>
        <strong>Usługa</strong> — platforma edukacyjna Kursy.pl. <strong>Użytkownik</strong> —
        osoba korzystająca z Usługi po założeniu konta.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">2. Zawarcie umowy</h2>
      <p>
        Umowa o świadczenie Usługi jest zawierana w momencie rejestracji konta. Korzystanie z
        kursów płatnych wymaga aktywnej subskrypcji lub zrealizowania kodu instytucjonalnego.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">3. Treści generowane przez AI</h2>
      <p>
        Niektóre lekcje są w całości lub częściowo generowane przez sztuczną inteligencję
        (Claude przez Anthropic API). Treść jest weryfikowana przez autorów, ale może zawierać
        błędy. Użytkownik akceptuje, że nauka kodu z AI-generowanych materiałów wymaga zdrowego
        sceptycyzmu i samodzielnej weryfikacji.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">4. Płatności</h2>
      <p>
        Płatności obsługuje Stripe. Subskrypcja odnawia się automatycznie co miesiąc i można ją
        anulować w każdej chwili w panelu „Konto" → „Zarządzaj subskrypcją". Zwroty regulowane są
        Ustawą o Prawach Konsumenta (14 dni na odstąpienie, jeśli nie rozpocząłeś korzystania).
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">5. Reklamacje</h2>
      <p>
        Reklamacje kierować na <a href="mailto:hello@kursy.pl">hello@kursy.pl</a>. Odpowiadamy w
        terminie 14 dni.
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">6. Zmiana regulaminu</h2>
      <p>
        Powiadomimy o istotnych zmianach mailem co najmniej 14 dni przed ich wejściem w życie.
      </p>
    </article>
  );
}
