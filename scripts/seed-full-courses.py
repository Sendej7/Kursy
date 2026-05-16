#!/usr/bin/env python3
"""
Kursy.pl — pełen seed 4 kursów: JavaScript, C# .NET, HTML/CSS, React.js.
Wymaga: stack uruchomiony, demo@kursy.pl/demo1234 istnieje.
Wycina wszystkie obecne kursy CASCADE i wstawia od nowa.

Użycie: python3 /opt/kursy/scripts/seed-full-courses.py
"""

import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

API = os.environ.get("API", "http://localhost:5080/api")
DEMO_EMAIL = "demo@kursy.pl"
DEMO_PASS = "demo1234"


# ───────────────────── HTTP helpers ─────────────────────
def http(method, path, body=None, token=None):
    url = f"{API}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            if not raw:
                return None
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return None
    except urllib.error.HTTPError as e:
        body_txt = e.read().decode("utf-8", errors="replace")[:300]
        raise RuntimeError(f"HTTP {e.code} on {method} {path}: {body_txt}") from e


def psql(sql):
    subprocess.run([
        "docker", "compose", "exec", "-T", "postgres",
        "psql", "-U", "postgres", "-d", "eduplatform", "-c", sql
    ], check=True, capture_output=True)


def login(email, password):
    try:
        res = http("POST", "/auth/login", {"email": email, "password": password})
        return res.get("token") if res else None
    except RuntimeError:
        return None


def create_course(token, title, description, language, tags=None):
    res = http("POST", "/author/courses", {
        "title": title,
        "description": description,
        "language": language,
        "tags": tags or [],
    }, token=token)
    return res["id"]


def publish_course(course_id):
    psql(f"UPDATE \"Courses\" SET \"Visibility\" = 3 WHERE \"Id\" = '{course_id}';")


def create_module(token, course_id, title, order):
    res = http("POST", "/author/modules", {
        "courseId": course_id, "title": title, "description": "", "order": order
    }, token=token)
    return res["id"]


def create_lesson(token, module_id, title, order, type_, content, video_url=None):
    body = {
        "moduleId": module_id, "title": title, "order": order,
        "type": type_, "contentMarkdown": content,
    }
    if video_url:
        body["videoUrl"] = video_url
    res = http("POST", "/author/lessons", body, token=token)
    return res["id"]


def add_exercise(token, lesson_id, prompt, starter, solution, tests, hints):
    http("PUT", f"/author/lessons/{lesson_id}/exercise", {
        "prompt": prompt,
        "starterCode": starter,
        "solutionCode": solution,
        "testsCode": tests,
        "hints": hints,
    }, token=token)


def wipe_courses():
    psql('TRUNCATE TABLE "Courses" RESTART IDENTITY CASCADE;')


def enroll_student(student_token, course_id):
    try:
        http("POST", f"/courses/{course_id}/enroll", token=student_token)
    except RuntimeError:
        pass  # 409 = już zapisany


# ═══════════════════════════════════════════════════════════════════
# CONTENT
# ═══════════════════════════════════════════════════════════════════

