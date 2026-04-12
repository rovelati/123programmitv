/**
 * URL delle pagine di live streaming ufficiali per ogni canale.
 * Fonti: siti broadcaster (RaiPlay, Mediaset Infinity, La7, nove.tv, ecc.)
 *
 * login_required: la diretta richiede account (gratuito o a pagamento)
 * geo_it: accessibile solo da IP italiani
 */

export interface ChannelStream {
  url: string;
  login_required: boolean;
  geo_it: boolean;
  label?: string; // nome piattaforma da mostrare in UI (es. "RaiPlay", "Mediaset Infinity")
}

const CHANNEL_STREAMS: Record<string, ChannelStream> = {
  // ── RAI (raiplay.it) — libero, geo-Italia (tranne News24) ─────────────────
  'rai-1':      { url: 'https://www.raiplay.it/dirette/rai1',     login_required: false, geo_it: true,  label: 'RaiPlay' },
  'rai-2':      { url: 'https://www.raiplay.it/dirette/rai2',     login_required: false, geo_it: true,  label: 'RaiPlay' },
  'rai-3':      { url: 'https://www.raiplay.it/dirette/rai3',     login_required: false, geo_it: true,  label: 'RaiPlay' },
  'rai-4':      { url: 'https://www.raiplay.it/dirette/rai4',     login_required: false, geo_it: true,  label: 'RaiPlay' },
  'rai-5':      { url: 'https://www.raiplay.it/dirette/rai5',     login_required: false, geo_it: true,  label: 'RaiPlay' },
  'rai-movie':  { url: 'https://www.raiplay.it/dirette/raimovie', login_required: false, geo_it: true,  label: 'RaiPlay' },
  'rai-news24': { url: 'https://www.raiplay.it/dirette/rainews24',login_required: false, geo_it: false, label: 'RaiPlay' },
  'rai-sport':  { url: 'https://www.raiplay.it/dirette/raisport', login_required: false, geo_it: true,  label: 'RaiPlay' },

  // ── Mediaset (mediasetinfinity.mediaset.it) — login gratuito richiesto ────
  'canale-5':      { url: 'https://mediasetinfinity.mediaset.it/diretta/canale5_cC5',      login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'italia-1':      { url: 'https://mediasetinfinity.mediaset.it/diretta/italia1_cI1',      login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'rete-4':        { url: 'https://mediasetinfinity.mediaset.it/diretta/rete4_cR4',        login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'la-5':          { url: 'https://mediasetinfinity.mediaset.it/diretta/la5_cKA',          login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'italia-2':      { url: 'https://mediasetinfinity.mediaset.it/diretta/italia2_cI2',      login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'mediaset-extra':{ url: 'https://mediasetinfinity.mediaset.it/diretta/mediasetextra_cKQ',login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'twenty-seven':  { url: 'https://mediasetinfinity.mediaset.it/diretta/_cTS',             login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'mediaset-27-twentyseven': { url: 'https://mediasetinfinity.mediaset.it/diretta/_cTS',  login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'cine34':        { url: 'https://mediasetinfinity.mediaset.it/diretta/cine34_cB6',       login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'tgcom24':       { url: 'https://mediasetinfinity.mediaset.it/diretta/video_cKF',        login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'focus':         { url: 'https://mediasetinfinity.mediaset.it/diretta/focus_cFU',        login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'iris':          { url: 'https://mediasetinfinity.mediaset.it/diretta/iris_cKI',         login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'top-crime':     { url: 'https://mediasetinfinity.mediaset.it/diretta/topcrime_cLT',     login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  'topcrime':      { url: 'https://mediasetinfinity.mediaset.it/diretta/topcrime_cLT',     login_required: true, geo_it: true, label: 'Mediaset Infinity' },
  '20':            { url: 'https://mediasetinfinity.mediaset.it/diretta/20_cVE',           login_required: true, geo_it: true, label: 'Mediaset Infinity' },

  // ── La7 — libero, no geo-restriction ──────────────────────────────────────
  'la7':  { url: 'https://www.la7.it/dirette-tv', login_required: false, geo_it: false, label: 'La7' },
  'la7d': { url: 'https://www.la7.it/dirette-tv', login_required: false, geo_it: false, label: 'La7' },

  // ── TV8 — geo-Italia, possibile account Sky ────────────────────────────────
  'tv8': { url: 'https://www.tv8.it/streaming', login_required: false, geo_it: true, label: 'TV8' },

  // ── Discovery / Warner Bros. — libero, siti dedicati ─────────────────────
  'nove':       { url: 'https://nove.tv/live-streaming-nove',          login_required: false, geo_it: false, label: 'Nove' },
  'real-time':  { url: 'https://realtime.it/live-streaming-real-time', login_required: false, geo_it: false, label: 'Real Time' },
  'dmax':       { url: 'https://dmax.it/live-streaming-dmax',          login_required: false, geo_it: false, label: 'DMAX' },
  'giallo':     { url: 'https://giallotv.it/live-streaming-giallo',    login_required: false, geo_it: false, label: 'Giallo' },
  'warner-tv':  { url: 'https://discovery.it/live-streaming-discovery',login_required: false, geo_it: false, label: 'Discovery' },

  // ── Altri canali gratuiti ─────────────────────────────────────────────────
  'cielo':    { url: 'https://www.cielotv.it/streaming', login_required: false, geo_it: false, label: 'CieloTV' },
  'sky-tg24': { url: 'https://tg24.sky.it/diretta',     login_required: false, geo_it: false, label: 'Sky TG24' },
  'tv2000':   { url: 'https://www.play2000.it/live/tv', login_required: true,  geo_it: false, label: 'TV2000' },
};

/** Ritorna i dati di streaming per un channel_id, o null se non disponibile. */
export function getChannelStream(channelId: string): ChannelStream | null {
  return CHANNEL_STREAMS[channelId] ?? null;
}
