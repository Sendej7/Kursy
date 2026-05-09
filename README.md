# Kursy

Polska platforma do interaktywnej nauki kodowania z AI mentorem po polsku.

> Pełny plan w [`docs/PLAN.md`](docs/PLAN.md).

## Trzy filary

1. **Interaktywne lekcje po polsku** z AI mentorem mówiącym po polsku
2. **Każdy autor może wrzucić własny kurs** — ręcznie albo wygenerowany z PDF/notatek przez AI
3. **Kursy uczą się od studentów** — system zbiera, gdzie ludzie utykają, i sugeruje autorowi poprawki

## Stack

| Warstwa            | Wybór                                          |
|--------------------|------------------------------------------------|
| Backend            | .NET 10 + ASP.NET Core, EF Core                |
| Baza danych        | PostgreSQL 17                                  |
| Frontend           | React 18 + TypeScript + Vite                   |
| UI                 | TailwindCSS                                    |
| Edytor kodu        | Monaco Editor                                  |
| Runtime kodu (MVP) | Pyodide w Web Workerze                         |
| AI                 | Claude API (Anthropic)                         |
| Auth               | JWT (BCrypt na hasłach)                        |

## Struktura repo

```
backend/    # .NET solution (EduPlatform.sln)
  src/
    EduPlatform.Api/             # ASP.NET Core Web API
    EduPlatform.Domain/          # Encje, logika biznesowa
    EduPlatform.Infrastructure/  # EF Core, DbContext
    EduPlatform.CodeRunner/      # Wykonywanie kodu (stub na MVP)
    EduPlatform.AiService/       # Claude API wrapper
  tests/
    EduPlatform.Tests/

frontend/   # React + Vite + TS app
  src/
    pages/        # Home, CourseCatalog, CourseDetail, LessonView, Login, Register, author/, admin/
    components/   # CodeEditor, AiChat, ProtectedRoute
    lib/          # api, auth, pyodide (Web Worker)

docs/       # PLAN.md
```

## Uruchomienie lokalne

### Najszybciej: Docker Compose (cały stack jednym poleceniem)

```bash
cp .env.example .env       # opcjonalnie wypełnij sekrety
docker compose up -d --build
```

Otwórz **http://localhost:5173**. Backend: `:5080`, Mailhog UI (przechwytuje maile w dev): `:8025`,
Postgres: `:5432`. Pierwsze odpalenie buduje obrazy (~2-3 min), potem `up` startuje w sekundach.
Migracje EF lecą automatycznie przy starcie API.

```bash
docker compose logs -f backend     # logi
docker compose down                # zatrzymaj
docker compose down -v             # zatrzymaj + skasuj dane (wipe Postgres)
```

### Ręcznie (do hot-reload'a kodu)

#### 1. Postgres

```bash
docker compose up -d postgres
```

#### 2. Backend

```bash
cd backend
dotnet restore
dotnet run --project src/EduPlatform.Api
```

API słucha na `http://localhost:5080`. W trybie Development migracje EF lecą automatycznie i seed
dorzuca demo autora (`demo@kursy.pl` / `demo1234`) + kurs **„Python od zera"**.

##### Konfiguracja sekretów

```bash
cd backend/src/EduPlatform.Api
dotnet user-secrets init
dotnet user-secrets set "Claude:ApiKey" "sk-ant-..."
dotnet user-secrets set "Jwt:SigningKey" "co-najmniej-32-znaki-tajny-string"
# opcjonalnie: Stripe, Google/GitHub OAuth, SMTP — patrz .env.example
```

Bez kluczy poszczególne ficzery degradują się do „nieskonfigurowane" (AI / płatności / OAuth /
maile), reszta API działa.

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dev server: `http://localhost:5173`. Vite proxuje `/api` do backendu na :5080.

## Główne funkcje (gotowe na MVP)

- **Studenci**: rejestracja, login, katalog publicznych kursów, zapisywanie się, widok lekcji (markdown + Monaco editor + Pyodide w Web Workerze + testy + AI mentor)
- **Autorzy**: panel autora, tworzenie kursów/modułów/lekcji, edytor lekcji z podglądem markdown, generowanie treści lekcji przez AI (z tematu / z notatek), dashboard analytics (% ukończenia, średnia liczba prób, najczęstsze błędy)
- **Admin**: zatwierdzanie kursów do katalogu publicznego
- **AI mentor**: Claude API z polskim system promptem („naprowadzaj, nie dawaj gotowca"), prompt caching dla treści lekcji

## API (skrót)

```
POST /api/auth/register          # email, password, displayName, becomeAuthor
POST /api/auth/login             # email, password
GET  /api/courses                # publiczny katalog
GET  /api/courses/{slug}         # szczegóły kursu (auth pokazuje progres)
POST /api/courses/{id}/enroll    # auth
POST /api/courses/enroll-by-code # auth
GET  /api/lessons/{id}           # szczegóły lekcji (z exercise.testsCode)
POST /api/lessons/{id}/complete  # auth
POST /api/submissions            # auth, log próby
POST /api/ai/help                # auth, AI mentor
GET  /api/author/courses         # auth (Author/Admin)
POST /api/author/courses
PUT  /api/author/courses/{id}
POST /api/author/modules
POST /api/author/lessons
PUT  /api/author/lessons/{id}
PUT  /api/author/lessons/{id}/exercise
POST /api/author/generate-lesson
POST /api/author/generate-from-text
GET  /api/author/courses/{id}/analytics
GET  /api/admin/courses/pending  # auth (Admin)
POST /api/admin/courses/{id}/approve
POST /api/admin/courses/{id}/reject
```

## Co dalej

Niewielka pula ficzerów do dorobienia (każdy ~1 iteracja):

- Discount codes (Stripe promo)
- Drag-drop reorder modułów / lekcji + course duplication
- Achievements/odznaki (zebrać rozproszone XP/streaki/certs w spójny system)
- Stripe webhook expansion (refunds, disputes, failed payments)
- Author payouts (Stripe Connect)
- LTI 1.3 dla LMS uczelni
- JS/TS lessons (drugi język programowania — wymaga Judge0 lub V8 isolate)
- Sentry / Serilog / Redis backplane dla SignalR (skala >1 instancja)
- Więcej testów integracyjnych (mamy 7, sensownie ~40)

## Licencja

TBD.
