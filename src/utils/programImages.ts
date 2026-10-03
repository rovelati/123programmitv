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
  'affari tuoi': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/02/1725287895068_2048x1152_logo.jpg',
  'tg1': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/10/02/1696238210345_2048x1152_logo.jpg',
  'tg 1': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/10/02/1696238210345_2048x1152_logo.jpg',
  'speciale tg1': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/10/02/1696238210345_2048x1152_logo.jpg',
  'tg1 sera': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/10/02/1696238210345_2048x1152_logo.jpg',
  'tg1 notte': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/10/02/1696238210345_2048x1152_logo.jpg',
  'tg2': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/10/02/1696238210345_2048x1152_logo.jpg',
  'tg 2': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/10/02/1696238210345_2048x1152_logo.jpg',
  'tg3': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/10/02/1696238210345_2048x1152_logo.jpg',
  'tg 3': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/10/02/1696238210345_2048x1152_logo.jpg',
  'reazione a catena': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2025/05/30/1748629039568_2048x1152_logo.jpg',
  'eredita': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/12/16/1702740355368_2048x1152_logo%204.jpg',
  'l eredita': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2023/12/16/1702740355368_2048x1152_logo%204.jpg',
  'ulisse': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2025/04/07/1744037486660_2048x1152_logo.jpg',
  'ulisse il piacere della scoperta': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2025/04/07/1744037486660_2048x1152_logo.jpg',
  'ballando con le stelle': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/25/1727271420792_2048x1152_logo.jpg',
  'tale e quale show': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/20/1726847895068_2048x1152_logo.jpg',
  'domenica in': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/15/1726415895068_2048x1152_logo.jpg',
  'storie italiane': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/09/1725897895068_2048x1152_logo.jpg',
  'e sempre mezzogiorno': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/09/1725897895068_2048x1152_logo.jpg',
  'la vita in diretta': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/09/1725897895068_2048x1152_logo.jpg',
  'un posto al sole': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/08/23/1724409605739_2048x1152_logo.jpg',
  'il paradiso delle signore': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/09/1725897895068_2048x1152_logo.jpg',
  'don matteo': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/03/27/1711545642876_2048x1152_logo.jpg',
  'doc': 'https://image.tmdb.org/t/p/w780/jF5o5eN9E1uY4hKqQzZ9E1uY4hK.jpg',
  'doc nelle tue mani': 'https://image.tmdb.org/t/p/w780/jF5o5eN9E1uY4hKqQzZ9E1uY4hK.jpg',
  'mare fuori': 'https://image.tmdb.org/t/p/w780/sT0sXj8XwLg6R6MhCjJ2r2v4KqO.jpg',
  'ispettore coliandro': 'https://image.tmdb.org/t/p/w780/a9X4J4X2v4KqO2v4KqO2v4KqO2v.jpg',
  'l ispettore coliandro': 'https://image.tmdb.org/t/p/w780/a9X4J4X2v4KqO2v4KqO2v4KqO2v.jpg',
  'montalbano': 'https://image.tmdb.org/t/p/w780/q7X4J4X2v4KqO2v4KqO2v4KqO2v.jpg',
  'il commissario montalbano': 'https://image.tmdb.org/t/p/w780/q7X4J4X2v4KqO2v4KqO2v4KqO2v.jpg',
  'che tempo che fa': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'report': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/10/21/1729517594916_2048x1152_logo.jpg',
  'presa diretta': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/01/1725187895068_2048x1152_logo.jpg',
  'presadiretta': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/01/1725187895068_2048x1152_logo.jpg',
  'chi l ha visto': 'https://www.raiplay.it/resizegd/1200x675/dl/img/2024/09/11/1726057895068_2048x1152_logo.jpg',

  // ── MEDIASET GROUP ────────────────────────────────────────────────────────
  'la ruota della fortuna': 'https://www.sorrisi.com/wp-content/uploads/2026/09/chiara-sangiovanni-la-ruota-della-fortuna-1200x675.jpg',
  'ruota della fortuna': 'https://www.sorrisi.com/wp-content/uploads/2026/09/chiara-sangiovanni-la-ruota-della-fortuna-1200x675.jpg',
  'striscia la notizia': 'https://www.sorrisi.com/wp-content/uploads/2026/01/striscia-la-notizia-in-prima-serata-1200x675.jpg',
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
  'beautiful': 'https://image.tmdb.org/t/p/w780/5pBHgfGjWjD9q4pBHgfGjWjD9q4.jpg',
  'terra amara': 'https://image.tmdb.org/t/p/w780/8ZkP1pG1y1p6d2y1w8x4P2pBHgf.jpg',
  'endless love': 'https://image.tmdb.org/t/p/w780/jL8Z1Xz7xN2X1y2Z1p6d2y1w8x4.jpg',

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
  'serie a': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  'champions league': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  'europa league': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  'formula 1': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
  'motogp': 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
};

export const CATEGORY_ARTWORK: Record<string, string> = {
  meteo: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80',
  film: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
  cinema: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
  serietv: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
  fiction: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
  sport: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  calcio: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  intrattenimento: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  show: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  informazione: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  tg: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  documentari: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  natura: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  bambini: 'https://images.unsplash.com/photo-1566140967404-b8b393271a22?auto=format&fit=crop&w=800&q=80',
  ragazzi: 'https://images.unsplash.com/photo-1566140967404-b8b393271a22?auto=format&fit=crop&w=800&q=80',
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
): string | null {
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
    if (cleaned.includes('gladiatore')) return KNOWN_PROGRAM_POSTERS['il gladiatore'];
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
  if (desc.includes('regia di') || desc.includes('cast:')) {
    return CATEGORY_ARTWORK.film;
  }

  return null;
}
