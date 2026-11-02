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
  film: 'Film stasera in TV: scopri tutti i film di oggi in onda su RAI, Mediaset e DTT. Trame, orari di prima serata e cast: scegli subito cosa guardare stasera!',
  serie: 'Serie TV stasera in TV: scopri fiction, serie e telefilm in onda su RAI, Mediaset e DTT. Consulta orari ed episodi: non perdere le tue puntate preferite!',
  sport: 'Sport stasera in TV: partite di calcio in chiaro e Sky, tennis, Formula 1, MotoGP e basket di oggi. Consulta canali, orari e palinsesto per non perderti nulla!',
  cookiePolicy: 'Cookie Policy di inTVstasera.it: informativa completa su cookie tecnici e analitici per proteggere la tua privacy sul sito web e sull\'app mobile Stasera In TV.',
  terminiCondizioni: 'Termini e condizioni d\'uso di inTVstasera.it: consulta le regole del servizio di guida ai programmi TV, diritti, copyright e dell\'applicazione Stasera In TV.',
  privacyPolicy: 'Privacy Policy di inTVstasera.it: informativa sul trattamento dati personali (GDPR) per tutelare la tua navigazione sul portale e sull\'app mobile Stasera In TV.',
  frequenzeDtt: 'Frequenze TV e canali digitale terrestre in Italia: tabella LCN aggiornata, multiplex Mux Rai e Mediaset. Trova subito la frequenza del tuo canale TV preferito!',
  usciteSerieTv: 'Quando escono i nuovi episodi delle tue serie TV preferite? Scopri il calendario uscite con countdown in tempo reale per Netflix, Prime e Sky. Non perderti nulla!',
} as const;

/**
 * Genera il title SEO per la pagina canale stasera (/${canale}/).
 * Include varianti ad alto rendimento su GSC e Bing (Inter TV, La7d, 20 Mediaset, Sky Calcio, Eurosport).
 */
export function getChannelStaseraTitle(channelName: string, channelId?: string): string {
  switch (channelId) {
    case 'inter-tv':
      return 'Inter TV oggi e stasera: programmazione, palinsesto e orari partite';
    case 'la7d':
      return 'La7d stasera e oggi: programmi TV, film e palinsesto (Canale 29)';
    case '20':
      return 'Canale 20 Mediaset stasera e oggi: programmi TV, film e palinsesto';
    case 'mediaset-27-twentyseven':
    case 'twenty-seven':
      return 'Canale 27 Twentyseven stasera e oggi: film, programmi TV e palinsesto';
    case 'eurosport':
    case 'eurosport-1':
      return 'Eurosport stasera e oggi: programmazione, guida TV e palinsesto';
    case 'sky-sport-calcio':
      return 'Sky Sport Calcio stasera e oggi: partite, programmazione e diretta TV';
    case 'rai-2':
      return 'Rai 2 stasera e oggi: programmi TV, serie e palinsesto prima serata';
    case 'rai-3':
      return 'Rai 3 stasera e oggi: programmi TV, approfondimenti e palinsesto';
    default:
      return `${channelName} stasera e oggi: programmi TV, palinsesto e orari`;
  }
}

/**
 * Genera il title SEO per la pagina canale domani (/${canale}/domani/).
 */
export function getChannelDomaniTitle(channelName: string, channelId?: string): string {
  switch (channelId) {
    case 'inter-tv':
      return 'Inter TV domani: programmazione, orari repliche e palinsesto TV';
    case 'la7d':
      return 'La7d domani: programmi TV, film e palinsesto aggiornato';
    case '20':
      return 'Canale 20 Mediaset domani: programmi TV, film e palinsesto';
    default:
      return `${channelName} domani: programmi TV e palinsesto aggiornato`;
  }
}

/**
 * Genera la meta description dinamica per la pagina canale stasera (/${canale}/).
 * Mantiene la lunghezza ottimale tra 148 e 159 caratteri per qualsiasi canale.
 */
export function getChannelStaseraDescription(channelName: string, channelId?: string): string {
  if (channelId === 'inter-tv') {
    return 'Palinsesto e programmazione di oggi e stasera su Inter TV: orari repliche partite, interviste esclusive e news. Scopri subito cosa guardare sul canale nerazzurro!';
  }
  if (channelId === '20') {
    return 'Cosa c\'è stasera su Canale 20 Mediaset: programmazione e film di oggi in prima e seconda serata, orari e trame aggiornate. Scegli subito cosa guardare sul 20 DTT!';
  }
  if (channelId === 'la7d') {
    return 'Cosa c\'è stasera in TV su La7d (Canale 29): programmazione e film di oggi, orari prima serata, serie e repliche. Consulta subito il palinsesto aggiornato!';
  }
  if (channelId === 'eurosport' || channelId === 'eurosport-1') {
    return 'Programmazione Eurosport oggi e stasera: guida TV completa con orari dirette ed eventi di tennis, ciclismo, motori e sci. Consulta subito il palinsesto!';
  }
  if (channelId === 'sky-sport-calcio') {
    return 'Partite di calcio stasera in TV su Sky Sport Calcio: programmazione, orari, dirette e repliche di Serie A e coppe. Consulta subito la guida TV aggiornata!';
  }
  if (channelId === 'rai-2') {
    return 'Cosa c\'è stasera su Rai 2: programmazione e palinsesto di oggi con orari di prima serata, serie TV, film e approfondimenti. Scegli subito cosa guardare!';
  }
  if (channelId === 'rai-3') {
    return 'Cosa c\'è stasera su Rai 3: palinsesto completo di oggi, programmi di attualità, inchieste, cinema e cultura in prima serata. Consulta subito la guida TV!';
  }

  const full = `Scopri cosa c'è stasera in TV su ${channelName}: palinsesto completo di prima e seconda serata con orari, trame e dettagli. Scegli subito cosa guardare!`;
  if (full.length > 158) {
    return `Scopri cosa c'è stasera in TV su ${channelName}: palinsesto completo di prima e seconda serata con orari, trame e anticipazioni. Scegli cosa guardare!`;
  }
  return full;
}

/**
 * Genera la meta description dinamica per la pagina canale domani (/${canale}/domani/).
 * Mantiene la lunghezza ottimale tra 149 e 158 caratteri per qualsiasi canale.
 */
export function getChannelDomaniDescription(channelName: string, channelId?: string): string {
  if (channelId === 'inter-tv') {
    return 'Scopri la programmazione di domani su Inter TV: palinsesto completo, orari repliche partite, conferenze stampa e rassegna stampa. Consulta subito la guida!';
  }
  const full = `Scopri cosa c'è domani in TV su ${channelName}: palinsesto completo con orari, film, serie e la prima serata da non perdere. Consulta subito la guida aggiornata!`;
  if (full.length > 158) {
    return `Scopri cosa c'è domani in TV su ${channelName}: palinsesto completo con orari, film, serie, prima e seconda serata. Consulta la programmazione aggiornata!`;
  }
  return full;
}
