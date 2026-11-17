#!/usr/bin/env python3
"""
enrich_films_today.py — Rapid TMDb enrichment specifically for all films broadcasting today and tomorrow.
Fetches high-res 16:9 backdrops, posters, ratings, and full Italian descriptions.
"""
import os
import re
import json
import time
import urllib.parse
import urllib.request
import logging
import psycopg2
from psycopg2.extras import RealDictCursor

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', datefmt='%H:%M:%S')
logger = logging.getLogger('enrich_films')

TMDB_API_KEY = os.getenv('TMDB_API_KEY', 'f2a66cd75043fcfb7688948deb323d0e')
TMDB_BASE = 'https://api.themoviedb.org/3'
DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:Girasole86C@127.0.0.1:5432/programmitv')


def extract_year(title: str):
    m = re.search(r'\((\d{4})\)', title or '')
    return int(m.group(1)) if m else None


def clean_title(title: str) -> str:
    t = title or ''
    t = re.sub(r'\(.*?\)', '', t)
    t = re.sub(r'\[.*?\]', '', t)
    t = re.sub(r'\s*\b(hd|uhd|4k|1a\s*tv|prima\s*tv|live|diretta|replica)\b.*', '', t, flags=re.IGNORECASE)
    t = re.sub(r':\s*.*$', '', t)
    return t.strip(' -:.,"')


def is_title_match(query_title: str, res: dict) -> bool:
    qt = query_title.lower().strip()
    clean_q = re.sub(r'[^a-z0-9]', '', qt)
    if not clean_q or len(clean_q) < 2:
        return False

    candidates = []
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


def query_tmdb(title: str):
    cleaned = clean_title(title)
    if not cleaned or len(cleaned) < 2:
        return None

    year = extract_year(title)

    def _fetch(url: str):
        req = urllib.request.Request(url, headers={'User-Agent': 'intvstasera-film/1.0'})
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                results = data.get('results', [])
                for r in results:
                    media_type = r.get('media_type')
                    if media_type not in ('movie', 'tv'):
                        continue
                    if is_title_match(cleaned, r):
                        return r
        except Exception as e:
            logger.debug(f"Error querying TMDb for {title}: {e}")
        return None

    q = urllib.parse.quote(cleaned)
    if year:
        hit = _fetch(f"{TMDB_BASE}/search/multi?api_key={TMDB_API_KEY}&query={q}&year={year}&language=it-IT&include_adult=false")
        if hit:
            return hit

    hit = _fetch(f"{TMDB_BASE}/search/multi?api_key={TMDB_API_KEY}&query={q}&language=it-IT&include_adult=false")
    if hit:
        return hit

    # If subtitle after dash, try prefix
    if ' - ' in cleaned:
        prim = cleaned.split(' - ')[0].strip()
        if len(prim) >= 3:
            q_prim = urllib.parse.quote(prim)
            u = f"{TMDB_BASE}/search/multi?api_key={TMDB_API_KEY}&query={q_prim}&language=it-IT&include_adult=false"
            if year:
                u += f"&year={year}"
            hit = _fetch(u)
            if hit:
                return hit

    return None


def main():
    conn = psycopg2.connect(DB_URL, cursor_factory=RealDictCursor)
    logger.info("Connected to PostgreSQL, querying films broadcasting today/tomorrow...")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT ON (title) id, title, channel_id, start_time, poster_url, backdrop_url, description, rating
            FROM programs
            WHERE date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '1 day'
              AND (
                genre ILIKE '%film%' OR genre ILIKE '%cinema%' 
                OR title ILIKE '%(19%' OR title ILIKE '%(20%'
                OR channel_id IN ('rai-movie', 'iris', 'cine34', 'twenty-seven', 'cielo')
              )
              AND (
                poster_url IS NULL OR poster_url = ''
                OR backdrop_url IS NULL OR backdrop_url = ''
                OR description IS NULL OR description = '' OR length(description) < 25
              )
            ORDER BY
              title,
              start_time ASC;
        """)
        films = cur.fetchall()

    logger.info(f"Found {len(films)} unique film titles to enrich.")

    updated_count = 0
    cache = {}

    for idx, f in enumerate(films, 1):
        title = f['title']
        if title not in cache:
            cache[title] = query_tmdb(title)
            time.sleep(0.05)

        res = cache[title]
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
                    WHERE title = %s AND date >= CURRENT_DATE;
                """, (poster_url, backdrop_url, rating_str, tmdb_id, overview, title))
                rows = cur.rowcount
                conn.commit()

            updated_count += 1
            logger.info(f"[{idx}/{len(films)}] MATCHED: '{title}' -> TMDb #{tmdb_id} ({rows} rows updated, desc: {len(overview or '')} chars)")
        else:
            logger.info(f"[{idx}/{len(films)}] NO MATCH: '{title}'")

    conn.close()
    logger.info(f"Done! {updated_count}/{len(films)} film titles enriched with posters and descriptions.")


if __name__ == '__main__':
    main()
