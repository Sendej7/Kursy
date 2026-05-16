#!/usr/bin/env bash
# Kursy.pl — seedowanie demo userów i kursów przez API + SQL.
# Wymaga: stack już musi być uruchomiony (vps-bootstrap.sh ukończony).
#
# Tworzy:
#   - 3 studentów (student1..3@kursy.pl, hasło: student1234)
#   - 1 admin (admin@kursy.pl, hasło: admin1234) — promowany przez SQL
#   - 2 dodatkowe kursy autora demo@kursy.pl/demo1234: JavaScript + Quiz pokazowy
#   - Studenci zapisani na kursy
#
# Idempotentny — można odpalić wielokrotnie, pomija to co już istnieje.
#
# Użycie: bash /opt/kursy/scripts/seed-extras.sh
#   (lub: curl ... | bash jak masz repo)

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/kursy}"
API="${API:-http://localhost:5080/api}"
DEMO_EMAIL="demo@kursy.pl"
DEMO_PASS="demo1234"

log() { echo -e "\n\033[1;34m▶ $*\033[0m"; }
ok()  { echo -e "  \033[1;32m✓\033[0m $*"; }
warn(){ echo -e "  \033[1;33m!\033[0m $*"; }

cd "$INSTALL_DIR"

# Sprawdzenie czy backend żyje
if ! curl -sf "$API/health/ready" >/dev/null 2>&1; then
  echo "Backend nie odpowiada na $API/health/ready — odpal najpierw vps-bootstrap.sh"
  exit 1
fi
ok "Backend zdrowy"

# ════════════════════════════════════════════════════════════════
log "1/5  Rejestracja studentów"
# ════════════════════════════════════════════════════════════════

register_user() {
  local email="$1" pass="$2" name="$3"
  local resp http_code
  resp=$(curl -s -o /tmp/reg.out -w "%{http_code}" \
    -X POST "$API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\",\"displayName\":\"$name\"}")
  http_code="$resp"
  if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
    ok "Utworzono: $email"
  elif [[ "$http_code" == "409" || "$http_code" == "400" ]]; then
    warn "$email już istnieje (skip)"
  else
    warn "$email — HTTP $http_code: $(cat /tmp/reg.out)"
  fi
}

register_user "student1@kursy.pl" "student1234" "Jan Kowalski"
register_user "student2@kursy.pl" "student1234" "Anna Nowak"
register_user "student3@kursy.pl" "student1234" "Piotr Wiśniewski"
register_user "admin@kursy.pl"    "admin1234"   "Admin Główny"

# ════════════════════════════════════════════════════════════════
log "2/5  Promocja admin@kursy.pl do roli Admin (SQL)"
# ════════════════════════════════════════════════════════════════

docker compose exec -T postgres psql -U postgres -d eduplatform \
  -c "UPDATE \"Users\" SET \"Role\" = 2 WHERE \"Email\" = 'admin@kursy.pl';" >/dev/null
ok "admin@kursy.pl → Role=Admin"

# ════════════════════════════════════════════════════════════════
log "3/5  Logowanie jako demo author"
# ════════════════════════════════════════════════════════════════

login_token() {
  local email="$1" pass="$2"
  local resp
  resp=$(curl -s -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}")
  echo "$resp" | grep -oE '"token":"[^"]+"' | head -1 | sed 's/"token":"\([^"]*\)"/\1/'
}

AUTHOR_TOKEN=$(login_token "$DEMO_EMAIL" "$DEMO_PASS")
if [[ -z "$AUTHOR_TOKEN" ]]; then
  echo "Nie udało się zalogować demo@kursy.pl/demo1234 — czy seeder się odpalił?"
  exit 1
fi
ok "Token authora pobrany (${#AUTHOR_TOKEN} znaków)"

AUTH_H="Authorization: Bearer $AUTHOR_TOKEN"

# ════════════════════════════════════════════════════════════════
log "4/5  Tworzenie kursów + lekcji"
# ════════════════════════════════════════════════════════════════

create_course() {
  local title="$1" desc="$2" lang="$3"
  curl -s -X POST "$API/author/courses" \
    -H "$AUTH_H" -H "Content-Type: application/json" \
    -d "{\"title\":\"$title\",\"description\":\"$desc\",\"language\":\"$lang\"}" \
    | grep -oE '"id":"[^"]+"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/'
}

