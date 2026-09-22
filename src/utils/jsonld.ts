/**
 * JSON-LD schema generators — In TV Stasera
 *
 * Basato su:
 * - Google Search API leak (maggio 2024): freshness signal via dateModified,
 *   entity disambiguation con @id, BroadcastEvent per rich results TV
 * - Google Rich Results spec: BroadcastEvent, Movie, TVSeries, TVEpisode
 * - schema.org best practice 2025 per TV guide
 *
 * Regole:
 * - Ogni entità principale ha @id assoluto per l'entity graph
 * - WebPage con dateModified = ora del build (freshness signal per daily content)
 * - BroadcastEvent completo → rich snippet nella SERP Entertainment/TV
 * - Movie con WatchAction → eligible per Video rich results
 * - Publisher/Organization come entità root riutilizzata via @id
 */
import type { Channel, Program } from '../types';
import { getChannelLogo } from './channelLogos';
import { absoluteUrl, SITE_ORIGIN } from './urls';
import { filterStaseraPrograms } from './timeSlots';

const SITE_URL   = SITE_ORIGIN;
const SITE_NAME  = 'inTVstasera.it';
const ORG_ID     = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const ITALY_ID   = 'https://www.wikidata.org/wiki/Q38';

// ---------------------------------------------------------------------------
// Wikidata entity disambiguation per i canali principali italiani
// sameAs verso Wikidata aiuta Google a collegare l'entità al Knowledge Graph
// ---------------------------------------------------------------------------
const CHANNEL_WIKIDATA: Record<string, string> = {
  'rai-1':        'https://www.wikidata.org/wiki/Q18660073',
  'rai-2':        'https://www.wikidata.org/wiki/Q3773586',
  'rai-3':        'https://www.wikidata.org/wiki/Q3773590',
  'rai-4':        'https://www.wikidata.org/wiki/Q3773594',
  'rai-5':        'https://www.wikidata.org/wiki/Q3773596',
  'rai-movie':    'https://www.wikidata.org/wiki/Q7280454',
  'canale-5':     'https://www.wikidata.org/wiki/Q1085613',
  'italia-1':     'https://www.wikidata.org/wiki/Q1347804',
  'rete-4':       'https://www.wikidata.org/wiki/Q1082534',
  'la7':          'https://www.wikidata.org/wiki/Q1047313',
  'la7d':         'https://www.wikidata.org/wiki/Q3778540',
  'tv8':          'https://www.wikidata.org/wiki/Q3978226',
  'nove':         'https://www.wikidata.org/wiki/Q12039030',
  'iris':         'https://www.wikidata.org/wiki/Q3778004',
  'cielo':        'https://www.wikidata.org/wiki/Q3782890',
  'real-time':    'https://www.wikidata.org/wiki/Q3988091',
  'dmax':         'https://www.wikidata.org/wiki/Q1207878',
  'twenty-seven': 'https://www.wikidata.org/wiki/Q27973978',
  'cine34':       'https://www.wikidata.org/wiki/Q55673455',
  'top-crime':    'https://www.wikidata.org/wiki/Q16900036',
  'giallo':       'https://www.wikidata.org/wiki/Q16900035',
  'inter-tv':     'https://www.wikidata.org/wiki/Q3800609',
  'milan-tv':     'https://www.wikidata.org/wiki/Q1333792',
};

// URL streaming ufficiali — usati in WatchAction
const CHANNEL_STREAM_URL: Record<string, string> = {
  'rai-1':     'https://www.raiplay.it/dirette/rai1',
  'rai-2':     'https://www.raiplay.it/dirette/rai2',
  'rai-3':     'https://www.raiplay.it/dirette/rai3',
  'rai-4':     'https://www.raiplay.it/dirette/rai4',
  'rai-5':     'https://www.raiplay.it/dirette/rai5',
  'rai-movie': 'https://www.raiplay.it/dirette/raimovie',
  'canale-5':  'https://www.mediasetinfinity.mediaset.it/diretta/canale5_cC5',
  'italia-1':  'https://www.mediasetinfinity.mediaset.it/diretta/italia1_cI1',
  'rete-4':    'https://www.mediasetinfinity.mediaset.it/diretta/rete4_cR4',
  'la7':       'https://www.la7.it/dirette-tv',
  'tv8':       'https://www.tv8.it/live',
  'nove':      'https://nove.tv/live-streaming-nove',
  'cielo':     'https://www.cielotv.it/live.html',
  'inter-tv':  'https://www.inter.it/it/inter-tv',
  'milan-tv':  'https://www.acmilan.com/it/milan-tv',
};