# ───────────────── JavaScript od zera ─────────────────
def build_javascript_course(t):
    cid = create_course(t,
        "JavaScript od zera",
        "Pełny kurs JS dla początkujących. Zmienne, funkcje, tablice, async/await — z działającymi ćwiczeniami w przeglądarce.",
        "JavaScript",
        tags=["javascript", "podstawy", "dla-początkujących"]
    )

    # ── Moduł 1: Podstawy języka ──
    m = create_module(t, cid, "Podstawy języka", 1)
    create_lesson(t, m, "Witaj świat", 1, "Theory", """# Witaj w JavaScript!

JavaScript to język numer 1 internetu. Działa w przeglądarce, na serwerze (Node.js), w mobilkach (React Native) i nawet w embedded.

## Pierwszy program

```js
console.log("Witaj, świat!");
```

`console.log()` wypisuje tekst do konsoli. To Twoje główne narzędzie do debugowania.

## Komentarze

```js
// Komentarz jednoliniowy

/*
  Komentarz
  wieloliniowy
*/
```

## Co dalej?

W tym kursie nauczysz się:
- **Zmiennych** i typów danych
- **Sterowania**: if/else, pętle
- **Funkcji** (klasycznych i strzałkowych)
- **Tablic i obiektów**
- **Async/await** i fetch

Każda lekcja ma ćwiczenie — kod uruchamiasz bezpośrednio w przeglądarce, bez instalacji.
""")

    create_lesson(t, m, "Zmienne: let, const, var", 2, "Theory", """# Zmienne w JavaScript

W JS są 3 sposoby deklaracji zmiennych:

```js
let name = "Anna";       // zmienna — możesz zmienić
const age = 30;          // stała — nie do reasign
var oldStyle = true;     // PRZESTARZAŁE — nie używaj
```

## Reguła kciuka

**Zawsze `const`**, chyba że MUSISZ zmieniać → wtedy `let`. **Nigdy `var`** w nowym kodzie.

```js
const PI = 3.14159;      // matematyczna stała
const user = { name: "Anna" };  // obiekty mogą mieć const — referencja stała, zawartość mutowalna

let counter = 0;
counter = counter + 1;   // OK, let pozwala na zmianę
```

## Hoisting

`var` jest hoisted (przenoszony na górę bloku). `let` i `const` nie. To kolejny powód, by ich używać.
""")

    create_lesson(t, m, "Typy danych", 3, "Theory", """# Typy danych w JavaScript

JS ma 7 typów prymitywnych:

| Typ | Przykład |
|---|---|
| `string` | `"Anna"`, `'kursy'`, `` `hello` `` |
| `number` | `42`, `3.14`, `-7` |
| `boolean` | `true`, `false` |
| `null` | `null` (świadomie brak wartości) |
| `undefined` | nie ustawione |
| `bigint` | `123n` (bardzo duże liczby) |
| `symbol` | unikalne ID (rzadko używane) |

Plus **obiekty** (object, array, function, Date, …).

## typeof — sprawdzenie typu

```js
typeof "Anna"         // "string"
typeof 42             // "number"
typeof true           // "boolean"
typeof undefined      // "undefined"
typeof null           // "object" (HISTORYCZNY BUG!)
typeof []             // "object"
typeof {}             // "object"
typeof function(){}   // "function"
```

## Konwersje

```js
String(42)            // "42"
Number("3.14")        // 3.14
Boolean(0)            // false
Boolean("")           // false
Boolean("0")          // true (!)

parseInt("42px", 10)  // 42
parseFloat("3.14")    // 3.14
```

## Template literals

```js
const name = "Anna";
const age = 30;
console.log(`Cześć ${name}, masz ${age} lat`);
```

Backticki (``` ` ```) pozwalają na interpolację `${...}` — używaj zamiast `+`.
""")

    create_lesson(t, m, "Operatory", 4, "Theory", """# Operatory w JS

## Arytmetyczne

```js
2 + 3     // 5
10 - 4    // 6
3 * 4     // 12
10 / 3    // 3.333...
10 % 3    // 1   (reszta z dzielenia)
2 ** 10   // 1024 (potęgowanie)
```

## Porównania

```js
5 == "5"    // true  — == konwertuje typy (zła praktyka!)
5 === "5"   // false — === ścisłe porównanie (UŻYWAJ TEGO)
5 !== 6     // true
5 > 3       // true
5 >= 5      // true
```

**Zasada:** zawsze `===` i `!==`, nigdy `==` i `!=`.

## Logiczne

```js
true && false   // false — AND
true || false   // true  — OR
!true           // false — NOT
```

## Specjalne JS

```js
null ?? "default"        // "default"  — nullish coalescing
undefined ?? "default"   // "default"
0 ?? "default"           // 0          (0 nie jest null/undefined!)
"" ?? "default"          // ""         (też!)

user?.address?.city      // safe navigation — undefined jeśli któreś null/undefined
```

## Skrócone przypisanie

```js
let x = 10;
x += 5;     // x = x + 5  → 15
x -= 3;     // x = x - 3  → 12
x *= 2;     // x = x * 2  → 24
```
""")

    # Exercise 1: print hello
    ex1 = create_lesson(t, m, "Ćwiczenie: pierwsza wiadomość", 5, "Exercise", """# Pierwsze ćwiczenie

Napisz kod który wypisze do konsoli tekst:

```
Witaj, kursy.pl!
```

Użyj `console.log()`.

Po napisaniu kliknij **Sprawdź** — testy zweryfikują czy stdout zawiera ten tekst.
""")
    add_exercise(t, ex1,
        prompt="Wypisz tekst 'Witaj, kursy.pl!' do konsoli.",
        starter="// Twój kod tutaj\n",
        solution='console.log("Witaj, kursy.pl!");',
        tests="""function test_greetingPrinted() {
    assertContains(__stdout__, "Witaj, kursy.pl!");
}""",
        hints=["Użyj console.log()", "Tekst owijasz w cudzysłów"]
    )

    # ── Moduł 2: Sterowanie ──
    m = create_module(t, cid, "Sterowanie przepływem", 2)
    create_lesson(t, m, "if / else / else if", 1, "Theory", """# if / else

```js
const age = 18;

if (age >= 18) {
    console.log("Pełnoletni");
} else {
    console.log("Niepełnoletni");
}
```

## else if

```js
const score = 75;
if (score >= 90) {
    console.log("A");
} else if (score >= 75) {
    console.log("B");
} else if (score >= 60) {
    console.log("C");
} else {
    console.log("F");
}
```

## Operator ternarny

Krótszy zapis dla prostych if/else:

```js
const status = age >= 18 ? "Pełnoletni" : "Niepełnoletni";
```

## Truthy / Falsy

W JS te wartości są **falsy** (traktowane jak `false`):
- `false`
- `0`, `-0`, `0n`
- `""` (pusty string)
- `null`, `undefined`
- `NaN`

Wszystko inne jest **truthy**, włącznie z `"0"`, `"false"`, `[]`, `{}`.

```js
if ("0") console.log("To się wykona!");  // string "0" jest truthy
if ([]) console.log("Pusta tablica też!");
```
""")

    create_lesson(t, m, "switch", 2, "Theory", """# switch

Gdy masz wiele warunków na tej samej zmiennej:

```js
const day = "Mon";

switch (day) {
    case "Mon":
        console.log("Poniedziałek");
        break;
    case "Tue":
        console.log("Wtorek");
        break;
    case "Wed":
        console.log("Środa");
        break;
    default:
        console.log("Inny dzień");
}
```

**Pamiętaj o `break`!** Bez niego wykonanie "spadnie" do następnego case.

## Łączenie case'ów

```js
switch (day) {
    case "Sat":
    case "Sun":
        console.log("Weekend!");
        break;
    default:
        console.log("Tydzień pracy");
}
```
""")

    create_lesson(t, m, "Pętla for", 3, "Theory", """# Pętla for

Klasyczna pętla z licznikiem:

```js
for (let i = 0; i < 5; i++) {
    console.log(i);
}
// Wypisze: 0, 1, 2, 3, 4
```

Składa się z 3 części:
1. **Inicjalizacja**: `let i = 0` — wykonana raz przed pętlą
2. **Warunek**: `i < 5` — sprawdzany przed każdą iteracją
3. **Inkrement**: `i++` — wykonany po każdej iteracji

## Liczenie wstecz

```js
for (let i = 10; i > 0; i--) {
    console.log(i);
}
```

## break i continue

```js
for (let i = 0; i < 10; i++) {
    if (i === 5) break;       // wyjdź z pętli
    if (i % 2 === 0) continue; // pomiń resztę iteracji
    console.log(i);
}
// Wypisze: 1, 3
```
""")

    create_lesson(t, m, "while i do...while", 4, "Theory", """# while

Pętla z warunkiem na początku:

```js
let i = 0;
while (i < 5) {
    console.log(i);
    i++;
}
```

## do...while

Wykona się **co najmniej raz**, nawet jeśli warunek od początku jest false:

```js
let count = 10;
do {
    console.log(count);
    count++;
} while (count < 5);
// Wypisze: 10 (mimo że 10 < 5 jest false)
```

## Kiedy używać czego?

| Wiesz ile razy? | Użyj |
|---|---|
| Tak (np. 10) | `for (let i = 0; i < 10; i++)` |
| Nie | `while (warunek)` |
| Wykonaj raz minimum | `do...while` |
""")

    # Exercise 2: suma
    ex2 = create_lesson(t, m, "Ćwiczenie: suma 1..N", 5, "Exercise", """# Ćwiczenie

Napisz funkcję `sum(n)` która zwraca sumę liczb od `1` do `n` włącznie.

Przykład:
```
sum(5) → 1 + 2 + 3 + 4 + 5 = 15
sum(10) → 55
sum(1) → 1
sum(0) → 0
```
""")
    add_exercise(t, ex2,
        prompt="Napisz sum(n) zwracające sumę liczb od 1 do n.",
        starter="""function sum(n) {
    // Twój kod
    return 0;
}""",
        solution="""function sum(n) {
    let total = 0;
    for (let i = 1; i <= n; i++) total += i;
    return total;
}""",
        tests="""function test_sumSmall() {
    assertEqual(sum(5), 15);
}
function test_sumLarger() {
    assertEqual(sum(10), 55);
}
function test_sumOne() {
    assertEqual(sum(1), 1);
}
function test_sumZero() {
    assertEqual(sum(0), 0);
}""",
        hints=[
            "Użyj pętli for od 1 do n włącznie (i <= n)",
            "Trzymaj sumę w zmiennej total",
            "Można też matematycznie: n*(n+1)/2"
        ]
    )

    # Exercise 3: FizzBuzz
    ex3 = create_lesson(t, m, "Ćwiczenie: FizzBuzz", 6, "Exercise", """# Ćwiczenie: FizzBuzz

Klasyk pytań rekrutacyjnych. Napisz `fizzBuzz(n)` która zwraca **tablicę** z liczbami od 1 do n, z modyfikacjami:

- Liczba podzielna przez **3** → `"Fizz"`
- Liczba podzielna przez **5** → `"Buzz"`
- Liczba podzielna przez **3 i 5** → `"FizzBuzz"`
- W p.p. → sama liczba

Przykład:
```
fizzBuzz(15) →
[1, 2, "Fizz", 4, "Buzz", "Fizz", 7, 8, "Fizz", "Buzz", 11, "Fizz", 13, 14, "FizzBuzz"]
```
""")
    add_exercise(t, ex3,
        prompt="Zaimplementuj fizzBuzz(n) zwracające tablicę.",
        starter="""function fizzBuzz(n) {
    const result = [];
    // Twój kod
    return result;
}""",
        solution="""function fizzBuzz(n) {
    const result = [];
    for (let i = 1; i <= n; i++) {
        if (i % 15 === 0) result.push("FizzBuzz");
        else if (i % 3 === 0) result.push("Fizz");
        else if (i % 5 === 0) result.push("Buzz");
        else result.push(i);
    }
    return result;
}""",
        tests="""function test_smallExample() {
    const r = fizzBuzz(15);
    assertEqual(r.length, 15);
    assertEqual(r[0], 1);
    assertEqual(r[2], "Fizz");
    assertEqual(r[4], "Buzz");
    assertEqual(r[14], "FizzBuzz");
}
function test_singleElement() {
    assertEqual(JSON.stringify(fizzBuzz(1)), JSON.stringify([1]));
}""",
        hints=[
            "Sprawdź najpierw % 15 (czyli i podzielne przez 3 i 5 jednocześnie)",
            "Potem % 3 i % 5 osobno",
            "Push do tablicy: result.push(...)"
        ]
    )

    # ── Moduł 3: Funkcje ──
    m = create_module(t, cid, "Funkcje", 3)
    create_lesson(t, m, "Deklaracja funkcji", 1, "Theory", """# Funkcje

```js
function greet(name) {
    return `Cześć, ${name}!`;
}

console.log(greet("Anna"));  // Cześć, Anna!
```

## Function expression

Funkcja jako wartość przypisana do zmiennej:

```js
const greet = function(name) {
    return `Cześć, ${name}!`;
};
```

## Default parameters

```js
function greet(name = "świat") {
    return `Cześć, ${name}!`;
}

greet();         // "Cześć, świat!"
greet("Anna");   // "Cześć, Anna!"
```

## Rest parameters

```js
function sum(...numbers) {
    return numbers.reduce((a, b) => a + b, 0);
}

sum(1, 2, 3, 4);  // 10
```

## Funkcje to obywatele pierwszej kategorii

W JS funkcje to **wartości** — możesz je przekazywać, zwracać, przypisywać.

```js
const operations = {
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
};

console.log(operations.add(2, 3));  // 5
```
""")

    create_lesson(t, m, "Arrow functions", 2, "Theory", """# Arrow functions

Krótszy zapis funkcji wprowadzony w ES6:

```js
// Klasycznie:
function double(x) {
    return x * 2;
}

// Arrow:
const double = (x) => x * 2;

// Jeden parametr — można bez nawiasów:
const double = x => x * 2;

// Bez parametrów — pusty nawias:
const greet = () => "Cześć!";

// Wiele linijek — potrzebne {} i return:
const greetUser = (name, age) => {
    const msg = `${name} ma ${age} lat`;
    return msg;
};
```

## Różnice względem klasycznych funkcji

Arrow nie ma własnego `this` — dziedziczy z otaczającego scope. Bardzo użyteczne w callbackach:

```js
class Timer {
    constructor() {
        this.seconds = 0;
        setInterval(() => {
            this.seconds++;  // `this` to Timer dzięki arrow
        }, 1000);
    }
}
```

Bez arrow — `this` w `setInterval` to byłby `window`/undefined.

## Kiedy klasyczne, kiedy arrow?

- **Arrow** dla callbacków, krótkich funkcji, metod tablic
- **Klasyczne (function)** dla metod klas, gdy potrzebujesz `this` instancji
""")

    create_lesson(t, m, "Closure (domknięcia)", 3, "Theory", """# Closure

Funkcja wewnętrzna ma dostęp do zmiennych z otaczającej funkcji **nawet po jej zakończeniu**.

```js
function makeCounter() {
    let count = 0;          // zmienna lokalna
    return function() {
        count++;
        return count;
    };
}

const counter = makeCounter();
console.log(counter());  // 1
console.log(counter());  // 2
console.log(counter());  // 3
```

`counter` "pamięta" zmienną `count` — to jest closure.

## Praktyczne użycie

```js
function makeMultiplier(factor) {
    return (x) => x * factor;
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

double(5);  // 10
triple(5);  // 15
```

Closures pozwalają tworzyć **prywatny stan**, biblioteki konfiguracyjne, currying, memoizację.
""")

    # Exercise 4: double
    ex4 = create_lesson(t, m, "Ćwiczenie: funkcja double", 4, "Exercise", """# Ćwiczenie

Napisz funkcję `double(x)` która zwraca podwojoną wartość:

```
double(5) → 10
double(0) → 0
double(-3) → -6
```
""")
    add_exercise(t, ex4,
        prompt="Napisz funkcję double(x) zwracającą x razy 2.",
        starter="""function double(x) {
    // Twój kod
}""",
        solution="const double = x => x * 2;",
        tests="""function test_positive() { assertEqual(double(5), 10); }
function test_zero() { assertEqual(double(0), 0); }
function test_negative() { assertEqual(double(-3), -6); }
function test_decimal() { assertEqual(double(2.5), 5); }""",
        hints=["Pomnóż x razy 2", "Pamiętaj o return"]
    )

    # Exercise 5: factorial
    ex5 = create_lesson(t, m, "Ćwiczenie: silnia", 5, "Exercise", """# Ćwiczenie: silnia

Napisz funkcję `factorial(n)` która zwraca silnię z `n`:

```
factorial(0) → 1
factorial(1) → 1
factorial(5) → 5 × 4 × 3 × 2 × 1 = 120
factorial(7) → 5040
```

Możesz użyć pętli lub rekurencji.
""")
    add_exercise(t, ex5,
        prompt="Napisz factorial(n).",
        starter="""function factorial(n) {
    // Twój kod
}""",
        solution="""function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}""",
        tests="""function test_zero() { assertEqual(factorial(0), 1); }
function test_one() { assertEqual(factorial(1), 1); }
function test_five() { assertEqual(factorial(5), 120); }
function test_seven() { assertEqual(factorial(7), 5040); }""",
        hints=[
            "Silnia z 0 i 1 to 1 (przypadek bazowy)",
            "Pętla: for (let i = 1; i <= n; i++) result *= i",
            "Rekurencja: factorial(n) = n * factorial(n-1)"
        ]
    )

    # ── Moduł 4: Tablice i obiekty ──
    m = create_module(t, cid, "Tablice i obiekty", 4)
    create_lesson(t, m, "Tablice", 1, "Theory", """# Tablice w JS

```js
const fruits = ["jabłko", "banan", "wiśnia"];

fruits[0]      // "jabłko"
fruits.length  // 3

// Modyfikacja
fruits.push("śliwka");    // dodaj na koniec
fruits.pop();              // usuń z końca
fruits.unshift("morela"); // dodaj na początek
fruits.shift();            // usuń z początku
```

## Częste metody

```js
const nums = [3, 1, 4, 1, 5, 9, 2, 6];

nums.includes(4)              // true
nums.indexOf(5)               // 4
nums.slice(2, 5)              // [4, 1, 5]  (kopia, [start, end))
nums.concat([100, 200])       // nowa tablica z dodanymi
nums.join(", ")               // "3, 1, 4, 1, 5, 9, 2, 6"

[...nums].sort((a, b) => a - b)   // [1, 1, 2, 3, 4, 5, 6, 9]
[...nums].reverse()                // [6, 2, 9, 5, 1, 4, 1, 3]
```

**Uwaga:** `sort`, `reverse` modyfikują oryginał. Kopiuj `[...]` jeśli nie chcesz tego.

## Mutowalne vs niemutowalne

```js
// Mutują oryginał:
push, pop, shift, unshift, splice, sort, reverse

// Zwracają nową tablicę:
slice, concat, map, filter, reduce, flat, flatMap
```
""")

    create_lesson(t, m, "map, filter, reduce", 2, "Theory", """# Funkcyjne metody tablic

To 3 najbardziej praktyczne metody w JS.

## map — transformuje każdy element

```js
const nums = [1, 2, 3, 4, 5];
const doubled = nums.map(n => n * 2);
// [2, 4, 6, 8, 10]

const users = [{ name: "Anna" }, { name: "Bartek" }];
const names = users.map(u => u.name);
// ["Anna", "Bartek"]
```

## filter — wybiera elementy spełniające warunek

```js
const nums = [1, 2, 3, 4, 5, 6, 7, 8];
const evens = nums.filter(n => n % 2 === 0);
// [2, 4, 6, 8]

const users = [
    { name: "Anna", age: 30 },
    { name: "Bartek", age: 17 },
    { name: "Celina", age: 25 },
];
const adults = users.filter(u => u.age >= 18);
// [{ Anna, 30 }, { Celina, 25 }]
```

## reduce — redukuje tablicę do pojedynczej wartości

```js
const nums = [1, 2, 3, 4, 5];

const sum = nums.reduce((acc, n) => acc + n, 0);
// 15  (acc = "akumulator", startowo 0)

const product = nums.reduce((acc, n) => acc * n, 1);
// 120

const max = nums.reduce((acc, n) => n > acc ? n : acc, nums[0]);
// 5
```

## Łańcuchowanie

Możesz łączyć metody:

```js
const result = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    .filter(n => n % 2 === 0)   // [2, 4, 6, 8, 10]
    .map(n => n * n)             // [4, 16, 36, 64, 100]
    .reduce((a, b) => a + b, 0); // 220
```

To czyste, deklaratywne podejście — opisujesz CO chcesz, nie JAK.
""")

    create_lesson(t, m, "Obiekty", 3, "Theory", """# Obiekty

```js
const user = {
    name: "Anna",
    age: 30,
    email: "anna@example.com",
    greet() {
        return `Cześć, jestem ${this.name}`;
    },
};

user.name              // "Anna"
user["name"]           // "Anna" (alternatywa)
user.greet()           // "Cześć, jestem Anna"

// Dodawanie pól
user.role = "admin";

// Usuwanie
delete user.age;
```

## Iterowanie po obiekcie

```js
for (const key in user) {
    console.log(key, user[key]);
}

// Lepiej:
Object.keys(user)      // ["name", "email", "role", "greet"]
Object.values(user)    // wartości
Object.entries(user)   // [["name", "Anna"], ["email", ...]]

for (const [k, v] of Object.entries(user)) {
    console.log(k, v);
}
```

## Spread (rozproszenie)

```js
const user = { name: "Anna", age: 30 };
const updated = { ...user, age: 31 };
// { name: "Anna", age: 31 }   (oryginał nieruszony)
```

## Object destructuring

```js
const { name, age } = user;
console.log(name, age);

// Z aliasem:
const { name: userName } = user;

// Z wartością domyślną:
const { role = "guest" } = user;
```
""")

    # Exercise 6: max value
    ex6 = create_lesson(t, m, "Ćwiczenie: najwyższa wartość", 4, "Exercise", """# Ćwiczenie

Napisz `findMax(arr)` która zwraca najwyższą liczbę z tablicy.

```
findMax([1, 5, 3, 9, 2]) → 9
findMax([-10, -3, -7]) → -3
findMax([42]) → 42
```

Pusta tablica → zwróć `null`.
""")
    add_exercise(t, ex6,
        prompt="Napisz findMax(arr).",
        starter="""function findMax(arr) {
    // Twój kod
}""",
        solution="""function findMax(arr) {
    if (arr.length === 0) return null;
    return arr.reduce((m, n) => n > m ? n : m, arr[0]);
}""",
        tests="""function test_basic() { assertEqual(findMax([1, 5, 3, 9, 2]), 9); }
function test_negatives() { assertEqual(findMax([-10, -3, -7]), -3); }
function test_single() { assertEqual(findMax([42]), 42); }
function test_empty() { assertEqual(findMax([]), null); }""",
        hints=[
            "Możesz użyć Math.max(...arr) ale spróbuj reduce",
            "Pusta tablica → return null",
            "Akumulator startuje od pierwszego elementu"
        ]
    )

    create_lesson(t, m, "Quiz: tablice i obiekty", 5, "Quiz", json.dumps({
        "intro": "Sprawdź swoją wiedzę o strukturach danych w JS.",
        "passingPercentage": 70,
        "questions": [
            {"id": "q1", "prompt": "Co zwróci [1,2,3].map(n=>n*2)?",
             "options": ["[1,2,3]", "[2,4,6]", "[1,4,9]", "6"], "correctIndex": 1},
            {"id": "q2", "prompt": "Która metoda MUTUJE oryginalną tablicę?",
             "options": ["map", "filter", "sort", "slice"], "correctIndex": 2,
             "explanation": "sort modyfikuje oryginał. Robisz [...arr].sort() jeśli chcesz kopię."},
            {"id": "q3", "prompt": "reduce((acc, n) => acc + n, 0) na [1,2,3,4]?",
             "options": ["10", "0", "[1,2,3,4]", "1234"], "correctIndex": 0},
            {"id": "q4", "prompt": "Object.keys({a:1, b:2}) zwróci...",
             "options": ["[1, 2]", "['a', 'b']", "[['a',1],['b',2]]", "{a, b}"], "correctIndex": 1},
            {"id": "q5", "prompt": "const { x = 5 } = {}; jakie x?",
             "options": ["undefined", "null", "5", "error"], "correctIndex": 2,
             "explanation": "Default value w destructuring — gdy property nie istnieje."},
        ],
    }, ensure_ascii=False))

    # ── Moduł 5: Asynchroniczność ──
    m = create_module(t, cid, "Asynchroniczność", 5)
    create_lesson(t, m, "Callbacki i timery", 1, "Theory", """# Asynchroniczność — wstęp

JS jest **jednowątkowy** ale ma event loop, który pozwala wykonywać operacje asynchroniczne (timery, requesty HTTP, eventy).

## Callback

Funkcja przekazana jako argument, wykonana "później":

```js
setTimeout(() => {
    console.log("To pojawi się po 2 sekundach");
}, 2000);

console.log("To pojawi się NATYCHMIAST");
```

Output:
```
To pojawi się NATYCHMIAST
To pojawi się po 2 sekundach
```

## setInterval

```js
let i = 0;
const timer = setInterval(() => {
    console.log(i++);
    if (i >= 5) clearInterval(timer);
}, 1000);
```

## Callback hell

Problem — zagnieżdżone callbacki stają się nieczytelne:

```js
loadUser(1, (err, user) => {
    if (err) return console.error(err);
    loadPosts(user.id, (err, posts) => {
        if (err) return console.error(err);
        loadComments(posts[0].id, (err, comments) => {
            // ...
        });
    });
});
```

Rozwiązanie: **Promise i async/await** (następne lekcje).
""")

    create_lesson(t, m, "Promise", 2, "Theory", """# Promise

Promise to obiekt reprezentujący wartość, która będzie dostępna **w przyszłości** (lub błąd).

```js
const promise = new Promise((resolve, reject) => {
    setTimeout(() => {
        const success = true;
        if (success) {
            resolve("Got the data!");
        } else {
            reject(new Error("Failed!"));
        }
    }, 1000);
});

promise
    .then(result => console.log(result))      // jeśli resolve
    .catch(err => console.error(err.message)); // jeśli reject
```

## Stany Promise

- **pending** — w trakcie
- **fulfilled** — sukces (resolve)
- **rejected** — błąd (reject)

## Łańcuchowanie

```js
fetch("/api/users/1")
    .then(res => res.json())
    .then(user => fetch(`/api/posts/${user.id}`))
    .then(res => res.json())
    .then(posts => console.log(posts))
    .catch(err => console.error(err));
```

## Promise.all — równolegle

```js
const [user, posts, comments] = await Promise.all([
    fetch("/api/user"),
    fetch("/api/posts"),
    fetch("/api/comments"),
]);
```

Czeka aż wszystkie się rozwiążą. Jeden reject → wszystko reject.

## Promise.race — pierwszy wygrywa

```js
const winner = await Promise.race([
    slowApi(),
    timeout(5000),  // jeśli slowApi trwa >5s, rzuca błąd
]);
```
""")

    create_lesson(t, m, "async / await", 3, "Theory", """# async / await

Słodzik składniowy na Promise — kod wygląda jak synchroniczny.

```js
async function loadUser(id) {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error("Not found");
    return res.json();
}

const user = await loadUser(42);
console.log(user.name);
```

vs to samo na Promise:

```js
function loadUser(id) {
    return fetch(`/api/users/${id}`)
        .then(res => {
            if (!res.ok) throw new Error("Not found");
            return res.json();
        });
}

loadUser(42).then(user => console.log(user.name));
```

## Reguły

1. `await` działa **tylko wewnątrz `async function`** (lub top-level w modułach)
2. `async function` **zawsze zwraca Promise** — nawet jeśli nie ma awaita
3. Błędy łapiesz `try/catch`:

```js
async function example() {
    try {
        const user = await loadUser(42);
        console.log(user);
    } catch (err) {
        console.error("Coś poszło nie tak:", err.message);
    }
}
```

## Równolegle

```js
// Sekwencyjnie (wolno):
const a = await fetchA();   // 1s
const b = await fetchB();   // +1s = 2s total
const c = await fetchC();   // +1s = 3s total

// Równolegle (szybko):
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
// max(1s, 1s, 1s) = 1s total
```
""")

    create_lesson(t, m, "fetch API", 4, "Theory", """# fetch — wbudowane API do HTTP

```js
// GET
const res = await fetch("/api/users");
const users = await res.json();

// POST
const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Anna" }),
});

if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
}

const created = await res.json();
```

## Pełny przykład — obsługa błędów

```js
async function getUser(id) {
    try {
        const res = await fetch(`/api/users/${id}`);

        if (!res.ok) {
            if (res.status === 404) throw new Error("User not found");
            if (res.status === 401) throw new Error("Unauthorized");
            throw new Error(`HTTP ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        if (err instanceof TypeError) {
            // Network error (offline, DNS, CORS)
            console.error("Network error:", err.message);
        }
        throw err;
    }
}
```

## AbortController — anulowanie requestu

```js
const controller = new AbortController();

const res = await fetch("/api/slow", {
    signal: controller.signal,
});

// Po 5 sekundach przerwij:
setTimeout(() => controller.abort(), 5000);
```

## Headers

```js
await fetch("/api/secure", {
    headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "X-Custom-Header": "value",
    },
});
```
""")

    # Final quiz
    create_lesson(t, cid_to_module := create_module(t, cid, "Podsumowanie", 6),
                  "Wielki quiz końcowy", 1, "Quiz", json.dumps({
        "intro": "10 pytań sprawdzających całą wiedzę z kursu.",
        "passingPercentage": 70,
        "questions": [
            {"id": "q1", "prompt": "Który operator porównania używamy w JS?",
             "options": ["==", "===", "=", "<>"], "correctIndex": 1,
             "explanation": "=== nie robi konwersji typu, zawsze go używaj."},
            {"id": "q2", "prompt": "Co zwróci typeof null?",
             "options": ["null", "undefined", "object", "string"], "correctIndex": 2,
             "explanation": "Historyczny bug JS od 1995 roku, nigdy nie naprawiony dla wstecznej kompatybilności."},
            {"id": "q3", "prompt": "Co robi const?",
             "options": ["Tworzy stałą wartość", "Blokuje reasignację referencji", "Sprawia że obiekt jest immutable", "Hoistuje zmienną"],
             "correctIndex": 1,
             "explanation": "const blokuje reasignację, ale właściwości obiektu pod const można zmieniać."},
            {"id": "q4", "prompt": "[1,2,3].reduce((a,b) => a + b, 10) zwraca...",
             "options": ["6", "16", "[10,1,2,3]", "Error"], "correctIndex": 1,
             "explanation": "Akumulator startuje od 10, dodajemy 1+2+3 = 16."},
            {"id": "q5", "prompt": "Co zwraca async function fn() { return 42; }?",
             "options": ["42", "undefined", "Promise<42>", "Error"], "correctIndex": 2,
             "explanation": "async function ZAWSZE zwraca Promise — nawet jeśli return jest sync."},
            {"id": "q6", "prompt": "Wynik [...new Set([1,2,2,3,3,3])]?",
             "options": ["[1,2,3]", "[1,2,2,3,3,3]", "{1,2,3}", "6"], "correctIndex": 0,
             "explanation": "Set usuwa duplikaty, spread przerabia na tablicę."},
            {"id": "q7", "prompt": "Co robi optional chaining ?.",
             "options": ["null jeśli wartość null", "rzuca błąd", "zwraca undefined zamiast TypeError gdy któreś ogniwo null/undefined", "tworzy alias"],
             "correctIndex": 2},
            {"id": "q8", "prompt": "Kolejność output: console.log('A'); setTimeout(() => console.log('B'), 0); console.log('C');",
             "options": ["A B C", "A C B", "C A B", "B A C"], "correctIndex": 1,
             "explanation": "setTimeout z 0ms i tak idzie do event loop — wykona się po sync codzie."},
            {"id": "q9", "prompt": "Co robi spread (...)?",
             "options": ["łączy stringi", "rozpakowuje tablicę/obiekt", "tworzy wskaźnik", "konwertuje typ"],
             "correctIndex": 1},
            {"id": "q10", "prompt": "Najszybszy sposób na równoległe 3 awaity?",
             "options": ["3x await jeden po drugim", "Promise.all([a, b, c])", "Promise.race", "for...of z await"],
             "correctIndex": 1},
        ],
    }, ensure_ascii=False))

    publish_course(cid)
    return cid


