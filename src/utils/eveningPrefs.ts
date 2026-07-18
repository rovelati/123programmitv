import type { Channel, Program } from '../types';
import { HUB_CHANNELS } from './channelSlug';
import { toRomeMinutes } from './timeSlots';

export type EveningGenre = 'film' | 'serie' | 'sport' | 'news' | 'bambini';
export type EveningMood = 'relax' | 'evento' | 'famiglia';

export interface EveningPrefs {
  genres: EveningGenre[];
  channels: string[];
  mood: EveningMood | null;
  skipped: boolean;
  updatedAt: string;
}

export interface SavedProgram {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
  startTime: string;
  endTime: string;
  category: string;
  savedAt: string;
}

export interface RecCandidate {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  description: string;
  poster_url: string | null;
  channelId: string;
  channelName: string;
  channelLogo: string;
  channelNumber: number | null;
}

export const PREFS_KEY = 'intv_evening_prefs_v1';
export const SAVED_KEY = 'intv_evening_saved_v1';
export const ANON_KEY = 'intv_anon_id_v1';

export const GENRE_OPTIONS: Array<{ id: EveningGenre; label: string }> = [
  { id: 'film', label: 'Film' },
  { id: 'serie', label: 'Serie' },
  { id: 'sport', label: 'Sport' },
  { id: 'news', label: 'News' },
  { id: 'bambini', label: 'Bambini' },
];

export const MOOD_OPTIONS: Array<{ id: EveningMood; label: string; hint: string }> = [
  { id: 'relax', label: 'Relax', hint: 'Film e serie' },
  { id: 'evento', label: 'Evento', hint: 'Sport e live' },
  { id: 'famiglia', label: 'Famiglia', hint: 'Per tutti' },
];

export const ONBOARDING_CHANNELS = HUB_CHANNELS.slice(0, 12);

const PRIME_START = 20 * 60 + 30;
const PRIME_END = 23 * 60;
const EVENING_START = 18 * 60;

export function inferGenre(category: string): EveningGenre | null {
  const c = (category || '').toLowerCase();
  if (/film|cinema|movie|telefilm/.test(c)) return 'film';
  if (/serie|fiction|sitcom|soap|telenovela/.test(c)) return 'serie';
  if (/sport/.test(c)) return 'sport';
  if (/tg|news|inform|attual|giornale/.test(c)) return 'news';
  if (/bambin|cartoon|kids|ragazz|animaz|teen/.test(c)) return 'bambini';
  return null;
}

/** Pool di candidati sera (prime + evening) per ranking client-side. */
export function buildEveningCandidates(
  channels: Channel[],
  programs: Program[],
  limit = 120,
): RecCandidate[] {
  const channelMap = new Map(channels.map((ch) => [ch.id, ch]));
  const scored: Array<RecCandidate & { _rank: number }> = [];

  for (const p of programs) {
    const channelId = p.channel_id;
    if (!channelId) continue;
    const ch = channelMap.get(channelId);
    if (!ch) continue;

    const mins = toRomeMinutes(p.startTime);
    if (mins < EVENING_START) continue;

    let rank = 0;
    if (mins >= PRIME_START && mins < PRIME_END) rank += 100;
    else if (mins >= EVENING_START) rank += 40;

    const genre = inferGenre(p.category);
    if (genre === 'film' || genre === 'serie' || genre === 'sport') rank += 20;
    if (p.poster_url) rank += 5;
    if ((p.description || '').length > 80) rank += 3;

    scored.push({
      id: String(p.id),
      title: p.title,
      startTime: p.startTime,
      endTime: p.endTime,
      category: p.category ?? '',
      description: p.description ?? '',
      poster_url: p.poster_url ?? null,
      channelId: ch.id,
      channelName: ch.name,
      channelLogo: ch.logo,
      channelNumber: ch.number ?? null,
      _rank: rank,
    });
  }

  scored.sort((a, b) => b._rank - a._rank || a.startTime.localeCompare(b.startTime));

  // Max 2 titoli per canale nel pool (varietà)
  const perChannel = new Map<string, number>();
  const out: RecCandidate[] = [];
  for (const item of scored) {
    const n = perChannel.get(item.channelId) ?? 0;
    if (n >= 2) continue;
    perChannel.set(item.channelId, n + 1);
    const { _rank: _, ...candidate } = item;
    out.push(candidate);
    if (out.length >= limit) break;
  }
  return out;
}

export function scoreCandidate(
  c: RecCandidate,
  prefs: EveningPrefs | null,
  nowMs = Date.now(),
): { score: number; reason: string } {
  let score = 10;
  const reasons: string[] = [];
  const genre = inferGenre(c.category);
  const start = new Date(c.startTime).getTime();
  const end = new Date(c.endTime).getTime();
  const minsToStart = (start - nowMs) / 60000;

  if (start <= nowMs && nowMs < end) {
    score += 35;
    reasons.push('in onda ora');
  } else if (minsToStart > 0 && minsToStart <= 90) {
    score += 45;
    reasons.push(`inizia tra ${Math.round(minsToStart)}'`);
  } else if (minsToStart > 90 && minsToStart <= 240) {
    score += 25;
    reasons.push('stasera');
  } else if (minsToStart < 0) {
    score -= 40;
  }

  if (!prefs || prefs.skipped || (!prefs.genres.length && !prefs.channels.length && !prefs.mood)) {
    if (genre === 'film' || genre === 'serie' || genre === 'sport') {
      score += 15;
      if (!reasons.includes('stasera') && !reasons.some((r) => r.startsWith('inizia'))) {
        reasons.push(genre);
      }
    }
    const hubIdx = HUB_CHANNELS.findIndex((h) => h.id === c.channelId);
    if (hubIdx >= 0 && hubIdx < 9) score += 12;
    return { score, reason: reasons[0] || 'prime time' };
  }

  if (prefs.channels.includes(c.channelId)) {
    score += 40;
    reasons.push('canale tuo');
  }

  if (genre && prefs.genres.includes(genre)) {
    score += 35;
    reasons.push(genre);
  }

  if (prefs.mood === 'relax' && (genre === 'film' || genre === 'serie')) {
    score += 20;
    reasons.push('mood relax');
  }
  if (prefs.mood === 'evento' && genre === 'sport') {
    score += 28;
    reasons.push('mood evento');
  }
  if (prefs.mood === 'famiglia' && (genre === 'bambini' || genre === 'film' || genre === 'serie')) {
    score += 18;
    reasons.push('mood famiglia');
  }

  return { score, reason: reasons[0] || 'consigliato' };
}

export function rankForYou(
  candidates: RecCandidate[],
  prefs: EveningPrefs | null,
  limit = 5,
  nowMs = Date.now(),
): Array<RecCandidate & { reason: string; score: number }> {
  const ranked = candidates
    .map((c) => {
      const { score, reason } = scoreCandidate(c, prefs, nowMs);
      return { ...c, score, reason };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.startTime.localeCompare(b.startTime));

  const seenTitles = new Set<string>();
  const out: Array<RecCandidate & { reason: string; score: number }> = [];
  for (const item of ranked) {
    const key = item.title.toLowerCase().trim();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
