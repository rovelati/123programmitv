#!/usr/bin/env python3
"""
Hybrid EPG importer for 123programmitv.it
Primary source: TVIT JSON
Secondary source: IPTV-EPG Italy XMLTV
"""

import gzip
import io
import json
import logging
import os
import re
import subprocess
import sys
import unicodedata
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import pytz
import requests
from dotenv import load_dotenv
from PIL import Image

from pg_adapter import create_postgres_client

load_dotenv()

TVIT_EPG_URL = os.getenv('TVIT_EPG_URL', 'https://tvit.leicaflorianrobert.dev/epg/list.json')
IPTV_EPG_URL = os.getenv('IPTV_EPG_URL', 'https://iptv-epg.org/files/epg-it.xml')
TIMEZONE = pytz.timezone('Europe/Rome')
BATCH_SIZE = 100
RETENTION_DAYS = int(os.getenv('RETENTION_DAYS', '1'))
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHANNEL_MAP_PATH = os.getenv('EPG_CHANNEL_MAP_PATH', os.path.join(SCRIPT_DIR, 'epg_channel_map.json'))
SITE_BASE_URL = os.getenv('SITE_BASE_URL', 'https://www.intvstasera.it')
CHANNEL_LOGOS_SUBDIR = os.getenv('CHANNEL_LOGOS_SUBDIR', 'channel-logos')
SYNC_CHANNEL_LOGOS = os.getenv('SYNC_CHANNEL_LOGOS', '1') == '1'
ADESSOIN_URL = os.getenv('ADESSOIN_URL', 'https://www.adessoin.tv/')
RAIPLAY_ONAIR_URL = os.getenv('RAIPLAY_ONAIR_URL', 'https://www.raiplay.it/palinsesto/onAir.json')

CHANNELS_TABLE = os.getenv('EPG_CHANNELS_TABLE', 'channels')
PROGRAMS_TABLE = os.getenv('EPG_PROGRAMS_TABLE', 'programs')
CHANNELS_CONFIG_TABLE = os.getenv('EPG_CHANNELS_CONFIG_TABLE', 'channels_config')
EPG_SYNC_LOGS_TABLE = os.getenv('EPG_SYNC_LOGS_TABLE', 'epg_sync_logs')

EXCLUDED_CHANNEL_PATTERNS = ['antena', 'de -', 'de-']

# --- Indexability per film ---
FILM_CATEGORIES = {'film', 'cinema', 'movie'}
MIN_SYNOPSIS_WORDS = 300  # soglia descrizione per indicizzare la scheda

CLOUDFLARE_DEPLOY_HOOK_URL = os.getenv('CLOUDFLARE_DEPLOY_HOOK_URL', '')

# --- Trigger rebuild / deploy (opzionale) ---
# 1) Cloudflare Pages deploy hook (se usi Pages)
# 2) GitHub Actions workflow_dispatch (se fai build+rsync via Actions)
GITHUB_WORKFLOW_DISPATCH_URL = os.getenv('GITHUB_WORKFLOW_DISPATCH_URL', '').strip()
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN', '').strip()

# --- Static deploy pull (optional, legacy) ---
STATIC_DEPLOY_ENABLED = os.getenv('STATIC_DEPLOY_ENABLED', '0') == '1'
STATIC_DEPLOY_REPO = os.getenv('STATIC_DEPLOY_REPO', 'https://github.com/rovelati/123programmitv.git').strip()
STATIC_DEPLOY_BRANCH = os.getenv('STATIC_DEPLOY_BRANCH', 'deploy-static').strip()
STATIC_DEPLOY_DIR = os.getenv('STATIC_DEPLOY_DIR', '').strip()
STATIC_DEPLOY_PUBLIC_HTML = os.getenv('STATIC_DEPLOY_PUBLIC_HTML', '').strip()

# --- Verifica post-trigger (best effort) ---
REBUILD_VERIFY_URL = os.getenv('REBUILD_VERIFY_URL', 'https://www.intvstasera.it/').strip()
REBUILD_VERIFY_TIMEOUT_SEC = int(os.getenv('REBUILD_VERIFY_TIMEOUT_SEC', '180'))
REBUILD_VERIFY_POLL_SEC = int(os.getenv('REBUILD_VERIFY_POLL_SEC', '15'))
IMAGE_ENRICHER_ENABLED = os.getenv('IMAGE_ENRICHER_ENABLED', '1') == '1'
IMAGE_ENRICHER_TIMEOUT_SEC = int(os.getenv('IMAGE_ENRICHER_TIMEOUT_SEC', '900'))


def should_index_program(program_data: Dict[str, Any]) -> bool:
    """
    Determina se una scheda programma deve essere indicizzata da Google.
    Requisiti: genere = film/cinema/movie E description >= MIN_SYNOPSIS_WORDS parole.
    """
    genre = str(program_data.get('category') or '').lower()
    is_film = any(cat in genre for cat in FILM_CATEGORIES)
    if not is_film:
        return False
    description = str(program_data.get('description') or '')
    return len(description.split()) >= MIN_SYNOPSIS_WORDS


def trigger_cloudflare_rebuild() -> None:
    """Notifica Cloudflare Pages di ricostruire il sito dopo l'import EPG."""
    if not CLOUDFLARE_DEPLOY_HOOK_URL:
        logging.getLogger(__name__).info('CLOUDFLARE_DEPLOY_HOOK_URL non configurato, skip rebuild.')
        return
    try:
        resp = requests.post(CLOUDFLARE_DEPLOY_HOOK_URL, timeout=15)
        logging.getLogger(__name__).info('Cloudflare rebuild triggered: HTTP %s', resp.status_code)
    except Exception as error:
        logging.getLogger(__name__).warning('Cloudflare rebuild failed: %s', error)

def _head_last_modified(url: str) -> Optional[str]:
    try:
        resp = requests.head(url, allow_redirects=True, timeout=15, headers={'User-Agent': '123programmitv-epg-importer/1.0'})
        return resp.headers.get('Last-Modified') or resp.headers.get('last-modified')
    except Exception:
        return None


def trigger_github_workflow_dispatch() -> Dict[str, Any]:
    """
    Triggera un workflow GitHub via workflow_dispatch.

    Richiede:
      - GITHUB_WORKFLOW_DISPATCH_URL: es. https://api.github.com/repos/<owner>/<repo>/actions/workflows/deploy.yml/dispatches
      - GITHUB_TOKEN: token con permesso actions:write (o workflow).
    """
    if not GITHUB_WORKFLOW_DISPATCH_URL:
        return {'enabled': False, 'ok': False, 'reason': 'missing GITHUB_WORKFLOW_DISPATCH_URL'}
    if not GITHUB_TOKEN:
        return {'enabled': False, 'ok': False, 'reason': 'missing GITHUB_TOKEN'}

    try:
        resp = requests.post(
            GITHUB_WORKFLOW_DISPATCH_URL,
            json={'ref': 'main'},
            timeout=20,
            headers={
                'Authorization': f'Bearer {GITHUB_TOKEN}',
                'Accept': 'application/vnd.github+json',
                'User-Agent': '123programmitv-epg-importer/1.0',
            },
        )
        ok = resp.status_code in (201, 204)
        return {
            'enabled': True,
            'ok': ok,
            'status_code': resp.status_code,
            'response': (resp.text or '')[:500],
        }
    except Exception as error:
        return {'enabled': True, 'ok': False, 'error': str(error)}


def trigger_site_regeneration() -> Dict[str, Any]:
    """
    Pipeline di rigenerazione (best effort):
      1) Cloudflare deploy hook (se configurato)
      2) GitHub Actions workflow dispatch (se configurato)
      3) Verifica pubblica via Last-Modified su REBUILD_VERIFY_URL (se possibile)

    Ritorna un dict serializzabile da salvare in epg_sync_logs.metadata.
    """
    result: Dict[str, Any] = {
        'verify_url': REBUILD_VERIFY_URL,
        'verify_timeout_sec': REBUILD_VERIFY_TIMEOUT_SEC,
        'verify_poll_sec': REBUILD_VERIFY_POLL_SEC,
        'cloudflare': {'enabled': bool(CLOUDFLARE_DEPLOY_HOOK_URL)},
        'github': {'enabled': bool(GITHUB_WORKFLOW_DISPATCH_URL)},
        'verify': {'attempted': False},
    }

    before = _head_last_modified(REBUILD_VERIFY_URL)
    result['verify']['last_modified_before'] = before

    # 1) Cloudflare hook (fire-and-forget)
    if CLOUDFLARE_DEPLOY_HOOK_URL:
        try:
            resp = requests.post(CLOUDFLARE_DEPLOY_HOOK_URL, timeout=15)
            result['cloudflare'].update({'ok': 200 <= resp.status_code < 300, 'status_code': resp.status_code})
        except Exception as error:
            result['cloudflare'].update({'ok': False, 'error': str(error)})

    # 2) GitHub workflow dispatch (fire-and-forget)
    gh = trigger_github_workflow_dispatch()
    result['github'] = {**result.get('github', {}), **gh}

    # 3) Verifica (best effort) — aspetta fino a REBUILD_VERIFY_TIMEOUT_SEC
    start = time.time()
    deadline = start + max(0, REBUILD_VERIFY_TIMEOUT_SEC)
    result['verify']['attempted'] = True
    last_seen = before
    changed = False

    # Se non abbiamo un valore iniziale, la verifica non è affidabile.
    # Evitiamo di bloccare l'importer: registriamo solo il fatto che non possiamo verificare.
    if not before:
        result['verify']['skipped'] = True
        result['verify']['reason'] = 'missing Last-Modified on verify_url'
        result['verify']['elapsed_sec'] = 0
        return result

    while time.time() < deadline:
        current = _head_last_modified(REBUILD_VERIFY_URL)
        if current:
            last_seen = current
        if before and current and current != before:
            changed = True
            break
        time.sleep(max(1, REBUILD_VERIFY_POLL_SEC))

    result['verify']['last_modified_after'] = last_seen
    result['verify']['changed'] = changed
    result['verify']['elapsed_sec'] = int(time.time() - start)

    return result

