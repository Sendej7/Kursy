#!/usr/bin/env bash
# Kursy.pl — wipe wszystkich kursów i wstawienie nowych: .NET, JavaScript, HTML, React.
# Wymaga: stack uruchomiony, demo@kursy.pl/demo1234 istnieje (z bootstrap'a).
#
# Użycie:  bash /opt/kursy/scripts/reset-courses.sh
#
# UWAGA: wycina CASCADE — usuwa też wszystkie modules, lessons, enrollments,
# reviews, favorites, progres studentów na obecnych kursach. Nie ruszamy userów.

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/kursy}"
API="${API:-http://localhost:5080/api}"

cd "$INSTALL_DIR"

log() { echo -e "\n\033[1;34m▶ $*\033[0m"; }
ok()  { echo -e "  \033[1;32m✓\033[0m $*"; }
warn(){ echo -e "  \033[1;33m!\033[0m $*"; }

# Sprawdzenie backend
if ! curl -sf "$API/health/ready" >/dev/null 2>&1; then
  echo "Backend nie odpowiada — uruchom najpierw vps-bootstrap.sh"
  exit 1
fi

# ─── 1. Login jako demo author ───────────────────────────────
log "Logowanie demo@kursy.pl"
TOKEN=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"demo@kursy.pl","password":"demo1234"}' \
  | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"\([^"]*\)"/\1/')

if [[ -z "$TOKEN" ]]; then
  echo "Login failed — czy demo@kursy.pl/demo1234 istnieje?"
  exit 1
fi
ok "Token uzyskany"
H="Authorization: Bearer $TOKEN"

# ─── 2. Wipe wszystkich kursów (CASCADE) ─────────────────────
log "Czyszczenie istniejących kursów (CASCADE)"
docker compose exec -T postgres psql -U postgres -d eduplatform <<'SQL' >/dev/null
TRUNCATE TABLE "Courses" RESTART IDENTITY CASCADE;
SQL
ok "Wyczyszczono — startujemy ze świeżą bazą kursów"

# ─── 3. Helper functions ─────────────────────────────────────
create_course() {
  local title="$1" desc="$2" lang="$3"
  curl -s -X POST "$API/author/courses" -H "$H" -H "Content-Type: application/json" \
    -d "{\"title\":\"$title\",\"description\":\"$desc\",\"language\":\"$lang\"}" \
    | grep -oE '"id":"[^"]+"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/'
}

publish_course() {
  docker compose exec -T postgres psql -U postgres -d eduplatform \
    -c "UPDATE \"Courses\" SET \"Visibility\" = 3 WHERE \"Id\" = '$1';" >/dev/null
}

create_module() {
  local course_id="$1" title="$2" order="$3"
  curl -s -X POST "$API/author/modules" -H "$H" -H "Content-Type: application/json" \
    -d "{\"courseId\":\"$course_id\",\"title\":\"$title\",\"description\":\"\",\"order\":$order}" \
    | grep -oE '"id":"[^"]+"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/'
}

create_lesson() {
  local mod_id="$1" title="$2" order="$3" type="$4" content="$5"
  python3 - "$content" <<EOF | curl -s -X POST "$API/author/lessons" -H "$H" -H "Content-Type: application/json" -d @- >/dev/null
import json,sys
print(json.dumps({
  'moduleId':'$mod_id',
  'title':'$title',
  'order':$order,
  'type':'$type',
  'contentMarkdown':sys.argv[1]
}))
EOF
}

# ════════════════════════════════════════════════════════════════
# KURS 1: C# i .NET
# ════════════════════════════════════════════════════════════════
log "Kurs 1/4 — C# i .NET"
C1=$(create_course "C# i .NET od zera" "Naucz się C# 13 i .NET 10. Składnia, typy, LINQ, async/await, klasy, kolekcje. Praktyczne podstawy przed ASP.NET Core." "CSharp")
ok "Kurs utworzony: $C1"

M1A=$(create_module "$C1" "Podstawy języka" 1)
create_lesson "$M1A" "Witaj C#" 1 "Theory" "# Witaj w C#!

C# to nowoczesny, silnie typowany język od Microsoftu. Używamy go w .NET — frameworku do wszystkiego: web (ASP.NET), desktop (WinForms, WPF, MAUI), gry (Unity), mobile, cloud.