# ───────────────── C# i .NET ─────────────────
def build_csharp_course(t):
    cid = create_course(t,
        "C# i .NET od zera",
        "Kompletny kurs C# 13 i .NET 10 — od składni po LINQ, async/await i wstęp do ASP.NET. Bez znajomości programowania.",
        "CSharp",
        tags=["csharp", ".net", "podstawy"]
    )

    m = create_module(t, cid, "Wprowadzenie do C#", 1)
    create_lesson(t, m, "Co to jest .NET?", 1, "Theory", """# .NET — ekosystem Microsoftu

**.NET** to platforma developerska, na której budujesz aplikacje **dowolnego typu** w **dowolnym języku** (C#, F#, VB.NET).

## Co możesz zbudować?

- **Web API + backend** — ASP.NET Core
- **Desktop** — WinForms, WPF, MAUI
- **Mobile** — MAUI, Xamarin
- **Gry** — Unity (najpopularniejszy engine używa C#)
- **Cloud** — Azure Functions, Service Fabric
- **AI/ML** — ML.NET, ONNX

## Dlaczego C#?

- **Silnie typowany** — błędy łapiesz w kompilacji, nie produkcji
- **Bardzo wydajny** — JIT + AOT, czasem rivalizuje z Rustem/C++
- **Cross-platform** — Linux, Mac, Windows, kontenery
- **Ogromna stdlib** — kolekcje, LINQ, async, HTTP, JSON, …
- **Świetny tooling** — Visual Studio, Rider, VS Code z OmniSharp

## .NET 10

Najnowsza wersja (LTS). Ten kurs używa C# 13 + .NET 10.
""")

    create_lesson(t, m, "Witaj C#", 2, "Theory", """# Pierwszy program

```csharp
using System;

class Program
{
    static void Main()
    {
        Console.WriteLine("Witaj, C#!");
    }
}
```

Od .NET 6 możesz pisać **top-level statements** — bez klasy Main:

```csharp
Console.WriteLine("Witaj, C#!");
```

## Struktura projektu

```
MyApp/
├── MyApp.csproj          # plik projektu (XML)
├── Program.cs            # entry point
└── obj/, bin/            # generowane przez build
```

`.csproj` definiuje typ projektu, target framework, zależności:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
```

## Komendy

```bash
dotnet new console -n MyApp     # nowy projekt
cd MyApp
dotnet run                      # zbuduj i odpal
dotnet build                    # tylko zbuduj
dotnet add package Newtonsoft.Json    # dodaj NuGet
```
""")

    create_lesson(t, m, "Zmienne i typy danych", 3, "Theory", """# Typy w C#

C# jest **silnie typowany** — każda zmienna ma typ.

## Typy podstawowe

```csharp
int age = 30;              // 32-bitowa liczba całkowita
long bigNumber = 9_000_000_000L;
double price = 19.99;      // 8-bajtowa floating point
decimal money = 1999.50m;  // dokładna arytmetyka (pieniądze!)
float temp = 22.5f;
bool isActive = true;
char letter = 'A';
string name = "Anna";
```

**Reguła:** `decimal` do pieniędzy, `double` do nauki, `float` rzadko.

## Konwersje

```csharp
// Implicit (bezpieczne):
int x = 10;
double y = x;  // OK, int → double bez straty

// Explicit (cast):
double a = 3.7;
int b = (int)a;  // 3 (obcina!)

// Parse:
int n = int.Parse("42");
bool ok = int.TryParse("42", out int result);  // safer
```

## var — inferencja

```csharp
var x = 42;          // x jest int
var msg = "Hello";   // msg jest string
var list = new List<int>();  // List<int>
```

Kompilator wnioskuje typ. **Nadal silnie typowane** — x zawsze będzie int.

## nullable

W .NET z `Nullable: enable` rozróżniasz:

```csharp
string name = "Anna";        // nie może być null
string? maybeName = null;    // może być null

int x = 42;                  // nie może być null
int? y = null;               // może być null
```

`?` = "może być null". Kompilator wymusza sprawdzenia.
""")

    create_lesson(t, m, "Operatory i sterowanie", 4, "Theory", """# Operatory + sterowanie

## Arytmetyka

```csharp
int a = 10, b = 3;
int sum = a + b;     // 13
int div = a / b;     // 3   (dzielenie całkowite!)
int mod = a % b;     // 1
double d = a / (double)b;  // 3.333... (rzutuj!)
```

## Porównania

```csharp
a == b    // false
a != b    // true
a > b     // true
a >= b
```

## Logiczne

```csharp
true && false   // false (AND)
true || false   // true  (OR)
!true           // false (NOT)
```

## if / else

```csharp
if (age >= 18)
    Console.WriteLine("Pełnoletni");
else if (age >= 13)
    Console.WriteLine("Nastolatek");
else
    Console.WriteLine("Dziecko");

// ternarny:
string status = age >= 18 ? "adult" : "minor";
```

## switch (klasyczny)

```csharp
switch (day)
{
    case "Mon": Console.WriteLine("Pon"); break;
    case "Tue": Console.WriteLine("Wt"); break;
    default: Console.WriteLine("?"); break;
}
```

## switch expression (C# 8+, nowoczesne)

```csharp
string label = day switch {
    "Mon" => "Poniedziałek",
    "Tue" => "Wtorek",
    "Sat" or "Sun" => "Weekend",
    _ => "Tydzień"
};
```

## Pętle

```csharp
// for
for (int i = 0; i < 5; i++)
    Console.WriteLine(i);

// foreach
foreach (var item in collection)
    Console.WriteLine(item);

// while
int n = 0;
while (n < 5) { Console.WriteLine(n++); }
```
""")

    m = create_module(t, cid, "OOP — klasy i obiekty", 2)
    create_lesson(t, m, "Klasy", 1, "Theory", """# Klasy w C#

```csharp
public class User
{
    // Pola
    private string _email;

    // Properties (zalecane zamiast pól publicznych)
    public string Name { get; set; }
    public int Age { get; set; }

    // Konstruktor
    public User(string name, int age, string email)
    {
        Name = name;
        Age = age;
        _email = email;
    }

    // Metoda
    public string Greet() => $"Cześć, jestem {Name}!";
}
```

Użycie:

```csharp
var u = new User("Anna", 30, "anna@example.com");
Console.WriteLine(u.Greet());
u.Name = "Anna Nowak";
```

## Auto-properties z private set

```csharp
public class Order
{
    public Guid Id { get; }                  // tylko getter, ustawiany w konstr.
    public DateTime CreatedAt { get; }
    public decimal Total { get; private set; }  // settable tylko w klasie

    public Order()
    {
        Id = Guid.NewGuid();
        CreatedAt = DateTime.UtcNow;
    }

    public void AddItem(decimal price) => Total += price;
}
```

## Static

```csharp
public static class MathHelper
{
    public static int Square(int x) => x * x;
}

// Użycie:
int s = MathHelper.Square(5);  // 25 — bez instancji
```
""")

    create_lesson(t, m, "Records (C# 9+)", 2, "Theory", """# Records — immutable types

Krótszy zapis dla typów wartości / DTO:

```csharp
public record User(string Name, int Age, string Email);

// Użycie:
var u = new User("Anna", 30, "anna@example.com");
Console.WriteLine(u);  // User { Name = Anna, Age = 30, Email = ... }

// "with" — kopia z modyfikacją (immutable!)
var older = u with { Age = 31 };
```

## Record class vs struct

```csharp
public record class Person(string Name);    // reference type (default)
public record struct Point(int X, int Y);   // value type
```

## Equality by value

Records automatycznie mają `Equals` i `GetHashCode` bazowane na wartościach pól:

```csharp
var a = new User("Anna", 30, "a@b.com");
var b = new User("Anna", 30, "a@b.com");

a == b;          // true  (records)
ReferenceEquals(a, b);  // false  (różne instancje)
```

## Kiedy użyć?

- **DTO**, API contracts, value objects → record
- **Klasy z logiką, stanem, mutowalne** → class
""")

    create_lesson(t, m, "Dziedziczenie i interfejsy", 3, "Theory", """# Dziedziczenie

```csharp
public class Animal
{
    public string Name { get; set; }
    public virtual string Sound() => "...";
}

public class Dog : Animal
{
    public override string Sound() => "Hau!";
}

public class Cat : Animal
{
    public override string Sound() => "Miau!";
}

Animal a = new Dog { Name = "Rex" };
Console.WriteLine(a.Sound());  // "Hau!"  (polimorfizm)
```

## Interfejsy

```csharp
public interface IShape
{
    double Area();
    double Perimeter();
}

public class Circle : IShape
{
    public double Radius { get; set; }
    public double Area() => Math.PI * Radius * Radius;
    public double Perimeter() => 2 * Math.PI * Radius;
}

public class Square : IShape
{
    public double Side { get; set; }
    public double Area() => Side * Side;
    public double Perimeter() => 4 * Side;
}

// Polimorfizm:
IShape[] shapes = { new Circle { Radius = 5 }, new Square { Side = 3 } };
foreach (var s in shapes)
    Console.WriteLine($"Area: {s.Area()}");
```

## abstract class

Połączenie klasy i interfejsu — może mieć implementacje + abstract metody.

```csharp
public abstract class Shape
{
    public string Color { get; set; }     // konkretne
    public abstract double Area();          // musi być nadpisane
    public void Describe() => Console.WriteLine($"{Color} shape, area {Area()}");
}
```

## C# nie ma multiple inheritance dla klas

Ale możesz implementować WIELE interfejsów:

```csharp
public class Image : IDrawable, ISerializable, IComparable { ... }
```
""")

    m = create_module(t, cid, "Kolekcje i LINQ", 3)
    create_lesson(t, m, "List, Dictionary, HashSet", 1, "Theory", """# Kolekcje w C#

## List<T>

```csharp
var nums = new List<int> { 1, 2, 3 };
nums.Add(4);
nums.Remove(2);
nums.Count;             // 3
nums[0];                // 1
nums.Contains(3);       // true
```

## Dictionary<TKey, TValue>

Hash map — szybkie szukanie po kluczu O(1):

```csharp
var ages = new Dictionary<string, int>
{
    ["Anna"] = 30,
    ["Bartek"] = 25,
};

ages["Celina"] = 28;
ages.ContainsKey("Anna");  // true

if (ages.TryGetValue("Dorota", out int age))
    Console.WriteLine(age);

foreach (var (name, a) in ages)
    Console.WriteLine($"{name}: {a}");
```

## HashSet<T>

Set — unikalne wartości, szybkie .Contains():

```csharp
var unique = new HashSet<int> { 1, 2, 3, 2, 1 };
// {1, 2, 3}  (duplikaty usunięte)

unique.Add(5);
unique.Contains(2);  // true (O(1))
```

## Array vs List

```csharp
int[] arr = new int[10];       // sztywny rozmiar 10
arr[0] = 42;

var list = new List<int>();    // dynamiczny rozmiar
list.Add(42);
```

W praktyce: zawsze `List<T>` chyba że masz powód użyć array (interop, performance, fixed size).
""")

    create_lesson(t, m, "LINQ — zapytania na kolekcjach", 2, "Theory", """# LINQ (Language Integrated Query)

LINQ pozwala pisać deklaratywnie na każdej kolekcji.

```csharp
using System.Linq;

var nums = new[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

// Where (filter)
var evens = nums.Where(n => n % 2 == 0);

// Select (map)
var squared = nums.Select(n => n * n);

// OrderBy
var sorted = nums.OrderByDescending(n => n);

// Łańcuchowanie
var result = nums
    .Where(n => n > 3)
    .Select(n => n * 10)
    .Take(3)
    .ToList();
// [40, 50, 60]
```

## Agregacje

```csharp
nums.Sum();         // 55
nums.Average();     // 5.5
nums.Min();         // 1
nums.Max();         // 10
nums.Count();       // 10
nums.Any(n => n > 5);    // true
nums.All(n => n > 0);    // true
```

## Group i Join

```csharp
var users = new[]
{
    new { Name = "Anna", City = "Warszawa" },
    new { Name = "Bartek", City = "Kraków" },
    new { Name = "Celina", City = "Warszawa" },
};

var byCity = users.GroupBy(u => u.City);
foreach (var g in byCity)
{
    Console.WriteLine($"{g.Key}:");
    foreach (var u in g)
        Console.WriteLine($"  - {u.Name}");
}
// Warszawa:
//   - Anna
//   - Celina
// Kraków:
//   - Bartek
```

## FirstOrDefault vs First

```csharp
nums.First(n => n > 100);              // wyjątek!
nums.FirstOrDefault(n => n > 100);     // 0 (default int)
nums.FirstOrDefault(n => n > 100, -1); // -1 (custom default)
```

## Materializacja

LINQ jest **lazy** — query się nie wykonuje aż wywołasz `ToList()`, `ToArray()`, `First()`, `Count()`.

```csharp
var query = nums.Where(n => n > 3);   // jeszcze nic nie zrobione
var list = query.ToList();             // teraz wykona
```
""")

    create_lesson(t, m, "Quiz: kolekcje i LINQ", 3, "Quiz", json.dumps({
        "intro": "Sprawdź swoją znajomość LINQ.",
        "passingPercentage": 70,
        "questions": [
            {"id": "q1", "prompt": "Która metoda LINQ odpowiada JS .map()?",
             "options": ["Where", "Select", "Aggregate", "GroupBy"], "correctIndex": 1},
            {"id": "q2", "prompt": "Która metoda LINQ odpowiada JS .filter()?",
             "options": ["Where", "Select", "Filter", "Find"], "correctIndex": 0},
            {"id": "q3", "prompt": "Co zwraca FirstOrDefault gdy brak elementu pasującego?",
             "options": ["null lub default(T)", "wyjątek", "false", "pustą tablicę"], "correctIndex": 0},
            {"id": "q4", "prompt": "LINQ jest...",
             "options": ["eager — wykonuje natychmiast", "lazy — wykonuje przy materializacji (ToList itd)", "async", "compile-time"],
             "correctIndex": 1,
             "explanation": "Query expressions LINQ są deferred — nie wykonują się aż wywołasz terminal operation."},
            {"id": "q5", "prompt": "Który typ do pamiętania pieniędzy?",
             "options": ["double", "float", "decimal", "long"], "correctIndex": 2},
        ],
    }, ensure_ascii=False))

    m = create_module(t, cid, "Asynchroniczność i .NET", 4)
    create_lesson(t, m, "Task i async/await", 1, "Theory", """# Async/Await w C#

```csharp
public async Task<User> GetUserAsync(int id)
{
    using var http = new HttpClient();
    var json = await http.GetStringAsync($"https://api.example.com/users/{id}");
    return JsonSerializer.Deserialize<User>(json);
}

// Użycie:
var user = await GetUserAsync(42);
Console.WriteLine(user.Name);
```

## Reguły

1. `await` działa tylko w `async` metodzie
2. `async` method zwraca `Task`, `Task<T>` lub `ValueTask<T>`
3. Tylko `Main` może być `async Task Main()` (od C# 7.1)

## Task.WhenAll — równolegle

```csharp
var task1 = GetUserAsync(1);
var task2 = GetUserAsync(2);
var task3 = GetUserAsync(3);

var users = await Task.WhenAll(task1, task2, task3);
// 3 równoległe requesty, czeka na wszystkie
```

## Task.WhenAny — pierwszy

```csharp
var winner = await Task.WhenAny(task1, task2, task3);
```

## Obsługa błędów

```csharp
try
{
    var user = await GetUserAsync(42);
}
catch (HttpRequestException ex)
{
    Console.WriteLine($"HTTP error: {ex.Message}");
}
catch (TaskCanceledException)
{
    Console.WriteLine("Anulowano");
}
```

## CancellationToken

```csharp
public async Task<User> GetUserAsync(int id, CancellationToken ct = default)
{
    using var http = new HttpClient();
    var res = await http.GetAsync($"...", ct);
    return await res.Content.ReadFromJsonAsync<User>(cancellationToken: ct);
}

// Wywołanie z timeoutem:
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
var user = await GetUserAsync(42, cts.Token);
```
""")

    create_lesson(t, m, "Wprowadzenie do ASP.NET Core", 2, "Theory", """# ASP.NET Core — REST API

Tworzenie web API w .NET jest **bardzo proste** (od .NET 6+ minimal APIs):

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Witaj!");

app.MapGet("/users/{id:int}", (int id) =>
{
    return new { Id = id, Name = "Anna" };
});

app.MapPost("/users", (User user) =>
{
    // ... save
    return Results.Created($"/users/{user.Id}", user);
});

app.Run();
```

Odpalasz: `dotnet run` → API na `http://localhost:5000`.

## Dependency Injection (DI)

Built-in DI w .NET:

```csharp
builder.Services.AddSingleton<IUserRepository, UserRepository>();
builder.Services.AddScoped<UserService>();
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Wstrzykiwanie:
app.MapGet("/users/{id:int}", async (int id, UserService svc) =>
{
    return await svc.GetByIdAsync(id);
});
```

## Controllers (klasyczny styl)

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserService _svc;

    public UsersController(UserService svc) => _svc = svc;

    [HttpGet("{id:int}")]
    public async Task<User?> Get(int id) => await _svc.GetByIdAsync(id);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        var user = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
    }
}
```

## Co dalej?

- **EF Core** — ORM (Object-Relational Mapper)
- **Authentication** — JWT, OAuth, Identity
- **SignalR** — WebSockets, real-time
- **Blazor** — frontend w C# (no JS!)

To temat na osobny kurs.
""")

    create_lesson(t, m, "Quiz końcowy — C# i .NET", 3, "Quiz", json.dumps({
        "intro": "Sprawdzian z całego kursu.",
        "passingPercentage": 60,
        "questions": [
            {"id": "q1", "prompt": "Który modyfikator robi pole tylko-do-odczytu po inicjalizacji?",
             "options": ["const", "readonly", "static", "sealed"], "correctIndex": 1,
             "explanation": "readonly = ustawione tylko w deklaracji lub konstruktorze; const = compile-time."},
            {"id": "q2", "prompt": "Co robi using w głowie pliku?",
             "options": ["zwalnia zasoby", "importuje namespace", "tworzy alias", "kompiluje"], "correctIndex": 1},
            {"id": "q3", "prompt": "Records w C# 9+ są domyślnie...",
             "options": ["mutable", "immutable", "sealed", "abstract"], "correctIndex": 1},
            {"id": "q4", "prompt": "C# pozwala dziedziczyć po...",
             "options": ["wielu klasach", "jednej klasie + wielu interfejsach", "tylko interfejsach", "wielu klasach abstract"],
             "correctIndex": 1},
            {"id": "q5", "prompt": "async Task<T> oznacza...",
             "options": ["asynchroniczna metoda zwracająca T", "sync metoda zwracająca Task", "callback z T", "kolejka tasków"],
             "correctIndex": 0},
            {"id": "q6", "prompt": "Task.WhenAll uruchamia taski...",
             "options": ["sekwencyjnie", "równolegle, czeka na wszystkie", "równolegle, na pierwszy", "anuluje pozostałe"],
             "correctIndex": 1},
            {"id": "q7", "prompt": "Który typ do pieniędzy?",
             "options": ["double", "float", "decimal", "int"], "correctIndex": 2},
            {"id": "q8", "prompt": "var x = 42; jaki typ x?",
             "options": ["object", "dynamic", "int", "var"], "correctIndex": 2,
             "explanation": "var = inferencja typu w compile-time. x jest int."},
        ],
    }, ensure_ascii=False))

    publish_course(cid)
    return cid


