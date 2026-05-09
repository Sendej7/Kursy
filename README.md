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

### 1. Postgres

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd backend
dotnet restore
dotnet run --project src/EduPlatform.Api
```

API słucha na `http://localhost:5080`. W trybie Development:
- baza zostaje utworzona przez `EnsureCreated()`,
- seed dorzuca demo autora (`demo@kursy.pl` / `demo1234`) i kurs **„Python od zera"** z 3 lekcjami.

#### Konfiguracja sekretów (development)

```bash
cd backend/src/EduPlatform.Api
dotnet user-secrets init
dotnet user-secrets set "Claude:ApiKey" "sk-ant-..."
dotnet user-secrets set "Jwt:SigningKey" "co-najmniej-32-znaki-tajny-string"
```

Bez `Claude:ApiKey` AI mentor zwraca komunikat „skonfiguruj klucz". Reszta API działa.

### 3. Frontend

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

## Co dalej (po feedbacku z testów)

- Pełen flow „PDF/PPTX → struktura kursu → lekcje per call AI" (na razie tylko text → lekcja)
- SignalR live progress (hub jest, frontend jeszcze nie podpięty)
- Wsparcie dla innych języków (Judge0 dla JS/SQL/C#)
- Płatności (Stripe + Przelewy24)
- Aplikacja mobilna (React Native)

## Licencja

TBD.
