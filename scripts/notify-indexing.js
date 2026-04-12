#!/usr/bin/env node
/**
 * notify-indexing.js
 * Notifica Google Search Console (Indexing API) delle pagine hub aggiornate.
 * Eseguire via cron alle 06:00 UTC (dopo rebuild Cloudflare alle 02:30).
 *
 * Prerequisiti:
 *   1. Google Search Console API abilitata nel Google Cloud project
 *   2. Service Account con verifica su Search Console (Property Owner)
 *   3. Variabili d'ambiente nel .env:
 *      SUPABASE_URL, SUPABASE_SERVICE_KEY
 *      GOOGLE_SA_KEY_JSON  oppure  GOOGLE_SA_KEY_FILE
 *
 * Usage: node scripts/notify-indexing.js
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config(); // carica .env

const SITE_URL = process.env.SITE_URL || 'https://www.123programmitv.it';
const MAX_URLS_PER_DAY = 200; // Google Indexing API daily quota
const RATE_LIMIT_MS = 200;    // 200ms tra richieste per evitare 429

// Hub sempre notificate dopo ogni rebuild
const HUB_URLS = [
  '/',
  '/domani',
  '/film-stasera',
  '/serie-stasera',
  '/sport-stasera',
  '/rai-1', '/rai-2', '/rai-3', '/rai-4', '/rai-5',
  '/canale-5', '/italia-1', '/rete-4',
  '/la7', '/la7d', '/tv8', '/nove',
  '/iris', '/focus', '/dmax', '/giallo', '/real-time',
  '/warner-tv', '/cine34', '/tgcom24', '/top-crime', '/cielo',
  '/mediaset-extra',
].map(p => `${SITE_URL}${p}`);

async function getIndexableFilmUrls() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('programs')
    .select('channel_id, slug')
    .eq('indexable', true)
    .gte('created_at', since)
    .limit(MAX_URLS_PER_DAY);

  if (error) {
    console.warn('Warning: could not fetch indexable films:', error.message);
    return [];
  }

  return (data || [])
    .filter(p => p.channel_id && p.slug)
    .map(p => `${SITE_URL}/programma/${p.channel_id}/${p.slug}`);
}

async function getGoogleAuth() {
  let credentials;

  if (process.env.GOOGLE_SA_KEY_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SA_KEY_JSON);
  } else if (process.env.GOOGLE_SA_KEY_FILE) {
    credentials = JSON.parse(readFileSync(process.env.GOOGLE_SA_KEY_FILE, 'utf8'));
  } else {
    throw new Error(
      'Missing Google service account credentials. ' +
      'Set GOOGLE_SA_KEY_JSON or GOOGLE_SA_KEY_FILE in .env'
    );
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
}

async function notifyUrl(indexing, url) {
  try {
    await indexing.urlNotifications.publish({
      requestBody: { url, type: 'URL_UPDATED' },
    });
    console.log(`  ✓ ${url}`);
    return true;
  } catch (err) {
    const status = err?.response?.status;
    if (status === 429) {
      console.warn(`  ⚠ Rate limited: ${url} — retrying after 5s`);
      await new Promise(r => setTimeout(r, 5000));
      return notifyUrl(indexing, url); // una sola retry
    }
    console.warn(`  ✗ ${url} → ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Google Indexing API Notifier ===');
  console.log(`Site: ${SITE_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);

  const [auth, filmUrls] = await Promise.all([
    getGoogleAuth(),
    getIndexableFilmUrls(),
  ]);

  const indexing = google.indexing({ version: 'v3', auth });

  // Deduplicazione + limit giornaliero
  const allUrls = [...new Set([...HUB_URLS, ...filmUrls])].slice(0, MAX_URLS_PER_DAY);
  console.log(`\nNotifying ${allUrls.length} URLs (${HUB_URLS.length} hub + ${filmUrls.length} film)\n`);

  let ok = 0;
  let fail = 0;

  for (const url of allUrls) {
    const success = await notifyUrl(indexing, url);
    if (success) ok++; else fail++;
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  console.log(`\nDone: ${ok} notified, ${fail} failed.`);
  process.exit(fail > 0 && ok === 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
