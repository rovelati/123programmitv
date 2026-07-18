/**
 * EPG data fetching — SERVER-ONLY.
 * Usa SUPABASE_SERVICE_KEY (senza prefisso VITE_): mai esposta al browser.
 * Chiamata esclusivamente da getStaticPaths() o endpoint server-side di Astro.
 */
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import { getChannelLogo } from '../utils/channelLogos';
import { resolveChannelNumber } from '../utils/channelNumbers';
import type { Channel, Program } from '../types';

let pgPool: Pool | null = null;

function getClient() {
  const url = import.meta.env.SUPABASE_URL as string;
  const key = import.meta.env.SUPABASE_SERVICE_KEY as string;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getDatabaseUrl(): string | undefined {
  return import.meta.env.DATABASE_URL as string | undefined;
}

function getPgPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pgPool;
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

interface RawChannel {
  id: number;
  channel_id: string;
  name: string;
  logo_url: string | null;
  channel_number: number | null;
  category: string | null;
  source: string | null;
}

interface RawChannelConfig {
  id: string;
  name: string | null;
  visible: boolean;
  position: number;
  logo_override: string | null;
}

function mapChannel(raw: RawChannel, config?: RawChannelConfig): Channel {
  const visible = config ? config.visible : true;
  const position = config?.position ?? 999;
  const logoOverride = config?.logo_override ?? null;
  const logo = getChannelLogo(raw.channel_id, logoOverride ?? raw.logo_url, raw.name);
  const number = resolveChannelNumber(raw.channel_number, raw.channel_id, raw.name);

  return {
    id: raw.channel_id,
    name: raw.name,
    number,
    logo,
    type: 'Generalista',
    programs: [],
    visible,
    position,
    source: raw.source ?? undefined,
  };
}

export async function fetchChannels(): Promise<Channel[]> {
  const pool = getPgPool();
  if (pool) {
    const { rows } = await pool.query<RawChannel & {
      config_id: string | null;
      config_name: string | null;
      config_visible: boolean | null;
      config_position: number | null;
      logo_override: string | null;
    }>(`
      SELECT
        c.id,
        c.channel_id,
        c.name,
        c.logo_url,
        c.channel_number,
        c.category,
        c.source,
        cc.id AS config_id,
        cc.name AS config_name,
        cc.visible AS config_visible,
        cc.position AS config_position,
        cc.logo_override
      FROM channels c
      LEFT JOIN channels_config cc ON cc.id = c.channel_id
      LIMIT 1000
    `);

    return rows
      .map(ch => mapChannel(ch, ch.config_id ? {
        id: ch.config_id,
        name: ch.config_name,
        visible: ch.config_visible ?? true,
        position: ch.config_position ?? 999,
        logo_override: ch.logo_override,
      } : undefined))
      .filter(ch => ch.visible !== false)
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || a.number - b.number);
  }

  const supabase = getClient();
  const [{ data: channels, error: chErr }, { data: configs }] = await Promise.all([
    supabase.from('channels').select('*').limit(1000),
    supabase.from('channels_config').select('*').limit(1000),
  ]);

  if (chErr) throw chErr;

  const configMap = new Map<string, RawChannelConfig>(
    (configs ?? []).map((c: RawChannelConfig) => [c.id, c])
  );

  return (channels as RawChannel[])
    .map(ch => mapChannel(ch, configMap.get(ch.channel_id)))
    .filter(ch => ch.visible !== false)
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || a.number - b.number);
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

interface RawProgram {
  id: number;
  channel_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  start_time: string | Date;
  end_time: string | Date;
  date: string | Date;
  genre: string | null;
  poster_url: string | null;
  indexable: boolean | null;
}

const SITE_ORIGIN = 'https://www.intvstasera.it';

/** Risolve le poster_url relative in URL assoluti.
 * - /dl/img/... (RaiPlay) → CDN rai.it
 * - host legacy 123programmitv.it → intvstasera.it (SSL/redirect spezza le <img> in browser)
 * - path /images/programs/... → origin del sito
 */
function resolvePosterUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/dl/img/')) return `https://www.rai.it${trimmed}`;
  if (trimmed.startsWith('/images/programs/')) return `${SITE_ORIGIN}${trimmed}`;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.replace(/^www\./, '');
      if (host === '123programmitv.it' || host === 'intvstasera.it') {
        parsed.protocol = 'https:';
        parsed.hostname = 'www.intvstasera.it';
        return parsed.toString();
      }
      return trimmed;
    } catch {
      return null;
    }
  }

  return trimmed;
}