# ───────────────── HTML — od zera ─────────────────
def build_html_course(t):
    cid = create_course(t,
        "HTML — od zera do strony",
        "Pełny kurs HTML5. Tagi, semantyka, formularze, accessibility, meta tagi. Po kursie napiszesz każdy markup.",
        "JavaScript",  # brak HTML language enum
        tags=["html", "frontend", "podstawy"]
    )

    m = create_module(t, cid, "Podstawy HTML", 1)
    create_lesson(t, m, "Czym jest HTML?", 1, "Theory", """# HTML — fundament webu

**HTML** (HyperText Markup Language) opisuje strukturę strony. Razem z **CSS** (style) i **JavaScript** (logika) tworzy każdą stronę WWW.

## Pierwszy dokument

```html
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moja strona</title>
</head>
<body>
    <h1>Witaj!</h1>
    <p>To jest moja pierwsza strona.</p>
</body>
</html>
```

## Co znaczą poszczególne elementy?

- `<!DOCTYPE html>` — informacja: "to HTML5"
- `<html lang="pl">` — root element, język strony
- `<head>` — metadane (nie widoczne)
- `<meta charset="UTF-8">` — kodowanie (zawsze UTF-8 dla polskiego)
- `<meta name="viewport"...>` — wsparcie mobile (musisz mieć!)
- `<title>` — tekst w pasku zakładki
- `<body>` — wszystko co widzi user

## Jak otworzyć stronę?

Zapisz powyższy kod jako `index.html`. Kliknij dwukrotnie — otworzy się w przeglądarce. To wszystko!
""")

    create_lesson(t, m, "Podstawowe tagi", 2, "Theory", """# Tagi do tekstu i linków

## Nagłówki

```html
<h1>Największy nagłówek</h1>
<h2>Mniejszy</h2>
<h3>Jeszcze mniejszy</h3>
<h4>...</h4>
<h5>...</h5>
<h6>Najmniejszy</h6>
```

**Reguła:** jeden `<h1>` na stronę. Pozostałe hierarchicznie.

## Paragrafy i tekst

```html
<p>To jest paragraf.</p>
<p>To drugi paragraf — sam się oddzieli.</p>

<strong>Pogrubienie semantyczne (ważne)</strong>
<em>Kursywa semantyczna (akcent)</em>
<b>Pogrubienie wizualne</b>
<i>Kursywa wizualna</i>

<br>            <!-- nowa linia -->
<hr>            <!-- pozioma kreska -->
```

## Linki

```html
<a href="https://google.com">Google</a>
<a href="/about">Strona o nas (relatywny)</a>
<a href="mailto:hello@example.com">Napisz do nas</a>
<a href="tel:+48123456789">Zadzwoń</a>

<!-- Otwórz w nowej karcie -->
<a href="..." target="_blank" rel="noopener noreferrer">Link zewnętrzny</a>
```

## Obrazki

```html
<img src="zdjecie.jpg" alt="Opis dla accessibility" width="300">

<!-- responsywny -->
<img src="..." alt="..." style="max-width: 100%; height: auto;">
```

**Atrybut `alt` jest OBOWIĄZKOWY** — czytniki ekranu go odczytują, Google indeksuje.
""")

    create_lesson(t, m, "Listy i tabele", 3, "Theory", """# Listy i tabele

## Lista nieuporządkowana (•)

```html
<ul>
    <li>Pierwsze</li>
    <li>Drugie</li>
    <li>Trzecie</li>
</ul>
```

## Lista uporządkowana (1, 2, 3)

```html
<ol>
    <li>Krok pierwszy</li>
    <li>Krok drugi</li>
</ol>
```

## Lista definicji

```html
<dl>
    <dt>HTML</dt>
    <dd>HyperText Markup Language</dd>
    <dt>CSS</dt>
    <dd>Cascading Style Sheets</dd>
</dl>
```

## Tabele

```html
<table>
    <thead>
        <tr>
            <th>Imię</th>
            <th>Wiek</th>
            <th>Miasto</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Anna</td>
            <td>30</td>
            <td>Warszawa</td>
        </tr>
        <tr>
            <td>Bartek</td>
            <td>25</td>
            <td>Kraków</td>
        </tr>
    </tbody>
</table>
```

- `<thead>` — nagłówek tabeli
- `<tbody>` — dane
- `<tr>` — wiersz (table row)
- `<th>` — komórka nagłówkowa
- `<td>` — komórka z danymi

**Uwaga:** tabele do **danych tabelarycznych**, NIE do layoutu! Do layoutu używamy flexbox/grid.
""")

    create_lesson(t, m, "Formularze", 4, "Theory", """# Formularze HTML

```html
<form action="/submit" method="POST">
    <label for="name">Imię:</label>
    <input type="text" id="name" name="name" required>

    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required>

    <label for="age">Wiek:</label>
    <input type="number" id="age" name="age" min="0" max="120">

    <label for="message">Wiadomość:</label>
    <textarea id="message" name="message" rows="4"></textarea>

    <label for="country">Kraj:</label>
    <select id="country" name="country">
        <option value="pl">Polska</option>
        <option value="de">Niemcy</option>
        <option value="uk">UK</option>
    </select>

    <label>
        <input type="checkbox" name="newsletter" value="yes">
        Chcę otrzymywać newsletter
    </label>

    <label>
        <input type="radio" name="plan" value="free" checked>
        Plan darmowy
    </label>
    <label>
        <input type="radio" name="plan" value="pro">
        Plan Pro
    </label>

    <button type="submit">Wyślij</button>
</form>
```

## Typy inputów (HTML5)

- `text`, `password`, `email`, `tel`, `url`
- `number`, `range`, `date`, `time`, `datetime-local`
- `color`, `file`, `search`
- `checkbox`, `radio`, `hidden`

## Walidacja

```html
<input type="email" required>
<input type="text" minlength="3" maxlength="20" pattern="[A-Za-z]+">
<input type="number" min="18" max="100">
```

Przeglądarka sama waliduje przed submit.
""")

    create_lesson(t, m, "Tagi semantyczne HTML5", 5, "Theory", """# Tagi semantyczne

HTML5 wprowadził tagi które **opisują** co zawierają — nie tylko stylują.

```html
<body>
    <header>
        <h1>Nazwa strony</h1>
        <nav>
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">O nas</a></li>
                <li><a href="/contact">Kontakt</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <article>
            <h2>Tytuł artykułu</h2>
            <p>Treść...</p>

            <section>
                <h3>Sekcja w artykule</h3>
                <p>...</p>
            </section>
        </article>

        <aside>
            <h3>Pasek boczny</h3>
            <p>Treść uzupełniająca...</p>
        </aside>
    </main>

    <footer>
        <p>&copy; 2026 Moja Strona</p>
    </footer>
</body>
```

## Po co?

1. **SEO** — Google rozumie strukturę
2. **Accessibility** — czytniki ekranu nawigują po regionach (skok do `<main>`, `<nav>`)
3. **Czytelność kodu** — `<nav>` jest jaśniejsze niż `<div class="navigation">`

## Mapowanie

| Stara praktyka | Semantyczny tag |
|---|---|
| `<div id="header">` | `<header>` |
| `<div class="nav">` | `<nav>` |
| `<div class="main">` | `<main>` |
| `<div class="article">` | `<article>` |
| `<div class="sidebar">` | `<aside>` |
| `<div class="footer">` | `<footer>` |
""")

    m = create_module(t, cid, "Multimedia i embedy", 2)
    create_lesson(t, m, "Obrazy, audio, video", 1, "Theory", """# Multimedia w HTML

## Obrazy z różnymi rozdzielczościami

```html
<img
    src="img-small.jpg"
    srcset="img-small.jpg 480w, img-medium.jpg 800w, img-large.jpg 1200w"
    sizes="(max-width: 600px) 480px, 100vw"
    alt="Opis"
    loading="lazy"
>
```

`loading="lazy"` ładuje obraz dopiero gdy wejdzie w viewport — ogromna poprawa wydajności.

## picture — różne źródła dla różnych mediów

```html
<picture>
    <source srcset="img.webp" type="image/webp">
    <source srcset="img.avif" type="image/avif">
    <img src="img.jpg" alt="Fallback dla starych przeglądarek">
</picture>
```

## Video

```html
<video controls width="640" poster="thumbnail.jpg">
    <source src="movie.mp4" type="video/mp4">
    <source src="movie.webm" type="video/webm">
    Twoja przeglądarka nie wspiera video.
</video>
```

Atrybuty: `controls`, `autoplay`, `loop`, `muted`, `playsinline`.

## Audio

```html
<audio controls>
    <source src="podcast.mp3" type="audio/mpeg">
</audio>
```

## iframe — embedy

```html
<iframe
    src="https://www.youtube.com/embed/dQw4w9WgXcQ"
    width="560"
    height="315"
    title="YouTube video"
    allowfullscreen
></iframe>
```
""")

    create_lesson(t, m, "Meta tagi i SEO", 2, "Theory", """# Meta tagi w <head>

```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Tytuł strony — max 60 znaków</title>
    <meta name="description" content="Opis dla Google, max 160 znaków">
    <meta name="keywords" content="kursy, programowanie, react">  <!-- (Google ignoruje) -->

    <meta name="author" content="Anna Nowak">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://kursy.pl/strona">

    <!-- Open Graph (Facebook, LinkedIn, Slack) -->
    <meta property="og:title" content="Tytuł na social media">
    <meta property="og:description" content="Opis">
    <meta property="og:image" content="https://kursy.pl/og-image.jpg">
    <meta property="og:url" content="https://kursy.pl/strona">
    <meta property="og:type" content="article">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Tytuł">
    <meta name="twitter:image" content="https://kursy.pl/twitter.jpg">

    <link rel="icon" href="/favicon.ico">
</head>
```

Te meta tagi są podstawą SEO i sharingu na social media.
""")

    create_lesson(t, m, "Accessibility (a11y)", 3, "Theory", """# Accessibility — HTML dla wszystkich

## Semantyczne tagi

```html
<!-- ZŁE: -->
<div class="header">
    <div class="nav">
        <div class="item"><div onclick="...">Home</div></div>
    </div>
</div>

<!-- DOBRE: -->
<header>
    <nav>
        <ul>
            <li><a href="/">Home</a></li>
        </ul>
    </nav>
</header>
```

## Atrybuty ARIA

```html
<button aria-label="Zamknij dialog">×</button>
<input aria-describedby="hint">
<span id="hint">Wprowadź email</span>

<div role="alert" aria-live="polite">
    Plik został zapisany.
</div>
```

## Etykiety w formularzach

```html
<!-- ZAWSZE associowane label z input: -->
<label for="email">Email:</label>
<input id="email" type="email">

<!-- Lub label otaczający input: -->
<label>
    Email:
    <input type="email">
</label>
```

## Skip to content

```html
<a href="#main" class="skip-link">Pomiń nawigację</a>
<nav>...</nav>
<main id="main">...</main>
```

```css
.skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: black;
    color: white;
    padding: 8px;
}
.skip-link:focus {
    top: 0;
}
```

## Kontrast kolorów

Tekst musi mieć kontrast min. **4.5:1** względem tła (WCAG AA). Tooly:
- Chrome DevTools → Lighthouse
- contrastchecker.com

## Test klawiaturą

Czy możesz nawigować całą stronę tylko klawiszem Tab + Enter? Jeśli nie — masz problem z accessibility.
""")

    m = create_module(t, cid, "Walidacja i best practices", 3)
    create_lesson(t, m, "Walidacja HTML", 1, "Theory", """# Walidacja formularzy w HTML

HTML5 ma wbudowaną walidację — przeglądarka sprawdza zanim formularz się wyśle.

```html
<form>
    <input type="email" required>
    <input type="text" minlength="3" maxlength="20">
    <input type="number" min="18" max="100">
    <input type="text" pattern="[A-Za-z]+">
    <input type="url" required>
    <input type="tel" pattern="\\+48[0-9]{9}">

    <button type="submit">Wyślij</button>
</form>
```

## Atrybuty walidacji

| Atrybut | Zastosowanie |
|---|---|
| `required` | nie może być puste |
| `minlength` / `maxlength` | długość tekstu |
| `min` / `max` | liczby, daty |
| `pattern` | regex |
| `type` | sam waliduje email, url, tel |

## Custom validation messages

```html
<input
    type="email"
    required
    oninvalid="this.setCustomValidity('Wpisz poprawny email!')"
    oninput="this.setCustomValidity('')"
>
```

## :valid i :invalid w CSS

```css
input:valid { border-color: green; }
input:invalid { border-color: red; }
```

## novalidate — wyłącz walidację przeglądarki

```html
<form novalidate>...</form>
```

Czasem chcesz robić walidację samodzielnie w JS (np. async sprawdzanie czy email zajęty).
""")

    create_lesson(t, m, "Quiz: HTML", 2, "Quiz", json.dumps({
        "intro": "Sprawdź swoją znajomość HTML.",
        "passingPercentage": 70,
        "questions": [
            {"id": "q1", "prompt": "Który tag jest semantyczny dla menu?",
             "options": ["<div>", "<nav>", "<menu>", "<list>"], "correctIndex": 1},
            {"id": "q2", "prompt": "Atrybut alt na <img> jest...",
             "options": ["opcjonalny", "obowiązkowy dla a11y", "tylko dla SEO", "ukrywa obrazek"], "correctIndex": 1},
            {"id": "q3", "prompt": "loading=\"lazy\" sprawia że obraz...",
             "options": ["ładuje się szybciej", "ładuje się dopiero gdy widoczny", "kompresuje się", "ukrywa"], "correctIndex": 1},
            {"id": "q4", "prompt": "Który tag dla artykułu?",
             "options": ["<article>", "<section>", "<main>", "<div>"], "correctIndex": 0},
            {"id": "q5", "prompt": "Viewport meta jest do...",
             "options": ["SEO", "responsywności mobilnej", "kolorów", "fontów"], "correctIndex": 1},
            {"id": "q6", "prompt": "Type inputu dla numerów telefonu?",
             "options": ["text", "phone", "tel", "number"], "correctIndex": 2,
             "explanation": "type='tel' otwiera klawiaturę numeryczną na mobile."},
        ],
    }, ensure_ascii=False))

    publish_course(cid)
    return cid


