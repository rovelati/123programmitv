#!/usr/bin/env python3
"""
enrich_it_official_posters.py — intvstasera.it / 123programmitv
High-definition broadcaster image and synopsis enrichment for Italian TV.

Fetches 1080p backdrops, posters, and detailed synopses directly from:
1. TivùSat / Tivù la Guida official API (Rai, Mediaset, Discovery, DTT channels)
2. Sky Italia Guida TV API (Sky Uno, Atlantic, Cinema, Sport, SuperTennis, DAZN)

Guarantees:
- Zero SuperguidaTV or 3rd-party watermarked promotional banners.
- No channel logos masquerading as program posters.
- Precise schedule matching (±5 min tolerance) in Europe/Rome timezone.
- Enriches both poster_url, backdrop_url, and description in PostgreSQL.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
import json
import logging
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional, Tuple

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger('enrich_it_official_posters')

ROME_TZ = ZoneInfo('Europe/Rome')
DEFAULT_DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:Girasole86C@127.0.0.1:5432/programmitv')

# ---------------------------------------------------------------------------
# Channel Mappings
# ---------------------------------------------------------------------------

# TivùSat API: https://services.tivulaguida.it/api/epg/channels/{tivu_id}/date/{YYYY-MM-DD}
# Maps TivùSat numeric channel ID -> DB canonical channel slug
TIVUSAT_CHANNEL_MAP: Dict[int, str] = {
    # Rai
    42: 'rai-1',
    43: 'rai-2',
    44: 'rai-3',
    89: 'rai-4',
    120: 'rai-5',
    106: 'rai-movie',
    107: 'rai-premium',
    88: 'rai-sport',
    132: 'rai-storia',
    131: 'rai-news-24',
    133: 'rai-gulp',
    134: 'rai-yoyo',
    # Mediaset
    155: 'rete-4',
    145: 'canale-5',
    148: 'italia-1',
    249: '20',
    11: 'iris',
    18: 'la-5',
    273: 'cine34',
    253: 'focus',
    25: 'top-crime',
    24: 'mediaset-extra',
    23: 'italia-2',
    292: 'twenty-seven',
    118: 'tgcom24',
    # Discovery & Warner
    32: 'dmax',
    19: 'real-time',
    263: 'food-network',
    259: 'giallo',
    296: 'warner-tv',
    67: 'k2',
    68: 'frisbee',
    # Other National Networks
    149: 'la7',
    108: 'la7d',
    279: 'tv8',
    140: 'nove',
    280: 'cielo',
    16: 'tv2000',
    29: 'boing',
    84: 'cartoonito',
    141: 'super',
    289: 'horse-tv',
    288: 'trm-h24'
}

# Sky Italia DTH API: https://apid.sky.it/gtv/v1/events?from=...&to=...&channels={sky_id}
# Maps Sky numeric channel ID -> DB canonical channel slug
SKY_CHANNEL_MAP: Dict[int, str] = {
    9115: 'sky-uno',
    9095: 'sky-atlantic',
    11244: 'sky-serie',
    11246: 'sky-investigation',
    8336: 'sky-crime',
    11239: 'sky-documentaries',
    11242: 'sky-nature',
    8473: 'sky-arte',
    11437: 'sky-classica',
    # Sky Sport
    9094: 'sky-sport-24',
    9097: 'sky-sport-uno',
    9113: 'sky-sport-calcio',
    11237: 'sky-sport-tennis',
    9093: 'sky-sport-arena',
    9116: 'sky-sport-basket',
    9103: 'sky-sport-max',
    9096: 'sky-sport-f1',
    9102: 'sky-sport-motogp',
    10254: 'sky-sport-golf',
    6000: 'supertennis',
    11402: 'dazn-1',
    11401: 'dazn-2',
    # Sky Cinema
    9044: 'sky-cinema-uno',
    9034: 'sky-cinema-due',
    9047: 'sky-cinema-collection',
    9042: 'sky-cinema-family',
    9050: 'sky-cinema-action',
    10515: 'sky-cinema-suspense',
    9039: 'sky-cinema-comedy',
    9055: 'sky-cinema-romance',
    10518: 'sky-cinema-drama',
    # Kids & Entertainment
    9693: 'cartoon-network',
    472: 'boomerang',
    318: 'comedy-central',
    11055: 'gambero-rosso'
}

DISALLOWED_IMG_PATTERNS = [
    r'superguidatv',
    r'share-1200',
    r'dtt_cover',
    r'/channel/',
    r'placeholder',
    r'blank',
    r'default_'
]
DISALLOWED_IMG_REGEX = re.compile('|'.join(DISALLOWED_IMG_PATTERNS), re.IGNORECASE)


def is_valid_official_img(url: Optional[str]) -> bool:
    if not url or not isinstance(url, str):
        return False
    u = url.strip()
    if not u.startswith('http'):
        return False
    if DISALLOWED_IMG_REGEX.search(u):
        return False
    return True


def fetch_json(url: str, timeout: int = 20) -> Optional[Any]:
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            return json.loads(data.decode('utf-8'))
    except Exception as e:
        logger.debug(f"Failed to fetch {url}: {e}")
        return None


# ---------------------------------------------------------------------------
# Database Helpers
# ---------------------------------------------------------------------------

def get_db_connection(db_url: str):
    import psycopg2
    import psycopg2.extras
    conn = psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)
    conn.autocommit = False
    return conn


def clean_contaminated_posters(conn) -> int:
    """Purges all 3rd-party watermarked banners (superguidatv) and placeholder covers."""
    logger.info("Purging legacy 3rd-party banners and broken placeholder covers from database...")
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE programs
            SET
              poster_url = NULL,
              backdrop_url = NULL
            WHERE
              poster_url ILIKE '%superguidatv%'
              OR backdrop_url ILIKE '%superguidatv%'
              OR poster_url ILIKE '%share-1200%'
              OR backdrop_url ILIKE '%share-1200%'
              OR poster_url ILIKE '%dtt_cover%'
              OR backdrop_url ILIKE '%dtt_cover%';
        """)
        purged = cur.rowcount
        conn.commit()
    logger.info(f"Purged {purged} rows containing competitor banners or invalid covers.")
    return purged


