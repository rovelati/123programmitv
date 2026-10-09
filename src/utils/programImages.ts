/**
 * ============================================================================
 * INTVSTASERA - PROGRAM IMAGES & HD POSTER RESOLVER
 * ============================================================================
 * 
 * Risolve locandine ed immagini ufficiali in alta definizione per tutti i programmi TV:
 * 1. Mappatura HD per trasmissioni popolari (Affari Tuoi, Striscia, Le Iene, Meteo, ecc.).
 * 2. Rimozione di thumbnail a bassa risoluzione (/epg_program_small/ e w200).
 * 3. Fallback grafici professionali ad alta risoluzione (800x600 px) per categoria.
 * 
 * @module utils/programImages
 */

export const KNOWN_PROGRAM_POSTERS: Record<string, string> = {
  // ── METEO & PREVISIONI TEMPO ──────────────────────────────────────────────
  'meteo': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'il meteo': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'meteo 1': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'meteo 2': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'meteo 3': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'meteo 4': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'meteo 5': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'meteo it': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'tg meteo': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'previsioni meteo': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'che tempo fa': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'studio aperto meteo': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'tg5 meteo': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'tg4 meteo': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  'tg la7 meteo': 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',

  // ── RAI 1 & RAI GROUP ──────────────────────────────────────────────────────
  'affari tuoi': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'tg1': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg 1': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'speciale tg1': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg1 sera': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg1 notte': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg2': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg 2': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg3': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg 3': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'reazione a catena': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'eredita': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'l eredita': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'ulisse': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  'ulisse il piacere della scoperta': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  'ballando con le stelle': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'tale e quale show': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'domenica in': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'storie italiane': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'e sempre mezzogiorno': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
  'la vita in diretta': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'un posto al sole': 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
  'il paradiso delle signore': 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
  'don matteo': 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=800&q=80',
  'doc': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  'doc nelle tue mani': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  'mare fuori': 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
  'ispettore coliandro': 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=800&q=80',
  'l ispettore coliandro': 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=800&q=80',
  'montalbano': 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=800&q=80',
  'il commissario montalbano': 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=800&q=80',
  'che tempo che fa': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'report': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'presa diretta': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'presadiretta': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'chi l ha visto': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',

  // ── MEDIASET GROUP ────────────────────────────────────────────────────────
  'la ruota della fortuna': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'ruota della fortuna': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'striscia la notizia': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'le iene': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'le iene show': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'le iene presentano': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'le iene presentano inside': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg5': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg 5': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg4': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tg 4': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'studio aperto': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'uomini e donne': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'amici': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'amici di maria de filippi': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'verissimo': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'pomeriggio cinque': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'mattino cinque': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'caduta libera': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'avanti un altro': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'grande fratello': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'grande fratello vip': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'temptation island': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'tu si que vales': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'c e posta per te': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'quarto grado': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'dritto e rovescio': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'forum': 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
  'the big bang theory': 'https://image.tmdb.org/t/p/w780/euKFiO5M125rpngFRBbSW83beeI.jpg',

  // ── LA7 & DISCOVERY / WARNER BROS ──────────────────────────────────────────
  'tg la7': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'tgla7': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'otto e mezzo': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'piazzapulita': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'dimartedi': 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'propaganda live': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'fratelli di crozza': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'pechino express': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  '4 ristoranti': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  'cash or trash': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'masterchef italia': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',

  // ── SPORT & CALCIO ─────────────────────────────────────────────────────────
  'serie a': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
  'champions league': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
  'europa league': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
  'formula 1': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
  'motogp': 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
};

export const CATEGORY_ARTWORK: Record<string, string> = {
  meteo: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  film: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
  cinema: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
  serietv: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
  fiction: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
  serie: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
  sport: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
  calcio: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
  intrattenimento: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  show: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  informazione: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  tg: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  documentari: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  natura: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  bambini: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80',
  ragazzi: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80',
};

function cleanTitle(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  return upgraded;
}

