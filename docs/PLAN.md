# Plan platformy do interaktywnej nauki kodowania (PL)

## 1. Wizja produktu w jednym zdaniu

**Polska platforma do nauki kodowania, gdzie każdy może uczyć się z gotowych kursów albo stworzyć własny — a kursy poprawiają się automatycznie na podstawie tego, gdzie realnie gubią się studenci.**

Trzy filary, które razem tworzą przewagę nad Codio/Scrimbą/Codecademy:

1. **Interaktywne lekcje po polsku** z AI mentorem mówiącym po polsku
2. **Każdy autor może wrzucić własny kurs** — albo napisany ręcznie, albo wygenerowany z notatek/PDF/slajdów przez AI
3. **Kursy uczą się od studentów** — system zbiera dane gdzie ludzie utykają i AI sugeruje autorowi poprawki

---

## 2. Trzy typy użytkowników

### Student (B2C)
- Wchodzi z linku albo zakłada konto
- Przegląda katalog kursów albo wchodzi z kodem dostępu od wykładowcy
- Czyta lekcję, pisze kod w przeglądarce, dostaje feedback od AI po polsku
- Widzi swój postęp, certyfikaty

### Autor / Wykładowca (B2B + B2C)
- Tworzy kursy ręcznie w edytorze (markdown + bloki kodu + testy)
- Albo wrzuca PDF/slajdy/notatki → AI generuje pierwszą wersję kursu → autor poprawia
- Udostępnia kurs publicznie (zarabia % z subskrypcji) albo prywatnie swoim studentom (kod dostępu)
- Widzi dashboard: gdzie studenci się gubią, które zadania są za trudne, jakie pytania zadają AI

### Admin (Ty)
- Zatwierdzanie kursów publicznych (jakość)
- Zarządzanie płatnościami, użytkownikami
- Globalne metryki

---

## 3. Architektura — .NET + React

### Backend (.NET 10)

**Dlaczego .NET pasuje tu dobrze:**
- Świetny do API + SignalR (live feedback, postęp w czasie rzeczywistym)
- Entity Framework Core do bazy
- Ekosystem dojrzały, łatwo skalować

**Główne projekty w solucji:**

```
EduPlatform.sln
├── EduPlatform.Api              # ASP.NET Core Web API (REST + SignalR)
├── EduPlatform.Domain           # Encje, logika biznesowa
├── EduPlatform.Infrastructure   # EF Core, repozytoria, integracje
├── EduPlatform.CodeRunner       # Serwis odpalający kod studenta
├── EduPlatform.AiService        # Wrapper na Claude/GPT API
└── EduPlatform.Tests
```

**Kluczowe encje (Domain):**

```csharp
User           // Id, Email, Role (Student/Author/Admin), Subscription
Course         // Id, Title, AuthorId, IsPublic, Price, Language (Python/JS/...)
Module         // Id, CourseId, Order, Title
Lesson         // Id, ModuleId, Order, ContentMarkdown, Type (Theory/Exercise)
Exercise       // Id, LessonId, StarterCode, SolutionCode, TestsCode, Hints
Submission     // Id, UserId, ExerciseId, Code, Passed, Attempts, TimeSpent, Errors
LessonProgress // Id, UserId, LessonId, Completed, TimeSpent
AiInteraction  // Id, UserId, LessonId, Question, Answer, WasHelpful
CourseEnrollment // Id, UserId, CourseId, AccessCode, EnrolledAt
Analytics      // Agregaty: per-lesson dropoff, error patterns, AI questions
```

**Główne endpointy API:**

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh

# Kursy (publiczne)
GET    /api/courses                    # katalog
GET    /api/courses/{id}
POST   /api/courses/{id}/enroll
POST   /api/courses/enroll-by-code     # kod od wykładowcy

# Lekcje
GET    /api/lessons/{id}
POST   /api/lessons/{id}/complete

# Wykonywanie kodu
POST   /api/code/run                   # uruchom kod, zwróć output
POST   /api/code/submit                # uruchom + sprawdź testami

# AI mentor
POST   /api/ai/help                    # student pyta o pomoc
POST   /api/ai/explain-error           # AI tłumaczy błąd

# Autor — tworzenie kursów
POST   /api/author/courses
PUT    /api/author/courses/{id}
POST   /api/author/courses/{id}/lessons
POST   /api/author/generate-from-file  # wrzuć PDF/MD → AI generuje kurs
GET    /api/author/courses/{id}/analytics  # gdzie studenci się gubią