function cleanProgramTitle(title: string): string {
  return title
    .replace(/\s*(?:ᴺᵉʷ|🆕)\s*$/u, '')
    .replace(/\s+\bnew\b\s*$/iu, '')
    .trim();
}

function mapProgram(raw: RawProgram): Program {
  const startTime = raw.start_time instanceof Date ? raw.start_time.toISOString() : raw.start_time;
  const endTime = raw.end_time instanceof Date ? raw.end_time.toISOString() : raw.end_time;
  const date = raw.date instanceof Date ? raw.date.toISOString().slice(0, 10) : raw.date;

  return {
    id: String(raw.id),
    title: cleanProgramTitle(raw.title),
    startTime,
    endTime,
    date,
    category: raw.genre ?? '',
    description: raw.description ?? '',
    slug: raw.slug ?? undefined,
    poster_url: resolvePosterUrl(raw.poster_url),
    indexable: raw.indexable ?? false,
    channel_id: raw.channel_id,
  };
}

/**
 * Fetch ALL programs for a given date (Europe/Rome YYYY-MM-DD).
 * Paginates in chunks of 1000 (Supabase default row cap).
 * Optionally filtered by channelId.
 */
export async function fetchProgramsForDate(date: string, channelId?: string): Promise<Program[]> {
  const pool = getPgPool();
  if (pool) {
    const PAGE = 1000;
    const all: RawProgram[] = [];
    let offset = 0;

    while (true) {
      const params: (string | number)[] = [date, PAGE, offset];
      const channelClause = channelId ? 'AND channel_id = $4' : '';
      if (channelId) params.push(channelId);

      const { rows } = await pool.query<RawProgram>(`
        SELECT
          id,
          channel_id,
          title,
          slug,
          description,
          start_time,
          end_time,
          date,
          genre,
          poster_url,
          indexable
        FROM programs
        WHERE date = $1
        ${channelClause}
        ORDER BY start_time ASC
        LIMIT $2 OFFSET $3
      `, params);

      if (rows.length === 0) break;
      all.push(...rows);
      if (rows.length < PAGE) break;
      offset += PAGE;
    }

    return all.map(mapProgram);
  }

  const supabase = getClient();
  const PAGE = 1000;
  const all: RawProgram[] = [];
  let from = 0;

  while (true) {
    let q = supabase
      .from('programs')
      .select('id, channel_id, title, slug, description, start_time, end_time, date, genre, poster_url, indexable')
      .eq('date', date)
      .order('start_time', { ascending: true })
      .range(from, from + PAGE - 1);

    if (channelId) q = q.eq('channel_id', channelId);

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as RawProgram[]));
    if (data.length < PAGE) break; // ultima pagina
    from += PAGE;
  }

  return all.map(mapProgram);
}

/**
 * Fetch a single program by channel_id + slug (SSR on-demand per schede).
 * Recupera il programma più recente in caso di slug duplicati.
 */
export async function fetchProgramBySlug(channelId: string, slug: string): Promise<Program | null> {
  const pool = getPgPool();
  if (pool) {
    const { rows } = await pool.query<RawProgram>(`
      SELECT
        id,
        channel_id,
        title,
        slug,
        description,
        start_time,
        end_time,
        date,
        genre,
        poster_url,
        indexable
      FROM programs
      WHERE channel_id = $1 AND slug = $2
      ORDER BY start_time DESC
      LIMIT 1
    `, [channelId, slug]);

    return rows[0] ? mapProgram(rows[0]) : null;
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('channel_id', channelId)
    .eq('slug', slug)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapProgram(data as RawProgram);
}

/**
 * Fetch film indicizzabili aggiornati nelle ultime N ore.
 * Usato da notify-indexing.js.
 */
export async function fetchIndexableFilms(sinceHours = 24): Promise<{ channel_id: string; slug: string }[]> {
  const pool = getPgPool();
  if (pool) {
    const since = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();
    const { rows } = await pool.query<{ channel_id: string; slug: string }>(`
      SELECT channel_id, slug
      FROM programs
      WHERE indexable = true
        AND created_at >= $1
        AND slug IS NOT NULL
      LIMIT 200
    `, [since]);
    return rows;
  }

  const supabase = getClient();
  const since = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from('programs')
    .select('channel_id, slug')
    .eq('indexable', true)
    .gte('created_at', since)
    .limit(200);
  return data ?? [];
}
