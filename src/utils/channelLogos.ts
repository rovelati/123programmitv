/**
 * Risolve il logo di un canale con fallback a /channel-logos/ (Cloudflare Pages CDN).
 * I loghi locali sono in public/channel-logos/ — nessuna hotlink protection.
 */

// Loghi locali per i canali principali (file in public/channel-logos/)
const LOCAL_LOGOS: Record<string, string> = {
  // ── RAI ──────────────────────────────────────────────────────────────────
  'rai-1':          '/channel-logos/rai-1.svg',
  'rai-2':          '/channel-logos/rai-2.svg',
  'rai-3':          '/channel-logos/rai-3.svg',
  'rai-4':          '/channel-logos/rai-4.svg',
  'rai-5':          '/channel-logos/rai-5.svg',
  'rai-movie':      '/channel-logos/rai-movie.png',
  'rai-premium':    '/channel-logos/rai-premium.png',
  'rai-news':       '/channel-logos/rai-news.png',
  'rai-storia':     '/channel-logos/rai-storia.png',
  'rai-scuola':     '/channel-logos/rai-scuola.png',
  'rai-sport':      '/channel-logos/rai-sport.png',
  'rai-sport-1':    '/channel-logos/rai-sport-1.png',
  'rai-gulp':       '/channel-logos/rai-gulp.png',
  'rai-yoyo':       '/channel-logos/rai-yoyo.png',
  // ── Mediaset ─────────────────────────────────────────────────────────────
  'canale-5':                  '/channel-logos/canale-5.svg',
  'italia-1':                  '/channel-logos/italia-1.png',
  'italia-2':                  '/channel-logos/italia-2.svg',
  'rete-4':                    '/channel-logos/rete-4.svg',
  'boing':                     '/channel-logos/boing.png',
  'k2':                        '/channel-logos/k2.png',
  'frisbee':                   '/channel-logos/frisbee.png',
  'cartoonito':                '/channel-logos/cartoonito.png',
  'cine34':                    '/channel-logos/cine34.jpg',
  'focus':                     '/channel-logos/focus.png',
  'tgcom24':                   '/channel-logos/tgcom24.jpg',
  'mediaset-extra':            '/channel-logos/mediaset-extra.png',
  'twenty-seven':              '/channel-logos/twenty-seven.svg',
  'mediaset-27-twentyseven':   '/channel-logos/twenty-seven.svg',
  '20':                        '/channel-logos/20.jpg',
  'la5':                       '/channel-logos/la5.png',
  'iris':                      '/channel-logos/iris.svg',
  'top-crime':                 '/channel-logos/top-crime.png',
  'topcrime':                  '/channel-logos/topcrime.png',
  // ── La7 ──────────────────────────────────────────────────────────────────
  'la7':            '/channel-logos/la7.png',
  'la7d':           '/channel-logos/la7d.png',
  // ── Discovery & Warner & Altri ───────────────────────────────────────────
  'tv8':            '/channel-logos/tv8.png',
  'nove':           '/channel-logos/nove.png',
  'cielo':          '/channel-logos/cielo.png',
  'real-time':      '/channel-logos/real-time.png',
  'giallo':         '/channel-logos/giallo.png',
  'dmax':           '/channel-logos/dmax.png',
  'super':          '/channel-logos/super.png',
  'qvc':            '/channel-logos/qvc.png',
  'warner-tv':      '/channel-logos/warner-tv.png',
  // ── Sky ──────────────────────────────────────────────────────────────────
  'sky-uno':        '/channel-logos/sky-uno.png',
  'sky-serie':      '/channel-logos/sky-serie.png',
  'sky-atlantic':   '/channel-logos/sky-atlantic.png',
  'sky-tg24':       '/channel-logos/sky-tg24.png',
  'sky-sport':      '/channel-logos/sky-sport.jpg',
  'sky-sport-uno':  '/channel-logos/sky-sport-uno.png',
  'sky-sport-arena':'/channel-logos/sky-sport-arena.png',
  'sky-cinema-uno': '/channel-logos/sky-cinema-uno.png',
  'sky-cinema-action':'/channel-logos/sky-cinema-action.png',
  'sky-cinema-comedy':'/channel-logos/sky-cinema-comedy.png',
  'sky-cinema-drama':'/channel-logos/sky-cinema-drama.png',
  'sky-cinema-family':'/channel-logos/sky-cinema-family.png',
  'sky-cinema-romance':'/channel-logos/sky-cinema-romance.png',
  'sky-cinema-suspense':'/channel-logos/sky-cinema-suspense.png',
  'sky-cinema-collection':'/channel-logos/sky-cinema-collection.png',
  // ── Altri Nazionali & Tematici ────────────────────────────────────────────
  'tv2000':         '/channel-logos/tv2000.png',
  'supertennis':    '/channel-logos/supertennis.png',
  'inter-tv':       '/channel-logos/inter-tv.png',
  'history-channel':'/channel-logos/history-channel.png',
  'comedy-central': '/channel-logos/comedy-central.svg',
  'cartoon-network':'/channel-logos/cartoon-network.png',
  'boomerang':      '/channel-logos/boomerang.png',
  'nickelodeon':    '/channel-logos/nickelodeon.png',
  'antenna3':       '/channel-logos/antenna3.png',
  'telelombardia':  '/channel-logos/telelombardia.png',
  'class-tv-moda':  '/channel-logos/class-tv-moda.png',
  'al-jazeera':     '/channel-logos/al-jazeera.png',
  'alma-tv':        '/channel-logos/alma-tv.png',
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
