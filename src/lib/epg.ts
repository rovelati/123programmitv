/**
 * EPG data fetching — SERVER-ONLY.
 * Usa SUPABASE_SERVICE_KEY (senza prefisso VITE_): mai esposta al browser.
 * Chiamata esclusivamente da getStaticPaths() o endpoint server-side di Astro.
 */
import { createClient } from '@supabase/supabase-js';
import { getChannelLogo } from '../utils/channelLogos';
import { resolveChannelNumber } from '../utils/channelNumbers';
import type { Channel, Program } from '../types';

function getClient() {
  const url = import.meta.env.SUPABASE_URL as string;
  const key = import.meta.env.SUPABASE_SERVICE_KEY as string;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
  start_time: string;
  end_time: string;
  date: string;
  genre: string | null;
  poster_url: string | null;
  indexable: boolean | null;
}

/** Risolve le poster_url relative in URL assoluti.
 * Lo scraper RaiPlay salva /dl/img/... senza dominio → risolvono su 123programmitv.it → 404.
 * Prefissiamo con www.rai.it che è il CDN originale di quelle immagini.
 */
function resolvePosterUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;          // già assoluto
  if (url.startsWith('/dl/img/')) return `https://www.rai.it${url}`;  // RAI
  return url;                                      // altri relativi: lasciamo stare
}

function mapProgram(raw: RawProgram): Program {
  return {
    id: String(raw.id),
    title: raw.title,
    startTime: raw.start_time,
    endTime: raw.end_time,
    date: raw.date,
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