# ───────────────── CSS — od zera ─────────────────
def build_css_course(t):
    cid = create_course(t,
        "CSS — od zera do zaawansowanych",
        "Pełny kurs CSS3. Selektory, box model, flexbox, grid, responsywność, animacje, custom properties.",
        "JavaScript",  # brak CSS language enum
        tags=["css", "frontend", "podstawy"]
    )

    m = create_module(t, cid, "CSS — podstawy", 1)
    create_lesson(t, m, "Wprowadzenie do CSS", 1, "Theory", """# CSS — Cascading Style Sheets

CSS opisuje wygląd HTML. Selektor → właściwości.

```css
selektor {
    właściwość: wartość;
    inna-właściwość: wartość;
}
```

## Trzy sposoby dodania CSS

### 1. External (najlepiej!)

`styles.css`:
```css
body { font-family: sans-serif; }
h1 { color: navy; }
```

W HTML:
```html
<link rel="stylesheet" href="styles.css">
```

### 2. Internal — w `<style>` w `<head>`

```html
<head>
    <style>
        body { background: #f5f5f5; }
    </style>
</head>
```

### 3. Inline — atrybut `style` (NIE używaj)

```html
<p style="color: red;">Hej</p>
```

## Komentarze

```css
/* To jest komentarz CSS */
```
""")

    create_lesson(t, m, "Selektory CSS", 2, "Theory", """# Selektory

## Podstawowe

```css
/* Element */
h1 { color: navy; }

/* Klasa (.) */
.button { background: blue; }

/* ID (#) — rzadko */
#main-header { border-bottom: 1px solid; }

/* Wszystko */
* { box-sizing: border-box; }
```

W HTML:
```html
<h1>Tytuł</h1>
<button class="button">Klik</button>
<header id="main-header">...</header>
```

## Kombinatory

```css
/* Potomek (każdy <a> wewnątrz <nav>) */
nav a { color: white; }

/* Dziecko bezpośrednie (>) */
ul > li { list-style: none; }

/* Rodzeństwo (+) — pierwszy następny */
h2 + p { margin-top: 0; }

/* Wszystkie rodzeństwa (~) */
h2 ~ p { color: gray; }
```

## Atrybuty

```css
a[target="_blank"] { /* link otwierający się w nowej karcie */
    color: green;
}

input[type="email"] { /* tylko email inputy */
    border-color: blue;
}

a[href^="https://"] { /* zaczyna się od https */ }
a[href$=".pdf"] { /* kończy się na .pdf */ }
a[href*="kursy"] { /* zawiera "kursy" */ }
```

## Pseudo-klasy

```css
a:hover { color: red; }          /* gdy myszka nad */
a:active { color: orange; }      /* w trakcie klikania */
input:focus { outline: blue; }   /* focus */
li:first-child { font-weight: bold; }
li:last-child { color: gray; }
li:nth-child(odd) { background: #f0f0f0; }
```

## Specyficzność

Im bardziej specyficzny selektor, tym wyższy priorytet:

1. Inline style (`style="..."`) — najwyższe
2. ID (`#header`)
3. Klasa (`.button`), atrybut, pseudo-klasa
4. Element (`h1`, `div`)
""")

    create_lesson(t, m, "Box model", 3, "Theory", """# Box model

Każdy element to **prostokąt** z 4 warstwami:

```
┌──────────────────────────┐
│      margin              │
│  ┌───────────────────┐   │
│  │     border        │   │
│  │  ┌──────────────┐ │   │
│  │  │   padding    │ │   │
│  │  │  ┌─────────┐ │ │   │
│  │  │  │ content │ │ │   │
│  │  │  └─────────┘ │ │   │
│  │  └──────────────┘ │   │
│  └───────────────────┘   │
└──────────────────────────┘
```

```css
.box {
    width: 200px;
    height: 100px;

    padding: 16px;        /* odstęp wewnętrzny */
    border: 2px solid #333;
    margin: 24px;         /* odstęp zewnętrzny */
}
```

## Skrócone zapisy

```css
margin: 10px;                 /* wszystkie 4 strony */
margin: 10px 20px;            /* góra-dół / lewo-prawo */
margin: 10px 20px 30px 40px;  /* góra prawo dół lewo (clockwise) */

padding: 1rem 2rem;           /* analogicznie */

border: 2px solid #333;       /* shorthand */
```

## box-sizing

**Domyślnie** `width` = szerokość **content** (bez paddingu i border). To irytujące — szerokość elementu rośnie z paddingiem.

**Rozwiązanie:**

```css
* {
    box-sizing: border-box;   /* width = całość włącznie z paddingiem */
}
```

To pierwsza reguła którą zawsze dodajesz. **Pisz w każdym projekcie.**

## display

```css
.block-element { display: block; }     /* div, p, h1 — domyślnie */
.inline-element { display: inline; }   /* span, a — domyślnie */
.inline-block { display: inline-block; }
.flex { display: flex; }
.grid { display: grid; }
.hidden { display: none; }
```
""")

    create_lesson(t, m, "Kolory, fonty, tła", 4, "Theory", """# Kolory i typografia

## Kolory

```css
/* Nazwy */
color: red;
color: cornflowerblue;

/* HEX */
color: #6366f1;
color: #6366f180;   /* z alpha (0-FF) */

/* RGB / RGBA */
color: rgb(99, 102, 241);
color: rgba(99, 102, 241, 0.5);   /* 50% transparency */

/* HSL — kolejność tonu (najbardziej intuicyjne) */
color: hsl(238, 84%, 67%);
color: hsla(238, 84%, 67%, 0.5);
```

## Fonty

```css
body {
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: #1a1a1a;
}

h1 {
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
}
```

## Jednostki

```css
font-size: 16px;     /* pixele — fixed */
font-size: 1rem;     /* relatywne do root html (default 16px) */
font-size: 1.2em;    /* relatywne do rodzica */
font-size: 1.5vw;    /* viewport width */
```

**Reguła:** `rem` do wszystkiego oprócz border (1-2px).

## Web fonts (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
```

```css
body { font-family: 'Inter', sans-serif; }
```

## Tło

```css
.box {
    background-color: #f0f0f0;

    background-image: url('bg.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;

    /* Lub gradient */
    background: linear-gradient(135deg, #6366f1, #ec4899);
    background: radial-gradient(circle, #ffd700, #ff6347);
}
```
""")

    m = create_module(t, cid, "Layout — flexbox i grid", 3)
    create_lesson(t, m, "Flexbox", 1, "Theory", """# Flexbox

Najlepszy layout do **rzędu lub kolumny** elementów.

```html
<div class="container">
    <div class="item">A</div>
    <div class="item">B</div>
    <div class="item">C</div>
</div>
```

```css
.container {
    display: flex;
    gap: 16px;
    justify-content: space-between;
    align-items: center;
}
```

## Główne właściwości containera

```css
.container {
    display: flex;
    flex-direction: row | column | row-reverse | column-reverse;
    flex-wrap: nowrap | wrap;
    gap: 16px;

    /* Wzdłuż osi głównej */
    justify-content: flex-start | center | flex-end | space-between | space-around | space-evenly;

    /* Wzdłuż osi poprzecznej */
    align-items: stretch | flex-start | center | flex-end | baseline;
}
```

## Właściwości elementów

```css
.item {
    flex: 1;              /* rozciągnij równo */
    flex: 0 1 200px;      /* grow shrink basis */
    align-self: flex-end; /* nadpisuje align-items dla tego elementu */
}
```

## Przykłady

### Center wszystkiego (poziomo + pionowo)

```css
.container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}
```

### Navbar — logo lewo, menu prawo

```css
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
}
```

### Karty równej wysokości

```css
.cards {
    display: flex;
    gap: 16px;
}
.card {
    flex: 1;
    padding: 24px;
}
```
""")

    create_lesson(t, m, "CSS Grid", 2, "Theory", """# CSS Grid

Layout w 2 wymiarach (rzędy + kolumny).

```html
<div class="grid">
    <div>1</div>
    <div>2</div>
    <div>3</div>
    <div>4</div>
    <div>5</div>
    <div>6</div>
</div>
```

```css
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);  /* 3 równe kolumny */
    gap: 16px;
}
```

## Definiowanie siatki

```css
.grid {
    display: grid;
    grid-template-columns: 200px 1fr 1fr;   /* 3 kolumny: fixed + 2 elastyczne */
    grid-template-rows: 100px 200px;        /* 2 rzędy */
    gap: 16px;
}
```

## Jednostka `fr` (fraction)

```css
grid-template-columns: 1fr 2fr 1fr;
/* 4 części razem — 1+2+1; środkowa kolumna 2x szersza */
```

## auto-fit + minmax — responsywne karty

```css
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
}
```

Każdy element ma min. 250px, kolumny dodawane same wraz ze wzrostem viewportu. **Magia, działa wszędzie.**

## Pozycjonowanie elementów

```css
.item {
    grid-column: 1 / 3;     /* od kolumny 1 do 3 (włącznie) */
    grid-row: 1 / 2;
    /* lub: */
    grid-column: span 2;     /* zajmij 2 kolumny */
}
```

## Layout strony

```css
.layout {
    display: grid;
    grid-template-areas:
        "header header"
        "sidebar main"
        "footer footer";
    grid-template-columns: 200px 1fr;
    grid-template-rows: 60px 1fr 40px;
    min-height: 100vh;
}

header  { grid-area: header; }
nav     { grid-area: sidebar; }
main    { grid-area: main; }
footer  { grid-area: footer; }
```

## Kiedy Flex vs Grid?

- **Flexbox** — 1 wymiar (rząd lub kolumna)
- **Grid** — 2 wymiary, prawdziwy layout strony, karty z auto-fit
""")

    create_lesson(t, m, "Responsywność i media queries", 3, "Theory", """# Responsive design

Twoja strona musi działać na **telefonie, tablecie i monitorze**.

## Viewport meta (zawsze!)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Bez tego mobilki renderują stronę w wirtualnym viewporcie 980px i pomniejszają.

## Media queries

```css
/* default — mobile-first */
.container {
    padding: 16px;
}

/* >= 768px — tablet */
@media (min-width: 768px) {
    .container {
        padding: 32px;
        max-width: 720px;
        margin: 0 auto;
    }
}

/* >= 1024px — desktop */
@media (min-width: 1024px) {
    .container {
        max-width: 960px;
    }
}
```

## Standardowe breakpointy

```css
/* Mobile first — zaczynamy od najmniejszego */

/* Small phone */                /* base */
@media (min-width: 640px)  { }   /* sm */
@media (min-width: 768px)  { }   /* md */
@media (min-width: 1024px) { }   /* lg */
@media (min-width: 1280px) { }   /* xl */
@media (min-width: 1536px) { }   /* 2xl */
```

To breakpointy Tailwind CSS — przyjęte jako standard branżowy.

## Praktyczny przykład

```css
.grid {
    display: grid;
    grid-template-columns: 1fr;       /* 1 kolumna mobile */
    gap: 16px;
}

@media (min-width: 768px) {
    .grid {
        grid-template-columns: repeat(2, 1fr);   /* 2 kolumny tablet */
    }
}

@media (min-width: 1024px) {
    .grid {
        grid-template-columns: repeat(3, 1fr);   /* 3 kolumny desktop */
    }
}
```

## Ukrywanie / pokazywanie

```css
.mobile-only { display: block; }
.desktop-only { display: none; }

@media (min-width: 768px) {
    .mobile-only { display: none; }
    .desktop-only { display: block; }
}
```

## Lepszy sposób — clamp

```css
font-size: clamp(1rem, 2vw, 1.5rem);
/* min 1rem, idealnie 2% szerokości viewportu, max 1.5rem */

padding: clamp(1rem, 4vw, 3rem);
```

**Fluid typography** — płynnie skaluje się bez breakpointów.
""")

    m = create_module(t, cid, "Animacje i nowoczesny CSS", 4)
    create_lesson(t, m, "Transitions", 1, "Theory", """# CSS Transitions

Płynne przejścia między stanami właściwości.

```css
.button {
    background: #6366f1;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;

    transition: all 200ms ease;
}

.button:hover {
    background: #4f46e5;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}
```

## Składnia

```css
transition: <property> <duration> <timing-function> <delay>;

transition: background 300ms ease-in-out;
transition: transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);

/* wiele właściwości: */
transition:
    background 200ms ease,
    transform 300ms ease;
```

## Timing functions

| Wartość | Efekt |
|---|---|
| `linear` | stałe tempo |
| `ease` | wolno-szybko-wolno |
| `ease-in` | wolny start |
| `ease-out` | wolne zakończenie |
| `cubic-bezier(...)` | custom |

cubic-bezier.com — generator wizualny.
""")

    create_lesson(t, m, "Animations + @keyframes", 2, "Theory", """# Animacje CSS

Bardziej zaawansowane niż transitions — wieloetapowe.

```css
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.fade-in {
    animation: fadeIn 0.4s ease-out;
}
```

## Wiele kroków

```css
@keyframes pulse {
    0%   { transform: scale(1); }
    50%  { transform: scale(1.1); }
    100% { transform: scale(1); }
}

.heart {
    animation: pulse 1s infinite;
}
```

## Składnia

```css
animation:
    <name>
    <duration>
    <timing-function>
    <delay>
    <iteration-count>
    <direction>
    <fill-mode>;

animation: fadeIn 0.5s ease-out 100ms 1 normal forwards;
```

| Property | Wartości |
|---|---|
| `iteration-count` | liczba / `infinite` |
| `direction` | normal / reverse / alternate |
| `fill-mode` | none / forwards (zostań na końcu) / backwards |

## Loading spinner

```css
@keyframes spin {
    to { transform: rotate(360deg); }
}

.spinner {
    border: 3px solid #e5e7eb;
    border-top-color: #6366f1;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
}
```

## prefers-reduced-motion

Szanuj userów którzy wyłączyli animacje:

```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```
""")

    create_lesson(t, m, "Custom Properties (CSS Variables)", 3, "Theory", """# CSS Custom Properties

Zmienne w CSS — natywne, bez preprocesorów.

```css
:root {
    --color-primary: #6366f1;
    --color-text: #1a1a1a;
    --color-bg: #fafafa;
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-4: 1rem;
    --radius: 8px;
}

.button {
    background: var(--color-primary);
    color: white;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius);
}
```

## Dark mode

```css
:root {
    --bg: white;
    --text: #1a1a1a;
}

[data-theme="dark"] {
    --bg: #1a1a1a;
    --text: white;
}

body {
    background: var(--bg);
    color: var(--text);
    transition: background 200ms;
}
```

```js
document.documentElement.dataset.theme = 'dark';
```

## Fallback

```css
.box {
    color: var(--color-primary, #6366f1);  /* fallback gdy var nieustawiony */
}
```

## Modyfikacja z JS

```js
document.documentElement.style.setProperty('--color-primary', '#ec4899');
```

## Zakres

Custom properties dziedziczą po drzewie DOM:

```css
.card {
    --padding: 16px;
}
.card .inner {
    padding: var(--padding);  /* 16px z .card */
}
```

W odróżnieniu od preprocesorów (Sass) custom properties są **dynamiczne** — możesz je zmieniać runtime.
""")

    create_lesson(t, m, "Modern CSS — clamp, container queries", 4, "Theory", """# Nowoczesne CSS

## clamp() — fluid typography

```css
font-size: clamp(1rem, 2.5vw, 1.5rem);
/* min 1rem, idealnie 2.5vw, max 1.5rem */
```

Tekst skaluje się płynnie bez breakpointów. **Game changer.**

```css
.hero h1 {
    font-size: clamp(2rem, 5vw + 1rem, 4rem);
    line-height: 1.1;
}

.section {
    padding: clamp(2rem, 5vw, 6rem);
}
```

## Container queries (modern)

```css
.card-grid {
    container-type: inline-size;
    container-name: card;
}

@container card (min-width: 400px) {
    .card {
        display: flex;
        gap: 16px;
    }
}
```

Komponent reaguje na **rozmiar swojego containera**, nie viewportu. Idealne dla design systemów.

## :has() — selektor rodzica

```css
/* Karta z obrazkiem ma inny padding */
.card:has(img) {
    padding-top: 0;
}

/* Form z błędem na inputie */
form:has(input:invalid) .submit-btn {
    opacity: 0.5;
}
```

## aspect-ratio

```css
.video-wrapper {
    aspect-ratio: 16 / 9;
    width: 100%;
}

.avatar {
    aspect-ratio: 1;
    border-radius: 50%;
}
```

Koniec ery padding-bottom hack.

## subgrid

```css
.parent {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
}

.child {
    display: grid;
    grid-template-columns: subgrid;  /* dziedziczy z parent */
}
```

## color-mix()

```css
.button:hover {
    background: color-mix(in srgb, var(--brand), black 10%);
}
```

Generuje darker version brand color bez Sassa.
""")

    create_lesson(t, m, "Quiz: CSS", 5, "Quiz", json.dumps({
        "intro": "Sprawdź swoją wiedzę z CSS.",
        "passingPercentage": 70,
        "questions": [
            {"id": "q1", "prompt": "Która właściwość flexbox wyrównuje wzdłuż osi głównej?",
             "options": ["align-items", "justify-content", "flex-grow", "gap"], "correctIndex": 1},
            {"id": "q2", "prompt": "Jednostka rem to...",
             "options": ["pixele", "procent rodzica", "wielokrotność font-size elementu html", "viewport width"], "correctIndex": 2},
            {"id": "q3", "prompt": "box-sizing: border-box sprawia że width...",
             "options": ["nie zawiera paddingu", "ZAWIERA padding i border", "jest fixed", "rośnie auto"], "correctIndex": 1},
            {"id": "q4", "prompt": "grid-template-columns: repeat(3, 1fr) tworzy...",
             "options": ["3 kolumny równe", "kolumny po 1px", "rzędy", "1 kolumnę"], "correctIndex": 0},
            {"id": "q5", "prompt": "@keyframes definiuje...",
             "options": ["media query", "animację wieloetapową", "selektor", "import"], "correctIndex": 1},
            {"id": "q6", "prompt": "Custom property zaczyna się od...",
             "options": ["$", "@", "--", "#"], "correctIndex": 2,
             "explanation": "--var-name: ... potem var(--var-name)"},
            {"id": "q7", "prompt": "clamp(1rem, 2vw, 1.5rem) zwraca...",
             "options": ["zawsze 2vw", "min 1rem, max 1.5rem, idealnie 2vw", "1rem", "random"], "correctIndex": 1},
            {"id": "q8", "prompt": "Selektor :has() pozwala...",
             "options": ["wybrać dziecko", "wybrać rodzica zawierającego coś", "atrybut", "pseudo-class"], "correctIndex": 1},
        ],
    }, ensure_ascii=False))

    publish_course(cid)
    return cid


