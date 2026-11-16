/**
 * format.ts — Clean string & metadata formatters for intvstasera.it
 */

const CATEGORY_MAP: Record<string, string> = {
  'film': 'Film',
  'kino': 'Film',
  'cinema': 'Cinema',
  'serie': 'Serie TV',
  'serie tv': 'Serie TV',
  'fiction': 'Fiction',
  'sitcom': 'Sitcom',
  'soap': 'Soap Opera',
  'telenovela': 'Telenovela',
  'calcio': 'Calcio',
  'sport': 'Sport',
  'tennis': 'Tennis',
  'motori': 'Motori',
  'formula 1': 'Formula 1',
  'motogp': 'MotoGP',
  'basket': 'Basket',
  'ciclismo': 'Ciclismo',
  'notizie': 'Notizie',
  'tg': 'Telegiornale',
  'telegiornale': 'Telegiornale',
  'informazione': 'Informazione',
  'attualita': 'Attualità',
  'attualità': 'Attualità',
  'meteo': 'Meteo',
  'documentario': 'Documentario',
  'documentari': 'Documentario',
  'dokumentation': 'Documentario',
  'dok': 'Documentario',
  'cultura': 'Cultura',
  'storia': 'Storia',
  'natura': 'Natura',
  'viaggi': 'Viaggi & Natura',
  'intrattenimento': 'Intrattenimento',
  'unterhaltung': 'Intrattenimento',
  'divertissement': 'Intrattenimento',
  'nachrichten': 'Notizie',
  'spielfilm': 'Film',
  'magazin': 'Rubrica',
  'krimi': 'Giallo',
  'varieta': 'Varietà',
  'varietà': 'Varietà',
  'talk show': 'Talk Show',
  'talk': 'Talk Show',
  'game show': 'Quiz',
  'quiz': 'Quiz',
  'reality': 'Reality',
  'cucina': 'Cucina',
  'musica': 'Musica',
  'bambini': 'Ragazzi & Cartoni',
  'jeunesse': 'Ragazzi',
  'animazione': 'Animazione',
  'televendita': 'Shopping',
  'shopping': 'Shopping'
};

export function localizeCategory(rawCat?: string | null): string {
  if (!rawCat) return '';
  const key = rawCat.toLowerCase().trim();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];

  for (const [k, val] of Object.entries(CATEGORY_MAP)) {
    if (key.includes(k)) return val;
  }
  return rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
}

/**
 * Pulisce descrizioni rimuovendo codici interni come S102026 E2026111425,
 * prefissi tecnici e stringhe sporche.
 */
export function cleanDescription(desc?: string | null): string {
  if (!desc) return '';
  let cleaned = desc.trim();

  // Rimozione codici interni di palinsesto
  cleaned = cleaned.replace(/^S\d+\s+E\d{4,}\s*[-—–:]?\s*/i, '');
  cleaned = cleaned.replace(/^S\d{3,}\s+E\d+\s*[-—–:]?\s*/i, '');
  cleaned = cleaned.replace(/^S\d{3,}\s*[-—–:]?\s*/i, '');
  cleaned = cleaned.replace(/^E\d{4,}\s*[-—–:]?\s*/i, '');

  // Rimozione codici orfani finali
  if (/^S\d+(\s*[-—–:]?)?$/i.test(cleaned) || /^E\d+(\s*[-—–:]?)?$/i.test(cleaned)) {
    return '';
  }

  return cleaned.trim();
}

/**
 * Verifica se un programma deve mostrare o meno il badge con voto IMDb/TMDb.
 * Notiziari, meteo, televendite, lotto e dirette sportive non devono MAI mostrare voti.
 */
export function shouldShowImdbRating(title?: string | null, category?: string | null): boolean {
  if (!title) return false;
  const t = title.toLowerCase().trim();
  const c = (category || '').toLowerCase().trim();
  const full = `${t} ${c}`;

  if (
    full.includes('meteo') || full.includes('previsioni') || full.includes('che tempo fa') ||
    full.includes('tg1') || full.includes('tg2') || full.includes('tg3') || full.includes('tg4') || full.includes('tg5') ||
    full.includes('tgr') || full.includes('studio aperto') || full.includes('telegiornale') ||
    full.includes('tg la7') || full.includes('tgla7') || full.includes('sky tg24') || full.includes('notiziario') ||
    full.includes('lotto') || full.includes('superenalotto') || full.includes('traffico') || full.includes('viabilità') ||
    full.includes('televendita') || full.includes('shopping') || full.includes('mediashopping') ||
    full.includes('diretta sport')
  ) {
    return false;
  }
  return true;
}

/**
 * Formatta voto IMDb/TMDb pulito (es. "7.8").
 * Filtra anomalie a 10.0 con 1 solo voto e rimuove valori non validi.
 */
export function formatImdbRating(rawRating?: number | string | null, title?: string | null, category?: string | null): string | null {
  if (title && !shouldShowImdbRating(title, category)) return null;
  if (!rawRating) return null;

  const num = Number(rawRating);
  if (isNaN(num) || num <= 0) return null;

  let val = num > 10 ? num / 10 : num;
  // Capping per evitare 10.0 artificiali dovuti a un solo voto
  if (val >= 9.8) {
    val = 9.2;
  }
  return val.toFixed(1);
}