# Admin
GET    /api/admin/courses/pending
POST   /api/admin/courses/{id}/approve
```

### Frontend (React + TypeScript)

**Stack:**
- React 18 + TypeScript + Vite
- TailwindCSS + shadcn/ui (szybkie, dobre defaulty)
- React Router
- TanStack Query (cache, mutacje)
- Zustand (lokalny state)
- **Monaco Editor** (ten sam edytor co VS Code) — kluczowe dla doświadczenia
- React Markdown + rehype-highlight do renderowania lekcji
- Recharts do dashboardu autora

**Struktura aplikacji:**

```
src/
├── pages/
│   ├── Home.tsx
│   ├── CourseCatalog.tsx
│   ├── CoursePage.tsx
│   ├── LessonView.tsx           # GŁÓWNY widok — tu się dzieje magia
│   ├── author/
│   │   ├── Dashboard.tsx
│   │   ├── CourseEditor.tsx
│   │   ├── LessonEditor.tsx
│   │   ├── GenerateFromFile.tsx
│   │   └── Analytics.tsx
│   └── admin/
├── components/
│   ├── CodeEditor.tsx           # Monaco wrapper
│   ├── CodeRunner.tsx           # przycisk Uruchom + output
│   ├── AiChat.tsx               # mentor po polsku
│   ├── LessonContent.tsx        # markdown z osadzonymi exercises
│   └── ProgressBar.tsx
└── lib/
    ├── api.ts
    └── pyodide.ts               # opcjonalnie — Python w przeglądarce
```

---

## 4. Kluczowy problem techniczny: jak uruchamiać kod studenta?

To jest **najważniejsza decyzja architektoniczna**. Masz trzy opcje:

### Opcja A — Python w przeglądarce (Pyodide)
- **Plus:** zero kosztów serwera, zero ryzyka bezpieczeństwa, instant feedback
- **Minus:** tylko Python, wolny start (kilka sekund pierwsze załadowanie), nie wszystkie biblioteki
- **Werdykt:** **idealne na MVP jeśli zaczynasz od Pythona**

### Opcja B — Sandboxed containers (Docker per request)
- **Plus:** każdy język, pełna izolacja, cokolwiek (Python, C#, JS, SQL)
- **Minus:** drogie, trzeba zarządzać, ryzyko bezpieczeństwa, latencja 1-3s
- **Werdykt:** docelowo, ale nie na MVP

### Opcja C — Gotowy serwis (Judge0, Piston, Sphere Engine)
- **Plus:** ktoś inny rozwiązał bezpieczeństwo, łatwo dodać języki
- **Minus:** koszt rośnie z użyciem, zależność od zewnętrznego serwisu
- **Werdykt:** dobry kompromis na start dla wielu języków

**Moja rekomendacja na MVP:** Pyodide w przeglądarce dla Pythona + Judge0 (selfhosted lub API) dla innych języków później.

---

## 5. Jak działa lekcja od strony studenta (UX)

Konkretny przepływ na ekranie:

```
┌─────────────────────────────────────────────────────────┐
│  Kurs: Python od zera   |  Lekcja 5/30: Pętle for      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ## Pętla for                                           │
│  Pętla `for` pozwala wykonać blok kodu wielokrotnie... │
│  [tekst, obrazki, przykłady]                            │
│                                                         │
│  ### Spróbuj sam                                        │
│  Napisz pętlę, która wypisze liczby od 1 do 5.         │
│                                                         │
│  ┌──────────────────────────┬─────────────────────┐    │
│  │ # napisz tu kod          │ Output:             │    │
│  │ for i in range(...):     │                     │    │
│  │     print(i)             │ [Uruchom] [Sprawdź] │    │
│  │                          │                     │    │
│  └──────────────────────────┴─────────────────────┘    │
│                                                         │
│  💬 AI mentor: "Cześć! Utknąłeś? Mogę pomóc"           │
│  [pole tekstowe do pytania]                             │
│                                                         │
│  [< Poprzednia]              [Następna lekcja >]        │
└─────────────────────────────────────────────────────────┘
```

**Co się dzieje pod spodem:**

1. Student pisze kod → klika **Uruchom**
2. Kod leci do Pyodide (przeglądarka) albo backendu → wraca output
3. Student klika **Sprawdź** → kod uruchamiany jest z testami autora
4. Jeśli przeszło: zielona ikona, **Następna lekcja** się odblokowuje
5. Jeśli nie: czerwona ikona + jaki test nie przeszedł
6. Student może kliknąć **AI mentor** → AI dostaje: kod, błąd, kontekst lekcji → odpowiada po polsku, **NIE daje gotowca**, naprowadza
7. **Wszystko jest logowane:** każda próba, czas, błędy, pytania do AI

---

## 6. Generowanie kursów z plików — feature, który Cię wyróżni

To jest kluczowa rzecz, którą Codio nie robi dobrze. Workflow:

### Krok 1: Autor wrzuca materiał
- PDF z wykładu, slajdy PPTX, plik MD z notatkami, link do GitHuba z README
- Może też wkleić sam tekst albo opisać czego chce uczyć

### Krok 2: AI analizuje i proponuje strukturę
- Backend wysyła content do Claude/GPT z system promptem:
  > "Jesteś dydaktykiem programowania. Z tego materiału stwórz strukturę interaktywnego kursu po polsku. Podziel na moduły i lekcje. Każda lekcja ma teorię + min. 1 zadanie praktyczne. Zwróć JSON z polami: modules[].lessons[].{title, theory, exercise, tests}"
- Autor widzi propozycję strukturalną i zatwierdza/edytuje

### Krok 3: AI generuje pełną treść każdej lekcji
- Dla każdej lekcji osobne wywołanie AI: pełny tekst, kod startowy, kod rozwiązania, testy jednostkowe, podpowiedzi
- **Ważne:** każda lekcja generowana w oddzielnym wywołaniu = lepsza jakość niż "wygeneruj cały kurs naraz"

### Krok 4: Autor poprawia w edytorze
- Widzi każdą lekcję, edytuje markdown, modyfikuje zadania, dodaje swoje uwagi
- Może powiedzieć AI: "to zadanie jest za trudne, zrób łatwiejsze" → regeneracja

### Krok 5: Publikacja
- Kurs prywatny (kod dostępu dla studentów) albo do recenzji do publicznego katalogu

**Prompt do generowania (przykład):**

```
System: Jesteś dydaktykiem programowania z 10-letnim doświadczeniem.
Tworzysz interaktywne lekcje po polsku dla początkujących.