def deploy_static_from_branch() -> Dict[str, Any]:
    """
    Pull del branch statico (deploy-static) e rsync locale verso public_html.
    Richiede git+rsync sul server e un GITHUB_TOKEN con read sul repo.
    """
    if not STATIC_DEPLOY_ENABLED:
        return {'enabled': False, 'ok': False, 'reason': 'STATIC_DEPLOY_ENABLED=0'}
    if not GITHUB_TOKEN:
        return {'enabled': True, 'ok': False, 'reason': 'missing GITHUB_TOKEN'}
    if not STATIC_DEPLOY_REPO:
        return {'enabled': True, 'ok': False, 'reason': 'missing STATIC_DEPLOY_REPO'}

    import base64
    import subprocess
    from pathlib import Path

    deploy_dir = Path(STATIC_DEPLOY_DIR)
    deploy_dir.mkdir(parents=True, exist_ok=True)

    # GitHub recommends using x-access-token as username for HTTPS auth.
    cred = base64.b64encode(f"x-access-token:{GITHUB_TOKEN}".encode("utf-8")).decode("ascii")
    extraheader = f"AUTHORIZATION: basic {cred}"

    def run(cmd: list[str]) -> subprocess.CompletedProcess:
        return subprocess.run(cmd, cwd=str(deploy_dir), capture_output=True, text=True)

    # Clone if empty (no .git)
    if not (deploy_dir / '.git').exists():
        # Initialize + fetch only the deploy branch
        subprocess.run(['git', 'init'], cwd=str(deploy_dir), check=False, capture_output=True, text=True)
        subprocess.run(['git', 'remote', 'remove', 'origin'], cwd=str(deploy_dir), check=False, capture_output=True, text=True)
        subprocess.run(['git', 'remote', 'add', 'origin', STATIC_DEPLOY_REPO], cwd=str(deploy_dir), check=False, capture_output=True, text=True)

    # Fetch + checkout branch
    fetch = subprocess.run(
        ['git', '-c', f'http.https://github.com/.extraheader={extraheader}', 'fetch', '--depth', '1', 'origin', STATIC_DEPLOY_BRANCH],
        cwd=str(deploy_dir),
        capture_output=True,
        text=True,
    )
    if fetch.returncode != 0:
        return {'enabled': True, 'ok': False, 'step': 'git fetch', 'stderr': fetch.stderr[-500:], 'stdout': fetch.stdout[-500:]}

    checkout = subprocess.run(['git', 'checkout', '-f', 'FETCH_HEAD'], cwd=str(deploy_dir), capture_output=True, text=True)
    if checkout.returncode != 0:
        return {'enabled': True, 'ok': False, 'step': 'git checkout', 'stderr': checkout.stderr[-500:], 'stdout': checkout.stdout[-500:]}

    # Deploy to public_html
    rsync = subprocess.run(
        ['rsync', '-av', '--checksum', '--delete', '--exclude=api', '--exclude=ads.txt', './', STATIC_DEPLOY_PUBLIC_HTML],
        cwd=str(deploy_dir),
        capture_output=True,
        text=True,
    )
    if rsync.returncode != 0:
        return {'enabled': True, 'ok': False, 'step': 'rsync', 'stderr': rsync.stderr[-500:], 'stdout': rsync.stdout[-500:]}

    return {'enabled': True, 'ok': True}


INVALID_PROGRAM_TITLES = {
    'no game today',
    'signing off',
    'tba',
    'to be announced',
    'no program today',
    'no programme today',
    'off air',
}

CHANNEL_NUMBER_FALLBACK = {
    'rai-1': 1,
    'rai-2': 2,
    'rai-3': 3,
    'rete-4': 4,
    'canale-5': 5,
    'italia-1': 6,
    'la7': 7,
    'tv8': 8,
    'nove': 9,
    '20': 20,
    'rai-4': 21,
    'iris': 22,
    'rai-5': 23,
    'rai-movie': 24,
    'cielo': 26,
    'twenty-seven': 27,
    'la7d': 29,
    'la-5': 30,
    'real-time': 31,
    'cine34': 34,
    'focus': 35,
    'warner-tv': 37,
    'giallo': 38,
    'top-crime': 39,
    'boing': 40,
    'k2': 41,
    'frisbee': 44,
    'cartoonito': 46,
    'italia-2': 49,
    'tgcom24': 51,
    'dmax': 52,
    'mediaset-extra': 55,
    'r101': 101,
    'radio-105': 105,
}

MANUAL_LOGO_FALLBACKS = {
    'canale-5': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Canale_5_-_2018_logo.svg',
    'italia-1': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Italia_1_logo.svg',
    'la7': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/LA7_-_Logo_2011.svg',
    'la7d': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/La7d_logo.svg',
    'tv8': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/TV8_logo.svg',
    'cielo': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Cielo_TV_logo_2013.svg',
    'twenty-seven': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Twentyseven_logo.svg',
}

FORCE_LOGO_REFRESH_IDS = {'20', 'cielo', 'twenty-seven', 'la7d', 'tv8'}

DEFAULT_CHANNEL_SLUG_ALIASES = {
    'rai1': 'rai-1',
    'rai2': 'rai-2',
    'rai3': 'rai-3',
    'rai4': 'rai-4',
    'rai5': 'rai-5',
    'raimovie': 'rai-movie',
    'rete4': 'rete-4',
    'canale5': 'canale-5',
    'italia1': 'italia-1',
    'italia2': 'italia-2',
    'mediaset20': '20',
    '20mediaset': '20',
    'la7d': 'la7d',
    'la5': 'la-5',
    'realtime': 'real-time',
    'tgcom24': 'tgcom24',
    'twentyseven': 'twenty-seven',
    'mediasetextra': 'mediaset-extra',
    'warnertv': 'warner-tv',
    'radiouno': 'radio-rai-1',
    'radiodue': 'radio-rai-2',
    'radiotre': 'radio-rai-3',
}

RAI_CHANNEL_IDS = {
    'rai-1',
    'rai-2',
    'rai-3',
    'rai-4',
    'rai-5',
    'rai-movie',
    'rai-premium',
    'rai-yoyo',
    'rai-gulp',
    'rai-storia',
    'rai-scuola',
    'rai-news',
    'rai-sport',
}

RAI_SCHEDULE_CHANNELS = {
    'rai-1',
    'rai-2',
    'rai-3',
    'rai-4',
    'rai-5',
    'rai-movie',
    'rai-premium',
    'rai-yoyo',
    'rai-gulp',
    'rai-storia',
    'rai-scuola',
}

CHANNEL_SLUG_ALIASES: Dict[str, str] = {}


def setup_logging():
    log_file = os.getenv('LOG_FILE', '/tmp/epg_importer_hybrid.log')
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout),
        ],
    )
    return logging.getLogger(__name__)


logger = setup_logging()


def normalize_ascii(value: Optional[str]) -> str:
    normalized = unicodedata.normalize('NFD', (value or '').strip().lower())
    return ''.join(ch for ch in normalized if unicodedata.category(ch) != 'Mn')


def load_channel_slug_aliases() -> Dict[str, str]:
    aliases = dict(DEFAULT_CHANNEL_SLUG_ALIASES)
    if not os.path.exists(CHANNEL_MAP_PATH):
        logger.warning('Channel map file not found: %s', CHANNEL_MAP_PATH)
        return aliases

    try:
        with open(CHANNEL_MAP_PATH, 'r', encoding='utf-8') as handle:
            payload = json.load(handle)
        if not isinstance(payload, dict):
            raise ValueError('Channel map payload must be an object')
        for raw_key, raw_value in payload.items():
            compact_key = re.sub(r'[^a-z0-9]+', '', normalize_ascii(str(raw_key or '')))
            if compact_key and raw_value:
                aliases[compact_key] = str(raw_value).strip()
    except Exception as error:
        logger.warning('Unable to load channel map from %s: %s', CHANNEL_MAP_PATH, error)
    return aliases


