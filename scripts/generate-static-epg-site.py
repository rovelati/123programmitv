#!/usr/bin/env python3
"""
Generate a static fallback TV guide directly from XMLTV.

This pipeline intentionally avoids Supabase so the site can keep fresh dates and
hub pages while the database/API project is unavailable.
"""

from __future__ import annotations

import gzip
import html
import os
import re
import shutil
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable
from zoneinfo import ZoneInfo


SITE_URL = os.getenv("SITE_URL", "https://www.intvstasera.it").rstrip("/")
EPG_URL = os.getenv("IPTV_EPG_URL", "https://iptv-epg.org/files/epg-it.xml.gz")
OUT_DIR = Path(os.getenv("STATIC_EPG_OUT_DIR", "static-epg-dist"))
ROME = ZoneInfo("Europe/Rome")

HEAD_CHANNEL_NAMES = [
    "Rai 1",
    "Rai 2",
    "Rai 3",
    "Rete 4",
    "Canale 5",
    "Italia 1",
    "La7",
    "TV8",
    "Nove",
    "20 Mediaset",
    "Rai 4",
    "Iris",
    "Rai 5",
    "Rai Movie",
    "Cielo",
    "27 Twenty Seven",
    "La7d",
    "Real Time",
    "Cine34",
    "Focus",
    "Warner TV",
    "Giallo",
    "Top Crime",
    "Boing",
    "K2",
    "Frisbee",
    "Cartoonito",
    "Italia 2",
    "TGcom24",
    "DMAX",
    "Mediaset Extra",
]

LCN = {
    "Rai 1": 1,
    "Rai 2": 2,
    "Rai 3": 3,
    "Rete 4": 4,
    "Canale 5": 5,
    "Italia 1": 6,
    "La7": 7,
    "TV8": 8,
    "Nove": 9,
    "20 Mediaset": 20,
    "Rai 4": 21,
    "Iris": 22,
    "Rai 5": 23,
    "Rai Movie": 24,
    "Cielo": 26,
    "27 Twenty Seven": 27,
    "La7d": 29,
    "Real Time": 31,
    "Cine34": 34,
    "Focus": 35,
    "Warner TV": 37,
    "Giallo": 38,
    "Top Crime": 39,
    "Boing": 40,
    "K2": 41,
    "Frisbee": 44,
    "Cartoonito": 46,
    "Italia 2": 49,
    "TGcom24": 51,
    "DMAX": 52,
    "Mediaset Extra": 55,
}


@dataclass
class Channel:
    xml_id: str
    name: str
    slug: str
    logo: str
    number: int


@dataclass
class Program:
    channel_id: str
    title: str
    start: datetime
    end: datetime
    category: str
    description: str


