#!/usr/bin/env bash
# Kursy.pl — wipe wszystkich kursów i wstawienie 5 pełnych:
# JavaScript, HTML, CSS, C# .NET, React.js
#
# Wymaga: stack uruchomiony, demo@kursy.pl/demo1234 istnieje.
# Użycie: bash /opt/kursy/scripts/reset-courses.sh

set -euo pipefail

cd "${INSTALL_DIR:-/opt/kursy}"

exec python3 "$(dirname "$0")/seed-full-courses.py"
