/**
 * adsense.ts — inTV stasera (www.intvstasera.it) AdSense Config
 * Centralizzazione Publisher ID e slot pubblicitari UX-friendly.
 */

export const ADSENSE_CLIENT_ID = 'ca-pub-2168172914069272';

export const ADSENSE_SLOTS = {
  // In-Feed tra i canali (dopo i primi 8 canali principali senza interrompere l'eroe iniziale)
  IN_FEED_CHANNELS: '3881971380',
  // Mid-Content nella scheda canale (tra il palinsesto e i canali correlati)
  CHANNEL_MID_CONTENT: '4452817027',
  // Pre-Footer (sopra i link SEO e la navigazione a fine pagina)
  FOOTER_PRE_SEO: '1255808043',
} as const;