Zasady:
- Wyjaśnienia konkretne, krótkie, z przykładem
- Każde nowe pojęcie wprowadzasz raz, nie zakładasz wiedzy spoza poprzednich lekcji
- Zadania od najprostszych do trudniejszych
- Testy sprawdzają TYLKO to co lekcja uczy
- Język polski, naturalny, "tykaj" studenta

User: Stwórz lekcję na temat: {temat}
Kontekst: {co było w poprzednich lekcjach}
Format: JSON {theory, starterCode, solutionCode, tests, hints[]}
```

---

## 7. Pętla zwrotna: kursy uczą się od studentów

To jest Twoja przewaga, o której mówiłeś. Konkretnie:

### Co zbierasz (per lekcja, agregowane)

```csharp
public class LessonAnalytics
{
    public Guid LessonId { get; set; }
    public int TotalAttempts { get; set; }
    public int Completions { get; set; }
    public double CompletionRate { get; set; }       // % kto skończył
    public double AvgAttempts { get; set; }          // ile prób średnio
    public TimeSpan MedianTimeToComplete { get; set; }
    public List<ErrorPattern> CommonErrors { get; set; } // pogrupowane przez AI
    public List<string> CommonAiQuestions { get; set; }  // też pogrupowane przez AI
    public double DropoffRate { get; set; }          // ile osób porzuciło tu kurs
}

public class ErrorPattern
{
    public string Description { get; set; }   // "off-by-one in range()"
    public int Occurrences { get; set; }
    public List<string> ExampleCodes { get; set; }
}
```

### Co widzi autor w dashboardzie

```
Lekcja 5: Pętle for
─────────────────────────────────
Ukończenie:        67%   ⚠️ niska wartość
Średnio prób:      4.3   ⚠️ za dużo
Drop-off:          12%   ❌ tracisz studentów

Najczęstsze błędy (przeanalizowane przez AI):
  • 34% — używa range(5) zamiast range(1, 6) (off-by-one)
  • 21% — zapomina dwukropka po `for`
  • 18% — myli `range` z `len`

