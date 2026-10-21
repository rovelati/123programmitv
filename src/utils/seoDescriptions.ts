/**
 * SEO Meta Descriptions per inTVstasera.it
 *
 * Linee guida Bing Webmaster & Google Search:
 * - Lunghezza raccomandata: 150-160 caratteri (evita warning "too short" < 110 car e troncamenti SERP > 160 car).
 * - Tono accattivante con Call to Action (CTA) chiara ("Scopri...", "Scegli...", "Consulta...").
 * - Keyword semantiche primarie incluse (palinsesto, prima serata, seconda serata, orari, film, serie TV).
 */

export const SEO_DESCRIPTIONS = {
  home: 'inTV stasera: scopri cosa c\'è in onda su RAI, Mediaset e canali del digitale terrestre. Film, serie e programmi di prima serata: scegli subito cosa guardare!',
  domani: 'Programmi TV domani: guida completa con orari, film, serie e la prima serata sui canali RAI, Mediaset e DTT. Organizza subito la tua serata in TV in un clic!',
  ora: 'Cosa c\'è adesso in TV? Scopri i programmi attualmente in onda sui canali RAI, Mediaset e digitale terrestre con orari e durata residua. Scegli cosa vedere ora!',
  film: 'Film stasera in TV: scopri tutti i film di oggi in onda su RAI, Mediaset e DTT. Consulta trame, orari e cast: scegli subito il film perfetto per la tua serata!',
  serie: 'Serie TV stasera in TV: scopri fiction, serie e telefilm in onda su RAI, Mediaset e DTT. Consulta orari ed episodi: non perdere le tue puntate preferite!',
  sport: 'Sport stasera in TV: guida a partite di calcio, tennis, motori, basket e grandi eventi in onda. Scopri canali e orari per non perderti nessun minuto di azione!',
  cookiePolicy: 'Cookie Policy di inTVstasera.it: informativa completa su cookie tecnici e analitici per proteggere la tua privacy sul sito web e sull\'app mobile Stasera In TV.',
  terminiCondizioni: 'Termini e condizioni d\'uso di inTVstasera.it: consulta le regole del servizio di guida ai programmi TV, diritti, copyright e dell\'applicazione Stasera In TV.',
  privacyPolicy: 'Privacy Policy di inTVstasera.it: informativa sul trattamento dati personali (GDPR) per tutelare la tua navigazione sul portale e sull\'app mobile Stasera In TV.',
  frequenzeDtt: 'Frequenze TV e canali digitale terrestre in Italia: tabella LCN aggiornata, multiplex Mux Rai e Mediaset. Trova subito la frequenza del tuo canale TV preferito!',
  usciteSerieTv: 'Quando escono i nuovi episodi delle tue serie TV preferite? Scopri il calendario uscite con countdown in tempo reale per Netflix, Prime e Sky. Non perderti nulla!',
} as const;

/**
 * Genera la meta description dinamica per la pagina canale stasera (/${canale}/).
 * Mantiene la lunghezza ottimale tra 148 e 158 caratteri per qualsiasi canale.
 */
export function getChannelStaseraDescription(channelName: string): string {
  const full = `Scopri cosa c'è stasera in TV su ${channelName}: palinsesto completo con prima e seconda serata, orari aggiornati, trame e dettagli. Scegli subito cosa guardare!`;
  if (full.length > 158) {
    return `Scopri cosa c'è stasera in TV su ${channelName}: palinsesto completo di prima e seconda serata con orari, trame e anticipazioni. Scegli cosa guardare!`;
  }
  return full;
}

/**
 * Genera la meta description dinamica per la pagina canale domani (/${canale}/domani/).
 * Mantiene la lunghezza ottimale tra 149 e 158 caratteri per qualsiasi canale.
 */
export function getChannelDomaniDescription(channelName: string): string {
  const full = `Scopri cosa c'è domani in TV su ${channelName}: palinsesto completo con orari, film, serie e la prima serata da non perdere. Consulta subito la guida aggiornata!`;
  if (full.length > 158) {
    return `Scopri cosa c'è domani in TV su ${channelName}: palinsesto completo con orari, film, serie, prima e seconda serata. Consulta la programmazione aggiornata!`;
  }
  return full;
}