// ---------------------------------------------------------------------------
// Helpers interni
// ---------------------------------------------------------------------------

/** ISO 8601 duration: PT1H30M */
function isoDuration(start: string, end: string): string {
  const ms = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  const totalMin = Math.round(ms / 60000);
  if (totalMin === 0) return 'PT0M';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `PT${h}H${m}M`;
  if (h > 0) return `PT${h}H`;
  return `PT${m}M`;
}

/** Estrae anno da titoli tipo "Nome Film (2023)" */
function extractYear(title: string): string | null {
  const match = title.match(/\((\d{4})\)/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  return (y >= 1900 && y <= 2030) ? match[1] : null;
}

function defaultImageUrl(siteUrl = SITE_URL): string {
  return `${siteUrl.replace(/\/$/, '')}/favicon/apple-touch-icon.png`;
}

/** URL assoluto per immagini schema.org (no data: URI). */
function toAbsoluteImageUrl(raw: string | null | undefined, siteUrl = SITE_URL): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('data:')) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${siteUrl.replace(/\/$/, '')}${trimmed}`;
  return `${siteUrl.replace(/\/$/, '')}/${trimmed}`;
}

/** Poster programma → logo canale → immagine sito (Movie richiede image). */
function programImageUrl(program: Program, channel?: Channel, siteUrl = SITE_URL): string {
  return (
    toAbsoluteImageUrl(program.poster_url, siteUrl)
    ?? (channel ? toAbsoluteImageUrl(channel.logo, siteUrl) : null)
    ?? (program.channel_id
      ? toAbsoluteImageUrl(getChannelLogo(program.channel_id), siteUrl)
      : null)
    ?? defaultImageUrl(siteUrl)
  );
}

function schemaImageObject(url: string): Record<string, unknown> {
  return {
    '@type': 'ImageObject',
    url,
    representativeOfPage: true,
  };
}

/** Determina il tipo schema.org del contenuto trasmesso */
function workType(program: Program): 'Movie' | 'TVEpisode' | 'SportsEvent' {
  const cat   = (program.category ?? '').toLowerCase();
  const hasYear = !!extractYear(program.title);

  if (cat.includes('film') || cat.includes('movie') || cat.includes('cinema') || hasYear) return 'Movie';
  if (cat.includes('sport') || cat.includes('calcio') || cat.includes('tennis') || cat.includes('formula')) return 'SportsEvent';
  return 'TVEpisode';
}

const EVENT_SCHEDULED = 'https://schema.org/EventScheduled';
const ONLINE_ATTENDANCE = 'https://schema.org/OnlineEventAttendanceMode';

/** Location per eventi TV trasmessi online (VirtualLocation richiede eventAttendanceMode). */
function onlineEventLocation(streamUrl: string): Record<string, unknown> {
  return { '@type': 'VirtualLocation', url: streamUrl };
}

/** Campi Event/SportsEvent richiesti da Google quando location è VirtualLocation. */
function onlineEventExtras(
  channel: Channel,
  channelUrl: string,
  streamUrl?: string,
  program?: Program,
): Record<string, unknown> {
  return {
    eventStatus: EVENT_SCHEDULED,
    eventAttendanceMode: ONLINE_ATTENDANCE,
    organizer: {
      '@type': 'Organization',
      name: channel.name,
      url: channelUrl,
    },
    ...(program ? {
      description: program.description ?? `${program.title} in onda su ${channel.name}`,
    } : {}),
    ...(program ? { image: programImageUrl(program, channel) } : {}),
    ...(streamUrl ? {
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        url: streamUrl,
      },
    } : {}),
  };
}

function watchAction(streamUrl: string): Record<string, unknown> {
  return {
    '@type': 'WatchAction',
    target: { '@type': 'EntryPoint', urlTemplate: streamUrl },
  };
}

/** Entità Organization root — referenziata via @id in tutti gli schemi */
function orgEntity(): Record<string, unknown> {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    // knowsAbout migliora authorityScore per topical authority (confermato dal Google leak)
    knowsAbout: ['Television', 'Televisione italiana', 'Guida TV', 'Palinsesto TV'],
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/favicon/apple-touch-icon.png`,
      width: 180,
      height: 180,
    },
  };
}

