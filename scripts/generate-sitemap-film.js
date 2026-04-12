#!/usr/bin/env node
/**
 * generate-sitemap-film.js
 * Genera /dist/sitemap-film.xml con le URL dei film indicizzabili.
 * Eseguito come postbuild (dopo astro build).
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.env.SITE_URL || 'https://www.123programmitv.it';
const OUTPUT_PATH = join(__dirname, '../dist/sitemap-film.xml');

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from('programs')
    .select('channel_id, slug, start_time')
    .eq('indexable', true)
    .order('start_time', { ascending: false })
    .limit(10000);

  if (error) {
    console.warn('Warning: could not fetch indexable films:', error.message);
    console.warn('sitemap-film.xml will be empty.');
  }

  const programs = data || [];
  console.log(`Generating sitemap-film.xml with ${programs.length} indexable films...`);

  const urls = programs
    .filter(p => p.channel_id && p.slug)
    .map(p => {
      const lastmod = p.start_time
        ? new Date(p.start_time).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      return `  <url>
    <loc>${SITE_URL}/programma/${p.channel_id}/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  writeFileSync(OUTPUT_PATH, xml, 'utf8');
  console.log(`Wrote ${urls.length} URLs to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('generate-sitemap-film failed:', err.message);
  // Non fallire il build se la sitemap non riesce
  process.exit(0);
});