Najczęstsze pytania do AI w tej lekcji:
  • "co to jest range" (47 pytań)
  • "czemu się zaczyna od 0" (31 pytań)

💡 Sugestie AI dla autora:
  → Dodaj wyjaśnienie czemu range zaczyna od 0 PRZED zadaniem
  → Pokaż przykład range(1, 6) wcześniej
  → Rozważ podzielenie tej lekcji na dwie

[Wygeneruj poprawioną wersję lekcji] [Edytuj ręcznie]
```

### Klikasz "Wygeneruj poprawioną" → AI dostaje:
- Aktualną treść lekcji
- Dane analytics (błędy, pytania)
- Prompt: "popraw lekcję tak, żeby rozwiązać te problemy ze zrozumieniem"
- Autor widzi diff, zatwierdza/odrzuca

**To jest funkcja, której nie ma żadna platforma na świecie w taki sposób.** To Twoja realna przewaga.

---

## 8. Plan na MVP — pierwsze 4 miesiące

### Miesiąc 1: Fundament (zanim napiszesz porządny kod)
- [ ] Walidacja: pogadaj z 10 wykładowcami i 10 studentami
- [ ] Pokaż im Codio/Scrimbę → pytaj czego brakuje, czy płaciliby za polską wersję
- [ ] Zdefiniuj dokładnie: na jakim języku startujesz (sugeruję Python)
- [ ] Setup repo, .NET solution, React app, baza (PostgreSQL), CI
- [ ] Auth (email + hasło, później Google/GitHub OAuth)

### Miesiąc 2: Rdzeń doświadczenia studenta
- [ ] Encje + EF Core + migracje
- [ ] Widok lekcji: markdown + osadzony Monaco editor
- [ ] Pyodide integracja — odpalanie Pythona w przeglądarce
- [ ] Sprawdzanie testami (testy autora ukryte przed studentem)
- [ ] Logowanie postępu + każdej próby do bazy
- [ ] Twój pierwszy kurs (10 lekcji Pythona) wpisany ręcznie w bazę

### Miesiąc 3: AI mentor + edytor autora
- [ ] Integracja Claude API (po polsku, z system promptem niedającym gotowca)
- [ ] Czat z AI w widoku lekcji
- [ ] Logowanie pytań do AI
- [ ] Prosty edytor autora — markdown + dodawanie zadań + testów
- [ ] Twórz drugi i trzeci kurs przez własny edytor (test, czy działa)

### Miesiąc 4: Generowanie z plików + analytics
- [ ] Upload PDF/MD → AI generuje strukturę kursu → autor edytuje
- [ ] Generowanie pojedynczych lekcji w edytorze
- [ ] Dashboard analytics dla autora (lekcje, błędy, pytania)
- [ ] Sugestie AI poprawek dla autora
- [ ] Płatności (Stripe albo Przelewy24 dla PL)
- [ ] Wypuść do pierwszych 50 testerów (Twoi studenci + grupa wykładowców)

### Po MVP (miesiące 5-9)
- Kolejne języki (JavaScript, SQL, C#)
- Aplikacja mobilna (React Native — masz już React)
- Marketplace dla autorów
- B2B sprzedaż uczelniom (umowy, faktury)
- Certyfikaty, gamifikacja (XP, streaki — działa)

---

## 9. Stack do wdrożenia (konkretne wybory)

| Warstwa | Wybór | Dlaczego |
|---------|-------|----------|
| Backend | .NET 10 + ASP.NET Core | LTS (listopad 2025), pełen ekosystem |
| ORM | Entity Framework Core | Standard dla .NET |
| Baza | PostgreSQL | Tańsza i równie dobra co MSSQL, świetne wsparcie JSON |
| Frontend | React 18 + TS + Vite | Twój wybór, szybki dev |
| UI | Tailwind + shadcn/ui | Szybko, ładnie |
| Edytor kodu | Monaco Editor | Standard, świetny |
| Run Pythona | Pyodide | Zero kosztów serwera |
| AI | Claude API (Anthropic) | Najlepszy do edukacji, dobry po polsku |
| Auth | ASP.NET Identity + JWT | Wbudowane |
| Płatności | Stripe (+ Przelewy24 dla PL) | Standard |
| Hosting backend | Azure/Hetzner/DigitalOcean | Tanio na start: Hetzner |
| Hosting frontend | Vercel albo Cloudflare Pages | Darmowe |
| Pliki (PDF, obrazki) | Cloudflare R2 albo Azure Blob | Tanie |
| Analytics | PostHog (selfhosted) | Darmowe, dobre |
| Monitoring | Sentry | Darmowe na start |

---

## 10. Co MUSISZ zrobić zanim napiszesz pierwszą linię kodu

To jest część, którą wszyscy pomijają i potem żałują:

1. **Walidacja popytu (1-2 tygodnie):**
   - Pogadaj z 10 wykładowcami: "płaciłbyś 200 zł/mies za platformę z Twoim kursem dla Twoich studentów?"
   - Pogadaj z 10 studentami: "płaciłbyś 30 zł/mies za naukę kodowania po polsku z AI mentorem?"
   - Jeśli mniej niż 5/10 mówi tak — zmień coś w pomyśle

2. **Landing page i lista zapisów (1 tydzień):**
   - Zrób prostą stronę z opisem produktu i formularzem zapisu
   - Wrzuć na grupy FB/LinkedIn dla nauczycieli, programistów, studentów
   - Cel: 100 zapisów przed rozpoczęciem kodowania
   - To Twoja pierwsza waluta — ludzie którzy chcą produktu zanim istnieje

3. **Zdefiniuj zakres MVP:**
   - JEDEN język na start (Python)
   - JEDEN model dla autorów (Twój własny + 2-3 zaproszonych testerów)
   - BRAK aplikacji mobilnej, BRAK marketplace, BRAK gamifikacji

4. **Decyzja: solo czy z kimś:**
   - Solo na MVP jest realne, ale wykończysz się
   - Idealnie: znajdź drugą osobę (frontend albo UI) — Twoi studenci mogą być świetnymi pomocnikami za udziały albo zniżkę
   - W ostateczności: zrób MVP solo, znajdź pomoc po pierwszych 100 płatnych użytkownikach

---

## 11. Realistyczne zagrożenia (i co z nimi)

| Ryzyko | Prawdopodobieństwo | Co robić |
|--------|--------------------|----------|
| Nikt nie chce płacić | Średnie | Walidacja przed budową, freemium |
| Codio/Scrimba zrobi polską wersję | Niskie | Twoja przewaga to lokalność i społeczność |
| AI generuje słabe kursy | Wysokie | Twoja redakcja jest must-have, AI to draft |
| Wykończysz się przy MVP | Wysokie | Ścisły zakres, znajdź wspólnika |
| Koszty AI API zjedzą zysk | Średnie | Cache, limit per user, własny prompt-engineering |
| Polski rynek za mały | Średnie | Od początku planuj wersję EN po PL sukcesie |

---

## 12. Liczby, które muszą się spinać

**Koszty miesięczne na MVP (przybliżenie):**
- Hosting (Hetzner VPS + Postgres): 100 zł
- Cloudflare/Vercel: 0 zł
- AI API (Claude): zależne od użycia, na start 200-500 zł
- Stripe/Przelewy24: % od transakcji
- Domena, certyfikaty: 50 zł
- **Razem: ~500 zł/mies na początek**

**Próg rentowności:**
- 30 zł/mies × 17 użytkowników = 500 zł → break-even
- Realny cel po 6 miesiącach: 200 płatnych → 6000 zł/mies przychodu
- Realny cel po 12 miesiącach: 1000 płatnych + 5 uczelni B2B → ~40-50k zł/mies

To jest osiągalne, ale tylko jeśli walidacja zadziała i marketing nie umrze.

---

## Następne 3 kroki, które MASZ zrobić

1. **W tym tygodniu:** wypisz listę 15 osób (wykładowcy + studenci) i zacznij pisać do nich z 5 pytaniami. Nie buduj nic, dopóki nie pogadasz.
2. **W następnym tygodniu:** zrób landing page (możesz w 2 godziny w Framer/Webflow albo prostym Reactem) z formularzem zapisu.
3. **Za 2-3 tygodnie:** decyzja go/no-go na podstawie odpowiedzi z walidacji + liczby zapisów.

Dopiero wtedy odpalasz `dotnet new webapi`.

Powodzenia. Zadzwoń, jak będziesz chciał omówić konkretny etap głębiej.