/** Entità WebSite root con SearchAction (Sitelinks search box eligible) */
function websiteEntity(): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'it',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * WebPage entity con dateModified = ora del build.
 * CRITICO per freshness: Google leak ha confermato dateModified come strong signal.
 * Per un sito che rebuilda ogni giorno, questo vale la data di oggi.
 */
function webPageEntity(url: string, name: string, description: string): Record<string, unknown> {
  return {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: 'it',
    dateModified: new Date().toISOString(),
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORG_ID },
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };
}

/** BroadcastService completo con Wikidata sameAs per entity disambiguation */
function broadcastServiceEntity(channel: Channel, siteUrl = SITE_URL): Record<string, unknown> {
  const channelUrl = absoluteUrl(`/${channel.id}`, siteUrl);
  const wikidata   = CHANNEL_WIKIDATA[channel.id];

  return {
    '@type': 'BroadcastService',
    '@id': `${channelUrl}#channel`,
    name: channel.name,
    broadcastDisplayName: channel.name,
    ...(channel.number ? { broadcastChannelId: String(channel.number) } : {}),
    broadcastTimezone: 'Europe/Rome',
    inLanguage: 'it',
    areaServed: {
      '@type': 'Country',
      name: 'Italy',
      sameAs: ITALY_ID,
    },
    ...(wikidata ? { sameAs: wikidata } : {}),
    broadcastAffiliateOf: {
      '@type': 'Organization',
      name: channel.name,
      url: channelUrl,
    },
  };
}

/**
 * BroadcastEvent completo — genera rich result nella SERP Entertainment.
 * Campi obbligatori per eligibility: name, startDate, endDate, publishedOn.
 * Campi consigliati: duration, isLiveBroadcast, eventStatus, workPerformed.
 */
