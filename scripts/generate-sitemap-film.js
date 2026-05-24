#!/usr/bin/env node
/**
 * generate-sitemap-film.js
 * Legacy helper: la strategia SEO attuale non pubblica sitemap /programma/*.
 * Mantiene un XML vuoto se eseguito manualmente, senza dichiarare URL bloccate.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '../dist/client/sitemap-film.xml');

function main() {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

  writeFileSync(OUTPUT_PATH, xml, 'utf8');
  console.log(`Wrote empty legacy sitemap to ${OUTPUT_PATH}`);
}

main();
