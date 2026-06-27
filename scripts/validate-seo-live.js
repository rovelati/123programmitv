#!/usr/bin/env node
/**
 * Post-deploy SEO smoke test.
 * Verifica robots, sitemap e principali hub indicizzabili del sito live.
 */

const SITE_URL = (process.env.SITE_URL || 'https://123programmitv.it').replace(/\/$/, '');
const MAX_ATTEMPTS = Number.parseInt(process.env.SEO_VALIDATE_ATTEMPTS || '1', 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.SEO_VALIDATE_RETRY_MS || '30000', 10);

const HUB_PATHS = [
  '/',
  '/stasera/',
  '/domani/',
  '/film-stasera/',
  '/serie-stasera/',
  '/sport-stasera/',
  '/rai-1/',
  '/rai-movie/',
  '/canale-5/',
  '/italia-1/',
  '/la7/',
];

function extractMeta(html, pattern) {
  const match = html.match(pattern);
  return match?.[1] ?? null;
}

async function fetchText(path, method = 'GET') {
  const url = `${SITE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'User-Agent': '123ProgrammiTV SEO validator',
    },
  });
  const text = method === 'HEAD' ? '' : await response.text();
  return {
    url,
    status: response.status,
    ok: response.ok,
    text,
    headers: response.headers,
  };
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runValidation() {
  const failures = [];

  console.log(`SEO live validation for ${SITE_URL}`);

  const robots = await fetchText('/robots.txt');
  console.log(`${robots.status} ${robots.url}`);
  assert(robots.ok, 'robots.txt is not reachable', failures);
  assert(!robots.text.includes('Disallow: /programma/'), 'robots.txt should allow crawling /programma/ for 410 de-indexing', failures);
  assert(robots.text.includes('Sitemap: https://123programmitv.it/sitemap-index.xml'), 'robots.txt should declare sitemap-index.xml', failures);
  assert(!robots.text.includes('sitemap-film.xml'), 'robots.txt should not declare legacy sitemap-film.xml', failures);
  assert(!robots.text.includes('Disallow: /channel-logos/'), 'robots.txt should not block channel logo assets', failures);

  const logoAsset = await fetchText('/channel-logos/italia-1.svg', 'HEAD');
  console.log(`${logoAsset.status} ${logoAsset.url}`);
  assert(logoAsset.ok, '/channel-logos/italia-1.svg should remain reachable', failures);
  const logoCache = logoAsset.headers.get('cache-control') || '';
  assert(logoCache.includes('max-age=') && !logoCache.includes('max-age=0'), 'channel logos should use long-lived cache headers', failures);
  assert(!logoAsset.headers.get('x-robots-tag')?.includes('noindex'), 'channel logos should not send X-Robots-Tag noindex', failures);

  const sitemap = await fetchText('/sitemap-index.xml');
  console.log(`${sitemap.status} ${sitemap.url}`);
  assert(sitemap.ok, 'sitemap-index.xml is not reachable', failures);
  assert(!sitemap.text.includes('/programma/'), 'sitemap-index.xml should not include /programma/ URLs', failures);

  for (const path of HUB_PATHS) {
    const page = await fetchText(path);
    console.log(`${page.status} ${page.url}`);
    assert(page.ok, `${path} is not reachable`, failures);
    const canonical = extractMeta(page.text, /<link rel="canonical" href="([^"]+)"/);
    const ogUrl = extractMeta(page.text, /<meta property="og:url" content="([^"]+)"/);
    assert(canonical, `${path} should expose a canonical URL`, failures);
    if (path !== '/') {
      assert(canonical.endsWith('/'), `${path} canonical should end with trailing slash (${canonical})`, failures);
      assert(ogUrl?.endsWith('/'), `${path} og:url should end with trailing slash (${ogUrl})`, failures);
    }
    assert(canonical === ogUrl, `${path} canonical and og:url should match`, failures);
  }

  const program = await fetchText('/programma/rai-1/test-seo-smoke', 'HEAD');
  console.log(`${program.status} ${program.url}`);
  assert([404, 410].includes(program.status), '/programma/* should not return indexable 200 responses', failures);
  assert(!program.headers.get('x-robots-tag')?.includes('noindex'), '/programma/* 410 should not send X-Robots-Tag noindex', failures);

  if (failures.length > 0) {
    return failures;
  }

  console.log('\nSEO validation passed.');
  console.log('Search Console checklist: submit sitemap-index.xml, inspect /, /stasera, /film-stasera, /rai-1, /canale-5, then monitor Coverage and Performance for 7-14 days.');
  return [];
}

async function main() {
  let failures = [];
  const attempts = Math.max(1, MAX_ATTEMPTS);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) {
      console.log(`\nRetrying SEO validation (${attempt}/${attempts})...`);
    }

    failures = await runValidation();
    if (failures.length === 0) return;

    if (attempt < attempts) {
      console.warn(`\nSEO validation found ${failures.length} issue(s); waiting ${RETRY_DELAY_MS}ms for deploy propagation.`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  console.error('\nSEO validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

main().catch(error => {
  console.error(`SEO validation error: ${error.message}`);
  process.exit(1);
});