function broadcastEventEntity(
  program: Program,
  channel: Channel,
  eventId: string,   // usato solo per @id univoco, NON come url navigabile
  siteUrl = SITE_URL,
): Record<string, unknown> {
  const type       = workType(program);
  const year       = extractYear(program.title);
  const streamUrl  = CHANNEL_STREAM_URL[channel.id];
  const channelUrl = absoluteUrl(`/${channel.id}`, siteUrl);

  const imageUrl = programImageUrl(program, channel, siteUrl);

  // workPerformed: Movie / TVEpisode / SportsEvent
  const workPerformed: Record<string, unknown> = {
    '@type': type,
    '@id': `${eventId}#work`,
    name: program.title,
    inLanguage: 'it',
    ...(program.description ? { description: program.description } : {}),
    ...(program.category ? { genre: program.category } : {}),
    ...(type === 'Movie'
      ? { image: schemaImageObject(imageUrl), ...(year ? { dateCreated: year } : {}) }
      : program.poster_url
        ? { image: toAbsoluteImageUrl(program.poster_url, siteUrl) ?? program.poster_url }
        : {}),
    url: channelUrl,
  };

  if (type === 'SportsEvent') {
    workPerformed['startDate'] = program.startTime;
    workPerformed['endDate']   = program.endTime;
    Object.assign(workPerformed, onlineEventExtras(channel, channelUrl, streamUrl, program));
    if (streamUrl) {
      workPerformed['location'] = onlineEventLocation(streamUrl);
    } else {
      workPerformed['location'] = {
        '@type': 'Place',
        name: channel.name,
        address: { '@type': 'PostalAddress', addressCountry: 'IT' },
      };
    }
  }

  if (type === 'TVEpisode') {
    workPerformed['partOfSeries'] = {
      '@type': 'TVSeries',
      name: program.title,
      url: channelUrl,
    };
  }

  if (streamUrl) {
    workPerformed['potentialAction'] = watchAction(streamUrl);
  }

  const broadcastEvent: Record<string, unknown> = {
    '@type': 'BroadcastEvent',
    '@id': `${eventId}#event`,
    name: program.title,
    ...(program.description ? { description: program.description } : {}),
    startDate: program.startTime,
    endDate:   program.endTime,
    duration:  isoDuration(program.startTime, program.endTime),
    isLiveBroadcast: false,
    videoFormat: 'HD',
    eventStatus: EVENT_SCHEDULED,
    inLanguage: 'it',
    url: channelUrl,
    image: imageUrl,
    publishedOn: { '@id': `${channelUrl}#channel` },
    workPerformed,
  };

  if (streamUrl) {
    broadcastEvent['eventAttendanceMode'] = ONLINE_ATTENDANCE;
    broadcastEvent['location'] = onlineEventLocation(streamUrl);
    broadcastEvent['organizer'] = {
      '@type': 'Organization',
      name: channel.name,
      url: channelUrl,
    };
  } else {
    broadcastEvent['location'] = {
      '@type': 'Place',
      name: channel.name,
      address: { '@type': 'PostalAddress', addressCountry: 'IT' },
    };
  }

  return broadcastEvent;
}

// ===========================================================================
// Funzioni pubbliche per ogni tipo di pagina
// ===========================================================================

// ---------------------------------------------------------------------------
// Hub canale (/[canale])
// ---------------------------------------------------------------------------
export function buildHubChannelJsonLd({
  channel,
  programs,
  today,
  siteUrl = SITE_URL,
  canonicalPath,
  pageTitle,
  pageDescription,
}: {
  channel: Channel;
  programs: Program[];
  today: string;
  siteUrl?: string;
  canonicalPath?: string;
  pageTitle?: string;
  pageDescription?: string;
}): object[] {
  const channelUrl = absoluteUrl(`/${channel.id}`, siteUrl);
  const pageUrl = canonicalPath ? absoluteUrl(canonicalPath, siteUrl) : channelUrl;
  const resolvedTitle = pageTitle ?? `Programmi ${channel.name} stasera`;
  const pageDesc = pageDescription ?? `Guida TV ${channel.name}: tutti i programmi in onda stasera. Orari e palinsesti aggiornati.`;

  // Solo programmi serali coerenti con la pagina canale
  const primeTime = filterStaseraPrograms(programs);

  const broadcastService = broadcastServiceEntity(channel, siteUrl);

  // BroadcastEvent per i programmi prime time (max 10)
  // @id usa anchor univoco sull'hub (es: /rai-1#event-abc123), non /programma/
  const broadcastEvents = primeTime.slice(0, 10).map(p =>
    broadcastEventEntity(
      p, channel,
      `${channelUrl}#prog-${p.id ?? p.slug}`,
      siteUrl,
    ),
  );

  const tvChannel: object = {
    '@context': 'https://schema.org',
    '@type': 'TVChannel',
    '@id': `${channelUrl}#tvchannel`,
    name: channel.name,
    ...(channel.number ? { broadcastChannelId: String(channel.number) } : {}),
    url: channelUrl,
    inBroadcastLineup: { '@id': `${channelUrl}#channel` },
    broadcastOfEvent: broadcastEvents,
  };

  const itemList: object = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${pageUrl}#list`,
    name: `${resolvedTitle} — ${today}`,
    url: pageUrl,
    numberOfItems: primeTime.length,
    // url punta all'hub, non a /programma/ (pagine inesistenti → 410)
    itemListElement: primeTime.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.title,
      url: channelUrl,
      ...(p.description ? { description: p.description.slice(0, 160) } : {}),
    })),
  };

  const breadcrumb: object = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'inTV stasera', item: absoluteUrl('/', siteUrl) },
      { '@type': 'ListItem', position: 2, name: channel.name, item: pageUrl },
    ],
  };

  const webPage: object = {
    '@context': 'https://schema.org',
    ...webPageEntity(pageUrl, resolvedTitle, pageDesc),
  };

  return [
    { '@context': 'https://schema.org', ...orgEntity() },
    { '@context': 'https://schema.org', ...broadcastService },
    tvChannel,
    itemList,
    breadcrumb,
    webPage,
  ];
}

