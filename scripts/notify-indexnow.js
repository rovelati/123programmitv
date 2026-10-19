#!/usr/bin/env node
/**
 * notify-indexnow.js — inTVstasera.it
 * Notifiche IndexNow e Bing Webmaster API mirate per fascia oraria:
 *  - SERA (17:00 - 22:59): Hub e categorie prima serata (/film-stasera/, /serie-stasera/, /sport-stasera/, /stasera/, homepage e top canali serali)
 *  - GIORNO (07:00 - 16:59): Guida del giorno (/ora/, homepage, top canali generalisti)
 *  - NOTTE (23:00 - 06:59): Guida di domani (/domani/, /[canale]/domani/)
 *
 * Supporta:
 *  - IndexNow (api.indexnow.org + yandex.com)
 *  - Bing Webmaster API (SubmitUrlBatch diretta con BING_API_KEY)
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import path from 'path';

const HOST = 'www.intvstasera.it';
const SITE_URL = `https://${HOST}`;
const BING_API_KEY = (process.env.BING_API_KEY || '4f25c5dc3491468f8459b92c21bb3ac1').trim();
const INDEXNOW_KEY = BING_API_KEY || '8f3b20c36691456da871bf2c8a149d62';
const KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

const ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://yandex.com/indexnow',
];

const TOP_CHANNELS = [
  'rai-1', 'rai-2', 'rai-3', 'rete-4', 'canale-5', 'italia-1', 'la7', 'tv8', 'nove',
  '20', 'rai-4', 'iris', 'rai-movie', 'cine34', 'twenty-seven', 'real-time',
  'top-crime', 'giallo', 'focus', 'warner-tv'
];

function getTimeSlot() {
  const argMode = process.argv.find(a => a.startsWith('--slot='))?.split('=')[1];
  if (argMode && ['evening', 'daytime', 'night'].includes(argMode)) {
    return argMode;
  }

  // Ora locale italiana (Europe/Rome)
  const nowRome = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const hour = nowRome.getHours();

  if (hour >= 17 && hour < 23) {
    return 'evening';
  }
  if (hour >= 23 || hour < 7) {
    return 'night';
  }
  return 'daytime';
}

function getTargetedUrls(slot) {
  const urls = [];

  if (slot === 'evening') {
    // Fascia serale: focus assoluto sui programmi e film di stasera in TV
    urls.push(
      `${SITE_URL}/`,
      `${SITE_URL}/film-stasera/`,
      `${SITE_URL}/serie-stasera/`,
      `${SITE_URL}/sport-stasera/`,
      `${SITE_URL}/stasera/`
    );
    for (const ch of TOP_CHANNELS) {
      urls.push(`${SITE_URL}/${ch}/`);
    }
  } else if (slot === 'night') {
    // Fascia notturna: focus sulla programmazione di domani
    urls.push(
      `${SITE_URL}/domani/`,
      `${SITE_URL}/`
    );
    for (const ch of TOP_CHANNELS.slice(0, 10)) {
      urls.push(`${SITE_URL}/${ch}/domani/`);
      urls.push(`${SITE_URL}/${ch}/`);
    }
  } else {
    // Fascia diurna: guida TV di oggi, ora in onda, canali principali
    urls.push(
      `${SITE_URL}/`,
      `${SITE_URL}/ora/`,
      `${SITE_URL}/domani/`
    );
    for (const ch of TOP_CHANNELS) {
      urls.push(`${SITE_URL}/${ch}/`);
    }
  }

  return [...new Set(urls)];
}

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

async function submitIndexNow(endpoint, urls) {
  const body = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'InTVStasera-IndexNow/2.0',
    },
    body: JSON.stringify(body),
  });

  return {
    endpoint,
    status: res.status,
    ok: res.status === 200 || res.status === 202,
    statusText: res.statusText,
  };
}

async function submitBingWebmasterApi(urls) {
  if (!BING_API_KEY) {
    return { ok: false, status: 0, statusText: 'No BING_API_KEY configured' };
  }

  try {
    const res = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=${BING_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'InTVStasera-BingSubmit/2.0',
      },
      body: JSON.stringify({
        siteUrl: `${SITE_URL}/`,
        urlList: urls,
      }),
    });

    return {
      endpoint: 'bing-webmaster-api',
      status: res.status,
      ok: res.ok,
      statusText: res.statusText,
    };
  } catch (err) {
    return {
      endpoint: 'bing-webmaster-api',
      status: 0,
      ok: false,
      statusText: err.message,
    };
  }
}

async function main() {
  const startedAt = new Date();
  const slot = getTimeSlot();
  const urls = getTargetedUrls(slot);

  console.log('=== Microsoft IndexNow & Bing Targeted Notifier ===');
  console.log(`Host: ${HOST}`);
  console.log(`Fascia oraria rilevata: [${slot.toUpperCase()}]`);
  console.log(`URL mirate selezionate: ${urls.length}`);
  console.log(`Key: ${INDEXNOW_KEY}`);

  console.log('\nElenco URL mirate inviate:');
  urls.forEach((u, idx) => console.log(`  ${idx + 1}. ${u}`));

  const results = [];

  // 1. Invio a Bing Webmaster API diretta (se presente chiave)
  if (BING_API_KEY) {
    console.log(`\nInvio a Bing Webmaster API diretta (quota batch)...`);
    const bingRes = await submitBingWebmasterApi(urls);
    console.log(`Bing API -> HTTP ${bingRes.status} (${bingRes.ok ? 'SUCCESS' : bingRes.statusText})`);
    results.push(bingRes);
  }

  // 2. Invio agli endpoint IndexNow
  for (const ep of ENDPOINTS) {
    console.log(`\nInvio a ${ep}...`);
    try {
      const res = await submitIndexNow(ep, urls);
      console.log(`IndexNow (${ep}) -> HTTP ${res.status} (${res.ok ? 'SUCCESS' : res.statusText})`);
      results.push(res);
    } catch (err) {
      console.error(`IndexNow (${ep}) FAILED: ${err.message}`);
      results.push({ endpoint: ep, status: 0, ok: false, statusText: err.message });
    }
  }

  const finishedAt = new Date();
  const reportPayload = {
    generatedAt: finishedAt.toISOString(),
    host: HOST,
    timeSlot: slot,
    urlsSubmitted: urls.length,
    urls: urls,
    endpoints: results,
    run: {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationSeconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    },
  };

  writeReport(reportPayload);
  console.log(`\nReport salvato in search-console/indexnow-latest.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
