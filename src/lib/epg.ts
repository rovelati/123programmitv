/**
 * EPG data fetching — SERVER-ONLY.
 * Legge da Postgres locale (DATABASE_URL). Mai esposta al browser.
 * Chiamata esclusivamente da getStaticPaths() o endpoint server-side di Astro.
 */
import { Pool } from 'pg';
import { getChannelLogo } from '../utils/channelLogos';
import { resolveChannelNumber } from '../utils/channelNumbers';
import { resolveProgramPoster } from '../utils/programImages';
import type { Channel, Program } from '../types';

let pgPool: Pool | null = null;

function getDatabaseUrl(): string {
  const databaseUrl = import.meta.env.DATABASE_URL as string | undefined;
  if (!databaseUrl?.trim()) {
    throw new Error('Missing DATABASE_URL env var (Postgres locale su Contabo VPS)');
  }
  return databaseUrl.trim();
}

function getPgPool(): Pool {
  if (!pgPool) {
    const databaseUrl = getDatabaseUrl();
    const local =
      databaseUrl.includes('127.0.0.1') ||
      databaseUrl.includes('localhost') ||
      databaseUrl.includes('@postgres:');
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: local ? false : { rejectUnauthorized: false },
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

/** Risolve le poster_url relative in URL assoluti. */
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
      if (
        (host === '123programmitv.it' || host === 'intvstasera.it')
        && parsed.pathname.startsWith('/images/programs/')
      ) {
        return parsed.pathname;
      }
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
  const cleanedTitle = cleanProgramTitle(raw.title);
  const initialPoster = resolvePosterUrl(raw.poster_url);
  const finalPoster = resolveProgramPoster(initialPoster, cleanedTitle, raw.genre, raw.description);

  return {
    id: String(raw.id),
    title: cleanedTitle,
    startTime,
    endTime,
    date,
    category: raw.genre ?? '',
    description: raw.description ?? '',
    slug: raw.slug ?? undefined,
    poster_url: finalPoster,
    indexable: raw.indexable ?? false,
    channel_id: raw.channel_id,
  };
}

/**
 * Fetch ALL programs for a given date (Europe/Rome YYYY-MM-DD).
 * Paginates in chunks of 1000. Optionally filtered by channelId.
 */
export async function fetchProgramsForDate(date: string, channelId?: string): Promise<Program[]> {
  const pool = getPgPool();
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

/**
 * Fetch a single program by channel_id + slug (SSR on-demand per schede).
 */
export async function fetchProgramBySlug(channelId: string, slug: string): Promise<Program | null> {
  const pool = getPgPool();
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

/**
 * Fetch film indicizzabili aggiornati nelle ultime N ore.
 */
export async function fetchIndexableFilms(sinceHours = 24): Promise<{ channel_id: string; slug: string }[]> {
  const pool = getPgPool();
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