\`\`\`csharp
using System;

class Program
{
    static void Main()
    {
        Console.WriteLine(\"Witaj, C#!\");
    }
}
\`\`\`

W tym kursie nauczysz się **podstaw składni**, **typów**, **klas**, **LINQ** i **async/await**. To fundament przed ASP.NET Core."

create_lesson "$M1A" "Zmienne i typy" 2 "Theory" "# Zmienne i typy danych

C# jest **silnie typowany** — każda zmienna ma typ znany w czasie kompilacji.

\`\`\`csharp
int age = 30;                    // liczba całkowita
double price = 19.99;            // liczba z przecinkiem (8 bajtów)
decimal money = 1999.50m;        // dokładna arytmetyka (pieniądze!)
string name = \"Anna\";
bool isActive = true;
char letter = 'A';
\`\`\`

## var — inferencja typu

\`\`\`csharp
var x = 42;                      // x jest int
var msg = \"Hello\";              // msg jest string
\`\`\`

Kompilator wnioskuje typ z prawej strony. Dalej silnie typowane — \`x\` zawsze będzie int."

create_lesson "$M1A" "Klasy i obiekty" 3 "Theory" "# Klasy w C#

\`\`\`csharp
public class User
{
    public string Name { get; set; }
    public int Age { get; set; }

    public User(string name, int age)
    {
        Name = name;
        Age = age;
    }

    public string Greet() => \$\"Cześć, jestem {Name}!\";
}

var u = new User(\"Anna\", 30);
Console.WriteLine(u.Greet());    // Cześć, jestem Anna!
\`\`\`

## Records (C# 9+)

Krótszy zapis dla typów wartości (immutable):

\`\`\`csharp
public record User(string Name, int Age);

var u = new User(\"Anna\", 30);
var u2 = u with { Age = 31 };    // nowa instancja, Name skopiowane
\`\`\`"

M1B=$(create_module "$C1" "Sprawdź swoją wiedzę" 2)
create_lesson "$M1B" "Quiz: podstawy C#" 1 "Quiz" '{
  "intro": "5 pytań o podstawy C#.",
  "passingPercentage": 70,
  "questions": [
    {"id":"q1","prompt":"Który typ trzymać do pieniędzy?","options":["double","float","decimal","int"],"correctIndex":2,"explanation":"decimal ma dokładną arytmetykę BCD — bez błędów floating-point."},
    {"id":"q2","prompt":"Co zwraca operator ?? w C#?","options":["XOR","null-coalescing — wartość lewa jeśli nie-null, w p.p. prawa","sprawdzenie typu","ternary"],"correctIndex":1,"explanation":"?? zwraca lewy operand jeśli nie jest null, w p.p. prawy."},
    {"id":"q3","prompt":"Który modyfikator robi pole tylko do odczytu po konstruktorze?","options":["const","static","readonly","sealed"],"correctIndex":2},
    {"id":"q4","prompt":"Co robi using w głowie pliku?","options":["zwalnia zasoby","importuje namespace","tworzy alias","kompiluje"],"correctIndex":1},
    {"id":"q5","prompt":"Records w C# 9+ są domyślnie...","options":["mutable","immutable","sealed","abstract"],"correctIndex":1,"explanation":"records to value-equality + immutable by default."}
  ]
}'
publish_course "$C1"

# ════════════════════════════════════════════════════════════════
# KURS 2: JavaScript od zera
# ════════════════════════════════════════════════════════════════
log "Kurs 2/4 — JavaScript od zera"
C2=$(create_course "JavaScript od zera" "Nauka JS od podstaw: zmienne, funkcje, async, DOM, fetch. Kod uruchamiany w przeglądarce — żadnej instalacji." "JavaScript")
ok "Kurs utworzony: $C2"

M2A=$(create_module "$C2" "Podstawy JS" 1)
create_lesson "$M2A" "Zmienne: let, const, var" 1 "Theory" "# Zmienne w JavaScript

\`\`\`js
let name = \"Anna\";      // zmienna (zmienialna)
const age = 30;          // stała (nie do reasign)
var oldStyle = true;     // PRZESTARZAŁY — nie używaj
\`\`\`

**Zasada:** zawsze \`const\` chyba że MUSISZ zmieniać → wtedy \`let\`. **Nigdy \`var\`** w nowym kodzie."

create_lesson "$M2A" "Funkcje strzałkowe" 2 "Exercise" "# Funkcje w JS

Klasyczne:
\`\`\`js
function sum(a, b) {
    return a + b;
}
\`\`\`

Arrow function (krótszy):
\`\`\`js
const sum = (a, b) => a + b;
\`\`\`

## Zadanie
Napisz funkcję \`double(x)\` która zwraca x * 2.

Zacznij od kodu w edytorze →"

create_lesson "$M2A" "Tablice i map" 3 "Theory" "# Tablice w JS

\`\`\`js
const nums = [1, 2, 3, 4, 5];

const doubled = nums.map(n => n * 2);    // [2, 4, 6, 8, 10]
const evens = nums.filter(n => n % 2 === 0);  // [2, 4]
const sum = nums.reduce((acc, n) => acc + n, 0);  // 15
\`\`\`

Te 3 metody (\`map\`, \`filter\`, \`reduce\`) to chleb powszedni JS."

M2B=$(create_module "$C2" "Async i fetch" 2)
create_lesson "$M2B" "Promise i async/await" 1 "Theory" "# Asynchroniczność w JS

\`\`\`js
async function loadUser(id) {
    const res = await fetch(\`/api/users/\${id}\`);
    if (!res.ok) throw new Error('Not found');
    return res.json();
}

const user = await loadUser(42);
console.log(user.name);
\`\`\`

\`await\` zatrzymuje wykonanie funkcji \`async\` aż Promise się rozwiąże. Czysty, czytelny kod."

create_lesson "$M2B" "Quiz: JS" 2 "Quiz" '{
  "intro": "Sprawdź czy ogarniasz JS.",
  "passingPercentage": 70,
  "questions": [
    {"id":"q1","prompt":"Które słowo kluczowe deklaruje stałą?","options":["let","var","const","static"],"correctIndex":2},
    {"id":"q2","prompt":"Co zwróci typeof null?","options":["null","undefined","object","string"],"correctIndex":2,"explanation":"Historyczny bug JS — typeof null zwraca object."},
    {"id":"q3","prompt":"Który operator NIE konwertuje typu przy porównaniu?","options":["==","===","!=","<="],"correctIndex":1,"explanation":"=== to ścisłe porównanie."},
    {"id":"q4","prompt":"Co zwróci [1,2,3].map(x=>x*2)?","options":["[1,2,3]","[2,4,6]","6","[1,4,9]"],"correctIndex":1},
    {"id":"q5","prompt":"async function zawsze zwraca...","options":["undefined","Promise","sync wartość","null"],"correctIndex":1,"explanation":"async function zawsze zwraca Promise, nawet jeśli wewnątrz nie ma awaita."}
  ]
}'
publish_course "$C2"

# ════════════════════════════════════════════════════════════════
# KURS 3: HTML i CSS
# ════════════════════════════════════════════════════════════════
log "Kurs 3/4 — HTML i CSS"
C3=$(create_course "HTML i CSS — od zera do strony" "Naucz się HTML5 i CSS3. Tagi semantyczne, flexbox, grid, responsywność. Po kursie zbudujesz własną stronę." "JavaScript")
ok "Kurs utworzony: $C3"

M3A=$(create_module "$C3" "Podstawy HTML" 1)
create_lesson "$M3A" "Struktura dokumentu HTML" 1 "Theory" "# Twoja pierwsza strona HTML

\`\`\`html
<!DOCTYPE html>
<html lang=\"pl\">
<head>
    <meta charset=\"UTF-8\">
    <title>Moja strona</title>
</head>
<body>
    <h1>Cześć świecie!</h1>
    <p>To jest moja pierwsza strona.</p>
</body>
</html>
\`\`\`

- \`<!DOCTYPE html>\` — informacja dla przeglądarki: \"to HTML5\"
- \`<head>\` — metadane (nie widoczne na stronie)
- \`<body>\` — to co widzi user

## Najważniejsze tagi
- \`<h1>...<h6>\` — nagłówki
- \`<p>\` — paragraf
- \`<a href=\"...\">\` — link
- \`<img src=\"...\" alt=\"...\">\` — obrazek
- \`<ul>\`, \`<ol>\`, \`<li>\` — listy"

create_lesson "$M3A" "Tagi semantyczne HTML5" 2 "Theory" "# Tagi semantyczne

HTML5 wprowadził tagi które OPISUJĄ co zawierają — nie tylko stylują.

\`\`\`html
<header>nagłówek strony / sekcji</header>
<nav>menu nawigacyjne</nav>
<main>główna treść</main>
<article>samodzielny artykuł</article>
<section>sekcja tematyczna</section>
<aside>treść poboczna (sidebar)</aside>
<footer>stopka</footer>
\`\`\`

## Dlaczego to ważne?
1. **SEO** — Google lepiej rozumie strukturę
2. **Accessibility** — czytniki ekranu nawigują po regionach
3. **Czytelność** — \`<nav>\` jest jaśniejsze niż \`<div class=\"navigation\">\`"

M3B=$(create_module "$C3" "Podstawy CSS" 2)
create_lesson "$M3B" "CSS — selektory i właściwości" 1 "Theory" "# CSS — kaskadowe arkusze stylów

\`\`\`css
/* selektor element */
h1 {
    color: navy;
    font-size: 2rem;
}

/* selektor klasy */
.button {
    background: #6366f1;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
}

/* selektor ID (rzadko) */
#main-header {
    border-bottom: 2px solid #ddd;
}
\`\`\`

W HTML:
\`\`\`html
<button class=\"button\">Kliknij</button>
\`\`\`"

create_lesson "$M3B" "Flexbox — układanie elementów" 2 "Theory" "# Flexbox

Najpraktyczniejszy layout w CSS:

\`\`\`css
.container {
    display: flex;
    gap: 12px;
    justify-content: space-between;  /* poziomo */
    align-items: center;              /* pionowo */
}
\`\`\`

\`\`\`html
<div class=\"container\">
    <span>logo</span>
    <button>akcja</button>
</div>
\`\`\`

## Główne właściwości
- \`flex-direction\` — row / column
- \`justify-content\` — wyrównanie wzdłuż osi głównej
- \`align-items\` — wyrównanie poprzeczne
- \`gap\` — odstępy między elementami
- \`flex: 1\` — element rośnie żeby zająć dostępną przestrzeń"

create_lesson "$M3B" "Quiz: HTML/CSS" 3 "Quiz" '{
  "intro": "Sprawdź podstawy HTML i CSS.",
  "passingPercentage": 60,
  "questions": [
    {"id":"q1","prompt":"Który tag jest semantyczny dla menu?","options":["<div>","<nav>","<menu>","<list>"],"correctIndex":1},
    {"id":"q2","prompt":"Atrybut alt na <img> jest...","options":["opcjonalny","obowiązkowy dla accessibility","tylko dla SEO","ukrywa obrazek"],"correctIndex":1,"explanation":"alt musi być — czytniki ekranu go odczytują, a Google używa do indeksowania."},
    {"id":"q3","prompt":"Które property w flexboxie wyrównuje elementy wzdłuż osi głównej?","options":["align-items","justify-content","flex-grow","gap"],"correctIndex":1},
    {"id":"q4","prompt":"Jednostka CSS rem to...","options":["pixele","procent rodzica","wielokrotność rozmiaru fontu html","viewport width"],"correctIndex":2,"explanation":"1rem = font-size elementu html (zwykle 16px)."}
  ]
}'
publish_course "$C3"

# ════════════════════════════════════════════════════════════════
# KURS 4: React.js
# ════════════════════════════════════════════════════════════════
log "Kurs 4/4 — React.js"
C4=$(create_course "React.js — komponenty, hooks, stan" "Najpopularniejsza biblioteka frontendowa. Komponenty funkcyjne, useState, useEffect, props, kontekst. Po kursie zbudujesz własną SPA." "JavaScript")
ok "Kurs utworzony: $C4"

M4A=$(create_module "$C4" "Podstawy React" 1)
create_lesson "$M4A" "Pierwszy komponent" 1 "Theory" "# Komponent w React

Komponent to funkcja zwracająca JSX:

\`\`\`jsx
function Greeting({ name }) {
    return <h1>Cześć, {name}!</h1>;
}

// użycie:
<Greeting name=\"Anna\" />
\`\`\`

## Co to JSX?
Składnia która wygląda jak HTML, ale to JavaScript. Bundler (Vite/webpack) tłumaczy ją na wywołania \`React.createElement\`.

\`\`\`jsx
const el = <button onClick={() => alert('hej')}>Klik</button>;
\`\`\`

Każdy komponent zaczyna się **wielką literą** — to jak React odróżnia komponenty od tagów HTML."

create_lesson "$M4A" "useState — stan komponentu" 2 "Theory" "# useState

Hook do trzymania stanu w komponencie:

\`\`\`jsx
import { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <p>Licznik: {count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
        </div>
    );
}
\`\`\`

**Zasady:**
- \`useState(initial)\` zwraca \`[wartość, setter]\`
- \`setCount\` triggeruje re-render z nową wartością
- Stan jest **niemutowalny** — nigdy \`count++\`, zawsze \`setCount(count + 1)\`"

create_lesson "$M4A" "useEffect — side effects" 3 "Theory" "# useEffect

Hook do robienia rzeczy poza renderem (fetch, timer, event listener):

\`\`\`jsx
import { useEffect, useState } from 'react';

function UserProfile({ id }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch(\`/api/users/\${id}\`)
            .then(r => r.json())
            .then(setUser);
    }, [id]);  // re-run gdy id się zmieni

    if (!user) return <p>Ładuję...</p>;
    return <h1>{user.name}</h1>;
}
\`\`\`

**Dependency array \`[id]\`:**
- \`[]\` — odpala raz po pierwszym renderze
- \`[id]\` — odpala gdy \`id\` się zmieni
- brak — odpala po KAŻDYM renderze (rzadko czego chcemy)"

M4B=$(create_module "$C4" "Praktyka" 2)
create_lesson "$M4B" "Lista zadań — props i mapowanie" 1 "Theory" "# Lista zadań

\`\`\`jsx
function TodoList({ items }) {
    return (
        <ul>
            {items.map(item => (
                <li key={item.id}>
                    {item.done ? '✓' : '○'} {item.text}
                </li>
            ))}
        </ul>
    );
}

// użycie:
const todos = [
    { id: 1, text: 'Naucz się React', done: true },
    { id: 2, text: 'Zbudować SPA', done: false },
];

<TodoList items={todos} />
\`\`\`

**Klucz \`key={item.id}\`** — React go używa do efektywnych re-renderów. Musi być unikalny w tej liście."

create_lesson "$M4B" "Quiz: React" 2 "Quiz" '{
  "intro": "Sprawdź swoją wiedzę o React.",
  "passingPercentage": 70,
  "questions": [
    {"id":"q1","prompt":"Co zwraca useState?","options":["wartość","setter","tablicę [wartość, setter]","Promise"],"correctIndex":2},
    {"id":"q2","prompt":"Kiedy odpali się useEffect z [count] jako deps?","options":["co render","tylko raz","gdy count się zmieni","nigdy"],"correctIndex":2},
    {"id":"q3","prompt":"Komponenty React zaczynają się od...","options":["małej litery","wielkiej litery","_underscore","numeru"],"correctIndex":1,"explanation":"React rozpoznaje komponenty po wielkiej literze; <button> to tag HTML, <Button> to komponent."},
    {"id":"q4","prompt":"Prop key na elementach listy służy do...","options":["stylowania","wydajnego re-renderowania","wysyłania zdarzeń","walidacji"],"correctIndex":1},
    {"id":"q5","prompt":"Stan w React jest...","options":["mutowalny","immutable — używamy setter","global","statyczny"],"correctIndex":1}
  ]
}'
publish_course "$C4"

# ════════════════════════════════════════════════════════════════
# Zapisanie studentów (jeśli istnieją)
# ════════════════════════════════════════════════════════════════
log "Zapisywanie studentów na nowe kursy"
for s in student1 student2 student3; do
  T=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$s@kursy.pl\",\"password\":\"student1234\"}" \
    | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"\([^"]*\)"/\1/')
  if [[ -z "$T" ]]; then
    warn "$s@kursy.pl — brak konta (pomiń lub odpal seed-extras.sh)"
    continue
  fi
  for cid in "$C1" "$C2" "$C3" "$C4"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$API/courses/$cid/enroll" \
      -H "Authorization: Bearer $T")
    case "$code" in
      200|204) : ;;
      409) : ;;
      *) warn "$s@kursy.pl → $cid (HTTP $code)" ;;
    esac
  done
  ok "$s@kursy.pl zapisany na 4 kursy"
done

echo
echo "═══════════════════════════════════════════════════"
echo "  GOTOWE! Nowe kursy:"
echo "═══════════════════════════════════════════════════"
echo "  ▸ C# i .NET od zera"
echo "  ▸ JavaScript od zera"
echo "  ▸ HTML i CSS — od zera do strony"
echo "  ▸ React.js — komponenty, hooks, stan"
echo "═══════════════════════════════════════════════════"
echo
echo "  Otwórz http://173.212.253.10/courses żeby zobaczyć."