publish_course() {
  local id="$1" title="$2" desc="$3" lang="$4"
  curl -s -X PUT "$API/author/courses/$id" \
    -H "$AUTH_H" -H "Content-Type: application/json" \
    -d "{\"title\":\"$title\",\"description\":\"$desc\",\"language\":\"$lang\",\"visibility\":\"Draft\",\"priceMonthlyPln\":null}" \
    >/dev/null
  # Author nie ma uprawnień do Public — flip-niemy SQL'em.
  docker compose exec -T postgres psql -U postgres -d eduplatform \
    -c "UPDATE \"Courses\" SET \"Visibility\" = 3 WHERE \"Id\" = '$id';" >/dev/null
  ok "Kurs $id opublikowany (Visibility=Public)"
}

create_module() {
  local course_id="$1" title="$2" order="$3"
  curl -s -X POST "$API/author/modules" \
    -H "$AUTH_H" -H "Content-Type: application/json" \
    -d "{\"courseId\":\"$course_id\",\"title\":\"$title\",\"description\":\"\",\"order\":$order}" \
    | grep -oE '"id":"[^"]+"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/'
}

create_lesson() {
  local module_id="$1" title="$2" order="$3" type="$4" content="$5"
  # content musi być JSON-escaped — używamy python3 (dostępny na Ubuntu)
  local body
  body=$(python3 -c "
import json, sys
print(json.dumps({
  'moduleId': '$module_id',
  'title': '$title',
  'order': $order,
  'type': '$type',
  'contentMarkdown': sys.argv[1]
}))" "$content")
  curl -s -X POST "$API/author/lessons" \
    -H "$AUTH_H" -H "Content-Type: application/json" \
    -d "$body" >/dev/null
}

# ─── Kurs 1: JavaScript od zera ──────────────────────────────
JS_COURSE=$(create_course "JavaScript od zera" "Nauka JS od podstaw: zmienne, funkcje, DOM, async." "JavaScript")
if [[ -n "$JS_COURSE" ]]; then
  ok "Utworzono kurs JS: $JS_COURSE"
  JS_MOD=$(create_module "$JS_COURSE" "Podstawy języka" 1)
  create_lesson "$JS_MOD" "Zmienne i typy" 1 "Theory" "# Zmienne w JS

W JavaScript deklarujesz zmienne przez \`let\` (zmienne) lub \`const\` (stałe).

\`\`\`js
let name = 'Anna';
const age = 30;
\`\`\`"
  create_lesson "$JS_MOD" "Funkcje strzałkowe" 2 "Theory" "# Arrow functions

Krótsza składnia funkcji:

\`\`\`js
const sum = (a, b) => a + b;
console.log(sum(2, 3)); // 5
\`\`\`"
  create_lesson "$JS_MOD" "Quiz: podstawy JS" 3 "Quiz" '{
    "intro": "Sprawdź czy ogarniasz podstawy.",
    "passingPercentage": 70,
    "questions": [
      {
        "id": "q1",
        "prompt": "Które słowo kluczowe deklaruje stałą?",
        "options": ["let", "var", "const", "static"],
        "correctIndex": 2,
        "explanation": "const tworzy zmienną która nie może być reasignowana."
      },
      {
        "id": "q2",
        "prompt": "Co zwróci typeof null?",
        "options": ["null", "undefined", "object", "string"],
        "correctIndex": 2,
        "explanation": "Historyczny bug JS — typeof null zwraca object."
      },
      {
        "id": "q3",
        "prompt": "Który operator porównania NIE wykonuje konwersji typu?",
        "options": ["==", "===", "!=", "<="],
        "correctIndex": 1,
        "explanation": "=== to ścisłe porównanie, bez konwersji."
      }
    ]
  }'
  publish_course "$JS_COURSE" "JavaScript od zera" "Nauka JS od podstaw: zmienne, funkcje, DOM, async." "JavaScript"
else
  warn "JS course już istnieje lub błąd — sprawdź katalog"
fi

# ─── Kurs 2: Quizy z programowania ───────────────────────────
QZ_COURSE=$(create_course "Quizy z programowania" "Sprawdź swoją wiedzę quizami z różnych technologii." "Python")
if [[ -n "$QZ_COURSE" ]]; then
  ok "Utworzono kurs Quizy: $QZ_COURSE"
  QZ_MOD=$(create_module "$QZ_COURSE" "Wyzwania quizowe" 1)
  create_lesson "$QZ_MOD" "Python: składnia" 1 "Quiz" '{
    "intro": "5 pytań o podstawy składni Pythona.",
    "passingPercentage": 60,
    "questions": [
      {"id":"q1","prompt":"Który operator dzieli całkowicie?","options":["/", "//", "%", "**"],"correctIndex":1,"explanation":"// to dzielenie całkowite (floor division)."},
      {"id":"q2","prompt":"Jak skomentować wiele linii?","options":["//","/* */","''' '''","# #"],"correctIndex":2,"explanation":"Wielolinijkowe komentarze to potrójne cudzysłowy (technicznie docstring)."},
      {"id":"q3","prompt":"Jaki typ ma 3 / 2?","options":["int","float","str","bool"],"correctIndex":1,"explanation":"W Pythonie 3 normalne dzielenie zawsze zwraca float."},
      {"id":"q4","prompt":"Co zwróci len([1,2,3])?","options":["2","3","4","error"],"correctIndex":1,"explanation":"len() zwraca liczbę elementów."},
      {"id":"q5","prompt":"Który typ jest niezmienny (immutable)?","options":["list","dict","tuple","set"],"correctIndex":2,"explanation":"Tuple są immutable — nie można zmieniać po utworzeniu."}
    ]
  }'
  create_lesson "$QZ_MOD" "Git: podstawy" 2 "Quiz" '{
    "intro": "Czy znasz najczęstsze komendy gita?",
    "passingPercentage": 70,
    "questions": [
      {"id":"q1","prompt":"Komenda do pobrania zdalnych zmian?","options":["git pull","git push","git commit","git checkout"],"correctIndex":0},
      {"id":"q2","prompt":"Jak utworzyć nowy branch i przejść na niego?","options":["git branch new","git checkout new","git checkout -b new","git switch new"],"correctIndex":2,"explanation":"-b w checkout tworzy i przełącza w jednym kroku."},
      {"id":"q3","prompt":"Jak zobaczyć status plików?","options":["git log","git status","git show","git diff"],"correctIndex":1}
    ]
  }'
  publish_course "$QZ_COURSE" "Quizy z programowania" "Sprawdź swoją wiedzę quizami z różnych technologii." "Python"
else
  warn "Quiz course już istnieje lub błąd"
fi

# ════════════════════════════════════════════════════════════════
log "5/5  Zapisywanie studentów na kursy"
# ════════════════════════════════════════════════════════════════

# Wszystkie publiczne darmowe kursy
ALL_COURSES=$(curl -s "$API/courses" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data:
    print(c['id'])
")

for stud_email in student1@kursy.pl student2@kursy.pl student3@kursy.pl; do
  STUD_TOKEN=$(login_token "$stud_email" "student1234")
  if [[ -z "$STUD_TOKEN" ]]; then
    warn "Nie udało się zalogować $stud_email"
    continue
  fi
  for cid in $ALL_COURSES; do
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$API/courses/$cid/enroll" \
      -H "Authorization: Bearer $STUD_TOKEN")
    if [[ "$code" == "200" || "$code" == "204" ]]; then
      ok "$stud_email → kurs $cid"
    elif [[ "$code" == "409" ]]; then
      :  # już zapisany, cisza
    else
      warn "$stud_email → kurs $cid (HTTP $code)"
    fi
  done
done

echo
echo "═══════════════════════════════════════════════════"
echo "  Demo dane gotowe!"
echo "═══════════════════════════════════════════════════"
echo "  Logowania (wszystkie hasła = '${displayed:-jak niżej}'):"
echo
echo "  ▸ admin@kursy.pl    / admin1234       (Admin)"
echo "  ▸ demo@kursy.pl     / demo1234        (Author — domyślny z seedera)"
echo "  ▸ student1@kursy.pl / student1234     (Student — zapisany)"
echo "  ▸ student2@kursy.pl / student1234     (Student — zapisany)"
echo "  ▸ student3@kursy.pl / student1234     (Student — zapisany)"
echo
echo "  Kursy publiczne:"
curl -s "$API/courses" | python3 -c "
import json, sys
for c in json.load(sys.stdin):
    print(f'    ▸ {c[\"title\"]:<35} → /courses/{c[\"slug\"]}')
" || true
echo "═══════════════════════════════════════════════════"
