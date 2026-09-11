#!/bin/bash
# Arricchimento poster completo (cron notturno, dopo import EPG).
set -euo pipefail

ASTRO_DIR="${ASTRO_DIR:-/var/www/123programmitv.it/astro}"
EPG_DIR="$ASTRO_DIR/scripts/epg"
VENV_DIR="$EPG_DIR/.venv"
LOG="${POSTER_ENRICH_LOG:-/var/log/programmitv-poster-enrich.log}"

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

[ -f "$ASTRO_DIR/.env" ] || { log "ERROR: missing .env"; exit 1; }
load_env DATABASE_URL
load_env TMDB_API_KEY
load_env SITE_URL

export SITE_URL="${SITE_URL:-https://www.intvstasera.it}"
export IMAGE_STORE_MODE="${IMAGE_STORE_MODE:-remote}"
export IMAGE_ENRICHER_BATCH_SIZE="${IMAGE_ENRICHER_BATCH_SIZE:-150}"
export IMAGE_ENRICHER_MAX_ROUNDS="${IMAGE_ENRICHER_MAX_ROUNDS:-40}"
export IMAGE_ENRICHER_TIMEOUT_SEC="${IMAGE_ENRICHER_TIMEOUT_SEC:-3600}"

log "Starting full poster enrichment..."
cd "$EPG_DIR"
"$VENV_DIR/bin/python3" -u image_enricher.py 2>&1 | tee -a "$LOG"
log "Poster enrichment complete"
