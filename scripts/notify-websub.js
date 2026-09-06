#!/usr/bin/env node

import { mkdirSync, renameSync, writeFileSync } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { absoluteUrl } from './canonical-url.js';

config();

const SITE_URL = process.env.SITE_URL || 'https://www.intvstasera.it';
const HUBS = (process.env.WEBSUB_HUB_URLS || 'https://websub.superfeedr.com/,https://pubsubhubbub.appspot.com/')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const OPTIONAL_HUB_PATTERNS = (process.env.WEBSUB_OPTIONAL_HUB_PATTERNS || 'pubsubhubbub.appspot.com')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const REQUEST_DELAY_MS = Number(process.env.WEBSUB_REQUEST_DELAY_MS || '750');
const HUB_DELAY_MS = Number(process.env.WEBSUB_HUB_DELAY_MS || '1250');
const MAX_RETRIES = Number(process.env.WEBSUB_MAX_RETRIES || '3');
const TIMEOUT_MS = Number(process.env.WEBSUB_TIMEOUT_MS || '20000');

const HEAD_URLS = [
  '/',
  '/stasera',
  '/domani',
  '/film-stasera',
  '/serie-stasera',
  '/sport-stasera',
  '/rai-1',
  '/canale-5',
  '/italia-1',
  '/rete-4',
  '/la7',
  '/tv8',
  '/nove',
].map((value) => absoluteUrl(value));

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
  const finalPath = path.join(targetDir, 'websub-latest.json');
  const tempPath = `${finalPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
  renameSync(tempPath, finalPath);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOptionalHub(hubUrl) {
  const normalized = hubUrl.toLowerCase();
  return OPTIONAL_HUB_PATTERNS.some((pattern) => normalized.includes(pattern));
}

async function postWithBackoff(url, options) {
  let lastError = null;
  let lastResponse = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      lastResponse = response;

      if (![429, 500, 502, 503, 504].includes(response.status)) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }

    await wait(Math.min(20000, 800 * (2 ** attempt)));
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error(`WebSub request failed for ${url}`);
}

async function main() {
  const startedAt = new Date();
  let successfulHubs = 0;
  const warnings = [];

  for (let index = 0; index < HUBS.length; index += 1) {
    const hubUrl = HUBS[index];
    try {
      const body = new URLSearchParams();
      body.append('hub.mode', 'publish');
      HEAD_URLS.forEach((url) => body.append('hub.url', url));

      const response = await postWithBackoff(hubUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (![200, 202, 204].includes(response.status)) {
        throw new Error(`${response.status}: ${(await response.text()).slice(0, 400)}`);
      }

      successfulHubs += 1;
      if (index < HUBS.length - 1) {
        await wait(HUB_DELAY_MS);
      }
    } catch (error) {
      const message = String(error?.message || error);
      if (!isOptionalHub(hubUrl)) {
        warnings.push(`hub ${hubUrl}: ${message}`);
      }
    }

    if (index < HUBS.length - 1) {
      await wait(REQUEST_DELAY_MS);
    }
  }

  const finishedAt = new Date();
  const payload = {
    generatedAt: finishedAt.toISOString(),
    status: successfulHubs > 0 ? (warnings.length ? 'success_with_warnings' : 'success') : 'error',
    run: {
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationSeconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    },
    summary: {
      attemptedUrls: HEAD_URLS.length,
      successfulHubs,
      failedHubs: HUBS.length - successfulHubs,
    },
    hubs: HUBS,
    sampleUrls: HEAD_URLS,
    warnings,
  };

  writeReport(payload);
  if (successfulHubs === 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  writeReport({
    generatedAt: new Date().toISOString(),
    status: 'error',
    error: String(error?.message || error),
    summary: {
      attemptedUrls: HEAD_URLS.length,
      successfulHubs: 0,
      failedHubs: HUBS.length,
    },
    hubs: HUBS,
    sampleUrls: HEAD_URLS,
  });
  process.exit(1);
});
