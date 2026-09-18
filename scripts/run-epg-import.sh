#!/bin/bash
# Import EPG into Contabo Postgres before Astro static build.
set -euo pipefail

ASTRO_DIR="${ASTRO_DIR:-/var/www/123programmitv.it/astro}"
EPG_DIR="$ASTRO_DIR/scripts/epg"
VENV_DIR="$EPG_DIR/.venv"
LOG="${EPG_IMPORT_LOG:-/var/log/programmitv-epg-import.log}"

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

if [ ! -f "$ASTRO_DIR/.env" ]; then
  log "ERROR: missing $ASTRO_DIR/.env"
  exit 1
fi

load_env DATABASE_URL
load_env TMDB_API_KEY
load_env SITE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  log "ERROR: DATABASE_URL not set in $ASTRO_DIR/.env"
  exit 1
fi

if [ ! -f "$EPG_DIR/epg_importer.py" ]; then
  log "ERROR: missing EPG importer in $EPG_DIR"
  exit 1
fi

if [ ! -f "$VENV_DIR/bin/pip" ]; then
  log "Creating Python venv for EPG import..."
  python3 -m venv --clear "$VENV_DIR" 2>/dev/null || python3 -m venv "$VENV_DIR"
fi

log "Installing/updating EPG importer dependencies..."
"$VENV_DIR/bin/pip" install -q -r "$EPG_DIR/requirements.txt"

export SITE_BASE_URL="${SITE_URL:-https://www.intvstasera.it}"
export SITEMAP_PUBLIC_DIR="$ASTRO_DIR/public"
export SEARCH_CONSOLE_PUBLIC_DIR="$ASTRO_DIR/public/search-console"
export SYNC_CHANNEL_LOGOS="${SYNC_CHANNEL_LOGOS:-0}"
export IMAGE_ENRICHER_ENABLED="${IMAGE_ENRICHER_ENABLED:-1}"
export IMAGE_STORE_MODE="${IMAGE_STORE_MODE:-remote}"
export IMAGE_ENRICHER_BATCH_SIZE="${IMAGE_ENRICHER_BATCH_SIZE:-150}"
# Durante il deploy: batch breve sui programmi stasera (enricher completo via cron notturno).
export IMAGE_ENRICHER_MAX_ROUNDS="${IMAGE_ENRICHER_MAX_ROUNDS:-8}"
export IMAGE_ENRICHER_TIMEOUT_SEC="${IMAGE_ENRICHER_TIMEOUT_SEC:-600}"
export SYNC_TRIGGER_SOURCE="${SYNC_TRIGGER_SOURCE:-contabo-rebuild}"
export LOG_FILE="${LOG_FILE:-/var/log/programmitv-epg-import-python.log}"

# Avoid double deploy: rebuild-and-deploy-vps.sh runs right after import.
unset CLOUDFLARE_DEPLOY_HOOK_URL GITHUB_WORKFLOW_DISPATCH_URL GITHUB_TOKEN

log "Starting hybrid EPG import (TVIT + RaiPlay fallback)..."
cd "$EPG_DIR"
if "$VENV_DIR/bin/python3" epg_importer.py 2>&1 | tee -a "$LOG"; then
  log "EPG import completed"
else
  log "ERROR: EPG import failed"
  exit 1
fi
