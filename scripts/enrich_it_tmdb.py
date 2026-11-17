#!/usr/bin/env python3
"""
enrich_it_tmdb.py — intvstasera.it / 123programmitv
Automated TMDb enrichment for Italian TV programmes (films, TV series, documentaries).
Extracts 16:9 backdrops, high-res posters, and IMDb/TMDb ratings in Italian (it-IT).

Guarantees:
1. Strict service broadcast filter: Weather (Meteo), News bulletins (TG1, TG2, TG3, TG4, TG5, Studio Aperto, TG La7),
   Lotto, Shopping, and live sports are NEVER matched against fictional movies or anime.
2. Cleans up any legacy incorrect posters/ratings in PostgreSQL for service broadcasts.
3. Enriches programs for today and tomorrow with high-definition posters, backdrops, and ratings.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger('enrich_it_tmdb')

TMDB_API_KEY = os.getenv('TMDB_API_KEY', 'f2a66cd75043fcfb7688948deb323d0e')
TMDB_BASE = 'https://api.themoviedb.org/3'
DEFAULT_DB_URL = 'postgresql://postgres:Girasole86C@127.0.0.1:5432/programmitv'

# Regular expressions for news, weather, and service broadcasts that MUST NOT match films/anime
SERVICE_BROADCAST_PATTERNS = [
    r'^m[eé]t[eé]o',
    r'previsioni\s*(del\s*tempo)?',
    r'che\s*tempo\s*fa',
    r'^tg[1-5]($|\s|:)',
    r'^tg\s*[1-5]\b',
    r'^tgr\b',
    r'^studio\s*aperto',
    r'^telegiornale',
    r'^tg\s*la7',
    r'^tgla7',
    r'^sky\s*tg24',
    r'^notiziario',
    r'^giornale\s*radio',
    r'^lotto',
    r'^superenalotto',
    r'^estrazioni',
    r'^televendit',
    r'^shopping',
    r'^oroscopo',
    r'^diretta\s*sport',
    r'^calcio',
    r'^serie\s*a',
    r'^motogp',
    r'^formula\s*1',
    r'^ciclismo'
]
SERVICE_REGEXES = [re.compile(p, re.IGNORECASE) for p in SERVICE_BROADCAST_PATTERNS]


def is_low_information_title(title: str) -> bool:
    """Returns True if the title contains no meaningful program name (e.g. 'Ep. 2', '1a parte', digits)."""
    t = (title or '').lower().strip()
    if not t or len(t) <= 2 or t.isdigit():
        return True
    if re.fullmatch(r'(ep|ep\.|episode|episodio|episodi|puntata|parte|part)\s*\d*', t):
        return True
    if re.fullmatch(r'\d+[\^°a-zA-Z]*\s*(parte|tempo|episodio|puntata|part)', t):
        return True
    return False


def is_service_broadcast(title: str, genre: Optional[str] = None) -> bool:
    """Returns True if the program is news, weather, shopping, lotto, or sports."""
    if is_low_information_title(title):
        return True

    t = (title or '').strip().lower()
    g = (genre or '').strip().lower()

    if any(p.search(t) for p in SERVICE_REGEXES):
        return True

    if any(k in g for k in ('notizie', 'news', 'telegiornale', 'meteo', 'attualita', 'attualità', 'informazione', 'shopping', 'lotto', 'sport', 'sports', 'calcio', 'tennis', 'basket')):
        return True

    if any(k in t for k in ('uefa', 'champions league', 'europa league', 'atp', 'wta', 'diretta', 'serie a', 'motogp', 'formula 1')):
        return True

    return False


def extract_year(title: str) -> Optional[int]:
    """Extract 4-digit release year from title if present, e.g. (2024)."""
    m = re.search(r'\((\d{4})\)', title or '')
    return int(m.group(1)) if m else None


def clean_title(title: str) -> str:
    """Normalize program title for clean TMDb query matching."""
    t = title or ''
    # Strip brackets & parentheses: (2024), [HD], etc.
    t = re.sub(r'\(.*?\)', '', t)
    t = re.sub(r'\[.*?\]', '', t)
    # Strip season & episode patterns
    t = re.sub(r'\s*-\s*stagione\s*\d+.*', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*-\s*episodio\s*\d+.*', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*-\s*s\d+.*', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*-\s*ep\s*\d+.*', '', t, flags=re.IGNORECASE)
    t = re.sub(r'\s*-\s*parte\s*\d+.*', '', t, flags=re.IGNORECASE)
    # Strip broadcast markers
    t = re.sub(r'\s*\b(hd|uhd|4k|1a\s*tv|prima\s*tv|live|diretta|replica)\b.*', '', t, flags=re.IGNORECASE)
    # Normalize colons
    t = re.sub(r':\s*.*$', '', t)
    return t.strip(' -:.,"')


def is_title_match(query_title: str, res: Dict[str, Any]) -> bool:
    """Verify that the TMDb candidate actually matches the queried program title."""
    qt = query_title.lower().strip()
    clean_q = re.sub(r'[^a-z0-9]', '', qt)
    if not clean_q or len(clean_q) < 2:
        return False

    candidates: List[str] = []
    for field in ['title', 'name', 'original_title', 'original_name']:
        val = res.get(field)
        if val:
            candidates.append(val.lower().strip())

    for cand in candidates:
        clean_cand = re.sub(r'[^a-z0-9]', '', cand)
        if clean_cand == clean_q:
            return True
        if len(clean_q) <= 4:
            continue
        if clean_cand.startswith(clean_q) or clean_q.startswith(clean_cand):
            return True

    return False


def query_tmdb(title: str, year: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """Query TMDb API with language=it-IT."""
    cleaned = clean_title(title)
    if not cleaned or len(cleaned) < 2 or cleaned.isdigit():
        return None

    if year is None:
        year = extract_year(title)

    def _fetch(search_url: str) -> Optional[Dict[str, Any]]:
        req = urllib.request.Request(search_url, headers={'User-Agent': 'intvstasera-enrichment/1.0'})
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                results = data.get('results', [])
                for r in results:
                    media_type = r.get('media_type')
                    if media_type not in ('movie', 'tv'):
                        continue
                    if is_title_match(cleaned, r):
                        return r
        except Exception as e:
            logger.debug(f"TMDb query error for {title}: {e}")
        return None

    q = urllib.parse.quote(cleaned)
    # 1. Try with year if present
    if year:
        url_with_year = f"{TMDB_BASE}/search/multi?api_key={TMDB_API_KEY}&query={q}&year={year}&language=it-IT&include_adult=false"
        hit = _fetch(url_with_year)
        if hit:
            return hit

    # 2. Try clean title without year
    url_base = f"{TMDB_BASE}/search/multi?api_key={TMDB_API_KEY}&query={q}&language=it-IT&include_adult=false"
    hit = _fetch(url_base)
    if hit:
        return hit

    # 3. Fallback: if title contains ' - ', try querying the primary title part
    if ' - ' in cleaned:
        primary_part = cleaned.split(' - ')[0].strip()
        if len(primary_part) >= 3:
            q_prim = urllib.parse.quote(primary_part)
            url_prim = f"{TMDB_BASE}/search/multi?api_key={TMDB_API_KEY}&query={q_prim}&language=it-IT&include_adult=false"
            if year:
                url_prim += f"&year={year}"
            hit = _fetch(url_prim)
            if hit:
                return hit

    return None


def get_db_connection(db_url: str):
    import psycopg2
    from psycopg2.extras import RealDictCursor
    return psycopg2.connect(db_url, cursor_factory=RealDictCursor)


def sanitize_legacy_posters(conn):
    """Clear out any bogus movie/anime posters for news, weather and sports programs in PostgreSQL."""
    logger.info("Sanitizing legacy service & sports broadcast posters (TG, Meteo, Sport) in database...")
    with conn.cursor() as cur:
        cur.execute(r"""
            UPDATE programs
            SET poster_url = NULL, backdrop_url = NULL, rating = NULL, tmdb_id = NULL
            WHERE (
                title ILIKE '%tg1%' OR title ILIKE '%tg2%' OR title ILIKE '%tg3%'
                OR title ILIKE '%tg4%' OR title ILIKE '%tg5%' OR title ILIKE '%studio aperto%'
                OR title ILIKE '%tg la7%' OR title ILIKE '%tgla7%' OR title ILIKE '%telegiornale%'
                OR title ILIKE '%meteo%'
                OR genre ILIKE '%sport%' OR genre ILIKE '%sports%'
                OR title ILIKE '%uefa%' OR title ILIKE '%atp%' OR title ILIKE '%wta%'
                OR title ILIKE '%danimarca%norvegia%'
                OR title ~* '^(ep|ep\.|episode|episodio|puntata|parte)\s*\d*$'
                OR title ~* '^\d+[\^°a-z]*\s*(parte|tempo|episodio|puntata|part)'
            )
            AND (poster_url ILIKE '%tmdb%' OR backdrop_url ILIKE '%tmdb%');
        """)
        cleared = cur.rowcount
        conn.commit()
        logger.info(f"Cleared bogus TMDb data for {cleared} service/sport broadcast rows.")


def enrich_programs(db_url: str = DEFAULT_DB_URL, limit: int = 600):
    conn = get_db_connection(db_url)
    sanitize_legacy_posters(conn)

    logger.info("Fetching distinct program titles needing enrichment...")
    with conn.cursor() as cur:
        # Prioritize films, prime-time and upcoming programs whose backdrop, poster, or description is missing
        cur.execute("""
            SELECT DISTINCT ON (title) id, title, genre, poster_url, backdrop_url, rating, description
            FROM programs
            WHERE date >= CURRENT_DATE - INTERVAL '1 day'
              AND date <= CURRENT_DATE + INTERVAL '2 days'
              AND (
                (poster_url IS NULL OR poster_url = '')
                OR (backdrop_url IS NULL OR backdrop_url = '')
                OR (description IS NULL OR description = '' OR length(description) < 25)
                OR rating IS NULL
              )
            ORDER BY
              title,
              CASE WHEN (genre ILIKE '%%film%%' OR genre ILIKE '%%cinema%%') THEN 0 ELSE 1 END,
              CASE WHEN start_time >= CURRENT_DATE + TIME '20:00' THEN 0 ELSE 1 END,
              start_time ASC
            LIMIT %s;
        """, (limit,))
        rows = cur.fetchall()

    logger.info(f"Found {len(rows)} distinct program titles to evaluate for TMDb enrichment.")

    matched_count = 0
    skipped_count = 0
    total_rows_updated = 0

    title_cache: Dict[str, Optional[Dict[str, Any]]] = {}

    for idx, row in enumerate(rows, 1):
        title = row['title']
        genre = row.get('genre')

        if is_service_broadcast(title, genre):
            # Mark all occurrences as evaluated so we don't query again
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE programs
                    SET image_fetched_at = NOW()
                    WHERE title = %s AND date >= CURRENT_DATE - INTERVAL '1 day';
                """, (title,))
                conn.commit()
            skipped_count += 1
            continue

        if title not in title_cache:
            title_cache[title] = query_tmdb(title)
            # Rate-limiting pause to respect TMDb guidelines
            time.sleep(0.06)

        res = title_cache[title]
        if res:
            poster_path = res.get('poster_path')
            backdrop_path = res.get('backdrop_path')
            vote_avg = res.get('vote_average')
            vote_count = res.get('vote_count', 0)
            tmdb_id = res.get('id')
            overview = (res.get('overview') or '').strip() or None

            poster_url = f"https://image.tmdb.org/t/p/w780{poster_path}" if poster_path else None
            backdrop_url = f"https://image.tmdb.org/t/p/w1280{backdrop_path}" if backdrop_path else (poster_url if poster_url else None)
            rating_str = str(round(vote_avg, 1)) if (vote_avg and vote_count >= 5) else None

            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE programs
                    SET
                      poster_url = COALESCE(poster_url, %s),
                      backdrop_url = COALESCE(%s, backdrop_url),
                      rating = COALESCE(%s, rating),
                      tmdb_id = COALESCE(%s, tmdb_id),
                      description = CASE 
                        WHEN (description IS NULL OR description = '' OR length(description) < 25) 
                        THEN COALESCE(%s, description) 
                        ELSE description 
                      END,
                      image_fetched_at = NOW()
                    WHERE title = %s AND date >= CURRENT_DATE - INTERVAL '1 day';
                """, (poster_url, backdrop_url, rating_str, tmdb_id, overview, title))
                updated = cur.rowcount
                conn.commit()

            matched_count += 1
            total_rows_updated += updated
            desc_info = f", desc: {len(overview)} chars" if overview else ""
            logger.info(f"[{idx}/{len(rows)}] ENRICHED ({updated} rows): '{title}' -> TMDb #{tmdb_id} (rating: {rating_str}, backdrop: {bool(backdrop_url)}{desc_info})")
        else:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE programs
                    SET image_fetched_at = NOW()
                    WHERE title = %s AND date >= CURRENT_DATE - INTERVAL '1 day';
                """, (title,))
                conn.commit()
            skipped_count += 1

    conn.close()
    logger.info(f"Enrichment cycle finished: {matched_count} titles enriched ({total_rows_updated} total program rows updated), {skipped_count} skipped/unmatched.")


def main():
    parser = argparse.ArgumentParser(description="TMDb enrichment for Italian TV programmes")
    parser.add_argument("--db-url", default=os.getenv("DATABASE_URL", DEFAULT_DB_URL), help="PostgreSQL connection URL")
    parser.add_argument("--limit", type=int, default=500, help="Max programs to enrich per run")
    args = parser.parse_args()

    enrich_programs(db_url=args.db_url, limit=args.limit)


if __name__ == '__main__':
    main()