# ───────────────── React.js ─────────────────
def build_react_course(t):
    cid = create_course(t,
        "React.js — komponenty, hooks, stan",
        "Najpopularniejsza biblioteka frontendowa. Komponenty, JSX, useState, useEffect, props, kontekst. Po kursie zbudujesz własną SPA.",
        "JavaScript",
        tags=["react", "frontend", "javascript", "hooks"]
    )

    m = create_module(t, cid, "Wprowadzenie", 1)
    create_lesson(t, m, "Co to jest React?", 1, "Theory", """# React.js

**React** to biblioteka JavaScript do budowania **interfejsów użytkownika**. Stworzona w Facebook (2013), używana praktycznie wszędzie: Instagram, Netflix, Airbnb, Twitter, Discord, … i u nas na Kursy.pl 🙂

## Filozofia

- **Komponenty** — UI to funkcje zwracające JSX (HTML w JS)
- **Deklaratywnie** — opisujesz CO ma być, nie JAK to renderować
- **One-way data flow** — dane spływają z góry w dół przez props
- **Stan = źródło prawdy** — UI jest funkcją stanu

## React vs framework

React to **biblioteka**, nie framework. Robi tylko UI. Dla wszystkiego innego (routing, fetching, state) — bierzesz osobne biblioteki:

| Co | Biblioteka |
|---|---|
| Routing | React Router |
| Server state | TanStack Query |
| Client state | Zustand / Redux |
| Forms | React Hook Form |
| Styling | Tailwind, Emotion |
| Build | Vite |

Lub gotowy framework (Next.js, Remix) który łączy to wszystko.

## Setup z Vite

```bash
npm create vite@latest moja-app -- --template react-ts
cd moja-app
npm install
npm run dev
```

Po 10 sekundach masz działający dev server na localhost:5173.
""")

    create_lesson(t, m, "Pierwszy komponent + JSX", 2, "Theory", """# Komponenty i JSX

## Komponent funkcyjny

```jsx
function Greeting() {
    return <h1>Witaj!</h1>;
}

// użycie:
<Greeting />
```

Komponent to **funkcja zwracająca JSX**. Nazwa zaczyna się od **wielkiej litery** — React tak odróżnia komponenty od tagów HTML.

## JSX

JSX wygląda jak HTML, ale to JavaScript:

```jsx
const element = <h1 className="title">Hej!</h1>;
```

Pod spodem Vite/webpack zamienia to na:

```js
React.createElement('h1', { className: 'title' }, 'Hej!');
```

## Reguły JSX

```jsx
// 1. Atrybuty kebab-case → camelCase
<div className="card" onClick={handle}>  {/* nie "class" i "onclick" */}

// 2. Self-closing tags MUSZĄ być zamknięte
<img src="..." alt="..." />
<input type="text" />
<br />

// 3. Jeden root element
function Bad() {
    return (
        <h1>A</h1>
        <p>B</p>     // ERROR!
    );
}

// Naprawa: Fragment
function Good() {
    return (
        <>
            <h1>A</h1>
            <p>B</p>
        </>
    );
}

// 4. Wyrażenia JS w {}
const name = "Anna";
<h1>Cześć, {name}!</h1>
<p>Wynik: {2 + 2}</p>
<p>{user.email.toUpperCase()}</p>
```

## Conditional rendering

```jsx
function UserStatus({ isLoggedIn }) {
    return (
        <div>
            {isLoggedIn ? <p>Zalogowany</p> : <p>Wyloguj</p>}

            {/* lub krótka: && — tylko gdy true */}
            {isLoggedIn && <button>Wyloguj</button>}
        </div>
    );
}
```
""")

    create_lesson(t, m, "Props — przekazywanie danych", 3, "Theory", """# Props

Props to **dane przekazywane do komponentu** (jak argumenty funkcji).

```jsx
function Greeting({ name, age }) {
    return <h1>Cześć {name}, masz {age} lat!</h1>;
}

// użycie:
<Greeting name="Anna" age={30} />
```

## Destructuring (zalecane)

```jsx
// Bez destructuring:
function Greeting(props) {
    return <h1>Cześć {props.name}!</h1>;
}

// Z destructuring (czytelniej):
function Greeting({ name }) {
    return <h1>Cześć {name}!</h1>;
}
```

## children

Specjalny prop dla zagnieżdżonego JSX:

```jsx
function Card({ children, title }) {
    return (
        <div className="card">
            <h2>{title}</h2>
            <div>{children}</div>
        </div>
    );
}

// użycie:
<Card title="Witaj">
    <p>To jest treść karty</p>
    <button>Klik</button>
</Card>
```

## Przekazywanie funkcji

```jsx
function Button({ onClick, label }) {
    return <button onClick={onClick}>{label}</button>;
}

// użycie:
function App() {
    const handleClick = () => alert("Kliknięto!");
    return <Button onClick={handleClick} label="Klik mnie" />;
}
```

## TypeScript — typowanie props

```tsx
interface GreetingProps {
    name: string;
    age: number;
    isVip?: boolean;  // opcjonalne
}

function Greeting({ name, age, isVip = false }: GreetingProps) {
    return <h1>{isVip ? "★" : ""} {name} ({age})</h1>;
}
```
""")

    m = create_module(t, cid, "Stan i interakcje", 2)
    create_lesson(t, m, "useState — hook do stanu", 1, "Theory", """# useState

Hook do trzymania **stanu** w komponencie funkcyjnym.

```jsx
import { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <p>Licznik: {count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
            <button onClick={() => setCount(0)}>Reset</button>
        </div>
    );
}
```

## Reguły

1. `useState(initialValue)` zwraca tablicę `[wartość, setter]`
2. `setCount(newValue)` **triggeruje re-render** komponentu z nową wartością
3. Stan jest **immutable** — nie mutujesz, tworzy nowy:

```jsx
// ZŁE — mutujesz!
const [list, setList] = useState([1, 2, 3]);
list.push(4);                // NIC NIE TRIGGERUJE!

// DOBRE — nowy obiekt
setList([...list, 4]);
setList(prev => [...prev, 4]);  // bezpieczniej z prev
```

## Wiele stanów

```jsx
function Form() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState(0);

    return (
        <form>
            <input value={name} onChange={e => setName(e.target.value)} />
            <input value={email} onChange={e => setEmail(e.target.value)} />
            <input type="number" value={age} onChange={e => setAge(+e.target.value)} />
        </form>
    );
}
```

## Stan jako obiekt

```jsx
const [user, setUser] = useState({ name: '', age: 0 });

// Aktualizacja jednego pola:
setUser({ ...user, age: 31 });
setUser(prev => ({ ...prev, age: 31 }));
```

## Lazy initial state

```jsx
// Jeśli initial wymaga ciężkiego obliczenia:
const [data, setData] = useState(() => expensiveComputation());
```

Funkcja wywoła się **tylko raz**, przy pierwszym renderze.
""")

    create_lesson(t, m, "Event handling", 2, "Theory", """# Eventy w React

```jsx
function ClickMe() {
    const handleClick = (e) => {
        console.log('Kliknięto!', e.target);
    };

    return <button onClick={handleClick}>Klik</button>;
}
```

## Inline handlers

```jsx
<button onClick={() => alert('Hej!')}>Klik</button>
<button onClick={(e) => console.log(e.clientX, e.clientY)}>Pozycja</button>
```

## Przekazywanie parametrów

```jsx
function ItemList({ items, onDelete }) {
    return (
        <ul>
            {items.map(item => (
                <li key={item.id}>
                    {item.name}
                    <button onClick={() => onDelete(item.id)}>×</button>
                </li>
            ))}
        </ul>
    );
}
```

## Formularze — controlled inputs

```jsx
function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();  // zatrzymaj domyślne wysłanie formularza
        console.log({ email, password });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
            />
            <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
            />
            <button type="submit">Zaloguj</button>
        </form>
    );
}
```

## Częste eventy

| Event | Kiedy |
|---|---|
| `onClick` | klik |
| `onChange` | zmiana value (inputy) |
| `onSubmit` | submit formularza |
| `onFocus` / `onBlur` | focus / utrata fokusu |
| `onMouseEnter` / `onMouseLeave` | hover |
| `onKeyDown` / `onKeyUp` | klawiatura |
""")

    create_lesson(t, m, "Lista i klucze", 3, "Theory", """# Renderowanie list

```jsx
function TodoList() {
    const todos = [
        { id: 1, text: 'Naucz się React', done: true },
        { id: 2, text: 'Zbudować SPA', done: false },
        { id: 3, text: 'Wystartować startup', done: false },
    ];

    return (
        <ul>
            {todos.map(todo => (
                <li key={todo.id}>
                    {todo.done ? '✓' : '○'} {todo.text}
                </li>
            ))}
        </ul>
    );
}
```

## Klucze (key)

**Klucz** musi być:
1. **Unikalny** wśród rodzeństwa
2. **Stabilny** — nie zmienia się między renderami
3. **Stringiem lub liczbą**

```jsx
{items.map(item => <Item key={item.id} {...item} />)}  // ✓ id jest stabilne
{items.map((item, i) => <Item key={i} ... />)}         // ✗ index się zmienia po reorderze
```

**Klucz to NIE prop** — React go używa wewnętrznie do optymalizacji re-renderów.

## Lista z dodawaniem

```jsx
function Todos() {
    const [todos, setTodos] = useState([
        { id: 1, text: 'Pierwsze' },
    ]);
    const [newText, setNewText] = useState('');

    const add = () => {
        if (!newText.trim()) return;
        setTodos([...todos, { id: Date.now(), text: newText }]);
        setNewText('');
    };

    const remove = (id) => {
        setTodos(todos.filter(t => t.id !== id));
    };

    return (
        <div>
            <input value={newText} onChange={e => setNewText(e.target.value)} />
            <button onClick={add}>Dodaj</button>
            <ul>
                {todos.map(t => (
                    <li key={t.id}>
                        {t.text} <button onClick={() => remove(t.id)}>×</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
```
""")

    m = create_module(t, cid, "useEffect i side effects", 3)
    create_lesson(t, m, "useEffect", 1, "Theory", """# useEffect

Hook do **side effects** — wszystkiego co nie jest pure renderem (fetch, timer, event listener, DOM access).

```jsx
import { useState, useEffect } from 'react';

function UserProfile({ id }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetch(`/api/users/${id}`)
            .then(r => r.json())
            .then(setUser);
    }, [id]);  // re-run gdy id się zmieni

    if (!user) return <p>Ładuję...</p>;
    return <h1>{user.name}</h1>;
}
```

## Dependency array

```jsx
useEffect(() => { ... });           // KAŻDY render (źle!)
useEffect(() => { ... }, []);       // tylko PIERWSZY render (mount)
useEffect(() => { ... }, [x]);      // gdy x się zmieni
useEffect(() => { ... }, [x, y]);   // gdy x lub y się zmieni
```

## Cleanup function

Return z useEffect to **funkcja sprzątająca** — wywołana przed kolejnym effectem (lub przy unmount):

```jsx
useEffect(() => {
    const timer = setInterval(() => {
        console.log('tick');
    }, 1000);

    return () => clearInterval(timer);  // cleanup!
}, []);
```

Cleanup ZAWSZE rób dla:
- timery (`setTimeout`, `setInterval`)
- event listeners (`addEventListener`)
- subscriptions (WebSocket, EventSource)
- AbortController dla fetch

## Częsty bug

```jsx
useEffect(() => {
    let cancelled = false;

    fetch(`/api/users/${id}`)
        .then(r => r.json())
        .then(user => {
            if (!cancelled) setUser(user);  // ignore stale response
        });

    return () => { cancelled = true; };
}, [id]);
```

Jeśli `id` zmieni się szybko, możesz dostać stary response po nowym. Cleanup zapobiega temu.

## useEffect vs render

- **Render** = czysta funkcja, zwraca JSX
- **Effect** = side effect po renderze (fetch, log, manipulacja DOM)

NIE wywołuj `setState` w renderze — to infinite loop. Tylko w effects lub event handlerach.
""")

    create_lesson(t, m, "Custom hooks", 2, "Theory", """# Custom hooks

Wydzielasz powtarzalną logikę z komponentu do funkcji zaczynającej się od `use`.

## Przykład — useFetch

```jsx
import { useState, useEffect } from 'react';

function useFetch(url) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        fetch(url)
            .then(r => r.json())
            .then(data => {
                if (!cancelled) {
                    setData(data);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    setError(err);
                    setLoading(false);
                }
            });

        return () => { cancelled = true; };
    }, [url]);

    return { data, loading, error };
}

// Użycie:
function UserList() {
    const { data, loading, error } = useFetch('/api/users');

    if (loading) return <p>Ładuję...</p>;
    if (error) return <p>Błąd!</p>;
    return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

## Inne przykłady

```jsx
// useLocalStorage — persystencja
const [theme, setTheme] = useLocalStorage('theme', 'light');

// useDebounce — opóźniona aktualizacja
const debouncedQuery = useDebounce(query, 300);

// useMediaQuery — responsive logic
const isMobile = useMediaQuery('(max-width: 768px)');
```

## Reguły hooków

1. **Tylko wewnątrz komponentu** (lub innego hooka)
2. **Tylko na top-level** — nie w if, for, callbackach
3. **Nazwa MUSI zaczynać się od `use`** — to jak React je rozpoznaje

```jsx
// ZŁE:
function MyComponent() {
    if (loggedIn) {
        const [x] = useState(0);  // ERROR! warunek!
    }
}

// DOBRE:
function MyComponent() {
    const [x] = useState(0);
    if (loggedIn) {
        // ... użyj x tutaj
    }
}
```

**Reguła:** zawsze ta sama kolejność hooków przy każdym renderze.
""")

    create_lesson(t, m, "Context — globalny stan", 3, "Theory", """# useContext

Sposób na **przekazanie danych przez wiele poziomów komponentów** bez prop drilling.

## Tworzenie kontekstu

```jsx
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext('light');

function App() {
    const [theme, setTheme] = useState('light');

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <Layout />
        </ThemeContext.Provider>
    );
}

function Layout() {
    return (
        <div>
            <Header />
            <Sidebar />
        </div>
    );
}

function Header() {
    const { theme, setTheme } = useContext(ThemeContext);

    return (
        <header className={theme}>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                Zmień motyw
            </button>
        </header>
    );
}
```

## Bez kontekstu (prop drilling)

Trzeba by przekazywać `theme` przez każdy komponent po drodze:

```jsx
<App theme={theme}>
    <Layout theme={theme}>
        <Header theme={theme} />  {/* potrzebne tutaj */}
        <Sidebar theme={theme}>
            <Menu theme={theme} />
        </Sidebar>
    </Layout>
</App>
```

Brzydko. Context to rozwiązuje.

## Custom hook + context — wzorzec

```jsx
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    return (
        <AuthContext.Provider value={{ user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth musi być w AuthProvider');
    return ctx;
}

// W komponentach:
function Profile() {
    const { user } = useAuth();
    return <h1>Witaj, {user.name}</h1>;
}
```

## Kiedy NIE używać contextu

- Dla stanu zmieniającego się **często** (każdy consumer re-renderuje) → użyj Zustand / Redux
- Dla danych z serwera → użyj TanStack Query
""")

    m = create_module(t, cid, "Ekosystem i podsumowanie", 4)
    create_lesson(t, m, "Routing (React Router)", 1, "Theory", """# React Router

Najpopularniejsza biblioteka do routingu w React.

```bash
npm install react-router-dom
```

## Setup

```jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
    return (
        <BrowserRouter>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/about">About</Link>
                <Link to="/users">Users</Link>
            </nav>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/users" element={<Users />} />
                <Route path="/users/:id" element={<UserDetail />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
```

## Parametry URL

```jsx
import { useParams } from 'react-router-dom';

function UserDetail() {
    const { id } = useParams();
    return <h1>User {id}</h1>;
}
```

## Programatyczna nawigacja

```jsx
import { useNavigate } from 'react-router-dom';

function LoginForm() {
    const navigate = useNavigate();

    const handleLogin = async () => {
        await login();
        navigate('/dashboard');
    };
}
```

## Nested routes

```jsx
<Routes>
    <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<Users />} />
    </Route>
</Routes>
```

W `DashboardLayout`:
```jsx
import { Outlet } from 'react-router-dom';

function DashboardLayout() {
    return (
        <div>
            <Sidebar />
            <main><Outlet /></main>   {/* tu renderuje się child route */}
        </div>
    );
}
```
""")

    create_lesson(t, m, "Server state (TanStack Query)", 2, "Theory", """# TanStack Query

Najlepsza biblioteka do **danych z serwera** (kiedyś React Query).

```bash
npm install @tanstack/react-query
```

## Setup

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function Root() {
    return (
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    );
}
```

## useQuery — GET data

```jsx
import { useQuery } from '@tanstack/react-query';

function UserList() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['users'],
        queryFn: () => fetch('/api/users').then(r => r.json()),
    });

    if (isLoading) return <p>Ładuję...</p>;
    if (error) return <p>Błąd!</p>;

    return <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

## Co dostajesz za darmo?

- **Cache** — drugie wywołanie z tym samym `queryKey` użyje cache
- **Refetch on focus** — gdy wracasz do karty, dane się odświeżają
- **Retry** — automatyczne ponowne próby przy błędzie
- **Background updates** — odświeżanie w tle
- **Pagination, infinite scroll** — wsparcie built-in

## useMutation — POST/PUT/DELETE

```jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateUser() {
    const qc = useQueryClient();

    const mutation = useMutation({
        mutationFn: (newUser) => fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(newUser),
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });  // odśwież cache
        },
    });

    return (
        <button onClick={() => mutation.mutate({ name: 'Anna' })}>
            {mutation.isPending ? 'Dodaję...' : 'Dodaj'}
        </button>
    );
}
```

## Dlaczego nie useEffect + useState?

useState + useEffect + fetch wymaga ręcznego pisania: cache, retry, loading, error, refetch, abort. TanStack Query daje to wszystko z pudełka.
""")

    create_lesson(t, m, "Quiz: React.js", 3, "Quiz", json.dumps({
        "intro": "Sprawdź swoją wiedzę o React.",
        "passingPercentage": 70,
        "questions": [
            {"id": "q1", "prompt": "Co zwraca useState?",
             "options": ["wartość", "setter", "tablicę [wartość, setter]", "Promise"],
             "correctIndex": 2},
            {"id": "q2", "prompt": "Kiedy odpali się useEffect z [count] jako deps?",
             "options": ["co render", "tylko raz", "gdy count się zmieni", "nigdy"], "correctIndex": 2},
            {"id": "q3", "prompt": "Komponenty React zaczynają się od...",
             "options": ["małej litery", "wielkiej litery", "_underscore", "numeru"], "correctIndex": 1,
             "explanation": "React rozpoznaje komponenty po wielkiej literze; <button> to HTML, <Button> to komponent."},
            {"id": "q4", "prompt": "Prop key na elementach listy służy do...",
             "options": ["stylowania", "wydajnego re-renderowania", "wysyłania zdarzeń", "walidacji"],
             "correctIndex": 1},
            {"id": "q5", "prompt": "Stan w React jest...",
             "options": ["mutowalny", "immutable — używamy setter", "global", "statyczny"], "correctIndex": 1},
            {"id": "q6", "prompt": "Hooki muszą być wywoływane...",
             "options": ["w if/for", "tylko na top-level komponentu", "w klasach", "tylko w useEffect"],
             "correctIndex": 1,
             "explanation": "React polega na kolejności wywołań hooków — muszą być w tym samym porządku każdy render."},
            {"id": "q7", "prompt": "JSX jest...",
             "options": ["nową wersją HTML", "rozszerzeniem JS — wygląda jak HTML", "skomplikowanym SQL", "konfiguracją"],
             "correctIndex": 1},
            {"id": "q8", "prompt": "useContext rozwiązuje...",
             "options": ["routing", "prop drilling", "async", "wydajność"],
             "correctIndex": 1},
        ],
    }, ensure_ascii=False))

    publish_course(cid)
    return cid


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

