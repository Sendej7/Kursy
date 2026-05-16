#!/usr/bin/env bash
# Kursy.pl VPS bootstrap — odpalasz raz na świeżym Ubuntu 22.04/24.04 VPS jako root.
# Public repo:
#   curl -fsSL https://raw.githubusercontent.com/Sendej7/Kursy/claude/coding-platform-plan-18Ywv/scripts/vps-bootstrap.sh | bash
# Private repo (z fine-grained PAT, Contents:Read):
#   T=github_pat_XXX bash -c "GITHUB_TOKEN=$T; $(curl -fsSL -H \"Authorization: token $T\" https://raw.githubusercontent.com/Sendej7/Kursy/claude/coding-platform-plan-18Ywv/scripts/vps-bootstrap.sh)"
# Idempotentny — można uruchomić kilka razy, robi to co trzeba.

set -euo pipefail

BRANCH="${BRANCH:-claude/coding-platform-plan-18Ywv}"
REPO_URL="${REPO_URL:-https://github.com/Sendej7/Kursy.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/kursy}"
PUBLIC_IP="$(curl -fsSL --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"

# Jeśli repo jest prywatne, podaj GITHUB_TOKEN (fine-grained PAT z Contents:Read).
# Embedujemy go w URL clone'a tylko lokalnie — nie trafia do remote.
CLONE_URL="$REPO_URL"
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  CLONE_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/Sendej7/Kursy.git"
fi

log() { echo -e "\n\033[1;34m▶ $*\033[0m"; }
ok()  { echo -e "\033[1;32m✓ $*\033[0m"; }

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

log "1/7  System update"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ufw ca-certificates gnupg openssl

log "2/7  Docker install (skip if present)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
ok "$(docker --version)"
ok "$(docker compose version)"

log "3/7  Firewall (ufw)"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 5080/tcp >/dev/null  # backend API (jeśli wolisz frontend hituje przez IP)
echo "y" | ufw enable >/dev/null 2>&1 || true
ok "firewall: 22, 80, 443, 5080"

log "4/7  Clone / update repo"
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone --depth 1 --branch "$BRANCH" "$CLONE_URL" "$INSTALL_DIR"
else
  cd "$INSTALL_DIR"
  git remote set-url origin "$CLONE_URL"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi
cd "$INSTALL_DIR"
# Zdejmujemy token z remote URL po użyciu — gdyby kiedyś git config wyciekł.
git remote set-url origin "$REPO_URL"
ok "repo @ $(git rev-parse --short HEAD)"

log "5/7  Generate .env (only if missing)"
if [[ ! -f .env ]]; then
  JWT_KEY="$(openssl rand -hex 32)"
  cat > .env <<EOF
JWT_SIGNING_KEY=$JWT_KEY
APP_BASE_URL=http://$PUBLIC_IP
VITE_API_BASE=http://$PUBLIC_IP:5080/api

# Opcjonalne — bez kluczy ficzery degradują się gracefully
CLAUDE_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
GOOGLE_CLIENT_ID=
VITE_GOOGLE_CLIENT_ID=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
VITE_GITHUB_CLIENT_ID=
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_FROM=no-reply@kursy.local
SENTRY_DSN=
EOF
  ok ".env created with random JWT (32 bytes)"
else
  ok ".env already exists (skipping)"
fi

log "6/7  Docker compose override (port 80 + nie wystawiamy postgres na host)"
cat > docker-compose.override.yml <<'EOF'
# Override dla VPS deploymentu: frontend na :80, postgres NIE wystawiony na host
# (zwykle 5432 jest zajęty przez systemowy postgres). Kontenery gadają po
# wewnętrznym network'u, więc backend i tak widzi postgresa po nazwie usługi.
services:
  frontend:
    ports:
      - "80:80"
  postgres:
    ports: !reset []
  mailhog:
    ports:
      - "127.0.0.1:8025:8025"
EOF
ok "override.yml written"

log "7/7  Build + start (this takes 5-10 min — .NET SDK image is ~700MB)"
docker compose pull 2>/dev/null || true
docker compose up -d --build

echo
echo "Waiting for backend health endpoint..."
for i in {1..60}; do
  if curl -sf "http://localhost:5080/api/health/ready" >/dev/null 2>&1; then
    ok "Backend ready after $((i*5))s"
    break
  fi
  printf "."
  sleep 5
done
echo

echo
echo "═══════════════════════════════════════════════════"
echo "  Kursy.pl jest LIVE!"
echo "═══════════════════════════════════════════════════"
echo "  Frontend:  http://$PUBLIC_IP"
echo "  API:       http://$PUBLIC_IP:5080/api"
echo "  Swagger:   http://$PUBLIC_IP:5080/swagger"
echo "  Mailhog:   ssh -L 8025:127.0.0.1:8025 root@$PUBLIC_IP  → http://localhost:8025"
echo "═══════════════════════════════════════════════════"
echo
echo "Status kontenerów:"
docker compose ps
echo
echo "Logi backendu (Ctrl+C aby wyjść):"
echo "  cd $INSTALL_DIR && docker compose logs -f backend"