# ---------------------------------------------------------------------------
# TivùSat EPG Processor
# ---------------------------------------------------------------------------

def process_tivusat_channel(tivu_id: int, channel_slug: str, date_str: str) -> List[Dict[str, Any]]:
    url = f"https://services.tivulaguida.it/api/epg/channels/{tivu_id}/date/{date_str}"
    data = fetch_json(url)
    if not data or not isinstance(data, dict):
        return []

    events = data.get('events', [])
    records = []

    for ev in events:
        date_start_raw = ev.get('date_start')
        if not date_start_raw:
            continue

        try:
            # Format: '17-11-2026 06:30'
            dt_local = datetime.strptime(date_start_raw, '%d-%m-%Y %H:%M').replace(tzinfo=ROME_TZ)
        except ValueError:
            continue

        prog = ev.get('program', {})
        title = (prog.get('title') or '').strip()
        description = (prog.get('description') or '').strip() or None

        poster_candidate = prog.get('url_poster')
        if not is_valid_official_img(poster_candidate):
            # Try images array
            poster_candidate = None
            for img in ev.get('images', []):
                u = img.get('url')
                if is_valid_official_img(u):
                    poster_candidate = u
                    break

        if not poster_candidate:
            continue

        # Normalize double slash in TivùSat urls: http://services.tivulaguida.it//uploads -> https://services.tivulaguida.it/uploads
        poster_url = poster_candidate.replace('http://', 'https://').replace('.it//', '.it/')

        # For RaiPlay posters, create 1280x backdrop version
        backdrop_url = poster_url
        if 'raiplay.it/resizegd/' in poster_url:
            backdrop_url = poster_url.replace('/resizegd/640x-/', '/resizegd/1280x-/')
            poster_url = poster_url.replace('/resizegd/640x-/', '/resizegd/780x-/')

        records.append({
            'channel_id': channel_slug,
            'start_time': dt_local,
            'title': title,
            'description': description,
            'poster_url': poster_url,
            'backdrop_url': backdrop_url,
            'source': 'tivusat'
        })

    return records


