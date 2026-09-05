#!/usr/bin/env node
/**
 * Genera un'unica sitemap.xml piatta: hub principali + primi 50 canali.
 */
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

const SITE_URL = (process.env.SITE_URL || 'https://www.intvstasera.it').replace(/\/$/, '');
const OUTPUT_PATH = path.join(process.cwd(), 'dist', 'client', 'sitemap.xml');
const LEGACY_SITEMAPS = ['sitemap-index.xml', 'sitemap-0.xml', 'sitemap-film.xml'];

const HUB_CHANNEL_IDS = [
  'rai-1', 'rai-2', 'rai-3', 'rete-4', 'canale-5', 'italia-1', 'la7', 'tv8', 'nove', '20',
  'rai-4', 'iris', 'rai-5', 'rai-movie', 'cielo', 'twenty-seven', 'la7d', 'real-time', 'cine34', 'focus',
  'warner-tv', 'giallo', 'top-crime', 'boing', 'k2', 'frisbee', 'cartoonito', 'italia-2', 'tgcom24', 'dmax',
  'mediaset-extra',
];

const HUB_PAGES = [
  { loc: `${SITE_URL}/`, changefreq: 'hourly', priority: '1.0' },
  { loc: `${SITE_URL}/stasera/`, changefreq: 'daily', priority: '0.9' },
  { loc: `${SITE_URL}/domani/`, changefreq: 'daily', priority: '0.85' },
  { loc: `${SITE_URL}/film-stasera/`, changefreq: 'daily', priority: '0.85' },
  { loc: `${SITE_URL}/serie-stasera/`, changefreq: 'daily', priority: '0.85' },
  { loc: `${SITE_URL}/sport-stasera/`, changefreq: 'daily', priority: '0.85' },
];

const TOP_CHANNEL_IDS = new Set(['rai-1', 'canale-5', 'italia-1', 'la7', 'rete-4', 'rai-2', 'rai-3']);

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

async function fetchExtraChannelIds() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return [];

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT c.channel_id
      FROM channels c
      LEFT JOIN channels_config cc ON cc.id = c.channel_id
      WHERE COALESCE(cc.visible, true) = true
      ORDER BY COALESCE(cc.position, 999), COALESCE(c.channel_number, 999)
      LIMIT 200
    `);
    return rows.map(row => row.channel_id).filter(Boolean);
  } finally {
    await client.end();
  }
}

async function collectChannelIds() {
  const ordered = [];
  const seen = new Set();

  for (const id of HUB_CHANNEL_IDS) {
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }

  try {
    for (const id of await fetchExtraChannelIds()) {
      if (ordered.length >= 50) break;
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
  } catch (error) {
    console.warn('Channel lookup failed, using hub channel list only:', error?.message || error);
  }

  return ordered.slice(0, 50);
}

async function main() {
  const channelIds = await collectChannelIds();
  const channelPages = channelIds.map(id => ({
    loc: `${SITE_URL}/${id}/`,
    changefreq: 'daily',
    priority: TOP_CHANNEL_IDS.has(id) ? '0.9' : '0.7',
  }));

  const entries = [...HUB_PAGES, ...channelPages];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(urlEntry),
    '</urlset>',
    '',
  ].join('\n');

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, xml, 'utf8');

  for (const fileName of LEGACY_SITEMAPS) {
    const legacyPath = path.join(path.dirname(OUTPUT_PATH), fileName);
    if (existsSync(legacyPath)) unlinkSync(legacyPath);
  }

  console.log(`Wrote ${OUTPUT_PATH} with ${entries.length} URLs (${channelPages.length} channels)`);
}

main().catch(error => {
  console.error('Sitemap generation failed:', error?.message || error);
  process.exit(1);
});
