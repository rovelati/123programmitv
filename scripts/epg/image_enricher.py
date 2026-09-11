#!/usr/bin/env python3
"""Enrich program images in programs using TMDB and TVmaze."""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import time
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from psycopg2 import sql
from dotenv import load_dotenv
from image_store import ImageStore
from pg_adapter import create_postgres_client
from tmdb_client import TMDBClient
from tvmaze_client import TVMazeClient


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_LOG_FILE = SCRIPT_DIR / "enricher.log"
DEFAULT_PUBLIC_DIR = os.getenv("SITEMAP_PUBLIC_DIR", str(SCRIPT_DIR.parent.parent / "public"))
DEFAULT_SITE_URL = os.getenv("SITE_URL", "https://www.intvstasera.it")
LOCAL_PROGRAM_IMAGE_PREFIX = f"{DEFAULT_SITE_URL.rstrip('/')}/images/programs/"
HEAD_CHANNELS = (
    "rai-1",
    "rai-2",
    "rai-3",
    "rete-4",
    "canale-5",
    "italia-1",
    "la7",
    "tv8",
    "nove",
    "rai-premium",
    "iris",
    "twenty-seven",
    "cine34",
    "topcrime",
)


def setup_logging() -> logging.Logger:
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_file = Path(os.getenv("IMAGE_ENRICHER_LOG_FILE", str(DEFAULT_LOG_FILE)))
    log_file.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("image_enricher_123")
    logger.setLevel(getattr(logging, log_level, logging.INFO))
    logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


def normalize_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def normalize_ascii_text(value: str | None) -> str:
    raw = unicodedata.normalize("NFKD", (value or "").strip().lower())
    ascii_only = "".join(ch for ch in raw if not unicodedata.combining(ch))
    ascii_only = re.sub(r"[^a-z0-9]+", " ", ascii_only)
    return " ".join(ascii_only.split())


def strip_episode_markers(title: str) -> str:
    cleaned = title or ""
    patterns = [
        r"\s*[-–:]\s*stagione\s*\d+.*$",
        r"\s*[-–:]\s*stag\.?\s*\d+.*$",
        r"\s*[-–:]\s*season\s*\d+.*$",
        r"\s*[-–:]\s*saison\s*\d+.*$",
        r"\s*[-–:]\s*st\.?\s*\d+.*$",
        r"\s*[-–:]\s*ep\.?\s*\d+.*$",
        r"\s*[-–:]\s*episodio\s*\d+.*$",
        r"\s*[-–:]\s*épisode\s*\d+.*$",
        r"\s+stagione\s*\d+\s*$",
        r"\s+stag\.?\s*\d+\s*$",
        r"\s+st\.?\s*\d+\s*$",
        r"\s+ep\.?\s*\d+\s*$",
        r"\s+episodio\s*\d+\s*$",
        r"\s+épisode\s*\d+\s*$",
        r"\s*\(\s*stagione\s*\d+.*?\)\s*$",
        r"\s*\(\s*stag\.?\s*\d+.*?\)\s*$",
        r"\s*\(\s*saison\s*\d+.*?\)\s*$",
        r"\s*\(\s*st\.?\s*\d+.*?\)\s*$",
    ]
    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip(" -:")


def remove_trailing_numeric_marker(title: str) -> str:
    cleaned = re.sub(r"\s+\d{1,4}$", "", (title or "").strip())
    return cleaned.strip(" -:")


def simplify_repeated_segments(title: str) -> str:
    cleaned = (title or "").strip()
    if ":" in cleaned:
        parts = [part.strip(" -:") for part in cleaned.split(":") if part.strip(" -:")]
        if parts:
            normalized_parts = [normalize_ascii_text(part) for part in parts]
            longest_index = max(range(len(parts)), key=lambda idx: len(normalized_parts[idx]))
            cleaned = parts[longest_index]
    return cleaned.strip(" -:")


