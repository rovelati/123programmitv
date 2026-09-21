#!/usr/bin/env node
/**
 * notify-indexnow.js
 * Notifica Microsoft Bing, Copilot, Yahoo e motori partner via IndexNow API.
 * Sottomette l'elenco delle URL canoniche aggiornate ogni giorno.
 *
 * Specifica IndexNow: https://www.indexnow.org/documentation
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import path from 'path';

const HOST = 'www.intvstasera.it';
const SITE_URL = `https://${HOST}`;
const INDEXNOW_KEY = '8f3b20c36691456da871bf2c8a149d62';
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function getSearchConsoleDir() {
  const configured = (process.env.SEARCH_CONSOLE_PUBLIC_DIR || '').trim();
  if (configured) {
    mkdirSync(configured, { recursive: true });
    return configured;
  }

  const localDir = path.resolve(process.cwd(), 'public', 'search-console');
  mkdirSync(localDir, { recursive: true });
  return localDir;
}

function writeReport(payload) {
  const targetDir = getSearchConsoleDir();
  const finalPath = path.join(targetDir, 'indexnow-latest.json');
  const tempPath = `${finalPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  renameSync(tempPath, finalPath);
}

async function getUrlList() {
  try {
    const res = await fetch(`${SITE_URL}/sitemap.xml`);
    if (res.ok) {
      const xml = await res.text();
      const urls = [...xml.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)].map(m => m[1]);
      if (urls.length > 0) {
        return urls;
      }
    }
  } catch (err) {
    console.warn(`[indexnow] Non riesco a leggere la sitemap live (${err.message}), uso lista fallback`);
  }

  // Fallback URLs
  return [
    `${SITE_URL}/`,
    `${SITE_URL}/stasera/`,
    `${SITE_URL}/domani/`,
    `${SITE_URL}/film-stasera/`,
    `${SITE_URL}/serie-stasera/`,
    `${SITE_URL}/sport-stasera/`,
    `${SITE_URL}/rai-1/`,
    `${SITE_URL}/canale-5/`,
    `${SITE_URL}/italia-1/`,
    `${SITE_URL}/rete-4/`,
    `${SITE_URL}/la7/`,
    `${SITE_URL}/tv8/`,
    `${SITE_URL}/nove/`,
    `${SITE_URL}/rai-movie/`,
    `${SITE_URL}/iris/`,
    `${SITE_URL}/cine34/`,
    `${SITE_URL}/twenty-seven/`,
    `${SITE_URL}/focus/`,
    `${SITE_URL}/dmax/`,
    `${SITE_URL}/real-time/`,
    `${SITE_URL}/giallo/`,
    `${SITE_URL}/top-crime/`,
    `${SITE_URL}/inter-tv/`,
    `${SITE_URL}/milan-tv/`,
  ];
}

async function submitIndexNow(urls) {
  const body = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'InTVStasera IndexNow Notifier/1.0',
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    ok: response.status === 200 || response.status === 202,
    statusText: response.statusText,
  };
}

async function main() {
  const startedAt = new Date();
  console.log('=== Microsoft IndexNow API Notifier ===');
  console.log(`Host: ${HOST}`);
  console.log(`Key Location: ${KEY_LOCATION}`);

  const urls = await getUrlList();
  console.log(`\nSubmitting ${urls.length} URLs to IndexNow (${INDEXNOW_ENDPOINT})...\n`);

  let result;
  try {
    result = await submitIndexNow(urls);
    console.log(`IndexNow Response: HTTP ${result.status} ${result.statusText} (Success: ${result.ok})`);
  } catch (err) {
    result = { status: 0, ok: false, statusText: err.message };
    console.error(`IndexNow Request Failed: ${err.message}`);
  }

  const finishedAt = new Date();
  const reportPayload = {
    generatedAt: finishedAt.toISOString(),
    host: HOST,
    endpoint: INDEXNOW_ENDPOINT,
    keyLocation: KEY_LOCATION,
    status: result.ok ? 'success' : 'error',
    httpStatus: result.status,
    urlsSubmitted: urls.length,
    sampleUrls: urls.slice(0, 15),
    run: {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationSeconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    },
  };

  writeReport(reportPayload);
  console.log(`Report saved to search-console/indexnow-latest.json`);

  if (!result.ok && result.status !== 200 && result.status !== 202) {
    console.warn('IndexNow did not return 200/202. (Note: Key file must be accessible on live site).');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