// ---------------------------------------------------------------------------
// Hub home (/)
// ---------------------------------------------------------------------------
export function buildHubHomeJsonLd({
  channels,
  today,
  siteUrl = SITE_URL,
  canonicalPath = '/',
  pageTitle,
  pageDescription,
}: {
  channels: Channel[];
  today: string;
  siteUrl?: string;
  canonicalPath?: string;
  pageTitle?: string;
  pageDescription?: string;
}): object[] {
  const pageUrl = absoluteUrl(canonicalPath, siteUrl);
  const title = pageTitle ?? `Programmi TV stasera — ${today}`;
  const description = pageDescription ?? 'Guida TV italiana: tutti i programmi stasera su RAI, Mediaset, La7 e canali tematici.';

  return [
    { '@context': 'https://schema.org', ...websiteEntity() },
    { '@context': 'https://schema.org', ...orgEntity() },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': `${pageUrl}#list`,
      name: `${title} — ${today}`,
      url: pageUrl,
      numberOfItems: channels.length,
      itemListElement: channels.slice(0, 15).map((ch, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: `Programmi ${ch.name} stasera`,
        url: absoluteUrl(`/${ch.id}`, siteUrl),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      ...webPageEntity(
        pageUrl,
        title,
        description,
      ),
    },
  ];
}

// ---------------------------------------------------------------------------
// Hub categoria (/film-stasera, /serie-stasera, /sport-stasera)
// ---------------------------------------------------------------------------
export function buildHubCategoryJsonLd({
  categoryName,
  categorySlug,
  programs,
  today,
  siteUrl = SITE_URL,
}: {
  categoryName: string;
  categorySlug: string;
  programs: Program[];
  today: string;
  siteUrl?: string;
}): object[] {
  const pageUrl    = absoluteUrl(`/${categorySlug}`, siteUrl);
  const isFilmPage = categorySlug === 'film-stasera';

  const itemListElements = programs.slice(0, 20).map((p, i) => {
    const channelUrl = p.channel_id ? absoluteUrl(`/${p.channel_id}`, siteUrl) : pageUrl;
    if (isFilmPage) {
      const year = extractYear(p.title);
      const imageUrl = programImageUrl(p, undefined, siteUrl);
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Movie',
          name: p.title,
          ...(p.description ? { description: p.description.slice(0, 160) } : {}),
          image: schemaImageObject(imageUrl),
          ...(year ? { dateCreated: year } : {}),
          inLanguage: 'it',
          url: channelUrl,
        },
      };
    }
    return {
      '@type': 'ListItem',
      position: i + 1,
      name: p.title,
      url: channelUrl,
      ...(p.description ? { description: p.description.slice(0, 160) } : {}),
    };
  });

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': `${pageUrl}#list`,
      name: `${categoryName} stasera in TV — ${today}`,
      url: pageUrl,
      numberOfItems: programs.length,
      itemListElement: itemListElements,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',                    item: siteUrl },
        { '@type': 'ListItem', position: 2, name: `${categoryName} stasera`, item: pageUrl },
      ],
    },
    {
      '@context': 'https://schema.org',
      ...webPageEntity(
        pageUrl,
        `${categoryName} stasera in TV — ${today}`,
        `Tutti i programmi ${categoryName.toLowerCase()} in onda stasera sui canali italiani.`,
      ),
    },
  ];
}