# ---------------------------------------------------------------------------
# Sky Italia EPG Processor
# ---------------------------------------------------------------------------

def process_sky_channel(sky_id: int, channel_slug: str, dt_from: datetime, dt_to: datetime) -> List[Dict[str, Any]]:
    iso_from = dt_from.strftime('%Y-%m-%dT00:00:00Z')
    iso_to = dt_to.strftime('%Y-%m-%dT23:59:59Z')
    url = f"https://apid.sky.it/gtv/v1/events?from={iso_from}&to={iso_to}&pageSize=999&pageNum=0&env=DTH&channels={sky_id}"

    data = fetch_json(url)
    if not data or not isinstance(data, dict):
        return []

    events = data.get('events', [])
    records = []

    for ev in events:
        start_raw = ev.get('starttime')
        if not start_raw:
            continue

        try:
            # ISO UTC: '2026-11-17T01:15:00Z'
            dt_utc = datetime.fromisoformat(start_raw.replace('Z', '+00:00'))
        except ValueError:
            continue

        title = (ev.get('epgEventTitle') or ev.get('eventTitle') or '').strip()
        synopsis = (ev.get('eventSynopsis') or '').strip() or None

        content = ev.get('content', {})
        images_map = {item.get('key'): item.get('img', {}).get('url') for item in content.get('imagesMap', []) if item.get('img')}

        bg_path = images_map.get('background') or images_map.get('scene') or images_map.get('scene_key_art')
        cover_path = images_map.get('cover') or images_map.get('cover_clean') or images_map.get('cover_23')

        backdrop_url = f"https://guidatv.sky.it{bg_path}" if bg_path else None
        poster_url = f"https://guidatv.sky.it{cover_path}" if cover_path else (backdrop_url if backdrop_url else None)

        if not poster_url and not backdrop_url:
            continue

        records.append({
            'channel_id': channel_slug,
            'start_time': dt_utc,
            'title': title,
            'description': synopsis,
            'poster_url': poster_url,
            'backdrop_url': backdrop_url or poster_url,
            'source': 'sky'
        })

    return records