def build_search_title_candidates(title: str) -> list[str]:
    base = strip_episode_markers(title)
    candidates: list[str] = []

    def add(value: str | None) -> None:
        cleaned = (value or "").strip(" -:")
        if not cleaned:
            return
        if cleaned not in candidates:
            candidates.append(cleaned)

    add(base)
    add(simplify_repeated_segments(base))
    add(remove_trailing_numeric_marker(base))
    simplified = simplify_repeated_segments(remove_trailing_numeric_marker(base))
    add(simplified)

    collapsed_year = re.sub(r"\b(19|20)\d{2}\b", "", base).strip(" -:")
    add(collapsed_year)
    add(remove_trailing_numeric_marker(collapsed_year))

    return candidates


def is_low_information_title(title: str) -> bool:
    normalized = normalize_ascii_text(strip_episode_markers(title))
    if not normalized:
        return True
    if re.fullmatch(r"(ep|episode|episodio|episodi|puntata|parte|part)\s*\d*", normalized):
        return True
    tokens = [token for token in normalized.split() if len(token) > 2]
    return len(tokens) == 0


def match_token_ratio(query: str, candidate: str | None) -> float:
    query_tokens = {token for token in normalize_ascii_text(query).split() if len(token) > 2}
    candidate_tokens = {token for token in normalize_ascii_text(candidate).split() if len(token) > 2}
    if not query_tokens or not candidate_tokens:
        return 0.0
    return len(query_tokens & candidate_tokens) / len(query_tokens)


def is_reasonable_match(query: str, *candidate_titles: str | None) -> bool:
    normalized_query = normalize_ascii_text(query)
    if not normalized_query:
        return False

    for candidate in candidate_titles:
        normalized_candidate = normalize_ascii_text(candidate)
        if not normalized_candidate:
            continue
        if normalized_query == normalized_candidate:
            return True
        if normalized_query in normalized_candidate or normalized_candidate in normalized_query:
            return True
        if match_token_ratio(query, candidate) >= 0.6:
            return True
    return False


def infer_program_kind(title: str, genre: str | None) -> str:
    if is_low_information_title(title):
        return "skip"

    normalized_title = normalize_text(title)
    normalized_genre = normalize_text(genre)

    if any(
        token in normalized_genre
        for token in (
            "sport",
            "news",
            "notizie",
            "informazione",
            "attualita",
            "attualità",
            "tg",
            "meteo",
            "telegiornale",
        )
    ):
        return "skip"

    if any(token in normalized_genre for token in ("film", "cinema", "movie", "telefilm")):
        return "movie"

    if any(
        token in normalized_genre
        for token in (
            "serie",
            "série",
            "fiction",
            "sitcom",
            "soap",
            "animazione",
            "animation",
            "cartoni",
            "cartoon",
            "telenovela",
        )
    ):
        if re.search(r"(saison|season|stagione|stag\.?|st\.?|episode|episodio|épisode|ep\.?)\s*\d+", normalized_title, re.IGNORECASE):
            return "episode"
        return "series"

    if re.search(r"(saison|season|stagione|stag\.?|st\.?|episode|episodio|épisode|ep\.?)\s*\d+", normalized_title, re.IGNORECASE):
        return "episode"

    return "skip"


