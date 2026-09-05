#!/bin/bash
# Build 123programmitv Astro on Contabo (Postgres locale) + deploy Cloudflare Pages
set -euo pipefail

ASTRO_DIR="${ASTRO_DIR:-/var/www/123programmitv.it/astro}"
LOG="${LOG:-/var/log/programmitv-astro-rebuild.log}"
CF_PROJECT="${CF_PROJECT:-123programmitv}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

load_env() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ASTRO_DIR/.env" | head -1 || true)"
  [ -n "$line" ] || return 0
  local val="${line#*=}"
  val="${val%\"}"; val="${val#\"}"
  val="${val%\'}"; val="${val#\'}"
  printf -v "$key" '%s' "$val"
  export "$key"
}

cd "$ASTRO_DIR"

if [ ! -f .env ]; then
  log "ERROR: missing $ASTRO_DIR/.env"
  exit 1
fi

if [ -d .git ]; then
  log "Fetching latest code from git..."
  git fetch origin main
  git reset --hard origin/main
  log "HEAD at $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"
else
  log "No .git directory — using checkout synced from GitHub Actions"
fi

load_env DATABASE_URL
load_env CF_API_KEY
load_env CF_API_EMAIL
load_env CF_ACCOUNT_ID
export SITE_URL="https://www.intvstasera.it"

if [ -z "${DATABASE_URL:-}" ]; then
  log "ERROR: DATABASE_URL not set in .env"
  exit 1
fi

log "Starting Astro build (node adapter / static client)..."
npm install 2>&1 | tee -a "$LOG"
rm -rf dist .astro
# Prefer build:node if present (produces dist/client for Pages)
if npm run | grep -q 'build:node'; then
  npm run build:node 2>&1 | tee -a "$LOG"
else
  npm run build 2>&1 | tee -a "$LOG"
fi

# sync-search-console-assets.js used to copy stale dist/sitemap.xml over dist/client/.
# Regenerate sitemap after the full build/postbuild chain as a final safeguard.
log "Final sitemap regeneration..."
node scripts/generate-sitemap.js 2>&1 | tee -a "$LOG"

OUT=""
if [ -f dist/client/index.html ]; then
  OUT=dist/client
elif [ -f dist/index.html ]; then
  OUT=dist
else
  log "ERROR: no index.html in dist/ or dist/client/"
  exit 1
fi

if ! grep -qiE 'Programmi|Rai|Mediaset|stasera|TV' "$OUT/index.html"; then
  log "ERROR: homepage content looks empty/broken"
  exit 1
fi

# Ensure sitemap.xml strictly uses www.intvstasera.it
if [ -f "$OUT/sitemap.xml" ]; then
  sed -i \
    -e 's|https://123programmitv.it|https://www.intvstasera.it|g' \
    -e 's|http://123programmitv.it|https://www.intvstasera.it|g' \
    -e 's|https://www.123programmitv.it|https://www.intvstasera.it|g' \
    -e 's|http://www.123programmitv.it|https://www.intvstasera.it|g' \
    -e 's|https://intvstasera.it|https://www.intvstasera.it|g' \
    -e 's|http://intvstasera.it|https://www.intvstasera.it|g' \
    "$OUT/sitemap.xml"
  if grep -q '123programmitv.it' "$OUT/sitemap.xml"; then
    log "ERROR: sitemap.xml still contains legacy 123programmitv.it URLs"
    exit 1
  fi
  log "Sanitized $OUT/sitemap.xml to www.intvstasera.it"
fi

# Bundle CF Functions if present
if [ -d functions ] && [ "$OUT" = "dist/client" ]; then
  rm -rf "$OUT/functions"
  cp -R functions "$OUT/functions"
fi

log "Build OK ($(du -sh "$OUT" | awk '{print $1}')) → $OUT"

if [ -z "${CF_API_KEY:-}" ] || [ -z "${CF_API_EMAIL:-}" ]; then
  log "WARN: CF_API_KEY/CF_API_EMAIL missing — skip Pages deploy"
  exit 0
fi

export CLOUDFLARE_API_KEY="$CF_API_KEY"
export CLOUDFLARE_EMAIL="$CF_API_EMAIL"
[ -n "${CF_ACCOUNT_ID:-}" ] && export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"

log "Deploying to Cloudflare Pages project=$CF_PROJECT ..."
npx --yes wrangler@4 pages deploy "$OUT" \
  --project-name="$CF_PROJECT" \
  --commit-dirty=true \
  2>&1 | tee -a "$LOG"

if curl -fsS "https://www.intvstasera.it/sitemap.xml" | grep -q '123programmitv.it'; then
  log "WARN: live sitemap still lists 123programmitv.it — purge Cloudflare cache for /sitemap.xml"
else
  log "Live sitemap OK (www.intvstasera.it)"
fi

log "Deploy complete"