def are_titles_similar(t1: Optional[str], t2: Optional[str]) -> bool:
    if not t1 or not t2:
        return True
    def clean(s: str) -> str:
        s = re.sub(r'[\(\[\{].*?[\)\]\}]', '', s)  # Remove brackets
        s = re.sub(r'[^a-zA-Z0-9\s]', '', s.lower())
        return ' '.join(s.split())
    c1, c2 = clean(t1), clean(t2)
    if not c1 or not c2:
        return True
    if c1 in c2 or c2 in c1:
        return True
    w1, w2 = set(c1.split()), set(c2.split())
    stop = {'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'uno', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'del', 'della', 'dei', 'e', 'ed', 'o', 'puntata', 'episodio', 'ep', 's1', 's2'}
    w1_sig = w1 - stop
    w2_sig = w2 - stop
    if w1_sig and w2_sig and (w1_sig & w2_sig):
        return True
    return False


# ---------------------------------------------------------------------------
# Database Batch Enrichment
# ---------------------------------------------------------------------------

def apply_enrichment_records(conn, records: List[Dict[str, Any]]) -> int:
    if not records:
        return 0

    updated_count = 0
    with conn.cursor() as cur:
        for r in records:
            # 1. Match ONLY the closest single program row within a tight window (<= 150s).
            # Avoids cross-matching between consecutive short broadcasts (e.g. Cinque Minuti at 20:30 and Affari Tuoi at 20:35).
            cur.execute("""
                SELECT id, title, start_time
                FROM programs
                WHERE channel_id = %s
                  AND ABS(EXTRACT(EPOCH FROM (start_time - %s))) <= 150
                ORDER BY ABS(EXTRACT(EPOCH FROM (start_time - %s))) ASC
                LIMIT 1;
            """, (
                r['channel_id'],
                r['start_time'],
                r['start_time']
            ))
            match = cur.fetchone()
            if not match:
                continue

            prog_id = match['id']
            db_title = match['title']

            # If time differs by more than 60 seconds, ensure titles are not completely divergent
            time_diff = abs((match['start_time'] - r['start_time']).total_seconds())
            if time_diff > 60 and not are_titles_similar(db_title, r['title']):
                continue

            cur.execute("""
                UPDATE programs
                SET
                  poster_url = %s,
                  backdrop_url = %s,
                  description = CASE
                    WHEN (description IS NULL OR description = '' OR length(description) < 25)
                    THEN COALESCE(%s, description)
                    ELSE description
                  END,
                  image_fetched_at = NOW()
                WHERE id = %s;
            """, (
                r['poster_url'],
                r['backdrop_url'],
                r['description'],
                prog_id
            ))
            updated_count += cur.rowcount

        conn.commit()

    return updated_count


# ---------------------------------------------------------------------------
# Main Orchestrator
# ---------------------------------------------------------------------------

def run_enrichment(db_url: str = DEFAULT_DB_URL, days: int = 2, clean_only: bool = False):
    conn = get_db_connection(db_url)
    clean_contaminated_posters(conn)

    if clean_only:
        conn.close()
        logger.info("Clean-only mode requested. Exiting.")
        return

    now_rome = datetime.now(ROME_TZ)
    dates_to_fetch = [(now_rome + timedelta(days=d)).strftime('%Y-%m-%d') for d in range(days)]
    logger.info(f"Targeting broadcast dates: {dates_to_fetch}")

    all_records: List[Dict[str, Any]] = []

    # 1. Fetch TivùSat channels
    logger.info(f"Fetching official artwork from TivùSat API for {len(TIVUSAT_CHANNEL_MAP)} channels...")
    tivu_tasks = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        for tivu_id, channel_slug in TIVUSAT_CHANNEL_MAP.items():
            for d in dates_to_fetch:
                tivu_tasks.append(executor.submit(process_tivusat_channel, tivu_id, channel_slug, d))

        for future in as_completed(tivu_tasks):
            try:
                res = future.result()
                if res:
                    all_records.extend(res)
            except Exception as e:
                logger.error(f"Error fetching TivùSat channel: {e}")

    logger.info(f"Fetched {len(all_records)} official event records from TivùSat.")

    # 2. Fetch Sky channels
    logger.info(f"Fetching official artwork from Sky Italia API for {len(SKY_CHANNEL_MAP)} channels...")
    sky_start = now_rome - timedelta(hours=6)
    sky_end = now_rome + timedelta(days=days)
    sky_records = []
    sky_tasks = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        for sky_id, channel_slug in SKY_CHANNEL_MAP.items():
            sky_tasks.append(executor.submit(process_sky_channel, sky_id, channel_slug, sky_start, sky_end))

        for future in as_completed(sky_tasks):
            try:
                res = future.result()
                if res:
                    sky_records.extend(res)
            except Exception as e:
                logger.error(f"Error fetching Sky channel: {e}")

    logger.info(f"Fetched {len(sky_records)} official event records from Sky Italia.")
    all_records.extend(sky_records)

    # 3. Apply to database
    logger.info(f"Applying {len(all_records)} broadcaster records to PostgreSQL database...")
    total_updated = apply_enrichment_records(conn, all_records)
    conn.close()

    logger.info(f"Official poster enrichment complete! Updated {total_updated} program rows with high-res artwork.")


def main():
    parser = argparse.ArgumentParser(description="Official TivùSat and Sky HD poster enrichment")
    parser.add_argument("--db-url", default=DEFAULT_DB_URL, help="PostgreSQL connection string")
    parser.add_argument("--days", type=int, default=2, help="Number of days to enrich (default: 2)")
    parser.add_argument("--clean-only", action="store_true", help="Only purge invalid banners/covers")
    args = parser.parse_args()

    run_enrichment(db_url=args.db_url, days=args.days, clean_only=args.clean_only)


if __name__ == '__main__':
    main()