def main():
    print("▶ Sprawdzam backend...")
    try:
        http("GET", "/health/ready")
        print("  ✓ backend OK")
    except Exception as e:
        print(f"  ✗ backend down: {e}")
        sys.exit(1)

    print("\n▶ Logowanie demo@kursy.pl...")
    token = login(DEMO_EMAIL, DEMO_PASS)
    if not token:
        print("  ✗ login failed")
        sys.exit(1)
    print("  ✓ token uzyskany")

    print("\n▶ Czyszczenie wszystkich kursów (CASCADE)...")
    wipe_courses()
    print("  ✓ wyczyszczono")

    print("\n▶ Budowanie kursów...\n")

    courses = []
    for name, fn in [
        ("JavaScript od zera", build_javascript_course),
        ("HTML — od zera do strony", build_html_course),
        ("CSS — od zera do zaawansowanych", build_css_course),
        ("C# i .NET od zera", build_csharp_course),
        ("React.js", build_react_course),
    ]:
        print(f"  ▸ {name}")
        cid = fn(token)
        courses.append((name, cid))
        print(f"    ✓ utworzono i opublikowano ({cid})")

    print("\n▶ Zapisywanie studentów...")
    for s in ["student1@kursy.pl", "student2@kursy.pl", "student3@kursy.pl"]:
        t = login(s, "student1234")
        if not t:
            print(f"  ! {s} nie istnieje (uruchom seed-extras.sh)")
            continue
        for name, cid in courses:
            enroll_student(t, cid)
        print(f"  ✓ {s}")

    print("\n" + "═" * 56)
    print("  GOTOWE! 4 kursy z lekcjami + ćwiczeniami + quizami")
    print("═" * 56)
    for name, cid in courses:
        print(f"  ▸ {name}")
    print()
    print("  http://173.212.253.10/courses")
    print("═" * 56)


if __name__ == "__main__":
    main()