def slugify(value: str) -> str:
    value = value.lower().replace("+", " plus ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def clean_program_title(value: str) -> str:
    value = re.sub(r"\s*(?:ᴺᵉʷ|🆕)\s*$", "", value or "")
    value = re.sub(r"\s+\bnew\b\s*$", "", value, flags=re.IGNORECASE)
    return value.strip()


def normalize_name(value: str) -> str:
    value = re.sub(r"^IT\s*-\s*", "", value or "").strip()
    value = value.strip("- ").replace("  ", " ")
    aliases = {
        "Mediaset20": "20 Mediaset",
        "CARTOONITO": "Cartoonito",
        "cielo": "Cielo",
        "TOPcrime": "Top Crime",
        "TOP Crime": "Top Crime",
        "TgCom24": "TGcom24",
        "-frisbee-": "Frisbee",
    }
    return aliases.get(value, value)


def parse_xmltv_time(value: str) -> datetime:
    # XMLTV format: YYYYMMDDHHMMSS +0000
    match = re.match(r"(\d{14})\s*([+-]\d{4})?", value or "")
    if not match:
        raise ValueError(f"Unsupported XMLTV datetime: {value!r}")
    base = datetime.strptime(match.group(1), "%Y%m%d%H%M%S")
    tz = match.group(2) or "+0000"
    sign = 1 if tz[0] == "+" else -1
    offset = sign * (int(tz[1:3]) * 60 + int(tz[3:5]))
    utc = base - timedelta(minutes=offset)
    return utc.replace(tzinfo=ZoneInfo("UTC")).astimezone(ROME)


def fetch_epg(target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(EPG_URL, headers={"User-Agent": "InTVStasera static fallback"})
    with urllib.request.urlopen(request, timeout=180) as response:
        target.write_bytes(response.read())


def open_xml(path: Path):
    return gzip.open(path, "rb")


def load_channels(path: Path) -> dict[str, Channel]:
    channels: dict[str, Channel] = {}
    with open_xml(path) as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag != "channel":
                continue
            xml_id = elem.attrib.get("id", "")
            display = elem.findtext("display-name") or xml_id
            name = normalize_name(display)
            icon = elem.find("icon")
            logo = icon.attrib.get("src", "") if icon is not None else ""
            slug = slugify(name)
            channels[xml_id] = Channel(xml_id, name, slug, logo, LCN.get(name, 999))
            elem.clear()
    return channels


def load_programs(path: Path, channels: dict[str, Channel], start_day: datetime, days: int = 2) -> list[Program]:
    min_dt = start_day.replace(hour=0, minute=0, second=0, microsecond=0)
    max_dt = min_dt + timedelta(days=days)
    programs: list[Program] = []
    with open_xml(path) as handle:
        for _, elem in ET.iterparse(handle, events=("end",)):
            if elem.tag != "programme":
                continue
            channel_id = elem.attrib.get("channel", "")
            if channel_id not in channels:
                elem.clear()
                continue
            try:
                start = parse_xmltv_time(elem.attrib.get("start", ""))
                end = parse_xmltv_time(elem.attrib.get("stop", ""))
            except Exception:
                elem.clear()
                continue
            if end < min_dt or start >= max_dt:
                elem.clear()
                continue
            title = clean_program_title(elem.findtext("title") or "Programma TV")
            category = elem.findtext("category") or ""
            description = elem.findtext("desc") or ""
            programs.append(Program(channel_id, title.strip(), start, end, category.strip(), description.strip()))
            elem.clear()
    return sorted(programs, key=lambda p: (channels[p.channel_id].number, channels[p.channel_id].name, p.start))


def esc(value: str) -> str:
    return html.escape(value or "", quote=True)


def fmt_time(value: datetime) -> str:
    return value.strftime("%H:%M")


def fmt_date(value: datetime) -> str:
    weekdays = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]
    months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
    return f"{weekdays[value.weekday()]} {value.day} {months[value.month - 1]} {value.year}"


def page_path(path: str) -> Path:
    if path == "/":
        return OUT_DIR / "index.html"
    if path.endswith(".xml") or path.endswith(".txt"):
        return OUT_DIR / path.lstrip("/")
    return OUT_DIR / path.strip("/") / "index.html"


def write_page(path: str, title: str, description: str, body: str, canonical: str | None = None) -> None:
    canonical_url = f"{SITE_URL}{canonical or path}"
    html_doc = f"""<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="{esc(canonical_url)}">
  <style>
    body{{font-family:Inter,Arial,sans-serif;margin:0;background:#f8fafc;color:#0f172a}}
    header,main,footer{{max-width:1120px;margin:auto;padding:18px}}
    nav a{{display:inline-block;margin:4px 8px 4px 0;color:#2563eb;text-decoration:none;font-weight:700}}
    .hero{{background:#fff;border-bottom:1px solid #e2e8f0}}
    .card{{background:#fff;border:1px solid #e2e8f0;border-radius:14px;margin:10px 0;padding:14px}}
    .program{{border-top:1px solid #e2e8f0;padding:10px 0}}
    .time{{font-weight:800;color:#334155}}
    .muted{{color:#64748b}}
    .grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}}
    img.logo{{width:42px;height:42px;object-fit:contain;background:white;border-radius:8px;vertical-align:middle;margin-right:10px}}
  </style>
</head>
<body>
  <header>
    <nav aria-label="Navigazione principale">
      <a href="/">Ora</a><a href="/stasera">Stasera</a><a href="/domani">Domani</a>
      <a href="/film-stasera">Film stasera</a><a href="/serie-stasera">Serie TV</a><a href="/sport-stasera">Sport</a>
    </nav>
    <nav aria-label="Canali principali">
      {''.join(f'<a href="/{slugify(name)}">{esc(name)}</a>' for name in HEAD_CHANNEL_NAMES)}
    </nav>
  </header>
  {body}
  <footer>
    <nav><a href="/sitemap-index.xml">Sitemap</a><a href="/robots.txt">Robots</a></nav>
  </footer>
</body>
</html>"""
    target = page_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html_doc, encoding="utf-8")


def programs_for_date(programs: Iterable[Program], date: datetime) -> list[Program]:
    day = date.date()
    return [p for p in programs if p.start.date() == day]


def group_by_channel(programs: Iterable[Program]) -> dict[str, list[Program]]:
    grouped: dict[str, list[Program]] = defaultdict(list)
    for program in programs:
        grouped[program.channel_id].append(program)
    return grouped