CHANNEL_SLUG_ALIASES = load_channel_slug_aliases()


def slugify_channel(value: Optional[str]) -> str:
    normalized = normalize_ascii(value)
    normalized = re.sub(r'^\s*it\s*[-|:]\s*', '', normalized)
    normalized = normalized.replace('.it', '')
    normalized = re.sub(r'[^a-z0-9\s+-]', '', normalized)
    normalized = normalized.replace('+', ' plus ')
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    slug = normalized.replace(' ', '-')
    slug = re.sub(r'-+', '-', slug).strip('-')
    compact = re.sub(r'[^a-z0-9]+', '', normalized)
    return CHANNEL_SLUG_ALIASES.get(compact, slug)


def normalize_channel_key(value: Optional[str]) -> str:
    return re.sub(r'[^a-z0-9]+', '', normalize_ascii(value))


def is_sport_channel(channel_id: Optional[str], channel_name: Optional[str]) -> bool:
    combined = ' '.join(filter(None, [channel_id or '', channel_name or '']))
    normalized = normalize_channel_key(combined)
    return 'sport' in normalized


def derive_program_category(channel: Dict[str, Any], raw_category: Optional[str]) -> Optional[str]:
    category = (raw_category or '').strip()
    if category:
        return category
    if is_sport_channel(channel.get('id'), channel.get('name')):
        return 'Sport'
    return None


def channel_signature(channel: Dict[str, Any]) -> Tuple[Tuple[str, str, str], ...]:
    signature: List[Tuple[str, str, str]] = []
    for program in sorted(
        channel.get('programs') or [],
        key=lambda item: (str(item.get('start') or ''), str(item.get('end') or ''), str(item.get('title') or '')),
    ):
        signature.append((
            str(program.get('start') or ''),
            str(program.get('end') or ''),
            normalize_ascii(program.get('title') or ''),
        ))
    return tuple(signature)


def channel_dedupe_score(channel: Dict[str, Any]) -> Tuple[int, int, int, int, str]:
    channel_id = str(channel.get('id') or '')
    channel_name = str(channel.get('name') or '')
    return (
        1 if channel.get('channel_number') else 0,
        1 if channel.get('logo_url') else 0,
        1 if not re.search(r'-\d+$', channel_id) else 0,
        -len(channel_name),
        channel_id,
    )


def parse_duration_to_timedelta(value: Optional[str]) -> Optional[timedelta]:
    raw = (value or '').strip()
    if not raw:
        return None
    parts = raw.split(':')
    if len(parts) != 3:
        return None
    try:
        hours, minutes, seconds = [int(part) for part in parts]
    except ValueError:
        return None
    return timedelta(hours=hours, minutes=minutes, seconds=seconds)


def pick_program_poster(program: Dict[str, Any]) -> Optional[str]:
    direct_candidates = (
        program.get('poster'),
        program.get('image'),
        program.get('thumbnail'),
        program.get('thumb'),
        program.get('cover'),
        program.get('artwork'),
    )
    for candidate in direct_candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    nested_candidates = (
        program.get('images'),
        program.get('image_set'),
        program.get('media'),
        program.get('assets'),
    )
    for container in nested_candidates:
        if not isinstance(container, dict):
            continue
        for key in ('poster', 'image', 'thumbnail', 'thumb', 'cover', 'artwork', 'landscape'):
            candidate = container.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()

    return None


def normalize_program_title(value: Optional[str]) -> str:
    raw = normalize_ascii(str(value or '')).lower()
    raw = re.sub(r'[^a-z0-9]+', ' ', raw)
    return ' '.join(raw.split())


def enrich_programs_from_reference(
    programs: List[Dict[str, Any]],
    reference_programs: List[Dict[str, Any]],
    title_only_fallback: bool = False,
) -> List[Dict[str, Any]]:
    if not programs or not reference_programs:
        return programs

    exact_map: Dict[Tuple[str, str], Dict[str, Any]] = {}
    title_map: Dict[str, List[Dict[str, Any]]] = {}

    for reference in reference_programs:
        ref_title = normalize_program_title(reference.get('title'))
        ref_start = str(reference.get('start') or '')[:16]
        if ref_title and ref_start:
            exact_map[(ref_title, ref_start)] = reference
        if ref_title:
            title_map.setdefault(ref_title, []).append(reference)

    enriched: List[Dict[str, Any]] = []
    for program in programs:
        current = dict(program)
        current_title = normalize_program_title(current.get('title'))
        current_start = str(current.get('start') or '')[:16]
        reference = exact_map.get((current_title, current_start))

        if reference is None and title_only_fallback and current_title:
            candidates = title_map.get(current_title) or []
            if candidates:
                reference = candidates[0]

        if reference:
            if not current.get('poster') and reference.get('poster'):
                current['poster'] = reference.get('poster')
            if not current.get('description') and reference.get('description'):
                current['description'] = reference.get('description')
            if not current.get('category') and reference.get('category'):
                current['category'] = reference.get('category')

        enriched.append(current)

    return enriched


