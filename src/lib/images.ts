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
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1280&q=80', // Stadium lights & match
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

  // Pallavolo / Volley
  volleyball: [
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1280&q=80', // Volleyball court
    'https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=1280&q=80'  // Volleyball net
  ],

  // Nuoto / Sport acquatici
  swimming: [
    'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1280&q=80'  // Swimming pool lanes
  ],

  // Ippica / Galoppo / Trotto / Cavalli
  horse_racing: [
    'https://images.unsplash.com/photo-1601726429844-acd8b1385972?auto=format&fit=crop&w=1280&q=80' // Racehorses galloping with jockeys
  ],

  // Sport invernali / Sci / Salto con gli sci (FIS)
  ski: [
    'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=1280&q=80' // Skier on alpine powder snow slope
  ],

  // Atletica leggera / Corsa / Sprint (solo gare di atletica)
  athletics: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1280&q=80' // Olympic stadium track & starting blocks
  ],

  // Sport generale (Arena sportiva illuminata neutrale, mai corridore o calciatore)
  sports_general: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1280&q=80'  // Athletic arena
  ],

  // Film / Cinema
  movies: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80', // Cinema red seats
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1280&q=80', // Cinema auditorium
    'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=1280&q=80'  // Movie projector
  ],

  // Serie TV / Fiction (Brand-free cinematography & home theatre screens)
  series: [
    'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1280&q=80', // Modern TV display in minimalist living room (no brand logo)
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1280&q=80', // Movie film camera & clapperboard
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80'  // Cinematic film projector and reel (brand-free)
  ],

  // Documentari / Viaggi / Natura / Storia / Bellezze del mondo
  documentary: [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1280&q=80', // Majestic mountain valley & lake
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1280&q=80', // Scenic travel road trip & nature
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1280&q=80', // World travels & discovery
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80', // Wilderness landscape
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1280&q=80', // Coast ocean
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1280&q=80'  // Historical ruins & architecture
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
  // Documentari e viaggi italiani
  'emozioni dal mondo': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1280&q=80',
  'mangiare con gusto': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1280&q=80',
  'l ingrediente perfetto': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1280&q=80',
  'casa alice': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1280&q=80',
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
  description?: string;
  category?: string;
  genre?: string;
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
 * Blocca e scarta asset marchiati da terzi (es. SuperguidaTV share banner).
 */
export function upscaleImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;

  const lower = url.toLowerCase();
  // Rifiuta tassativamente banner social o watermark terzi di SuperguidaTV
  if (lower.includes('superguidatv') || lower.includes('share-1200')) {
    return null;
  }

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

  // 1. Notiziari, Meteo e Sport DEVONO SEMPRE usare i pool fotografici dedicati da catalogo
  const isMeteo = fullText.includes('meteo') || fullText.includes('previsioni') || fullText.includes('che tempo fa');
  const isNews = fullText.includes('tg1') || fullText.includes('tg2') || fullText.includes('tg3') ||
                 fullText.includes('tg4') || fullText.includes('tg5') || fullText.includes('tgr') ||
                 fullText.includes('studio aperto') || fullText.includes('tg la7') || fullText.includes('tgla7') ||
                 fullText.includes('sky tg24') || fullText.includes('telegiornale') || fullText.includes('notiziario') ||
                 fullText.includes('notizie');
  const isSport = c.includes('sport') || fullText.includes('uefa') || fullText.includes('atp') ||
                  fullText.includes('wta') || fullText.includes('tennis') || fullText.includes('calcio') ||
                  fullText.includes('formula 1') || fullText.includes('motogp') || fullText.includes('basket') ||
                  fullText.includes('ciclismo') || fullText.includes('volley') || fullText.includes('supertennis');

  if (isMeteo || isNews || isSport) {
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
  const d = (p.description || '').toLowerCase().trim();
  const fullText = `${t} ${c} ${d}`;

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

  // 3. Ippica / Galoppo / Trotto / Cavalli / Equitazione
  if (
    fullText.includes('ippica') || fullText.includes('ippodromo') || fullText.includes('cavalli') ||
    fullText.includes('galoppo') || fullText.includes('trotto') || fullText.includes('equitazione') ||
    fullText.includes('salto ostacoli') || fullText.includes('prix d\'amerique') || fullText.includes('uniresat') ||
    fullText.includes('gran premio lotteria')
  ) {
    return pickFromPool(FALLBACK_POOLS.horse_racing, p);
  }

  // 4. Sci / Salto con gli sci / Sport invernali (FIS, Trampolini, Slalom, Snowboard, Biathlon)
  if (
    fullText.includes('salto con gli sci') || fullText.includes('sci') || fullText.includes('trampolin') ||
    fullText.includes('slalom') || fullText.includes('discesa') || fullText.includes('coppa del mondo fis') ||
    fullText.includes('fis ') || fullText.includes('biathlon') || fullText.includes('snowboard') ||
    fullText.includes('quattro trampolini') || fullText.includes('invernali') || fullText.includes('super-g') ||
    fullText.includes('fondo') || fullText.includes('curling') || fullText.includes('pattinaggio')
  ) {
    return pickFromPool(FALLBACK_POOLS.ski, p);
  }

  // 5. Tennis (ATP, WTA, Sinner, Wimbledon, Davis Cup, Roland Garros)
  if (
    fullText.includes('tennis') || fullText.includes('atp') || fullText.includes('wta') ||
    fullText.includes('wimbledon') || fullText.includes('davis') || fullText.includes('sinner') ||
    fullText.includes('alcaraz') || fullText.includes('supertennis') || fullText.includes('nitto atp') ||
    fullText.includes('us open') || fullText.includes('roland garros') || fullText.includes('australian open') ||
    fullText.includes('the insider atp')
  ) {
    return pickFromPool(FALLBACK_POOLS.tennis, p);
  }

  // 6. Motori (Formula 1, MotoGP, SBK, Rally)
  if (
    fullText.includes('formula 1') || fullText.includes('formula1') || fullText.includes(' f1 ') ||
    fullText.includes('motogp') || fullText.includes('moto2') || fullText.includes('moto3') ||
    fullText.includes('superbike') || fullText.includes('sbk') || fullText.includes('rally') ||
    fullText.includes('gran premio') || fullText.includes('grand prix') || fullText.includes('motori') ||
    fullText.includes('ferrari') || fullText.includes('wrc')
  ) {
    return pickFromPool(FALLBACK_POOLS.motorsport, p);
  }

  // 7. Basket (NBA, Eurolega, LBA, Virtus)
  if (
    fullText.includes('basket') || fullText.includes('nba') || fullText.includes('pallacanestro') ||
    fullText.includes('eurolega') || fullText.includes('lba') || fullText.includes('virtus') ||
    fullText.includes('panathinaikos') || fullText.includes('olimpia milano')
  ) {
    return pickFromPool(FALLBACK_POOLS.basketball, p);
  }

  // 8. Ciclismo (Giro d'Italia, Tour de France, Vuelta)
  if (
    fullText.includes('ciclismo') || fullText.includes('giro d\'italia') || fullText.includes('tour de france') ||
    fullText.includes('vuelta') || fullText.includes('bicicletta')
  ) {
    return pickFromPool(FALLBACK_POOLS.cycling, p);
  }

  // 9. Pallavolo / Volley
  if (fullText.includes('volley') || fullText.includes('pallavolo') || fullText.includes('superlega') || fullText.includes('cev')) {
    return pickFromPool(FALLBACK_POOLS.volleyball, p);
  }

  // 10. Nuoto / Pallanuoto
  if (fullText.includes('nuoto') || fullText.includes('pallanuoto') || fullText.includes('tuffi')) {
    return pickFromPool(FALLBACK_POOLS.swimming, p);
  }

  // 11. Atletica leggera (SOLO per gare di atletica/corsa/maratona)
  if (
    fullText.includes('atletica') || fullText.includes('maratona') || fullText.includes('golden gala') ||
    fullText.includes('diamond league') || fullText.includes('100 metri') || fullText.includes('mezzofondo')
  ) {
    return pickFromPool(FALLBACK_POOLS.athletics, p);
  }

  // 12. Calcio / Football (Serie A, Champions League, UEFA, Nazionale, Coppe)
  if (
    fullText.includes('calcio') || fullText.includes('serie a') || fullText.includes('serie b') ||
    fullText.includes('champions league') || fullText.includes('europa league') ||
    fullText.includes('conference league') || fullText.includes('coppa italia') ||
    fullText.includes('mondiali') || fullText.includes('uefa') || fullText.includes('fifa') ||
    fullText.includes('milan') || fullText.includes('inter') || fullText.includes('juve') ||
    fullText.includes('juventus') || fullText.includes('roma') || fullText.includes('lazio') ||
    fullText.includes('napoli') || fullText.includes('atalanta') || fullText.includes('partita') ||
    fullText.includes('nazionale') || fullText.includes('danimarca') || fullText.includes('norvegia') ||
    fullText.includes('premier league') || fullText.includes('liga') || fullText.includes('bundesliga')
  ) {
    return pickFromPool(FALLBACK_POOLS.football, p);
  }

  // 10. Sport generale (Stadio olimpico, pista atletica - no calciatore)
  if (fullText.includes('sport') || fullText.includes('diretta sport')) {
    return pickFromPool(FALLBACK_POOLS.sports_general, p);
  }

  // 9. Documentari / Natura / Viaggi / Scienza / Cultura
  if (
    fullText.includes('doc') || fullText.includes('documentario') || fullText.includes('documentari') ||
    fullText.includes('dokumentation') || fullText.includes('wissenschaft') ||
    fullText.includes('viaggi') || fullText.includes('viaggio') || fullText.includes('reise') ||
    fullText.includes('emozioni dal mondo') || fullText.includes('storia') || fullText.includes('natura') ||
    fullText.includes('scienza') || fullText.includes('reportage')
  ) {
    return pickFromPool(FALLBACK_POOLS.documentary, p);
  }

  // 10. Cucina / Food / Cooking
  if (fullText.includes('cucina') || fullText.includes('kochen') || fullText.includes('chef') || fullText.includes('ricette') || fullText.includes('cooking') || fullText.includes('food') || fullText.includes('mangiare con gusto')) {
    return pickFromPool(FALLBACK_POOLS.cooking, p);
  }

  // 11. Film / Cinema
  if (fullText.includes('film') || fullText.includes('cinema') || fullText.includes('commedia') || fullText.includes('thriller') || fullText.includes('drammatico') || fullText.includes('spielfilm')) {
    return pickFromPool(FALLBACK_POOLS.movies, p);
  }

  // 12. Show / Varietà / Intrattenimento
  if (fullText.includes('show') || fullText.includes('varietà') || fullText.includes('intrattenimento') || fullText.includes('unterhaltung') || fullText.includes('talk') || fullText.includes('quiz') || fullText.includes('game show') || fullText.includes('reality')) {
    return pickFromPool(FALLBACK_POOLS.talkshow, p);
  }

  // 13. Serie TV / Fiction
  if (fullText.includes('serie') || fullText.includes('fiction') || fullText.includes('sitcom') || fullText.includes('soap') || fullText.includes('telenovela') || fullText.includes('poliziesco')) {
    return pickFromPool(FALLBACK_POOLS.series, p);
  }

  // 14. Shopping
  if (fullText.includes('shopping') || fullText.includes('televendita') || fullText.includes('einkauf')) {
    return pickFromPool(FALLBACK_POOLS.shopping, p);
  }

  return pickFromPool(FALLBACK_POOLS.general, p);
}