def channel_sort(channels: Iterable[Channel]) -> list[Channel]:
    return sorted(channels, key=lambda c: (c.number, c.name))


def program_rows(items: list[Program], limit: int | None = None) -> str:
    rows = []
    for program in items[:limit]:
        rows.append(
            f'<div class="program"><span class="time">{fmt_time(program.start)} – {fmt_time(program.end)}</span> '
            f'<strong>{esc(program.title)}</strong>'
            f'{f" <span class=\"muted\">{esc(program.category)}</span>" if program.category else ""}'
            f'{f"<p>{esc(program.description[:220])}</p>" if program.description else ""}</div>'
        )
    return "".join(rows) or '<p class="muted">Nessun programma disponibile.</p>'


def card_for_channel(channel: Channel, items: list[Program], now: datetime | None = None) -> str:
    display = None
    if now:
        display = next((p for p in items if p.start <= now < p.end), None)
    display = display or (items[0] if items else None)
    logo = f'<img class="logo" src="{esc(channel.logo)}" alt="Logo {esc(channel.name)}" loading="lazy">' if channel.logo else ""
    detail = ""
    if display:
        detail = f'<p><span class="time">{fmt_time(display.start)} – {fmt_time(display.end)}</span><br><strong>{esc(display.title)}</strong></p>'
    return f'<article class="card"><h2><a href="/{channel.slug}">{logo}{esc(channel.name)}</a></h2>{detail}</article>'


def render_listing(path: str, title: str, heading: str, date: datetime, channels: dict[str, Channel], programs: list[Program], mode: str) -> None:
    grouped = group_by_channel(programs)
    now = datetime.now(ROME) if mode == "now" else None
    cards = []
    for channel in channel_sort(channels[cid] for cid in grouped.keys()):
        items = sorted(grouped[channel.xml_id], key=lambda p: p.start)
        cards.append(card_for_channel(channel, items, now=now))
    body = f"""
<section class="hero"><main>
  <p class="muted">Live Now · {len(cards)} canali</p>
  <h1>{esc(heading)}</h1>
  <p>{esc(fmt_date(date))} · ore {datetime.now(ROME).strftime('%H:%M')}</p>
  <nav><a href="/stasera">Stasera in TV →</a><a href="/domani">Domani →</a></nav>
</main></section>
<main>
  <h2>In onda e programmi principali</h2>
  <div class="grid">{''.join(cards)}</div>
</main>"""
    write_page(path, title, f"{heading}: guida TV aggiornata con programmi, orari e canali.", body, canonical=path)


def render_channel(channel: Channel, today_items: list[Program], tomorrow_items: list[Program]) -> None:
    body = f"""
<main>
  <h1>Programmi {esc(channel.name)} stasera</h1>
  <p class="muted">Palinsesto di oggi con orari aggiornati.</p>
  <nav><a href="/">Tutti i programmi TV</a><a href="/{channel.slug}/domani">{esc(channel.name)} domani</a><a href="/film-stasera">Film stasera</a></nav>
  <section class="card">{program_rows(today_items)}</section>
  <aside class="card"><h2>Altri canali</h2><nav>{''.join(f'<a href="/{slugify(name)}">Programmi {esc(name)} stasera</a>' for name in HEAD_CHANNEL_NAMES if slugify(name) != channel.slug)}</nav></aside>
</main>"""
    write_page(f"/{channel.slug}", f"Programmi {channel.name} Stasera | Guida TV", f"Programmi {channel.name} stasera: palinsesto completo con orari.", body, canonical=f"/{channel.slug}")

    body_tomorrow = f"""
<main>
  <h1>Programmi {esc(channel.name)} domani</h1>
  <p class="muted">Palinsesto TV di domani.</p>
  <nav><a href="/{channel.slug}">{esc(channel.name)} stasera</a><a href="/domani">Tutti i canali domani</a></nav>
  <section class="card">{program_rows(tomorrow_items)}</section>
</main>"""
    write_page(f"/{channel.slug}/domani", f"Programmi {channel.name} Domani | Guida TV", f"Programmi {channel.name} domani: palinsesto e orari.", body_tomorrow, canonical=f"/{channel.slug}/domani")


def render_category(path: str, title: str, heading: str, programs: list[Program], channels: dict[str, Channel], predicate) -> None:
    items = [p for p in programs if predicate(p)]
    grouped = group_by_channel(items)
    parts = []
    for channel in channel_sort(channels[cid] for cid in grouped.keys()):
        parts.append(f'<section class="card"><h2><a href="/{channel.slug}">{esc(channel.name)}</a></h2>{program_rows(sorted(grouped[channel.xml_id], key=lambda p: p.start), 8)}</section>')
    body = f"<main><h1>{esc(heading)}</h1><p class=\"muted\">{len(items)} programmi trovati.</p>{''.join(parts) or '<p>Nessun programma trovato.</p>'}</main>"
    write_page(path, title, f"{heading}: orari e canali aggiornati.", body, canonical=path)


