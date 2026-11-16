/**
 * images.ts — Curated HD 16:9 Photography, Popular Italian Shows & Fallback Pools
 * for intvstasera.it
 */

export const FALLBACK_POOLS = {
  // Meteo / Atmospheric skies & Italian weather
  meteo: [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1280&q=80', // Alpine clouds & peaks
    'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1280&q=80', // Sunny clear sky
    'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=1280&q=80', // Dramatic cumulus & sun rays
    'https://images.unsplash.com/photo-1516912481808-3406841bd33c?auto=format&fit=crop&w=1280&q=80', // Golden sunset horizon
    'https://images.unsplash.com/photo-1530908295418-a12e326966ba?auto=format&fit=crop&w=1280&q=80', // Atmospheric storm sky
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80', // Mountain landscape
    'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1280&q=80', // Weather meadow horizon
    'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=1280&q=80'  // Sunset sky
  ],

  // News / TG1, TG2, TG3, TG4, TG5, Studio Aperto, TG La7, Sky TG24
  news: [
    'https://image.tmdb.org/t/p/w780/tQpnAlEwXihehoDFVIpw9BUuFS3.jpg',                                 // Broadcast studio news desk
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1280&q=80', // TV news desk
    'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=1280&q=80', // Broadcast control room
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1280&q=80', // Editorial newsroom
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1280&q=80', // Press camera / live journalism
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1280&q=80', // High-tech gallery
    'https://images.unsplash.com/photo-1521967906867-14ec9d64bee8?auto=format&fit=crop&w=1280&q=80', // Broadcast news media
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1280&q=80'  // Studio camera set
  ],

  // Calcio / Serie A / Champions League / Coppa Italia
  football: [
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1280&q=80', // Ball on stadium pitch
    'https://images.unsplash.com/photo-1517747614396-d21a78b850e8?auto=format&fit=crop&w=1280&q=80', // Stadium lights & match
    'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1280&q=80', // Floodlit night arena
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1280&q=80', // Pitch grass & stadium
    'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1280&q=80'  // Stadium arena perspective
  ],

  // Tennis (ATP, WTA, Coppa Davis)
  tennis: [
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1280&q=80', // Tennis court & net
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1280&q=80', // Ball & racket on court
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1280&q=80', // Clay court baseline
    'https://images.unsplash.com/photo-1531315630201-bb15abeb1653?auto=format&fit=crop&w=1280&q=80', // Court match play
    'https://images.unsplash.com/photo-1560012057-4372e14c5085?auto=format&fit=crop&w=1280&q=80'  // Tennis arena action
  ],

  // Motori / Formula 1 / MotoGP
  motorsport: [
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1280&q=80', // Racetrack apex turn
    'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1280&q=80'  // Sports car racing track
  ],

  // Ciclismo / Giro d'Italia
  cycling: [
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1280&q=80', // Road bike & tarmac
    'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=1280&q=80', // Cyclist mountain road
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1280&q=80'  // Road race cycling
  ],

  // Basket (LBA, NBA, Eurolega)
  basketball: [
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1280&q=80', // Basketball hoop
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1280&q=80'  // Sports arena
  ],

  // Sport generale
  sports_general: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1280&q=80', // Olympic stadium track
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1280&q=80'  // Athletic arena
  ],

  // Film / Cinema
  movies: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80', // Cinema red seats
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1280&q=80', // Cinema auditorium
    'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=1280&q=80'  // Movie projector
  ],

  // Serie TV / Fiction
  series: [
    'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=1280&q=80', // Living room TV screen
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1280&q=80'  // Streaming cinema screen
  ],

  // Documentari / Natura / Storia
  documentary: [
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80', // Wilderness landscape
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&q=80', // Coast ocean
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1280&q=80'  // Historical ruins / culture
  ],

  // Talk Show / Intrattenimento / Varietà
  talkshow: [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80', // Stage spotlight
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1280&q=80'  // Live stage event
  ],

  // Cucina / Food / Cooking show
  cooking: [
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1280&q=80', // Kitchen gourmet
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1280&q=80'  // Gourmet dishes
  ],

  // Shopping / Televendite
  shopping: [
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1280&q=80'
  ],

  // Default generale
  general: [
    'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=1280&q=80',
    'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1280&q=80'
  ]
};