// ---------------------------------------------------------------------------
// Scheda singolo programma (/programma/[canale]/[slug])
// ---------------------------------------------------------------------------
export function buildProgramJsonLd({
  program,
  channel,
  siteUrl = SITE_URL,
}: {
  program: Program;
  channel: Channel;
  siteUrl?: string;
}): object[] {
  const programUrl = absoluteUrl(`/programma/${channel.id}/${program.slug ?? program.id}`, siteUrl);
  const channelUrl = absoluteUrl(`/${channel.id}`, siteUrl);
  const type       = workType(program);
  const year       = extractYear(program.title);
  const streamUrl  = CHANNEL_STREAM_URL[channel.id];

  const broadcastService = broadcastServiceEntity(channel, siteUrl);
  const broadcastEvent   = broadcastEventEntity(program, channel, `${programUrl}`, siteUrl);

  // Entità principale del contenuto (Movie / TVEpisode / SportsEvent)
  const workEntity: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${programUrl}#work`,
    name: program.title,
    inLanguage: 'it',
    ...(program.description ? { description: program.description } : {}),
    ...(program.category ? { genre: program.category } : {}),
    ...(type === 'Movie'
      ? {
          image: schemaImageObject(programImageUrl(program, channel, siteUrl)),
          ...(year ? { dateCreated: year } : {}),
        }
      : program.poster_url
        ? { image: schemaImageObject(toAbsoluteImageUrl(program.poster_url, siteUrl) ?? program.poster_url) }
        : {}),
    url: programUrl,
    subjectOf: { '@id': `${programUrl}#event` },
    ...(streamUrl ? {
      potentialAction: {
        '@type': 'WatchAction',
        target: [{ '@type': 'EntryPoint', urlTemplate: streamUrl }],
        actionStatus: 'https://schema.org/PotentialActionStatus',
      },
    } : {}),
  };

  if (type === 'SportsEvent') {
    workEntity['startDate'] = program.startTime;
    workEntity['endDate'] = program.endTime;
    Object.assign(workEntity, onlineEventExtras(channel, channelUrl, streamUrl, program));
    workEntity['location'] = streamUrl
      ? onlineEventLocation(streamUrl)
      : {
          '@type': 'Place',
          name: channel.name,
          address: { '@type': 'PostalAddress', addressCountry: 'IT' },
        };
  }

  if (type === 'TVEpisode') {
    workEntity['partOfSeries'] = {
      '@type': 'TVSeries',
      name: program.title,
      url: channelUrl,
    };
  }

  // VideoObject → eligible per Video rich results se c'è poster + streaming
  const videoObject = (streamUrl && program.poster_url) ? {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    '@id': `${programUrl}#video`,
    name: program.title,
    description: program.description ?? `${program.title} in onda su ${channel.name}`,
    thumbnailUrl: program.poster_url,
    uploadDate: program.startTime,
    duration: isoDuration(program.startTime, program.endTime),
    embedUrl: streamUrl,
    publisher: { '@id': ORG_ID },
  } : null;

  const schemas: object[] = [
    { '@context': 'https://schema.org', ...orgEntity() },
    { '@context': 'https://schema.org', ...broadcastService },
    { '@context': 'https://schema.org', ...broadcastEvent },
    workEntity,
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${programUrl}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home',          item: siteUrl },
        { '@type': 'ListItem', position: 2, name: channel.name,    item: channelUrl },
        { '@type': 'ListItem', position: 3, name: program.title,   item: programUrl },
      ],
    },
    { '@context': 'https://schema.org', ...webPageEntity(programUrl, program.title, program.description?.slice(0, 160) ?? `${program.title} su ${channel.name}`) },
  ];

  if (videoObject) schemas.push(videoObject);
  return schemas;
}