def write_static_files(urls: list[str]) -> None:
    (OUT_DIR / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n\nSitemap: https://www.intvstasera.it/sitemap-index.xml\n",
        encoding="utf-8",
    )
    (OUT_DIR / "_redirects").write_text(
        "https://123programmitv.it/*      https://www.intvstasera.it/:splat  301\nhttps://www.123programmitv.it/*  https://www.intvstasera.it/:splat  301\nhttps://intvstasera.it/*         https://www.intvstasera.it/:splat  301\n/programmi-tv/:canale /:canale 301\n/programma/* 410\n/programma 410\n/* /404.html 404\n",
        encoding="utf-8",
    )
    (OUT_DIR / "_headers").write_text(
        "/\n  Cache-Control: public, max-age=300, stale-while-revalidate=300\n/*.html\n  Cache-Control: public, max-age=1800, stale-while-revalidate=3600\n/programma/*\n  Cache-Control: public, max-age=86400\n",
        encoding="utf-8",
    )
    sitemap_urls = "\n".join(f"  <url><loc>{SITE_URL}{url}</loc></url>" for url in sorted(set(urls)))
    (OUT_DIR / "sitemap-0.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{sitemap_urls}\n</urlset>', encoding="utf-8")
    (OUT_DIR / "sitemap-index.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>{SITE_URL}/sitemap-0.xml</loc></sitemap></sitemapindex>', encoding="utf-8")
    (OUT_DIR / "404.html").write_text("<!doctype html><title>Pagina non trovata</title><h1>Pagina non trovata</h1><p><a href=\"/\">Torna alla guida TV</a></p>", encoding="utf-8")


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)
    epg_path = OUT_DIR / "_source" / "epg-it.xml.gz"
    fetch_epg(epg_path)
    channels = load_channels(epg_path)
    now = datetime.now(ROME)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    programs = load_programs(epg_path, channels, today, days=2)
    today_programs = programs_for_date(programs, today)
    tomorrow_programs = programs_for_date(programs, tomorrow)

    render_listing("/", "Programmi TV Oggi e Stasera | Guida TV", "Cosa c'è in TV Ora", today, channels, today_programs, "now")
    render_listing("/stasera", "Programmi TV Stasera | Guida TV", "Programmi TV Stasera", today, channels, today_programs, "stasera")
    render_listing("/domani", "Programmi TV Domani | Guida TV", "Programmi TV Domani", tomorrow, channels, tomorrow_programs, "domani")

    today_by_channel = group_by_channel(today_programs)
    tomorrow_by_channel = group_by_channel(tomorrow_programs)
    urls = ["/", "/stasera", "/domani", "/film-stasera", "/serie-stasera", "/sport-stasera"]
    for channel in channel_sort(channels.values()):
        if channel.xml_id not in today_by_channel and channel.xml_id not in tomorrow_by_channel:
            continue
        render_channel(channel, sorted(today_by_channel.get(channel.xml_id, []), key=lambda p: p.start), sorted(tomorrow_by_channel.get(channel.xml_id, []), key=lambda p: p.start))
        urls.extend([f"/{channel.slug}", f"/{channel.slug}/domani"])

    def is_film(p: Program) -> bool:
        text = f"{p.title} {p.category}".lower()
        return any(k in text for k in ["film", "cinema", "movie"])

    def is_serie(p: Program) -> bool:
        text = f"{p.title} {p.category} {p.description}".lower()
        return any(k in text for k in ["serie", "fiction", "telefilm", "sitcom", "episodio", "stagione"])

    def is_sport(p: Program) -> bool:
        text = f"{p.title} {p.category}".lower()
        return any(k in text for k in ["sport", "calcio", "tennis", "basket", "formula 1", "motogp", "pallavolo", "rugby"])

    render_category("/film-stasera", "Film Stasera in TV | Guida TV", "Film stasera in TV", today_programs, channels, is_film)
    render_category("/serie-stasera", "Serie TV Stasera in TV | Guida TV", "Serie TV stasera in TV", today_programs, channels, is_serie)
    render_category("/sport-stasera", "Sport Stasera in TV | Guida TV", "Sport stasera in TV", today_programs, channels, is_sport)
    write_static_files(urls)
    print(f"Generated {len(urls)} URLs in {OUT_DIR}")


if __name__ == "__main__":
    main()
