# Kursy

Polska platforma do interaktywnej nauki kodowania z AI mentorem po polsku.

> **Status:** scaffolding. Pełny plan w [`docs/PLAN.md`](docs/PLAN.md).

## Trzy filary

1. **Interaktywne lekcje po polsku** z AI mentorem mówiącym po polsku
2. **Każdy autor może wrzucić własny kurs** — ręcznie albo wygenerowany z PDF/notatek przez AI
3. **Kursy uczą się od studentów** — system zbiera, gdzie ludzie utykają, i sugeruje autorowi poprawki

## Stack

| Warstwa            | Wybór                                          |
|--------------------|------------------------------------------------|
| Backend            | .NET 9, ASP.NET Core, EF Core                  |
| Baza danych        | PostgreSQL                                     |
| Frontend           | React 18 + TypeScript + Vite                   |
| UI                 | TailwindCSS + shadcn/ui                        |
| Edytor kodu        | Monaco Editor                                  |
| Runtime kodu (MVP) | Pyodide (Python w przeglądarce)                |
| AI                 | Claude API (Anthropic)                         |

## Struktura repo

```
backend/    # .NET solution (EduPlatform.sln)
  src/
    EduPlatform.Api/             # ASP.NET Core Web API
    EduPlatform.Domain/          # Encje, logika biznesowa
    EduPlatform.Infrastructure/  # EF Core, DbContext, repozytoria
    EduPlatform.CodeRunner/      # Wykonywanie kodu studenta
    EduPlatform.AiService/       # Wrapper na Claude API
  tests/
    EduPlatform.Tests/

frontend/   # React + Vite + TS app
  src/
    pages/
    components/
    lib/

docs/       # PLAN.md i pozostała dokumentacja
```

## Uruchomienie lokalne (po zaimplementowaniu)

### Backend

```bash
cd backend
dotnet restore
dotnet ef database update --project src/EduPlatform.Infrastructure --startup-project src/EduPlatform.Api
dotnet run --project src/EduPlatform.Api
```

API słucha na `http://localhost:5080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dev server: `http://localhost:5173`.

## Status MVP — checklist (z `docs/PLAN.md`)

- [ ] Walidacja (10 wykładowców + 10 studentów)
- [ ] Auth (email/hasło + JWT)
- [ ] Encje + EF Core + migracje
- [ ] Widok lekcji (markdown + Monaco)
- [ ] Pyodide (Python w przeglądarce)
- [ ] Sprawdzanie testami autora
- [ ] AI mentor po polsku (Claude API)
- [ ] Edytor autora
- [ ] Generowanie kursów z plików (PDF/MD → kurs)
- [ ] Dashboard analytics autora
- [ ] Płatności (Stripe + Przelewy24)

## Licencja

TBD.
