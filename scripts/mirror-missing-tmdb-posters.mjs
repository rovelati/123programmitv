#!/usr/bin/env node
/**
 * Dopo il sync Hostinger, scarica i poster TMDB mancanti da programmecesoir.fr
 * (stesso naming /images/programs/tmdb/{id}.jpg) così il deploy CF li include.
 */
import { mkdir, access, writeFile, readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'dist', 'client', 'images', 'programs', 'tmdb');
const CLIENT_DIR = join(ROOT, 'dist', 'client');
const MIRROR = 'https://programmecesoir.fr/images/programs/tmdb';
const LIMIT = Number(process.env.MIRROR_TMDB_LIMIT || 80);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function extractTmdbId(url) {
  if (!url) return null;
  const m = String(url).match(/tmdb\/(\d+)\.jpg/i);
  return m ? m[1] : null;
}

async function collectIdsFromHtml() {
  const ids = new Set();
  async function walk(dir) {
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'images' || ent.name === '_astro' || ent.name === 'channel-logos') continue;
        await walk(p);
      } else if (ent.name.endsWith('.html')) {
        const html = await readFile(p, 'utf8');
        for (const m of html.matchAll(/tmdb\/(\d+)\.jpg/gi)) ids.add(m[1]);
      }
    }
  }
  await walk(CLIENT_DIR);
  return [...ids];
}

async function collectIdsFromDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return [];

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const ids = new Set();
  let offset = 0;
  const page = 1000;
  const today = new Date().toISOString().slice(0, 10);

  while (ids.size < 400) {
    const { data, error } = await sb
      .from('programs')
      .select('poster_url')
      .gte('date', today)
      .not('poster_url', 'is', null)
      .range(offset, offset + page - 1);
    if (error) {
      console.warn('DB query failed:', error.message);
      break;
    }
    if (!data?.length) break;
    for (const row of data) {
      const id = extractTmdbId(row.poster_url);
      if (id) ids.add(id);
    }
    if (data.length < page) break;
    offset += page;
  }
  return [...ids];
}

async function downloadOne(id) {
  const dest = join(OUT_DIR, `${id}.jpg`);
  if (await exists(dest)) return 'exists';

  const remote = `${MIRROR}/${id}.jpg`;
  const res = await fetch(remote, {
    headers: { 'User-Agent': 'intvstasera-mirror/1.0' },
  });
  if (!res.ok) return `skip-${res.status}`;
  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('image')) return `skip-ctype:${ctype}`;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000 || buf[0] !== 0xff || buf[1] !== 0xd8) return 'skip-not-jpeg';
  await writeFile(dest, buf);
  return 'downloaded';
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const fromDb = await collectIdsFromDb();
  const fromHtml = await collectIdsFromHtml();
  const ids = [...new Set([...fromDb, ...fromHtml])];
  console.log(`IDs from DB=${fromDb.length} HTML=${fromHtml.length} unique=${ids.length}`);
  if (!ids.length) {
    console.log('No TMDB poster ids found — nothing to mirror.');
    return;
  }

  console.log(`Found ${ids.length} TMDB ids — mirroring up to ${LIMIT} missing…`);
  let downloaded = 0;
  let exists = 0;
  let skipped = 0;

  for (const id of ids) {
    if (downloaded >= LIMIT) break;
    try {
      const result = await downloadOne(id);
      if (result === 'downloaded') {
        downloaded += 1;
        console.log(`+ ${id}.jpg`);
      } else if (result === 'exists') {
        exists += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      skipped += 1;
      console.warn(`! ${id}:`, err.message || err);
    }
  }

  console.log(`Done. downloaded=${downloaded} exists=${exists} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(0); // non bloccare il deploy
});
