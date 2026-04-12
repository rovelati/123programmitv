/**
 * JSON-LD schema generators per le pagine hub di 123ProgrammiTV.
 * Tutte le funzioni ritornano array di oggetti schema.org pronti per l'iniezione nel <head>.
 */
import type { Channel, Program } from '../types';

const SITE_URL = 'https://www.123programmitv.it';
const SITE_NAME = '123ProgrammiTV';

// ---------------------------------------------------------------------------
// Hub canale (es. /rai-1)
// ---------------------------------------------------------------------------

export function buildHubChannelJsonLd({
  channel,
  programs,
  today,
  siteUrl = SITE_URL,
}: {
  channel: Channel;
  programs: Program[];
  today: string;
  siteUrl?: string;
}): object[] {
  const channelUrl = `${siteUrl}/${channel.id}`;

  // BroadcastEvent per ogni programma in griglia
  const broadcastEvents: object[] = programs.map(p => ({
    '@type': 'BroadcastEvent',
    name: p.title,
    startDate: p.startTime,
    endDate: p.endTime,
    inLanguage: 'it',
    broadcastOf: {
      '@type': p.category?.toLowerCase().includes('film') ? 'Movie' : 'TVEpisode',
      name: p.title,
      ...(p.description ? { description: p.description } : {}),
      ...(p.category ? { genre: p.category } : {}),
    },
    broadcastOn: {
      '@type': 'BroadcastService',
      name: channel.name,
      ...(channel.number ? { broadcastChannelId: String(channel.number) } : {}),
    },
    url: channelUrl,
  }));

  // ItemList prime time (20:00-23:00)
  const primeTime = programs.filter(p => {
    const h = new Date(p.startTime).getUTCHours();
    // Approssimazione: UTC 18-21 ≈ Rome 20-23 (CET/CEST)
    return h >= 18 && h <= 21;
  });

  const itemList: object = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Programmi ${channel.name} stasera — ${today}`,
    url: channelUrl,
    itemListElement: primeTime.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.title,
      ...(p.description ? { description: p.description.slice(0, 160) } : {}),
    })),
  };

  // BreadcrumbList
  const breadcrumb: object = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: channel.name, item: channelUrl },
    ],
  };

  // SiteNavigationElement
  const siteNav: object = {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: `Programmi ${channel.name} stasera`,
    url: channelUrl,
  };

  // TVChannel wrapper con BroadcastEvents
  const tvChannel: object = {
    '@context': 'https://schema.org',
    '@type': 'TVChannel',
    name: channel.name,
    broadcastChannelId: channel.number ? String(channel.number) : undefined,
    broadcastAffiliateOf: { '@type': 'Organization', name: channel.name },
    subjectOf: broadcastEvents.slice(0, 20), // max 20 eventi per non appesantire
  };

  return [tvChannel, itemList, breadcrumb, siteNav];
}

// ---------------------------------------------------------------------------
// Hub home (/)
// ---------------------------------------------------------------------------

export function buildHubHomeJsonLd({
  channels,
  today,
  siteUrl = SITE_URL,
}: {
  channels: Channel[];
  today: string;
  siteUrl?: string;
}): object[] {
  const website: object = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    inLanguage: 'it',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };

  const organization: object = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/favicon/apple-icon.png`,
  };

  const itemList: object = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Programmi TV stasera — ${today}`,
    url: siteUrl,
    itemListElement: channels.slice(0, 12).map((ch, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `Programmi ${ch.name} stasera`,
      url: `${siteUrl}/${ch.id}`,
    })),
  };

  const breadcrumb: object = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    ],
  };

  return [website, organization, itemList, breadcrumb];
}

// ---------------------------------------------------------------------------
// Hub categoria (es. /film-stasera)
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
  const pageUrl = `${siteUrl}/${categorySlug}`;

  const itemList: object = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${categoryName} stasera in TV — ${today}`,
    url: pageUrl,
    itemListElement: programs.slice(0, 20).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.title,
      ...(p.description ? { description: p.description.slice(0, 160) } : {}),
    })),
  };

  const breadcrumb: object = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: categoryName, item: pageUrl },
    ],
  };

  return [itemList, breadcrumb];
}

// ---------------------------------------------------------------------------
// Scheda programma (/programma/[canale]/[slug])
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
  const programUrl = `${siteUrl}/programma/${channel.id}/${program.slug ?? ''}`;
  const channelUrl = `${siteUrl}/${channel.id}`;
  const isFilm = program.category?.toLowerCase().includes('film');

  const broadcastEvent: object = {
    '@context': 'https://schema.org',
    '@type': 'BroadcastEvent',
    name: program.title,
    startDate: program.startTime,
    endDate: program.endTime,
    inLanguage: 'it',
    url: programUrl,
    ...(program.description ? { description: program.description } : {}),
    publishedOn: {
      '@type': 'BroadcastService',
      name: channel.name,
    },
    workPerformed: {
      '@type': isFilm ? 'Movie' : 'TVEpisode',
      name: program.title,
      ...(program.category ? { genre: program.category } : {}),
      ...(program.description ? { description: program.description } : {}),
      ...(program.poster_url ? { image: program.poster_url } : {}),
      url: programUrl,
    },
  };

  const breadcrumb: object = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: channel.name, item: channelUrl },
      { '@type': 'ListItem', position: 3, name: program.title, item: programUrl },
    ],
  };

  return [broadcastEvent, breadcrumb];
}
