/**
 * Risolve il logo di un canale con fallback a /channel-logos/ (Cloudflare Pages CDN).
 * I loghi locali sono in public/channel-logos/ — nessuna hotlink protection.
 */

// Loghi locali per i canali principali (file in public/channel-logos/)
const LOCAL_LOGOS: Record<string, string> = {
  // ── RAI ──────────────────────────────────────────────────────────────────
  'rai-1':          '/channel-logos/rai-1.jpg',
  'rai-2':          '/channel-logos/rai-2.jpg',
  'rai-3':          '/channel-logos/rai-3.jpg',
  'rai-4':          '/channel-logos/rai-4.jpg',
  'rai-5':          '/channel-logos/rai-5.jpg',
  'rai-movie':      '/channel-logos/rai-movie.jpg',
  'rai-premium':    '/channel-logos/rai-premium.png',
  // ── Mediaset ─────────────────────────────────────────────────────────────
  'canale-5':                  '/channel-logos/canale-5.svg',
  'italia-1':                  '/channel-logos/italia-1.svg',
  'italia-2':                  '/channel-logos/italia-2.jpg',   // era .png
  'rete-4':                    '/channel-logos/rete-4.jpg',
  'boing':                     '/channel-logos/boing.jpg',
  'k2':                        '/channel-logos/k2.jpg',         // era .png
  'frisbee':                   '/channel-logos/frisbee.jpg',    // era .png
  'cartoonito':                '/channel-logos/cartoonito.jpg',
  'cine34':                    '/channel-logos/cine34.jpg',
  'focus':                     '/channel-logos/focus.jpg',      // era .png
  'tgcom24':                   '/channel-logos/tgcom24.jpg',    // era .png
  'mediaset-extra':            '/channel-logos/mediaset-extra.jpg', // era .png
  'twenty-seven':              '/channel-logos/twenty-seven.svg',   // era twentyseven.png
  'mediaset-27-twentyseven':   '/channel-logos/mediaset-27-twentyseven.png',
  // ── La7 ──────────────────────────────────────────────────────────────────
  'la7':            '/channel-logos/la7.svg',
  'la7d':           '/channel-logos/la7d.svg',
  // ── Indipendenti ─────────────────────────────────────────────────────────
  'tv8':            '/channel-logos/tv8.svg',
  'nove':           '/channel-logos/nove.jpg',
  '20':             '/channel-logos/20.jpg',
  'iris':           '/channel-logos/iris.svg',
  'cielo':          '/channel-logos/cielo.svg',
  'real-time':      '/channel-logos/real-time.jpg',    // era .png
  'giallo':         '/channel-logos/giallo.jpg',       // era .png
  'top-crime':      '/channel-logos/top-crime.jpg',    // era .png
  'topcrime':       '/channel-logos/topcrime.png',
  'dmax':           '/channel-logos/dmax.jpg',         // era .png
  'warner-tv':      '/channel-logos/warner-tv.png',
  // ── Sky ──────────────────────────────────────────────────────────────────
  'sky-uno':        '/channel-logos/sky-uno.png',
  'sky-tg24':       '/channel-logos/sky-tg24.png',
  'sky-sport':      '/channel-logos/sky-sport.jpg',    // era .png
  'sky-cinema-uno': '/channel-logos/sky-cinema-uno.png',
  // ── Altri ────────────────────────────────────────────────────────────────
  'tv2000':         '/channel-logos/tv2000.png',
  'supertennis':    '/channel-logos/supertennis.png',
  'inter-tv':       '/channel-logos/inter-tv.png',
  'euronews':       '/channel-logos/euronews.png',
  'bloomberg':      '/channel-logos/bloomberg.png',
};

const GENERIC_LOGO =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y4ZmFmYyIgcng9IjgiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2NiZDVlMSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VFY8L3RleHQ+PC9zdmc+';

export const getChannelLogo = (channelId: string, logoUrl?: string | null, channelName?: string): string => {
  const id = channelId?.toLowerCase().trim();

  // 1. Prova il logo locale (priorità massima — nessuna hotlink protection)
  if (id && LOCAL_LOGOS[id]) return LOCAL_LOGOS[id];

  // 2. Se il DB ha un URL del sito che punta a /channel-logos/, converti in locale
  if (
    logoUrl?.includes('123programmitv.it/channel-logos/')
    || logoUrl?.includes('www.intvstasera.it/channel-logos/')
    || logoUrl?.includes('intvstasera.it/channel-logos/')
  ) {
    const filename = logoUrl.split('/channel-logos/').pop();
    if (filename) return `/channel-logos/${filename}`;
  }

  // 3. Usa l'URL del DB se è un URL esterno valido (non hotlink-protetto)
  if (
    logoUrl
    && logoUrl.trim()
    && !logoUrl.includes('123programmitv.it')
    && !logoUrl.includes('intvstasera.it')
    && logoUrl !== 'null'
  ) {
    return logoUrl;
  }

  // 4. Fallback: cerca per channel_id nel path locale
  if (id) return `/channel-logos/${id}.png`;

  return GENERIC_LOGO;
};