/** Programmi TV italiani iconici con foto dedicate HD */
export const POPULAR_ITALIAN_SHOWS: Record<string, string> = {
  'affari tuoi': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'la ruota della fortuna': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'l eredita': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'eredita': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'reazione a catena': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'striscia la notizia': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1280&q=80',
  'le iene': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1280&q=80',
  'amici': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1280&q=80',
  'uomini e donne': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'fratelli di crozza': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'ballando con le stelle': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'tale e quale show': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'ulisse': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1280&q=80',
  'quarto grado': 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=1280&q=80',
  'piazzapulita': 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=1280&q=80',
  'otto e mezzo': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1280&q=80',
  'propaganda live': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1280&q=80',
  'report': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1280&q=80',
  'presa diretta': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1280&q=80',
  'linea verde': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1280&q=80',
  'masterchef': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1280&q=80',
  'bake off': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1280&q=80'
};

export interface ProgramLike {
  id?: string;
  title?: string;
  category?: string;
  channel_id?: string;
  startTime?: string;
  start_time?: string;
  backdrop_url?: string | null;
  poster_url?: string | null;
}

/**
 * Seleziona deterministica per rotazione temporale.
 */
export function pickFromPool(pool: string[], p: ProgramLike): string {
  if (!pool || pool.length === 0) return FALLBACK_POOLS.general[0];

  const startTimeIso = p.startTime || p.start_time;
  let timeVal = 0;
  if (startTimeIso) {
    const t = Date.parse(startTimeIso);
    if (!isNaN(t)) {
      timeVal = Math.floor(t / (1000 * 60)); // minuti epoch
    }
  }

  const seed = `${p.id || ''}_${p.channel_id || ''}_${p.title || ''}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) * 16777619;
    h &= 0xFFFFFFFF;
  }

  const idx = Math.abs((h + timeVal) % pool.length);
  return pool[idx];
}

/**
 * Migliora URL di immagini eliminando versioni thumbnail a bassa risoluzione.
 */
export function upscaleImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;

  let upgraded = url;
  if (upgraded.includes('/media/cache/epg_program_small/')) {
    upgraded = upgraded.replace('/media/cache/epg_program_small/', '/');
  }
  if (upgraded.includes('/media/cache/epg_program_medium/')) {
    upgraded = upgraded.replace('/media/cache/epg_program_medium/', '/');
  }
  if (upgraded.includes('tmdb.org/t/p/w200/')) {
    upgraded = upgraded.replace('/w200/', '/w780/');
  }
  if (upgraded.includes('tmdb.org/t/p/w300/')) {
    upgraded = upgraded.replace('/w300/', '/w780/');
  }
  if (upgraded.includes('tmdb.org/t/p/w500/')) {
    upgraded = upgraded.replace('/w500/', '/w780/');
  }

  return upgraded;
}

/**
 * Ritorna l'immagine hero (16:9 widescreen) prioritizzando backdrop HD,
 * poi poster, intercettando meteo/notiziari per forzare fotografie reali.
 */
export function getProgramHeroImg(p?: ProgramLike | null): string {
  if (!p) return FALLBACK_POOLS.general[0];

  const t = (p.title || '').toLowerCase().trim();
  const c = (p.category || '').toLowerCase().trim();
  const fullText = `${t} ${c}`;

  // 1. Notiziari e Meteo DEVONO SEMPRE usare i pool fotografici dedicati
  const isMeteo = fullText.includes('meteo') || fullText.includes('previsioni') || fullText.includes('che tempo fa');
  const isNews = fullText.includes('tg1') || fullText.includes('tg2') || fullText.includes('tg3') ||
                 fullText.includes('tg4') || fullText.includes('tg5') || fullText.includes('tgr') ||
                 fullText.includes('studio aperto') || fullText.includes('tg la7') || fullText.includes('tgla7') ||
                 fullText.includes('sky tg24') || fullText.includes('telegiornale') || fullText.includes('notiziario') ||
                 fullText.includes('notizie');

  if (isMeteo || isNews) {
    return getFallbackImage(p);
  }

  // 2. Mappatura programmi TV italiani popolari
  for (const [key, img] of Object.entries(POPULAR_ITALIAN_SHOWS)) {
    if (t.includes(key)) {
      return img;
    }
  }

  // 3. Immagine TMDb / EPG se presente
  if (p.backdrop_url && p.backdrop_url.trim()) {
    const up = upscaleImageUrl(p.backdrop_url);
    if (up) return up;
  }
  if (p.poster_url && p.poster_url.trim()) {
    const up = upscaleImageUrl(p.poster_url);
    if (up) return up;
  }

  return getFallbackImage(p);
}

/**
 * Selezione tematica fallback intelligente
 */
export function getFallbackImage(p: ProgramLike): string {
  const t = (p.title || '').toLowerCase().trim();
  const c = (p.category || '').toLowerCase().trim();
  const fullText = `${t} ${c}`;

  // 1. Meteo
  if (fullText.includes('meteo') || fullText.includes('previsioni') || fullText.includes('che tempo fa')) {
    return pickFromPool(FALLBACK_POOLS.meteo, p);
  }

  // 2. News / Telegiornali
  if (
    fullText.includes('tg1') || fullText.includes('tg2') || fullText.includes('tg3') ||
    fullText.includes('tg4') || fullText.includes('tg5') || fullText.includes('tgr') ||
    fullText.includes('studio aperto') || fullText.includes('tg la7') || fullText.includes('tgla7') ||
    fullText.includes('sky tg24') || fullText.includes('telegiornale') || fullText.includes('notiziario') ||
    fullText.includes('notizie') || fullText.includes('informazione') || fullText.includes('tagesschau')
  ) {
    return pickFromPool(FALLBACK_POOLS.news, p);
  }

  // 3. Calcio
  if (
    fullText.includes('calcio') || fullText.includes('serie a') || fullText.includes('serie b') ||
    fullText.includes('champions league') || fullText.includes('europa league') ||
    fullText.includes('conference league') || fullText.includes('coppa italia') ||
    fullText.includes('mondiali') || fullText.includes('uefa') || fullText.includes('fifa')
  ) {
    return pickFromPool(FALLBACK_POOLS.football, p);
  }

  // 4. Tennis
  if (fullText.includes('tennis') || fullText.includes('atp') || fullText.includes('wta') || fullText.includes('wimbledon') || fullText.includes('davis')) {
    return pickFromPool(FALLBACK_POOLS.tennis, p);
  }

  // 5. Motori
  if (fullText.includes('formula 1') || fullText.includes('f1') || fullText.includes('motogp') || fullText.includes('gran premio') || fullText.includes('motori')) {
    return pickFromPool(FALLBACK_POOLS.motorsport, p);
  }

  // 6. Ciclismo
  if (fullText.includes('ciclismo') || fullText.includes('giro d\'italia') || fullText.includes('tour de france') || fullText.includes('vuelta')) {
    return pickFromPool(FALLBACK_POOLS.cycling, p);
  }

  // 7. Basket
  if (fullText.includes('basket') || fullText.includes('nba') || fullText.includes('pallacanestro') || fullText.includes('eurolega')) {
    return pickFromPool(FALLBACK_POOLS.basketball, p);
  }

  // 8. Sport generale
  if (fullText.includes('sport') || fullText.includes('diretta sport')) {
    return pickFromPool(FALLBACK_POOLS.sports_general, p);
  }

  // 9. Film / Cinema
  if (fullText.includes('film') || fullText.includes('cinema') || fullText.includes('commedia') || fullText.includes('thriller') || fullText.includes('drammatico')) {
    return pickFromPool(FALLBACK_POOLS.movies, p);
  }

  // 10. Serie TV / Fiction
  if (fullText.includes('serie') || fullText.includes('fiction') || fullText.includes('sitcom') || fullText.includes('soap') || fullText.includes('telenovela') || fullText.includes('poliziesco')) {
    return pickFromPool(FALLBACK_POOLS.series, p);
  }

  // 11. Documentari / Natura / Scienza
  if (fullText.includes('doc') || fullText.includes('documentario') || fullText.includes('storia') || fullText.includes('natura') || fullText.includes('scienza') || fullText.includes('reportage')) {
    return pickFromPool(FALLBACK_POOLS.documentary, p);
  }

  // 12. Show / Varietà
  if (fullText.includes('show') || fullText.includes('varietà') || fullText.includes('intrattenimento') || fullText.includes('talk') || fullText.includes('quiz') || fullText.includes('game show') || fullText.includes('reality')) {
    return pickFromPool(FALLBACK_POOLS.talkshow, p);
  }

  // 13. Cucina
  if (fullText.includes('cucina') || fullText.includes('chef') || fullText.includes('ricette') || fullText.includes('cooking') || fullText.includes('food')) {
    return pickFromPool(FALLBACK_POOLS.cooking, p);
  }

  // 14. Shopping
  if (fullText.includes('shopping') || fullText.includes('televendita') || fullText.includes('einkauf')) {
    return pickFromPool(FALLBACK_POOLS.shopping, p);
  }

  return pickFromPool(FALLBACK_POOLS.general, p);
}