def fetch_raiplay_on_air_programs() -> Dict[str, List[Dict[str, Any]]]:
    try:
        response = requests.get(RAIPLAY_ONAIR_URL, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        payload = response.json()
    except Exception as error:
        logger.warning('Unable to fetch RaiPlay on-air fallback: %s', error)
        return {}

    results: Dict[str, List[Dict[str, Any]]] = {}
    for entry in payload.get('on_air') or []:
        channel_name = entry.get('channel')
        channel_slug = slugify_channel(channel_name)
        if channel_slug not in RAI_CHANNEL_IDS:
            continue

        programs: List[Dict[str, Any]] = []
        for item_key in ('currentItem', 'nextItem'):
            item = entry.get(item_key) or {}
            title = (item.get('name') or '').strip()
            start_raw = item.get('tech_datetime_en') or item.get('tech_datetime')
            if not title or not start_raw:
                continue
            try:
                start_dt = datetime.fromisoformat(str(start_raw).replace('Z', '+00:00'))
            except ValueError:
                continue

            duration = parse_duration_to_timedelta(item.get('duration')) or timedelta(minutes=30)
            end_dt = start_dt + duration
            category = None
            program_info = item.get('program') or {}
            if isinstance(program_info, dict):
                category = program_info.get('name')
            programs.append({
                'channel_id': channel_slug,
                'title': title,
                'description': item.get('description') or '',
                'start': start_dt.isoformat(),
                'end': end_dt.isoformat(),
                'category': derive_program_category({'id': channel_slug, 'name': channel_name}, category),
                'poster': item.get('image'),
            })

        if programs:
            results[channel_slug] = programs

    logger.info('RaiPlay on-air fallback loaded: %s channels', len(results))
    return results


def fetch_raiplay_day_schedule(channel_id: str, target_date: datetime) -> List[Dict[str, Any]]:
    formatted_date = target_date.astimezone(TIMEZONE).strftime('%d-%m-%Y')
    url = f'https://www.raiplay.it/palinsesto/app/{channel_id}/{formatted_date}.json'
    try:
        response = requests.get(url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        payload = response.json()
    except Exception as error:
        logger.warning('Unable to fetch RaiPlay day schedule for %s: %s', channel_id, error)
        return []

    channel_name = str(payload.get('channel') or channel_id)
    programs: List[Dict[str, Any]] = []
    for event in payload.get('events') or []:
        title = (event.get('name') or '').strip()
        hour = (event.get('hour') or '').strip()
        if not title or not hour:
            continue

        duration = parse_duration_to_timedelta(event.get('duration')) or timedelta(minutes=30)
        try:
            start_dt = datetime.strptime(
                f"{target_date.astimezone(TIMEZONE).strftime('%Y-%m-%d')} {hour}",
                '%Y-%m-%d %H:%M',
            )
            start_dt = TIMEZONE.localize(start_dt)
        except ValueError:
            continue
        end_dt = start_dt + duration

        category = None
        program_info = event.get('program') or {}
        if isinstance(program_info, dict):
            category = program_info.get('name')

        programs.append({
            'channel_id': channel_id,
            'title': title,
            'description': event.get('description') or '',
            'start': start_dt.isoformat(),
            'end': end_dt.isoformat(),
            'category': derive_program_category({'id': channel_id, 'name': channel_name}, category),
            'poster': event.get('image'),
        })

    return programs


def fetch_raiplay_schedule_programs(channel_ids: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    target_date = datetime.now(TIMEZONE)
    schedules: Dict[str, List[Dict[str, Any]]] = {}
    for channel_id in channel_ids:
        if channel_id not in RAI_SCHEDULE_CHANNELS:
            continue
        programs = fetch_raiplay_day_schedule(channel_id, target_date)
        if programs:
            schedules[channel_id] = programs
    logger.info('RaiPlay day schedule fallback loaded: %s channels', len(schedules))
    return schedules


def get_logo_public_dir() -> str:
    public_dir = get_public_dir()
    logo_dir = os.path.join(public_dir, CHANNEL_LOGOS_SUBDIR)
    os.makedirs(logo_dir, exist_ok=True)
    return logo_dir


def local_logo_url(filename: str) -> str:
    return f'{SITE_BASE_URL.rstrip("/")}/{CHANNEL_LOGOS_SUBDIR}/{filename}'


def sanitize_filename(value: str) -> str:
    cleaned = re.sub(r'[^a-z0-9._-]+', '-', normalize_ascii(value))
    return cleaned.strip('-._') or 'logo'


def infer_extension(url: str, content_type: Optional[str]) -> str:
    if content_type:
        lower = content_type.lower()
        if 'svg' in lower:
            return '.svg'
        if 'png' in lower:
            return '.png'
        if 'jpeg' in lower or 'jpg' in lower:
            return '.jpg'
        if 'webp' in lower:
            return '.webp'
    path = url.split('?', 1)[0].lower()
    for ext in ('.svg', '.png', '.jpg', '.jpeg', '.webp'):
        if path.endswith(ext):
            return '.jpg' if ext == '.jpeg' else ext
    return '.png'


def normalize_logo_asset(content: bytes, extension: str) -> Tuple[bytes, str]:
    if extension == '.svg':
        return content, extension

    image = Image.open(io.BytesIO(content)).convert('RGBA')
    opaque_pixels = [pixel for pixel in image.getdata() if pixel[3] > 0]
    if not opaque_pixels:
        return content, extension

    white_pixels = sum(1 for r, g, b, _ in opaque_pixels if r > 240 and g > 240 and b > 240)
    white_ratio = white_pixels / len(opaque_pixels)

    if white_ratio >= 0.95:
        background = Image.new('RGBA', image.size, (15, 23, 42, 255))
        background.alpha_composite(image)
        output = io.BytesIO()
        background.save(output, format='PNG')
        return output.getvalue(), '.png'

    return content, extension


def fetch_adessoin_logo_map() -> Dict[str, str]:
    try:
        response = requests.get(ADESSOIN_URL, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
    except Exception as error:
        logger.warning('Unable to fetch Adesso in TV logo map: %s', error)
        return {}

    html = response.text
    pattern = re.compile(
        r'<img[^>]+src="([^"]*gallerie/loghi/[^"]+)"[^>]+alt="([^"]+)"',
        re.IGNORECASE,
    )
    logo_map: Dict[str, str] = {}
    for raw_src, raw_name in pattern.findall(html):
        src = raw_src if raw_src.startswith('http') else f'https://www.adessoin.tv/{raw_src.lstrip("/")}'
        slug = slugify_channel(raw_name)
        if slug and slug not in logo_map:
            logo_map[slug] = src
    logger.info('Adesso in TV logo map loaded: %s entries', len(logo_map))
    return logo_map


def fetch_channel_configs(supabase: Any) -> Dict[str, Dict[str, Any]]:
    try:
        rows = supabase.table(CHANNELS_CONFIG_TABLE).select('id, name, visible, position, logo_override').execute().data or []
    except Exception as error:
        logger.warning('Unable to fetch channel configs for logo sync: %s', error)
        return {}
    return {str(row.get('id')): row for row in rows if row.get('id')}


def build_logo_candidates(channel: Dict[str, Any], adessoin_logo_map: Dict[str, str]) -> List[str]:
    candidates: List[str] = []
    channel_id = str(channel.get('id') or '')
    channel_name = str(channel.get('name') or '')
    compact_name = normalize_channel_key(channel_name)
    manual = MANUAL_LOGO_FALLBACKS.get(channel_id)

    # Prefer curated brand assets for major channels. Feed logos often expose
    # white-on-transparent variants that disappear on the site.
    if manual:
        candidates.append(manual)

    if channel_id in adessoin_logo_map:
        candidates.append(adessoin_logo_map[channel_id])
    else:
        for key, value in adessoin_logo_map.items():
            if normalize_channel_key(key) == compact_name or compact_name == normalize_channel_key(channel_id):
                candidates.append(value)
                break

    existing = channel.get('logo_url')
    if existing:
        candidates.append(str(existing))

    deduped: List[str] = []
    seen = set()
    for candidate in candidates:
        if candidate and candidate not in seen:
            deduped.append(candidate)
            seen.add(candidate)
    return deduped


def download_logo_asset(channel: Dict[str, Any], adessoin_logo_map: Dict[str, str], logo_dir: str) -> Optional[str]:
    candidates = build_logo_candidates(channel, adessoin_logo_map)
    if not candidates:
        return None

    channel_id = str(channel.get('id') or channel.get('name') or 'logo')
    base_name = sanitize_filename(channel_id)

    for candidate in candidates:
        try:
            response = requests.get(candidate, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
            response.raise_for_status()
            extension = infer_extension(candidate, response.headers.get('content-type'))
            content, extension = normalize_logo_asset(response.content, extension)
            filename = f'{base_name}{extension}'
            file_path = os.path.join(logo_dir, filename)
            with open(file_path, 'wb') as handle:
                handle.write(content)
            return local_logo_url(filename)
        except Exception as error:
            logger.warning('Logo download failed for %s from %s: %s', channel_id, candidate, error)
            continue
    return None


def sync_local_channel_logos(supabase: Any, channels_data: List[Dict[str, Any]]) -> int:
    if not SYNC_CHANNEL_LOGOS:
        return 0

    configs = fetch_channel_configs(supabase)
    adessoin_logo_map = fetch_adessoin_logo_map()
    logo_dir = get_logo_public_dir()
    updated_rows = []

    for channel in channels_data:
        channel_id = str(channel.get('id') or '')
        if not channel_id:
            continue

        config = configs.get(channel_id, {})
        existing_override = str(config.get('logo_override') or '').strip()
        if existing_override and CHANNEL_LOGOS_SUBDIR not in existing_override and SITE_BASE_URL not in existing_override:
            continue

        local_candidates = [
            entry for entry in os.listdir(logo_dir)
            if entry.startswith(sanitize_filename(channel_id) + '.')
        ]
        force_refresh = channel_id in FORCE_LOGO_REFRESH_IDS or (
            channel_id in MANUAL_LOGO_FALLBACKS and not any(entry.lower().endswith('.svg') for entry in local_candidates)
        )

        if force_refresh and local_candidates:
            for entry in local_candidates:
                try:
                    os.remove(os.path.join(logo_dir, entry))
                except OSError as error:
                    logger.warning('Unable to remove local logo %s: %s', entry, error)
            local_candidates = []

        local_url = local_logo_url(sorted(local_candidates)[0]) if local_candidates else None
        if not local_url:
            local_url = download_logo_asset(channel, adessoin_logo_map, logo_dir)
        if not local_url:
            continue

        if existing_override == local_url:
            continue

        updated_rows.append({
            'id': channel_id,
            'name': config.get('name') or channel.get('name'),
            'visible': config.get('visible', True),
            'position': config.get('position') or channel.get('channel_number') or 999,
            'logo_override': local_url,
        })

    if not updated_rows:
        return 0

    try:
        supabase.table(CHANNELS_CONFIG_TABLE).upsert(updated_rows, on_conflict='id').execute()
        logger.info('Local channel logos synced: %s overrides updated', len(updated_rows))
        return len(updated_rows)
    except Exception as error:
        logger.warning('Unable to persist local logo overrides: %s', error)
        return 0


def resolve_channel_number(channel: Dict[str, Any]) -> Optional[int]:
    for field in ('number', 'channel_number', 'lcn', 'channelNumber'):
        raw = channel.get(field)
        if raw is None:
            continue
        try:
            parsed = int(raw)
            if parsed > 0:
                return parsed
        except (TypeError, ValueError):
            continue

    channel_id = channel.get('id') or channel.get('channel_id')
    fallback = CHANNEL_NUMBER_FALLBACK.get(str(channel_id or '').lower())
    if fallback:
        return fallback

    compact = normalize_channel_key(channel.get('name') or channel_id)
    for slug, number in CHANNEL_NUMBER_FALLBACK.items():
        if normalize_channel_key(slug) == compact:
            return number
    return None


def slugify_title(title: Optional[str]) -> str:
    if not title or not isinstance(title, str):
        return ''
    normalized = normalize_ascii(title)
    cleaned = re.sub(r'[^a-z0-9\s-]', '', normalized)
    cleaned = re.sub(r'\s+', '-', cleaned)
    cleaned = re.sub(r'-+', '-', cleaned)
    return cleaned.strip('-')


def clean_program_title(title: Optional[str]) -> str:
    cleaned = str(title or '')
    cleaned = re.sub(r'\s*(?:ᴺᵉʷ|🆕)\s*$', '', cleaned, flags=re.UNICODE)
    cleaned = re.sub(r'\s+\bnew\b\s*$', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def is_invalid_program_title(title: Optional[str]) -> bool:
    normalized = normalize_ascii(title)
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    if not normalized:
        return True
    return normalized in INVALID_PROGRAM_TITLES


def should_exclude_channel(channel_id: Optional[str], channel_name: Optional[str]) -> bool:
    lower_id = (channel_id or '').lower()
    lower_name = (channel_name or '').lower()
    return any(
        pattern in lower_id or lower_name.startswith(pattern)
        for pattern in EXCLUDED_CHANNEL_PATTERNS
    )


def get_time_slot(start_time: datetime) -> str:
    rome_time = start_time.astimezone(TIMEZONE)
    hour = rome_time.hour
    minute = rome_time.minute
    if 6 <= hour < 18:
        return 'oggi'
    if (hour > 20 or (hour == 20 and minute >= 30)) and hour < 24:
        return 'stasera'
    return 'stanotte'


def parse_xmltv_datetime(value: str) -> datetime:
    value = (value or '').strip()
    if not value:
        raise ValueError('Empty XMLTV datetime')
    if ' ' in value:
        dt_part, tz_part = value.split(' ', 1)
    else:
        dt_part, tz_part = value, ''
    dt = datetime.strptime(dt_part, '%Y%m%d%H%M%S')
    if tz_part:
        sign = 1 if tz_part.startswith('+') else -1
        offset_minutes = sign * (int(tz_part[1:3]) * 60 + int(tz_part[3:5]))
        return dt.replace(tzinfo=pytz.FixedOffset(offset_minutes))
    return TIMEZONE.localize(dt)


def fetch_tvit_channels() -> List[Dict[str, Any]]:
    logger.info(f'Fetching TVIT feed from {TVIT_EPG_URL}')
    response = requests.get(TVIT_EPG_URL, timeout=120)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, list):
        raise ValueError('Unexpected TVIT payload format')

    channels: List[Dict[str, Any]] = []
    for channel in payload:
        raw_id = channel.get('id') or channel.get('channel_id')
        name = channel.get('name')
        if should_exclude_channel(raw_id, name):
            continue
        canonical_id = slugify_channel(raw_id or name)
        programs = []
        for program in channel.get('programs') or []:
            start = program.get('start') or program.get('startTime')
            end = program.get('end') or program.get('endTime')
            title = program.get('title')
            if not start or not end or not title or is_invalid_program_title(title):
                continue
            programs.append({
                'channel_id': canonical_id,
                'title': title,
                'description': program.get('description') or '',
                'start': start,
                'end': end,
                'category': derive_program_category({
                    'id': canonical_id,
                    'name': name or canonical_id,
                }, program.get('category')),
                'poster': pick_program_poster(program),
            })
        channels.append({
            'id': canonical_id,
            'name': name or canonical_id,
            'logo_url': channel.get('logo') or channel.get('logo_url'),
            'channel_number': resolve_channel_number(channel),
            'category': derive_program_category({
                'id': canonical_id,
                'name': name or canonical_id,
            }, channel.get('category')),
            'source': 'tvit',
            'programs': programs,
        })
    return channels


def fetch_iptv_it_channels() -> List[Dict[str, Any]]:
    logger.info(f'Fetching IPTV-EPG feed from {IPTV_EPG_URL}')
    response = requests.get(IPTV_EPG_URL, timeout=120)
    response.raise_for_status()
    content = response.content
    try:
        with gzip.GzipFile(fileobj=io.BytesIO(content)) as gz:
            xml_data = gz.read()
    except (gzip.BadGzipFile, OSError):
        xml_data = content

    root = ET.fromstring(xml_data)
    channels_by_xml_id: Dict[str, Dict[str, Any]] = {}
    used_ids: Dict[str, int] = {}

    for element in root.findall('channel'):
        xml_id = element.get('id') or ''
        display_names = [
            (node.text or '').strip()
            for node in element.findall('display-name')
            if (node.text or '').strip()
        ]
        name = display_names[0] if display_names else xml_id
        canonical_id = slugify_channel(name or xml_id)
        if not canonical_id:
            canonical_id = slugify_channel(xml_id)
        duplicate_count = used_ids.get(canonical_id, 0)
        used_ids[canonical_id] = duplicate_count + 1
        if duplicate_count:
            canonical_id = f'{canonical_id}-{duplicate_count + 1}'

        if should_exclude_channel(canonical_id, name):
            continue

        icon = element.find('icon')
        channels_by_xml_id[xml_id] = {
            'id': canonical_id,
            'name': re.sub(r'^\s*IT\s*[-|:]\s*', '', name, flags=re.IGNORECASE).strip() or canonical_id,
            'logo_url': icon.get('src') if icon is not None else None,
            'channel_number': resolve_channel_number({
                'channel_id': canonical_id,
                'name': name,
            }),
            'category': 'Sport' if is_sport_channel(canonical_id, name) else None,
            'source': 'iptv-epg',
            'programs': [],
        }

    for element in root.findall('programme'):
        xml_channel_id = element.get('channel') or ''
        channel = channels_by_xml_id.get(xml_channel_id)
        if not channel:
            continue

        start_raw = element.get('start')
        end_raw = element.get('stop')
        title = (element.findtext('title') or '').strip()
        if not start_raw or not end_raw or not title or is_invalid_program_title(title):
            continue

        try:
            start_dt = parse_xmltv_datetime(start_raw)
            end_dt = parse_xmltv_datetime(end_raw)
        except Exception:
            continue

        description = (element.findtext('desc') or '').strip()
        category = derive_program_category(channel, (element.findtext('category') or '').strip() or None)
        poster = None
        icon = element.find('icon')
        if icon is not None:
            poster = icon.get('src')

        channel['programs'].append({
            'channel_id': channel['id'],
            'title': title,
            'description': description,
            'start': start_dt.isoformat(),
            'end': end_dt.isoformat(),
            'category': category,
            'poster': poster,
        })

    deduped_channels: List[Dict[str, Any]] = []
    signatures: Dict[Tuple[Tuple[str, str, str], ...], Dict[str, Any]] = {}
    for channel in channels_by_xml_id.values():
        if not channel['programs']:
            continue
        signature = channel_signature(channel)
        existing = signatures.get(signature)
        if existing:
            winner = max([existing, channel], key=channel_dedupe_score)
            loser = channel if winner is existing else existing
            signatures[signature] = winner
            logger.info(
                'Dropping duplicate IPTV channel %s (%s), keeping %s (%s)',
                loser.get('id'),
                loser.get('name'),
                winner.get('id'),
                winner.get('name'),
            )
            continue
        signatures[signature] = channel

    deduped_channels.extend(signatures.values())
    return deduped_channels


def merge_channels(primary_channels: List[Dict[str, Any]], secondary_channels: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    merged_channels: Dict[str, Dict[str, Any]] = {}
    merged_programs: List[Dict[str, Any]] = []
    secondary_by_id = {channel['id']: channel for channel in secondary_channels}
    raiplay_schedule = fetch_raiplay_schedule_programs([channel['id'] for channel in primary_channels])
    raiplay_on_air = fetch_raiplay_on_air_programs()

    for channel in primary_channels:
        primary_programs = channel.get('programs') or []
        secondary_match = secondary_by_id.get(channel['id'])
        secondary_programs = secondary_match.get('programs') or [] if secondary_match else []
        raiplay_schedule_programs = raiplay_schedule.get(channel['id']) or []
        raiplay_on_air_programs = raiplay_on_air.get(channel['id']) or []

        if primary_programs and channel['id'] in RAI_SCHEDULE_CHANNELS:
            primary_programs = enrich_programs_from_reference(primary_programs, raiplay_schedule_programs)
            primary_programs = enrich_programs_from_reference(primary_programs, raiplay_on_air_programs, title_only_fallback=True)
            channel = {
                **channel,
                'programs': primary_programs,
            }

        if not primary_programs and secondary_programs:
            logger.info(
                'Primary feed empty for %s, using secondary IPTV-EPG programs (%s items)',
                channel['id'],
                len(secondary_programs),
            )
            channel = {
                **channel,
                'programs': secondary_programs,
                'source': channel.get('source', 'tvit'),
                'category': channel.get('category') or secondary_match.get('category'),
            }
            primary_programs = channel['programs']

        if not primary_programs and raiplay_schedule_programs:
            fallback_programs = raiplay_schedule_programs
            logger.info(
                'Primary and secondary feeds empty for %s, using RaiPlay day schedule fallback (%s items)',
                channel['id'],
                len(fallback_programs),
            )
            channel = {
                **channel,
                'programs': fallback_programs,
            }
            primary_programs = channel['programs']

        if not primary_programs and raiplay_on_air_programs:
            fallback_programs = raiplay_on_air_programs
            logger.info(
                'Primary and secondary feeds empty for %s, using RaiPlay on-air fallback (%s items)',
                channel['id'],
                len(fallback_programs),
            )
            channel = {
                **channel,
                'programs': fallback_programs,
            }

        merged_channels[channel['id']] = channel
        merged_programs.extend(channel['programs'])

    primary_ids = set(merged_channels.keys())
    added_secondary = 0
    for channel in secondary_channels:
        if channel['id'] in primary_ids:
            continue
        merged_channels[channel['id']] = channel
        merged_programs.extend(channel['programs'])
        added_secondary += 1

    logger.info(
        'Hybrid merge completed: %s primary channels, %s secondary added, %s total channels',
        len(primary_channels),
        added_secondary,
        len(merged_channels),
    )
    return list(merged_channels.values()), merged_programs


def create_sync_log(supabase: Any, trigger_source: str, triggered_by: Optional[str]) -> Optional[int]:
    try:
        if hasattr(supabase, 'cursor'):
            with supabase.cursor() as cur:
                cur.execute(
                    f"""
                    INSERT INTO {EPG_SYNC_LOGS_TABLE} (status, started_at, trigger_source, triggered_by)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    ('running', datetime.now(TIMEZONE).isoformat(), trigger_source, triggered_by),
                )
                row = cur.fetchone()
                return int(row[0]) if row and row[0] is not None else None
        result = (
            supabase.table(EPG_SYNC_LOGS_TABLE)
            .insert({
                'status': 'running',
                'started_at': datetime.now(TIMEZONE).isoformat(),
                'trigger_source': trigger_source,
                'triggered_by': triggered_by,
            })
            .execute()
        )
        data = getattr(result, 'data', None) or []
        if data and data[0].get('id') is not None:
            return int(data[0]['id'])
    except Exception as error:
        logger.warning('Unable to create sync log row: %s', error)
    return None


def update_sync_log(supabase: Any, sync_log_id: Optional[int], payload: Dict[str, Any]) -> None:
    if not sync_log_id:
        return
    try:
        if hasattr(supabase, 'cursor'):
            columns = list(payload.keys())
            assignments = ', '.join(f"{column} = %s" for column in columns)
            values = [
                json.dumps(payload[column]) if isinstance(payload[column], (dict, list)) else payload[column]
                for column in columns
            ] + [sync_log_id]
            with supabase.cursor() as cur:
                cur.execute(
                    f"UPDATE {EPG_SYNC_LOGS_TABLE} SET {assignments} WHERE id = %s",
                    values,
                )
            return
        supabase.table(EPG_SYNC_LOGS_TABLE).update(payload).eq('id', sync_log_id).execute()
    except Exception as error:
        logger.warning('Unable to update sync log %s: %s', sync_log_id, error)


def get_db_client() -> Any:
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError('Missing DATABASE_URL (Postgres locale Contabo VPS)')
    logger.info('Using Postgres connection from DATABASE_URL')
    return create_postgres_client(database_url)


def upsert_channels(supabase: Any, channels_data: List[Dict[str, Any]]) -> int:
    logger.info(f'Upserting {len(channels_data)} channels into {CHANNELS_TABLE}')
    processed = 0
    for channel in channels_data:
        channel_record = {
            'channel_id': channel['id'],
            'name': channel['name'],
            'logo_url': channel.get('logo_url'),
            'channel_number': channel.get('channel_number'),
            'category': channel.get('category'),
            'source': channel.get('source', 'tvit'),
        }
        try:
            supabase.table(CHANNELS_TABLE).upsert(channel_record, on_conflict='channel_id').execute()
            processed += 1
        except Exception as error:
            logger.error('Failed to upsert channel %s: %s', channel['id'], error)
    return processed


def ensure_channel_configs(supabase: Any, channels_data: List[Dict[str, Any]]) -> int:
    try:
        existing_rows = supabase.table(CHANNELS_CONFIG_TABLE).select('id').execute().data or []
    except Exception as error:
        logger.warning('Unable to fetch existing channel configs: %s', error)
        return 0

    existing_ids = {row.get('id') for row in existing_rows}
    missing_rows = []
    for channel in channels_data:
        if channel['id'] in existing_ids:
            continue
        missing_rows.append({
            'id': channel['id'],
            'name': channel['name'],
            'visible': True,
            'position': channel.get('channel_number') or 999,
        })

    if not missing_rows:
        return 0

    try:
        supabase.table(CHANNELS_CONFIG_TABLE).insert(missing_rows).execute()
        logger.info('Inserted %s missing channel config rows', len(missing_rows))
        return len(missing_rows)
    except Exception as error:
        logger.warning('Failed to insert default channel configs: %s', error)
        return 0


def load_preserved_posters(supabase: Any, dates: set) -> Dict[str, str]:
    """Conserva poster_url già arricchiti quando l'import giornaliero riscrive i programmi."""
    preserved: Dict[str, str] = {}
    for date_iso in sorted(dates):
        try:
            rows = (
                supabase.table(PROGRAMS_TABLE)
                .select('channel_id, slug, start_time, poster_url')
                .eq('date', date_iso)
                .execute()
                .data
                or []
            )
        except Exception as error:
            logger.warning('Unable to load existing posters for %s: %s', date_iso, error)
            continue
        for row in rows:
            poster = (row.get('poster_url') or '').strip()
            if not poster:
                continue
            channel_id = row.get('channel_id')
            slug = row.get('slug')
            start_time = row.get('start_time')
            if channel_id and slug:
                preserved[f'{channel_id}|slug|{slug}'] = poster
            if channel_id and start_time:
                preserved[f'{channel_id}|start|{start_time}'] = poster
    if preserved:
        logger.info('Preserving %s existing poster URLs across re-import', len(preserved))
    return preserved


def resolve_import_poster(
    program: Dict[str, Any],
    title: str,
    start_time: datetime,
    preserved: Dict[str, str],
) -> Optional[str]:
    poster = (program.get('poster') or '').strip() or None
    if poster:
        return poster
    channel_id = program.get('channel_id')
    slug = slugify_title(title)
    start_iso = start_time.isoformat()
    return (
        preserved.get(f'{channel_id}|slug|{slug}')
        or preserved.get(f'{channel_id}|start|{start_iso}')
    )


def insert_programs(supabase: Any, programs_data: List[Dict[str, Any]]) -> int:
    if not programs_data:
        return 0

    unique_dates = set()
    for program in programs_data:
        try:
            dt = datetime.fromisoformat(str(program['start']).replace('Z', '+00:00'))
            unique_dates.add(dt.astimezone(TIMEZONE).date().isoformat())
        except Exception:
            continue

    preserved_posters = load_preserved_posters(supabase, unique_dates)

    for date_iso in sorted(unique_dates):
        try:
            supabase.table(PROGRAMS_TABLE).delete().eq('date', date_iso).execute()
        except Exception as error:
            logger.warning('Failed to clear programs for date %s: %s', date_iso, error)

    inserted = 0
    batch: List[Dict[str, Any]] = []
    for program in programs_data:
        try:
            title = clean_program_title(program.get('title'))
            if is_invalid_program_title(title):
                continue
            start_time = datetime.fromisoformat(str(program['start']).replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(str(program['end']).replace('Z', '+00:00'))
            slug = slugify_title(title)
            batch.append({
                'channel_id': program['channel_id'],
                'title': title,
                'slug': slug,
                'description': program.get('description') or '',
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'date': start_time.astimezone(TIMEZONE).date().isoformat(),
                'time_slot': get_time_slot(start_time),
                'genre': program.get('category'),
                'rating': program.get('rating'),
                'poster_url': resolve_import_poster(program, title, start_time, preserved_posters),
                'indexable': should_index_program(program),
            })
            if len(batch) >= BATCH_SIZE:
                supabase.table(PROGRAMS_TABLE).insert(batch).execute()
                inserted += len(batch)
                batch = []
        except Exception as error:
            logger.error('Failed to process program %s: %s', program.get('title'), error)

    if batch:
        supabase.table(PROGRAMS_TABLE).insert(batch).execute()
        inserted += len(batch)
    logger.info('Inserted %s programs', inserted)
    return inserted


def cleanup_old_programs(supabase: Any) -> int:
    cutoff_date = (datetime.now(TIMEZONE).date() - timedelta(days=RETENTION_DAYS)).isoformat()
    try:
        result = supabase.table(PROGRAMS_TABLE).delete().lt('date', cutoff_date).execute()
        return len(getattr(result, 'data', []) or [])
    except Exception as error:
        logger.warning('Failed to cleanup old programs: %s', error)
        return 0


def remove_excluded_channels(supabase: Any) -> int:
    try:
        result = supabase.table(CHANNELS_TABLE).select('channel_id, name').execute()
    except Exception as error:
        logger.warning('Failed to load channels for exclusion cleanup: %s', error)
        return 0

    removed = 0
    for channel in result.data or []:
        if not should_exclude_channel(channel.get('channel_id'), channel.get('name')):
            continue
        try:
            supabase.table(PROGRAMS_TABLE).delete().eq('channel_id', channel['channel_id']).execute()
            supabase.table(CHANNELS_TABLE).delete().eq('channel_id', channel['channel_id']).execute()
            removed += 1
        except Exception as error:
            logger.warning('Failed to remove excluded channel %s: %s', channel.get('channel_id'), error)
    return removed


def remove_stale_channels(supabase: Any, channels_data: List[Dict[str, Any]]) -> int:
    current_ids = {str(channel.get('id') or '') for channel in channels_data if channel.get('id')}
    if not current_ids:
        return 0

    try:
        result = supabase.table(CHANNELS_TABLE).select('channel_id').execute()
    except Exception as error:
        logger.warning('Failed to load channels for stale cleanup: %s', error)
        return 0

    stale_ids = [
        str(row.get('channel_id'))
        for row in (result.data or [])
        if row.get('channel_id') and str(row.get('channel_id')) not in current_ids
    ]
    if not stale_ids:
        return 0

    removed = 0
    for channel_id in stale_ids:
        try:
            supabase.table(CHANNELS_TABLE).delete().eq('channel_id', channel_id).execute()
            removed += 1
        except Exception as error:
            logger.warning('Failed to remove stale channel %s: %s', channel_id, error)
    return removed


def get_public_dir() -> str:
    public_dir = os.getenv('SITEMAP_PUBLIC_DIR')
    if public_dir:
        return public_dir
    astro_public = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', 'public'))
    if os.path.isdir(astro_public):
        return astro_public
    return os.path.abspath(os.path.join(SCRIPT_DIR, '..', 'public'))


def get_search_console_dir() -> str:
    configured = os.getenv('SEARCH_CONSOLE_PUBLIC_DIR', '').strip()
    if configured:
        os.makedirs(configured, exist_ok=True)
        return configured
    target = os.path.join(get_public_dir(), 'search-console')
    os.makedirs(target, exist_ok=True)
    return target


def write_json_report(filename: str, payload: Dict[str, Any]) -> str:
    target_dir = get_search_console_dir()
    final_path = os.path.join(target_dir, filename)
    temp_path = f'{final_path}.tmp'
    with open(temp_path, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
    os.replace(temp_path, final_path)
    return final_path


def collect_sitemap_metadata() -> List[Dict[str, Any]]:
    public_dir = get_public_dir()
    sitemap_files = [
        ('sitemap.xml', 'Sitemap index'),
        ('sitemap-static.xml', 'Sitemap statiche'),
        ('sitemap-programmi.xml', 'Sitemap programmi'),
    ]
    rows: List[Dict[str, Any]] = []
    for filename, label in sitemap_files:
        abs_path = os.path.join(public_dir, filename)
        exists = os.path.exists(abs_path)
        rows.append({
            'label': label,
            'filename': filename,
            'path': abs_path,
            'url': f'{SITE_BASE_URL.rstrip("/")}/{filename}',
            'exists': exists,
            'lastModified': datetime.fromtimestamp(os.path.getmtime(abs_path), tz=TIMEZONE).isoformat() if exists else None,
            'sizeBytes': os.path.getsize(abs_path) if exists else None,
        })
    return rows


def write_import_pipeline_report(payload: Dict[str, Any]) -> str:
    return write_json_report('import-pipeline-latest.json', {
        'siteUrl': SITE_BASE_URL,
        'generatedAt': datetime.now(TIMEZONE).isoformat(),
        **payload,
    })


def fetch_programs_for_sitemap(supabase: Any) -> List[Dict[str, Any]]:
    visible_ids = None
    try:
        config_rows = supabase.table(CHANNELS_CONFIG_TABLE).select('id, visible').execute().data or []
        visible_ids = {row.get('id') for row in config_rows if row.get('visible') is not False}
    except Exception as error:
        logger.warning('Unable to load channel visibility for sitemap: %s', error)

    rows: List[Dict[str, Any]] = []
    offset = 0
    page_size = 1000
    while True:
        result = (
            supabase.table(PROGRAMS_TABLE)
            .select('title, channel_id, created_at')
            .order('created_at', desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = result.data or []
        if not batch:
            break
        for row in batch:
            title = row.get('title')
            channel_id = row.get('channel_id')
            if is_invalid_program_title(title):
                continue
            if visible_ids is not None and channel_id not in visible_ids:
                continue
            rows.append(row)
        if len(batch) < page_size or len(rows) >= 50000:
            break
        offset += page_size
    return rows[:50000]


def generate_programs_sitemap(supabase: Any) -> Optional[str]:
    public_dir = get_public_dir()
    os.makedirs(public_dir, exist_ok=True)
    programs = fetch_programs_for_sitemap(supabase)
    if not programs:
        return None

    urls = []
    seen = set()
    for program in programs:
        title = program.get('title') or ''
        channel_id = program.get('channel_id') or ''
        if not title or not channel_id or 'radio' in str(channel_id).lower():
            continue
        loc = f"https://www.intvstasera.it/programma/{channel_id}/{slugify_title(title)}"
        if loc in seen:
            continue
        seen.add(loc)
        created_at = program.get('created_at')
        lastmod = created_at.split('T')[0] if isinstance(created_at, str) and 'T' in created_at else datetime.now(TIMEZONE).date().isoformat()
        urls.append((loc, lastmod))

    programs_path = os.path.join(public_dir, 'sitemap-programmi.xml')
    with open(programs_path, 'w', encoding='utf-8') as handle:
        handle.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        handle.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for loc, lastmod in urls:
            handle.write('  <url>\n')
            handle.write(f'    <loc>{loc}</loc>\n')
            handle.write(f'    <lastmod>{lastmod}</lastmod>\n')
            handle.write('    <changefreq>daily</changefreq>\n')
            handle.write('    <priority>0.7</priority>\n')
            handle.write('  </url>\n')
        handle.write('</urlset>\n')

    sitemap_static = os.path.join(public_dir, 'sitemap-static.xml')
    sitemap_index = os.path.join(public_dir, 'sitemap.xml')
    if not os.path.exists(sitemap_static) and os.path.exists(sitemap_index):
        with open(sitemap_index, 'r', encoding='utf-8') as source_handle:
            current = source_handle.read()
        if '<urlset' in current and '<sitemapindex' not in current:
            with open(sitemap_static, 'w', encoding='utf-8') as target_handle:
                target_handle.write(current)

    lastmod_programs = urls[0][1] if urls else datetime.now(TIMEZONE).date().isoformat()
    lastmod_static = datetime.now(TIMEZONE).date().isoformat()
    with open(sitemap_index, 'w', encoding='utf-8') as handle:
        handle.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        handle.write('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        handle.write('  <sitemap>\n')
        handle.write('    <loc>https://www.intvstasera.it/sitemap-programmi.xml</loc>\n')
        handle.write(f'    <lastmod>{lastmod_programs}</lastmod>\n')
        handle.write('  </sitemap>\n')
        handle.write('  <sitemap>\n')
        handle.write('    <loc>https://www.intvstasera.it/sitemap-static.xml</loc>\n')
        handle.write(f'    <lastmod>{lastmod_static}</lastmod>\n')
        handle.write('  </sitemap>\n')
        handle.write('</sitemapindex>\n')
    return lastmod_programs


def build_hybrid_dataset() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    primary_channels = fetch_tvit_channels()
    feed_status: Dict[str, Any] = {
        'tvit': {'status': 'ok', 'channels': len(primary_channels)},
        'iptv_epg': {'status': 'ok', 'channels': 0, 'error': None},
    }
    secondary_channels: List[Dict[str, Any]] = []
    try:
        secondary_channels = fetch_iptv_it_channels()
        feed_status['iptv_epg']['channels'] = len(secondary_channels)
    except Exception as error:
        logger.warning('Secondary IPTV-EPG feed failed, continuing with TVIT only: %s', error)
        feed_status['iptv_epg']['status'] = 'failed'
        feed_status['iptv_epg']['error'] = str(error)
    channels, programs = merge_channels(primary_channels, secondary_channels)
    logger.info('Hybrid dataset ready: %s channels, %s programs', len(channels), len(programs))
    feed_status['secondary_channels_added'] = max(len(channels) - len(primary_channels), 0)
    feed_status['total_channels'] = len(channels)
    feed_status['total_programs'] = len(programs)
    return channels, programs, feed_status


def run_image_enricher_step() -> Dict[str, Any]:
    if not IMAGE_ENRICHER_ENABLED:
        return {
            'enabled': False,
            'ok': True,
            'status': 'disabled',
            'reason': 'IMAGE_ENRICHER_ENABLED=0',
        }

    script_path = os.path.join(SCRIPT_DIR, 'image_enricher.py')
    if not os.path.exists(script_path):
        return {
            'enabled': True,
            'ok': False,
            'status': 'missing_script',
            'error': f'Missing script: {script_path}',
        }

    started_at = time.time()
    command = [sys.executable, script_path]
    try:
        result = subprocess.run(
            command,
            cwd=SCRIPT_DIR,
            timeout=IMAGE_ENRICHER_TIMEOUT_SEC,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        return {
            'enabled': True,
            'ok': False,
            'status': 'timeout',
            'error': str(error),
            'durationSeconds': int(time.time() - started_at),
        }
    except Exception as error:
        return {
            'enabled': True,
            'ok': False,
            'status': 'failed_to_start',
            'error': str(error),
            'durationSeconds': int(time.time() - started_at),
        }

    return {
        'enabled': True,
        'ok': result.returncode == 0,
        'status': 'ok' if result.returncode == 0 else 'error',
        'returnCode': result.returncode,
        'durationSeconds': int(time.time() - started_at),
    }


def main() -> int:
    logger.info('=' * 60)
    logger.info('Hybrid EPG Importer Started')
    logger.info('=' * 60)

    supabase = None
    sync_log_id: Optional[int] = None
    run_started_dt = datetime.now(TIMEZONE)
    report_context: Dict[str, Any] = {
        'status': 'running',
        'stage': 'boot',
        'run': {
            'startedAt': run_started_dt.isoformat(),
            'finishedAt': None,
            'durationSeconds': None,
        },
        'sourceUrl': TVIT_EPG_URL,
        'retentionDays': RETENTION_DAYS,
        'counts': {
            'channelsFound': 0,
            'channelsProcessed': 0,
            'programsFound': 0,
            'programsInserted': 0,
            'programsDeleted': 0,
            'staleChannelsRemoved': 0,
        },
        'sitemaps': collect_sitemap_metadata(),
        'warnings': [],
        'notes': [
            'Importatore attivo: hybrid TVIT + IPTV-EPG.',
            'La dashboard 123ProgrammiTV non include report social.',
            'Le immagini programma vengono arricchite in post-processing best-effort.',
        ],
    }
    try:
        write_import_pipeline_report(report_context)
        supabase = get_db_client()
        trigger_source = os.getenv('SYNC_TRIGGER_SOURCE', 'cron')
        triggered_by = os.getenv('SYNC_TRIGGERED_BY')
        sync_log_id = create_sync_log(supabase, trigger_source, triggered_by)
        report_context['stage'] = 'build_hybrid_dataset'
        write_import_pipeline_report(report_context)
        channels, programs, feed_status = build_hybrid_dataset()
        report_context['counts']['channelsFound'] = len(channels)
        report_context['counts']['programsFound'] = len(programs)
        report_context['feeds'] = feed_status
        existing_channels = supabase.table(CHANNELS_TABLE).select('channel_id').execute().data or []
        existing_ids = {row.get('channel_id') for row in existing_channels if row.get('channel_id')}
        current_ids = {channel['id'] for channel in channels}
        report_context['stage'] = 'cleanup_and_upsert'
        write_import_pipeline_report(report_context)
        excluded_removed = remove_excluded_channels(supabase)
        channels_processed = upsert_channels(supabase, channels)
        stale_removed = remove_stale_channels(supabase, channels)
        config_defaults = ensure_channel_configs(supabase, channels)
        local_logos_synced = sync_local_channel_logos(supabase, channels)
        old_deleted = cleanup_old_programs(supabase)
        programs_inserted = insert_programs(supabase, programs)
        report_context['counts']['channelsProcessed'] = channels_processed
        report_context['counts']['programsInserted'] = programs_inserted
        report_context['counts']['programsDeleted'] = old_deleted
        report_context['counts']['staleChannelsRemoved'] = stale_removed
        report_context['counts']['excludedChannelsRemoved'] = excluded_removed
        report_context['counts']['configDefaultsInserted'] = config_defaults
        report_context['counts']['localLogosSynced'] = local_logos_synced
        report_context['channelDelta'] = {
          'newChannels': max(len(current_ids - existing_ids), 0),
          'missingChannels': max(len(existing_ids - current_ids), 0),
        }
        report_context['stage'] = 'generate_sitemaps'
        try:
            generate_programs_sitemap(supabase)
        except Exception as error:
            logger.warning('Sitemap generation failed: %s', error)
            report_context['warnings'].append(f'Generazione sitemap fallita: {error}')

        logger.info('Excluded removed: %s', excluded_removed)
        logger.info('Stale channels removed: %s', stale_removed)
        logger.info('Channels processed: %s', channels_processed)
        logger.info('Config defaults inserted: %s', config_defaults)
        logger.info('Local logos synced: %s', local_logos_synced)
        logger.info('Old programs deleted: %s', old_deleted)
        logger.info('Programs inserted: %s', programs_inserted)
        try:
            report_context['stage'] = 'image_enrichment'
            write_import_pipeline_report(report_context)
            image_enrichment = run_image_enricher_step()
            report_context['imageEnrichment'] = image_enrichment
            if not image_enrichment.get('ok', False):
                report_context['warnings'].append(
                    f"Image enricher non riuscito: {image_enrichment.get('status') or image_enrichment.get('error')}"
                )
        except Exception as error:
            image_enrichment = {'enabled': True, 'ok': False, 'status': 'exception', 'error': str(error)}
            report_context['imageEnrichment'] = image_enrichment
            report_context['warnings'].append(f'Image enricher fallito: {error}')
        update_sync_log(supabase, sync_log_id, {
            'status': 'success',
            'completed_at': datetime.now(TIMEZONE).isoformat(),
            'message': 'Hybrid sync completed successfully',
            'primary_channels': feed_status['tvit']['channels'],
            'secondary_channels': feed_status['iptv_epg']['channels'],
            'secondary_channels_added': feed_status['secondary_channels_added'],
            'new_channels': max(len(current_ids - existing_ids), 0),
            'missing_channels': max(len(existing_ids - current_ids), 0),
            'total_channels': len(channels),
            'total_programs': programs_inserted,
            'excluded_removed': excluded_removed,
            'old_programs_deleted': old_deleted,
            'metadata': {
                **feed_status,
                'local_logos_synced': local_logos_synced,
                'stale_channels_removed': stale_removed,
                'image_enrichment': image_enrichment,
            },
        })
        # Trigger rebuild/deploy del frontend (se configurato) e traccia esito
        try:
            report_context['stage'] = 'trigger_site_regeneration'
            regen = trigger_site_regeneration()
            update_sync_log(supabase, sync_log_id, {
                'metadata': {
                    **feed_status,
                    'local_logos_synced': local_logos_synced,
                    'stale_channels_removed': stale_removed,
                    'image_enrichment': image_enrichment,
                    'site_regeneration': regen,
                },
            })
            report_context['siteRegeneration'] = regen
        except Exception as error:
            logger.warning('Site regeneration trigger failed: %s', error)
            update_sync_log(supabase, sync_log_id, {
                'metadata': {
                    **feed_status,
                    'local_logos_synced': local_logos_synced,
                    'stale_channels_removed': stale_removed,
                    'image_enrichment': image_enrichment,
                    'site_regeneration': {'ok': False, 'error': str(error)},
                },
            })
            report_context['warnings'].append(f'Trigger rigenerazione sito fallito: {error}')
            report_context['siteRegeneration'] = {'ok': False, 'error': str(error)}
        run_finished_dt = datetime.now(TIMEZONE)
        report_context['status'] = 'success' if not report_context['warnings'] else 'success_with_warnings'
        report_context['stage'] = 'completed'
        report_context['run'] = {
            'startedAt': run_started_dt.isoformat(),
            'finishedAt': run_finished_dt.isoformat(),
            'durationSeconds': int((run_finished_dt - run_started_dt).total_seconds()),
        }
        report_context['sitemaps'] = collect_sitemap_metadata()
        write_import_pipeline_report(report_context)
        logger.info('Hybrid EPG Importer Completed')
        logger.info('=' * 60)
        return 0
    except Exception as error:
        run_failed_dt = datetime.now(TIMEZONE)
        report_context['status'] = 'error'
        report_context['stage'] = 'failed'
        report_context['error'] = str(error)
        report_context['run'] = {
            'startedAt': run_started_dt.isoformat(),
            'finishedAt': run_failed_dt.isoformat(),
            'durationSeconds': int((run_failed_dt - run_started_dt).total_seconds()),
        }
        report_context['sitemaps'] = collect_sitemap_metadata()
        write_import_pipeline_report(report_context)
        if supabase is not None:
            update_sync_log(supabase, sync_log_id, {
                'status': 'error',
                'completed_at': datetime.now(TIMEZONE).isoformat(),
                'message': 'Hybrid sync failed',
                'error_details': str(error),
            })
        logger.error('Hybrid importer failed: %s', error, exc_info=True)
        logger.error('=' * 60)
        return 1


if __name__ == '__main__':
    sys.exit(main())
