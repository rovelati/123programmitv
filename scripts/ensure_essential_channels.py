#!/usr/bin/env python3
"""
ensure_essential_channels.py
Garantisce che canali critici (es. Inter TV) esistano sempre
nel database PostgreSQL locale (channels + channels_config + schedule base in programs),
in modo che Astro possa prerenderizzare le relative route statiche (es. /inter-tv/, /inter-tv/domani/)
senza andare in 404 anche in caso di buco temporaneo nei feed EPG esterni.
"""
import os
import sys
import re
from datetime import datetime, timedelta
import pytz

TIMEZONE = pytz.timezone('Europe/Rome')

def get_db_url() -> str:
    url = os.getenv('DATABASE_URL', '')
    if not url or 'supabase.com' in url or 'dokgijnuiahqeayctoui' in url:
        return 'postgresql://postgres:Girasole86C@127.0.0.1:5432/programmitv'
    return url

def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def get_time_slot(start_time: datetime) -> str:
    rome_time = start_time.astimezone(TIMEZONE)
    hour = rome_time.hour
    minute = rome_time.minute
    if 6 <= hour < 18:
        return 'oggi'
    if (hour > 20 or (hour == 20 and minute >= 30)) and hour < 24:
        return 'stasera'
    return 'stanotte'

ESSENTIAL_CHANNELS = [
    {
        'id': 'inter-tv',
        'name': 'Inter TV',
        'logo_url': '/channel-logos/inter-tv.png',
        'number': 232,
        'category': 'Sport',
        'source': 'inter-tv-official',
        'schedule_slots': [
            ("06:00", "08:30", "Inter Morning & Rassegna Stampa", "Rassegna stampa sportiva, news della prima mattina e collegamenti con Appiano Gentile."),
            ("08:30", "10:00", "Match Review: Analisi Tattica & Highlights", "Analisi approfondita dell'ultimo match di campionato e coppe con statistiche e grafiche."),
            ("10:00", "11:30", "Live Appiano: Allenamento & Diretta Campo", "Diretta dal centro sportivo Suning: riscaldamento, tattica e rifinitura della squadra nerazzurra."),
            ("11:30", "13:00", "100% Inter: I Campioni Nerazzurri", "Interviste, storie e curiosità sui protagonisti dell'Inter di oggi e di ieri."),
            ("13:00", "14:00", "Inter News: Edizione Mezzogiorno", "Tutti gli aggiornamenti in tempo reale su formazione, infermeria e conferenze stampa."),
            ("14:00", "16:00", "Drive Inter: A Tu per Tu con i Giocatori", "Format esclusivo di interviste one-to-one per conoscere da vicino i campioni nerazzurri."),
            ("16:00", "17:30", "Inter Women & Settore Giovanile Primavera", "I risultati, gli highlights e i gol della formazione femminile e dell'Under 19."),
            ("17:30", "19:00", "Amarcord Nerazzurro: Notte di Coppe & Scudetti", "I momenti più iconici, i trionfi in Champions League e le cavalcate scudetto."),
            ("19:00", "20:00", "Inter News: Edizione Sera & Pre-Partita", "L'edizione principale del telegiornale di Inter TV con le ultime da Appiano Gentile e San Siro."),
            ("20:00", "20:30", "Goal Gallery: Tutti i Gol della Stagione", "La raccolta spettacolare di tutte le reti e prodezze balistiche dei nerazzurri."),
            ("20:30", "22:30", "Prime Time: Matchday Special & Studio Nerazzurro", "Approfondimento speciale in prima serata con ospiti, moviola e commenti esclusivi."),
            ("22:30", "23:30", "Inter Night Live: Il Post-Serata", "Tutte le reazioni a caldo, interviste e commenti della serata nerazzurra."),
            ("23:30", "01:00", "Inter Classics: Grandi Notti Europee", "Sintesi integrale delle grandi notti europee dell'Inter."),
            ("01:00", "06:00", "Inter 24/7 Notte: Best of & Highlights", "Rotazione continua delle migliori azioni, parate e gol della storia nerazzurra.")
        ]
    }
]

def ensure_channels():
    try:
        import psycopg2
    except ImportError:
        print("[ensure_essential_channels] psycopg2 non installato, skipping DB seed", file=sys.stderr)
        return

    db_url = get_db_url()
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
    except Exception as e:
        print(f"[ensure_essential_channels] Errore connessione DB: {e}", file=sys.stderr)
        return

    cur = conn.cursor()
    now = datetime.now(TIMEZONE)

    for ch in ESSENTIAL_CHANNELS:
        cid = ch['id']
        name = ch['name']
        logo = ch['logo_url']
        num = ch['number']
        cat = ch['category']
        src = ch['source']

        # 1. Upsert in channels
        cur.execute("""
            INSERT INTO channels (channel_id, name, logo_url, channel_number, category, source)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (channel_id) DO UPDATE SET
                name = EXCLUDED.name,
                logo_url = EXCLUDED.logo_url,
                channel_number = EXCLUDED.channel_number,
                category = EXCLUDED.category;
        """, (cid, name, logo, num, cat, src))

        # 2. Upsert in channels_config
        cur.execute("""
            INSERT INTO channels_config (id, name, visible, position, logo_override)
            VALUES (%s, %s, true, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                visible = true,
                position = EXCLUDED.position;
        """, (cid, name, num, logo))

        # 3. Check program coverage per ieri (-1), oggi (0), domani (+1), +2, +3
        days_to_check = [-1, 0, 1, 2, 3]
        total_inserted = 0

        for offset in days_to_check:
            target_date = (now + timedelta(days=offset)).date()
            cur.execute("""
                SELECT COUNT(*) FROM programs
                WHERE channel_id = %s AND date = %s;
            """, (cid, target_date.isoformat()))
            row = cur.fetchone()
            count = row[0] if row else 0

            if count < 5:
                # Pulisce eventuali placeholder residui prima di inserire
                cur.execute("""
                    DELETE FROM programs
                    WHERE channel_id = %s AND date = %s;
                """, (cid, target_date.isoformat()))

                for sh_str, eh_str, title, desc in ch['schedule_slots']:
                    sh, sm = map(int, sh_str.split(':'))
                    eh, em = map(int, eh_str.split(':'))
                    st = TIMEZONE.localize(datetime(target_date.year, target_date.month, target_date.day, sh, sm))
                    if eh < sh or (eh == 0 and em == 0):
                        et = TIMEZONE.localize(datetime(target_date.year, target_date.month, target_date.day, eh, em) + timedelta(days=1))
                    else:
                        et = TIMEZONE.localize(datetime(target_date.year, target_date.month, target_date.day, eh, em))

                    cur.execute("""
                        INSERT INTO programs (channel_id, title, slug, description, start_time, end_time, date, time_slot, genre, poster_url, indexable)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, false);
                    """, (
                        cid,
                        title,
                        slugify(title),
                        desc,
                        st.isoformat(),
                        et.isoformat(),
                        target_date.isoformat(),
                        get_time_slot(st),
                        'Sport',
                        logo,
                    ))
                    total_inserted += 1

        print(f"[ensure_essential_channels] Canale '{cid}' verificato e garantito ({total_inserted} programmi inseriti)")

    cur.close()
    conn.close()

if __name__ == '__main__':
    ensure_channels()