export function resolveProgramPoster(
  currentPoster?: string | null,
  title?: string | null,
  category?: string | null,
  description?: string | null
): string {
  const cleaned = cleanTitle(title);

  if (cleaned.includes('meteo') || cleaned.includes('previsioni') || cleaned.includes('che tempo fa')) {
    return KNOWN_PROGRAM_POSTERS['meteo'];
  }

  if (cleaned) {
    for (const [key, url] of Object.entries(KNOWN_PROGRAM_POSTERS)) {
      if (cleaned === key || cleaned.startsWith(key) || key.startsWith(cleaned)) {
        return url;
      }
    }

    if (cleaned.includes('affari tuoi')) return KNOWN_PROGRAM_POSTERS['affari tuoi'];
    if (cleaned.includes('ruota della fortuna') || (cleaned.includes('ruota') && cleaned.includes('fortuna'))) return KNOWN_PROGRAM_POSTERS['la ruota della fortuna'];
    if (cleaned.startsWith('tg1') || cleaned.startsWith('tg 1') || cleaned.includes(' tg1') || cleaned.includes(' tg 1')) return KNOWN_PROGRAM_POSTERS['tg1'];
    if (cleaned.startsWith('tg2') || cleaned.startsWith('tg 2') || cleaned.includes(' tg2') || cleaned.includes(' tg 2')) return KNOWN_PROGRAM_POSTERS['tg2'];
    if (cleaned.startsWith('tg3') || cleaned.startsWith('tg 3') || cleaned.includes(' tg3') || cleaned.includes(' tg 3')) return KNOWN_PROGRAM_POSTERS['tg3'];
    if (cleaned.startsWith('tg4') || cleaned.startsWith('tg 4') || cleaned.includes(' tg4') || cleaned.includes(' tg 4')) return KNOWN_PROGRAM_POSTERS['tg4'];
    if (cleaned.startsWith('tg5') || cleaned.startsWith('tg 5') || cleaned.includes(' tg5') || cleaned.includes(' tg 5')) return KNOWN_PROGRAM_POSTERS['tg5'];
    if (cleaned.includes('studio aperto')) return KNOWN_PROGRAM_POSTERS['studio aperto'];
    if (cleaned.includes('tg la7') || cleaned.includes('tgla7')) return KNOWN_PROGRAM_POSTERS['tg la7'];
    if (cleaned.includes('striscia')) return KNOWN_PROGRAM_POSTERS['striscia la notizia'];
    if (cleaned.includes('le iene') || cleaned.includes('iene')) return KNOWN_PROGRAM_POSTERS['le iene'];
    if (cleaned.includes('ulisse')) return KNOWN_PROGRAM_POSTERS['ulisse'];
    if (cleaned.includes('eredita')) return KNOWN_PROGRAM_POSTERS['eredita'];
    if (cleaned.includes('reazione a catena')) return KNOWN_PROGRAM_POSTERS['reazione a catena'];
    if (cleaned.includes('uomini e donne')) return KNOWN_PROGRAM_POSTERS['uomini e donne'];
    if (cleaned.includes('amici')) return KNOWN_PROGRAM_POSTERS['amici'];
    if (cleaned.includes('crozza')) return KNOWN_PROGRAM_POSTERS['fratelli di crozza'];
    if (cleaned.includes('pechino express')) return KNOWN_PROGRAM_POSTERS['pechino express'];
    if (cleaned.includes('otto e mezzo')) return KNOWN_PROGRAM_POSTERS['otto e mezzo'];
    if (cleaned.includes('piazzapulita')) return KNOWN_PROGRAM_POSTERS['piazzapulita'];
    if (cleaned.includes('propaganda')) return KNOWN_PROGRAM_POSTERS['propaganda live'];
    if (cleaned.includes('quarto grado')) return KNOWN_PROGRAM_POSTERS['quarto grado'];
    if (cleaned.includes('grande fratello')) return KNOWN_PROGRAM_POSTERS['grande fratello'];
  }

  if (currentPoster && typeof currentPoster === 'string' && currentPoster.startsWith('http')) {
    const upscaled = upscaleImageUrl(currentPoster);
    if (upscaled) return upscaled;
  }

  const cat = cleanTitle(category);
  for (const [catKey, artUrl] of Object.entries(CATEGORY_ARTWORK)) {
    if (cat.includes(catKey)) {
      return artUrl;
    }
  }

  const desc = (description || '').toLowerCase();
  if (desc.includes('regia di') || desc.includes('cast:') || desc.includes('film')) {
    return CATEGORY_ARTWORK.film;
  }
  if (desc.includes('serie') || desc.includes('stagione') || desc.includes('episodio')) {
    return CATEGORY_ARTWORK.serietv;
  }
  if (desc.includes('calcio') || desc.includes('campionato') || desc.includes('partita')) {
    return CATEGORY_ARTWORK.sport;
  }

  return CATEGORY_ARTWORK.film;
}