def coerce_year(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    raw = str(value).strip()
    if len(raw) >= 4 and raw[:4].isdigit():
        return int(raw[:4])
    return None


def is_local_program_image_url(url: str | None) -> bool:
    if not url:
        return False
    return str(url).startswith(LOCAL_PROGRAM_IMAGE_PREFIX)


@dataclass
class ProgramRow:
    id: str
    title: str
    slug: str | None
    genre: str | None
    description: str | None
    channel_id: str
    start_time: str
    poster_url: str | None
    tmdb_id: int | None
    tvmaze_id: int | None
    production_year: int | None


class ProgramImageEnricher:
    def __init__(self) -> None:
        load_dotenv()
        self.logger = setup_logging()

        self.database_url = os.getenv("DATABASE_URL")
        self.programs_table = os.getenv("EPG_PROGRAMS_TABLE", "programs")
        self.batch_size = int(os.getenv("IMAGE_ENRICHER_BATCH_SIZE", "100"))
        self.request_sleep = float(os.getenv("SLEEP_BETWEEN_REQUESTS", "0.25"))
        self.timeout = int(os.getenv("IMAGE_ENRICHER_TIMEOUT", "20"))
        self.image_base_path = os.getenv("IMAGE_BASE_PATH", f"{DEFAULT_PUBLIC_DIR.rstrip('/')}/images/programs")
        self.image_base_url = os.getenv("IMAGE_BASE_URL", f"{DEFAULT_SITE_URL.rstrip('/')}/images/programs")
        self.image_store_mode = os.getenv("IMAGE_STORE_MODE", "remote").strip().lower()
        if self.image_store_mode not in {"remote", "local"}:
            raise RuntimeError("IMAGE_STORE_MODE must be 'remote' or 'local'")
        self.tmdb_api_key = (os.getenv("TMDB_API_KEY") or "").strip()

        if not self.database_url:
            raise RuntimeError("Missing DATABASE_URL for image enrichment")
        self.logger.info("Using PostgreSQL adapter for image enrichment updates")
        self.db = create_postgres_client(self.database_url)

        self.ensure_schema()

        self.tmdb = None
        if self.tmdb_api_key:
            self.tmdb = TMDBClient(
                api_key=self.tmdb_api_key,
                logger=self.logger,
                timeout=self.timeout,
                sleep_between_requests=self.request_sleep,
            )
        else:
            self.logger.warning("TMDB_API_KEY missing: movie enrichment disabled, TV series will use TVmaze fallback only")

        self.tvmaze = TVMazeClient(
            logger=self.logger,
            timeout=self.timeout,
            sleep_between_requests=self.request_sleep,
        )
        self.image_store = ImageStore(
            base_path=self.image_base_path,
            base_url=self.image_base_url,
            timeout=self.timeout,
            logger=self.logger,
        )
        self.logger.info("Image store mode: %s", self.image_store_mode)
        self.series_cache: dict[str, tuple[str | None, str | None, int | None, int | None, bool]] = {}
        self.reference_rows_cache: list[tuple[str, str | None, int | None, int | None, str]] | None = None

    def ensure_schema(self) -> None:
        if not hasattr(self.db, "cursor"):
            return

        statements = [
            sql.SQL(
                """
                ALTER TABLE {table}
                  ADD COLUMN IF NOT EXISTS image_source VARCHAR(20),
                  ADD COLUMN IF NOT EXISTS image_fetched_at TIMESTAMPTZ,
                  ADD COLUMN IF NOT EXISTS tmdb_id INT,
                  ADD COLUMN IF NOT EXISTS tvmaze_id INT,
                  ADD COLUMN IF NOT EXISTS production_year INT
                """
            ).format(table=sql.Identifier(self.programs_table)),
            sql.SQL("CREATE INDEX IF NOT EXISTS {name} ON {table}(image_fetched_at)").format(
                name=sql.Identifier(f"idx_{self.programs_table}_image_fetched_at"),
                table=sql.Identifier(self.programs_table),
            ),
            sql.SQL("CREATE INDEX IF NOT EXISTS {name} ON {table}(tmdb_id)").format(
                name=sql.Identifier(f"idx_{self.programs_table}_tmdb_id"),
                table=sql.Identifier(self.programs_table),
            ),
            sql.SQL("CREATE INDEX IF NOT EXISTS {name} ON {table}(tvmaze_id)").format(
                name=sql.Identifier(f"idx_{self.programs_table}_tvmaze_id"),
                table=sql.Identifier(self.programs_table),
            ),
        ]
        with self.db.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)

    def fetch_batch(self) -> list[ProgramRow]:
        if hasattr(self.db, "cursor"):
            return self.fetch_priority_batch_postgres()

        now = datetime.now(timezone.utc).isoformat()
        image_filter = "poster_url.is.null,poster_url.eq."
        if self.image_store_mode == "remote":
            image_filter = (
                "and(poster_url.is.null,image_fetched_at.is.null),"
                "and(poster_url.eq.,image_fetched_at.is.null),"
                f"poster_url.like.{LOCAL_PROGRAM_IMAGE_PREFIX}%"
            )
        query = (
            self.db.table(self.programs_table)
            .select("id,title,slug,genre,description,channel_id,start_time,poster_url,tmdb_id,tvmaze_id,production_year")
            .or_(image_filter)
            .gt("end_time", now)
            .order("start_time", desc=False)
            .limit(self.batch_size)
        )
        if self.image_store_mode == "local":
            query = query.is_("image_fetched_at", "null")
        if not self.tmdb_api_key:
            query = query.neq("image_source", "pending_tmdb")
        response = query.execute()
        return self.rows_to_programs(response.data or [])

    def fetch_priority_batch_postgres(self) -> list[ProgramRow]:
        columns = "id,title,slug,genre,description,channel_id,start_time,poster_url,tmdb_id,tvmaze_id,production_year"
        genre_patterns = (
            "%film%",
            "%cinema%",
            "%movie%",
            "%telefilm%",
            "%serie%",
            "%fiction%",
            "%sitcom%",
            "%soap%",
            "%animazione%",
            "%animation%",
            "%cartoni%",
            "%telenovela%",
        )
        query = sql.SQL(
            """
            SELECT {columns}
            FROM {table}
            WHERE (
                ((poster_url IS NULL OR BTRIM(poster_url) = '') AND image_fetched_at IS NULL)
                OR (%s AND poster_url LIKE %s)
              )
              AND (%s OR COALESCE(image_source, '') <> 'pending_tmdb')
              AND end_time > NOW() - INTERVAL '6 hours'
              AND (
                LOWER(COALESCE(genre, '')) LIKE ANY(%s)
                OR LOWER(COALESCE(title, '')) ~ %s
              )
            ORDER BY
              CASE
                WHEN start_time >= DATE_TRUNC('day', NOW()) + INTERVAL '18 hours'
                  AND start_time < DATE_TRUNC('day', NOW()) + INTERVAL '1 day' THEN 0
                WHEN start_time >= NOW() AND start_time < NOW() + INTERVAL '12 hours' THEN 1
                WHEN start_time >= NOW() AND start_time < NOW() + INTERVAL '36 hours' THEN 2
                WHEN start_time < NOW() + INTERVAL '7 days' THEN 3
                ELSE 4
              END,
              CASE WHEN channel_id = ANY(%s) THEN 0 ELSE 1 END,
              CASE
                WHEN LOWER(COALESCE(genre, '')) LIKE ANY(%s) THEN 0
                ELSE 1
              END,
              start_time ASC
            LIMIT {limit}
            """
        ).format(
            columns=sql.SQL(", ").join(sql.Identifier(col.strip()) for col in columns.split(",")),
            table=sql.Identifier(self.programs_table),
            limit=sql.Literal(self.batch_size),
        )
        with self.db.cursor() as cursor:
            cursor.execute(
                query,
                (
                    self.image_store_mode == "remote",
                    f"{LOCAL_PROGRAM_IMAGE_PREFIX}%",
                    bool(self.tmdb_api_key),
                    list(genre_patterns),
                    r"(saison|season|stagione|stag\.?|st\.?|episode|episodio|épisode|ep\.?)\s*\d+",
                    list(HEAD_CHANNELS),
                    ["%film%", "%cinema%", "%movie%", "%telefilm%"],
                ),
            )
            rows = cursor.fetchall()
            names = [desc[0] for desc in cursor.description]
        return self.rows_to_programs([dict(zip(names, row)) for row in rows])

    def rows_to_programs(self, rows: list[dict[str, Any]]) -> list[ProgramRow]:
        return [
            ProgramRow(
                id=str(row["id"]),
                title=str(row.get("title") or ""),
                slug=row.get("slug"),
                genre=row.get("genre"),
                description=row.get("description"),
                channel_id=str(row.get("channel_id") or ""),
                start_time=str(row.get("start_time") or ""),
                poster_url=row.get("poster_url"),
                tmdb_id=row.get("tmdb_id"),
                tvmaze_id=row.get("tvmaze_id"),
                production_year=coerce_year(row.get("production_year")),
            )
            for row in rows
        ]

    def update_program(self, program_id: str, mark_fetched: bool = True, **fields: Any) -> None:
        payload = dict(fields)
        if mark_fetched:
            payload["image_fetched_at"] = datetime.now(timezone.utc).isoformat()
        self.db.table(self.programs_table).update(payload).eq("id", program_id).execute()

    def series_cache_key(self, program: ProgramRow) -> str:
        return normalize_text(build_search_title_candidates(program.title)[0])

    def resolve_series_reference(self, search_candidates: list[str]) -> tuple[str | None, str | None, int | None, int | None] | None:
        if not hasattr(self.db, "cursor"):
            return None

        if self.reference_rows_cache is None:
            query = sql.SQL(
                """
                SELECT poster_url, image_source, tmdb_id, tvmaze_id, title
                FROM {table}
                WHERE poster_url IS NOT NULL
                  AND BTRIM(poster_url) <> ''
                  AND end_time > NOW() - INTERVAL '30 days'
                ORDER BY image_fetched_at DESC NULLS LAST, start_time DESC
                LIMIT 500
                """
            ).format(table=sql.Identifier(self.programs_table))
            with self.db.cursor() as cursor:
                cursor.execute(query)
                self.reference_rows_cache = cursor.fetchall()

        for poster_url, image_source, tmdb_id, tvmaze_id, title in self.reference_rows_cache:
            if self.image_store_mode == "remote" and is_local_program_image_url(poster_url):
                continue
            for candidate in search_candidates:
                if is_reasonable_match(candidate, title):
                    return poster_url, image_source, tmdb_id, tvmaze_id
        return None

    def store_resolved_image(self, source: str, identifier: str | int, source_url: str) -> str:
        if self.image_store_mode == "local":
            return self.image_store.save_from_remote(source, identifier, source_url)
        return source_url

    def localize_existing_poster(self, program: ProgramRow) -> str | None:
        if self.image_store_mode != "local":
            return None
        if not program.poster_url or is_local_program_image_url(program.poster_url):
            return None
        if not str(program.poster_url).startswith(("http://", "https://")):
            return None

        return self.image_store.save_from_remote("feed", program.id, program.poster_url)

    def resolve_image(self, program: ProgramRow) -> tuple[str | None, str | None, int | None, int | None, bool]:
        kind = infer_program_kind(program.title, program.genre)
        if kind == "skip":
            return None, "skip", None, None, True

        search_candidates = build_search_title_candidates(program.title) if kind in ("series", "episode") else [program.title]
        search_title = search_candidates[0]
        if kind in ("series", "episode"):
            cache_key = self.series_cache_key(program)
            if cache_key in self.series_cache:
                return self.series_cache[cache_key]

        image_url: str | None = None
        image_source: str | None = None
        tmdb_id: int | None = None
        tvmaze_id: int | None = None
        exhausted_sources = True

        if kind in ("series", "episode"):
            referenced = self.resolve_series_reference(search_candidates)
            if referenced:
                image_url, image_source, tmdb_id, tvmaze_id = referenced
                result = (image_url, image_source or "db_reference", tmdb_id, tvmaze_id, True)
                self.series_cache[self.series_cache_key(program)] = result
                return result

        if kind == "movie":
            if self.tmdb is None:
                exhausted_sources = False
            else:
                for candidate in search_candidates:
                    tmdb_match = self.tmdb.search_movie(candidate, year=program.production_year)
                    if tmdb_match and is_reasonable_match(candidate, tmdb_match.title, tmdb_match.original_title):
                        image_url = self.store_resolved_image("tmdb", tmdb_match.tmdb_id, tmdb_match.poster_url)
                        image_source = "tmdb"
                        tmdb_id = tmdb_match.tmdb_id
                        break
        else:
            if self.tmdb is not None:
                for candidate in search_candidates:
                    tmdb_match = self.tmdb.search_tv(candidate)
                    if tmdb_match and is_reasonable_match(candidate, tmdb_match.title, tmdb_match.original_title):
                        image_url = self.store_resolved_image("tmdb", tmdb_match.tmdb_id, tmdb_match.poster_url)
                        image_source = "tmdb"
                        tmdb_id = tmdb_match.tmdb_id
                        break
            if image_url is None:
                for candidate in search_candidates:
                    tvmaze_match = self.tvmaze.search_show(candidate)
                    if tvmaze_match and is_reasonable_match(candidate, tvmaze_match.title):
                        image_url = self.store_resolved_image("tvmaze", tvmaze_match.tvmaze_id, tvmaze_match.image_url)
                        image_source = "tvmaze"
                        tvmaze_id = tvmaze_match.tvmaze_id
                        break

        result = (image_url, image_source, tmdb_id, tvmaze_id, exhausted_sources)
        if kind in ("series", "episode"):
            self.series_cache[self.series_cache_key(program)] = result
        return result

    def run(self) -> dict[str, int]:
        batch = self.fetch_batch()
        self.logger.info("Fetched %s programs to enrich from %s", len(batch), self.programs_table)

        summary = {
            "fetched": len(batch),
            "processed": 0,
            "matched": 0,
            "skipped": 0,
            "not_found": 0,
            "pending": 0,
            "failures": 0,
        }

        for program in batch:
            summary["processed"] += 1
            try:
                local_poster_url = self.localize_existing_poster(program)
                if local_poster_url:
                    summary["matched"] += 1
                    self.update_program(
                        program.id,
                        poster_url=local_poster_url,
                        image_source="feed",
                        tmdb_id=program.tmdb_id,
                        tvmaze_id=program.tvmaze_id,
                    )
                    self.logger.info(
                        "[%s/%s] %s -> poster=%s source=feed",
                        summary["processed"],
                        len(batch),
                        program.title,
                        local_poster_url,
                    )
                    time.sleep(self.request_sleep)
                    continue

                image_url, image_source, tmdb_id, tvmaze_id, exhausted_sources = self.resolve_image(program)
                if image_url:
                    summary["matched"] += 1
                    self.update_program(
                        program.id,
                        poster_url=image_url,
                        image_source=image_source,
                        tmdb_id=tmdb_id,
                        tvmaze_id=tvmaze_id,
                    )
                elif image_source == "skip":
                    summary["skipped"] += 1
                    self.update_program(program.id, image_source="skip")
                elif exhausted_sources:
                    summary["not_found"] += 1
                    fields: dict[str, Any] = {"image_source": "not_found"}
                    if is_local_program_image_url(program.poster_url):
                        fields["poster_url"] = None
                    self.update_program(program.id, **fields)
                else:
                    summary["pending"] += 1
                    self.update_program(program.id, mark_fetched=False, image_source="pending_tmdb")

                self.logger.info(
                    "[%s/%s] %s -> poster=%s source=%s",
                    summary["processed"],
                    len(batch),
                    program.title,
                    image_url or "none",
                    image_source or "none",
                )
            except Exception as exc:
                summary["failures"] += 1
                self.logger.exception("Failed enriching %s (%s): %s", program.title, program.id, exc)
                try:
                    self.update_program(program.id, image_source="error")
                except Exception:
                    self.logger.exception("Failed writing failure marker for %s", program.id)
            time.sleep(self.request_sleep)

        return summary


def main() -> int:
    enricher = ProgramImageEnricher()
    max_rounds = int(os.getenv("IMAGE_ENRICHER_MAX_ROUNDS", "25"))
    aggregated = {
        "rounds": 0,
        "fetched": 0,
        "processed": 0,
        "matched": 0,
        "skipped": 0,
        "not_found": 0,
        "pending": 0,
        "failures": 0,
    }
    try:
        for round_num in range(1, max_rounds + 1):
            summary = enricher.run()
            aggregated["rounds"] = round_num
            for key in ("fetched", "processed", "matched", "skipped", "not_found", "pending", "failures"):
                aggregated[key] += int(summary.get(key, 0))
            if int(summary.get("fetched", 0)) == 0:
                break
        print(json.dumps(aggregated, ensure_ascii=False))
        return 0
    finally:
        close_method = getattr(enricher.db, "close", None)
        if callable(close_method):
            close_method()


if __name__ == "__main__":
    raise SystemExit(main())
