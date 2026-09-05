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
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import path from 'path';
import { config } from 'dotenv';

config(); // carica .env

const SITE_URL = 'https://www.intvstasera.it';
const MAX_URLS_PER_DAY = 30;
const RATE_LIMIT_MS = 200;    // 200ms tra richieste per evitare 429
const SERVER_PUBLIC_DIR = '/home/u914016995/domains/123programmitv.it/public_html';
const GOOGLE_JSON_CANDIDATES = [
  path.resolve(process.cwd(), '..', 'programmitv-974f34f03606.json'),
  path.resolve(process.cwd(), '..', 'fernsehheute-8840739e2dc1.json'),
];

function getSearchConsoleDir() {
  const configured = (process.env.SEARCH_CONSOLE_PUBLIC_DIR || '').trim();
  if (configured) {
    mkdirSync(configured, { recursive: true });
    return configured;
  }

  const serverDir = path.join(SERVER_PUBLIC_DIR, 'search-console');
  if (existsSync(SERVER_PUBLIC_DIR)) {
    mkdirSync(serverDir, { recursive: true });
    return serverDir;
  }

  const localDir = path.resolve(process.cwd(), 'public', 'search-console');
  mkdirSync(localDir, { recursive: true });
  return localDir;
}

function writeReport(payload) {
  const targetDir = getSearchConsoleDir();
  const finalPath = path.join(targetDir, 'google-indexing-latest.json');
  const tempPath = `${finalPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  renameSync(tempPath, finalPath);
}

const HEAD_URLS = [
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

async function getGoogleAuth() {
  let credentials;

  if (process.env.GOOGLE_SA_KEY_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_SA_KEY_JSON);
  } else if (process.env.GOOGLE_SA_KEY_FILE) {
    credentials = JSON.parse(readFileSync(process.env.GOOGLE_SA_KEY_FILE, 'utf8'));
  } else {
    const candidate = GOOGLE_JSON_CANDIDATES.find((value) => existsSync(value));
    if (!candidate) {
      throw new Error(
        'Missing Google service account credentials. ' +
        'Set GOOGLE_SA_KEY_JSON or GOOGLE_SA_KEY_FILE in .env'
      );
    }
    credentials = JSON.parse(readFileSync(candidate, 'utf8'));
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
    return { ok: true, url };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 429) {
      console.warn(`  ⚠ Rate limited: ${url} — retrying after 5s`);
      await new Promise(r => setTimeout(r, 5000));
      return notifyUrl(indexing, url); // una sola retry
    }
    console.warn(`  ✗ ${url} → ${err.message}`);
    return { ok: false, url, error: err.message, status: status || null };
  }
}

async function main() {
  const startedAt = new Date();
  console.log('=== Google Indexing API Notifier ===');
  console.log(`Site: ${SITE_URL}`);
  console.log(`Date: ${startedAt.toISOString()}`);

  const auth = await getGoogleAuth();

  const indexing = google.indexing({ version: 'v3', auth });

  // Deduplicazione + limit giornaliero
  const allUrls = [...new Set(HEAD_URLS)].slice(0, MAX_URLS_PER_DAY);
  console.log(`\nNotifying ${allUrls.length} head URLs\n`);

  let ok = 0;
  let fail = 0;
  const failures = [];

  for (const url of allUrls) {
    const result = await notifyUrl(indexing, url);
    if (result.ok) {
      ok++;
    } else {
      fail++;
      failures.push(result);
    }
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  const finishedAt = new Date();
  const reportPayload = {
    generatedAt: finishedAt.toISOString(),
    siteUrl: SITE_URL,
    status: fail > 0 && ok === 0 ? 'error' : fail > 0 ? 'success_with_warnings' : 'success',
    run: {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationSeconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    },
    quota: {
      dailyLimit: MAX_URLS_PER_DAY,
      requestDelayMs: RATE_LIMIT_MS,
    },
    summary: {
      attempted: allUrls.length,
      success: ok,
      failed: fail,
      hubUrls: HEAD_URLS.length,
      filmUrls: 0,
    },
    urls: {
      sample: allUrls.slice(0, 20),
      failed: failures.slice(0, 20),
    },
    notes: [
      'Report focalizzato sulle head page, non sulle foglie programma.',
      'Questo report copre le notifiche Google Indexing API, non la conferma di indicizzazione effettiva in Search Console.',
    ],
  };
  writeReport(reportPayload);

  console.log(`\nDone: ${ok} notified, ${fail} failed.`);
  process.exit(fail > 0 && ok === 0 ? 1 : 0);
}

main().catch(err => {
  const failedAt = new Date();
  writeReport({
    generatedAt: failedAt.toISOString(),
    siteUrl: SITE_URL,
    status: 'error',
    run: {
      startedAt: null,
      finishedAt: failedAt.toISOString(),
      durationSeconds: null,
    },
    quota: {
      dailyLimit: MAX_URLS_PER_DAY,
      requestDelayMs: RATE_LIMIT_MS,
    },
    summary: {
      attempted: 0,
      success: 0,
      failed: 0,
      hubUrls: HEAD_URLS.length,
      filmUrls: 0,
    },
    urls: {
      sample: HEAD_URLS.slice(0, 20),
      failed: [],
    },
    error: err.message,
    notes: [
      'Errore fatale prima dell\'invio delle notifiche Google Indexing API.',
    ],
  });
  console.error('Fatal error:', err.message);
  process.exit(1);
});
