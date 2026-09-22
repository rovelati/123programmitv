import type { APIContext } from 'astro';
import { Pool } from 'pg';
import { google } from 'googleapis';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type RuntimeEnv = Record<string, unknown>;

type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type HeadTarget = {
  path: string;
  label: string;
  category: 'hub' | 'channel';
};

const TIME_ZONE = 'Europe/Rome';
const ROOT_DIR = path.resolve(process.cwd(), '..');
const GOOGLE_JSON_CANDIDATES = [
  path.join(ROOT_DIR, 'programmitv-974f34f03606.json'),
  path.join(ROOT_DIR, 'fernsehheute-8840739e2dc1.json'),
];
const PRODUCTION_MD_PATH = path.join(ROOT_DIR, 'production.md');
const LOCAL_GOOGLE_INDEXING_REPORT = path.join(process.cwd(), 'public', 'search-console', 'google-indexing-latest.json');
const LOCAL_WEBSUB_REPORT = path.join(process.cwd(), 'public', 'search-console', 'websub-latest.json');
const GA4_MEASUREMENT_ID_FALLBACK = 'G-824117SV8J';
const SEARCH_CONSOLE_SITE_FALLBACK = 'sc-domain:intvstasera.it';
const SITE_URL_FALLBACK = 'https://www.intvstasera.it';
const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000;

const HEAD_TARGETS: HeadTarget[] = [
  { path: '/', label: 'inTV stasera', category: 'hub' },
  { path: '/ora', label: 'inTV ora', category: 'hub' },
  { path: '/domani', label: 'inTV domani', category: 'hub' },
  { path: '/film-stasera', label: 'Film stasera', category: 'hub' },
  { path: '/serie-stasera', label: 'Serie stasera', category: 'hub' },
  { path: '/sport-stasera', label: 'Sport stasera', category: 'hub' },
  { path: '/rai-1', label: 'Rai 1', category: 'channel' },
  { path: '/canale-5', label: 'Canale 5', category: 'channel' },
  { path: '/italia-1', label: 'Italia 1', category: 'channel' },
  { path: '/rete-4', label: 'Rete 4', category: 'channel' },
  { path: '/la7', label: 'La7', category: 'channel' },
  { path: '/tv8', label: 'TV8', category: 'channel' },
  { path: '/nove', label: 'Nove', category: 'channel' },
];

const combinedCache = new Map<string, { expiresAt: number; payload: unknown }>();

function getRuntimeEnv(context: APIContext): RuntimeEnv {
  const runtime = (context.locals as { runtime?: { env?: RuntimeEnv } }).runtime;
  return runtime?.env || {};
}

function readProductionMdValue(key: string): string | null {
  try {
    if (!existsSync(PRODUCTION_MD_PATH)) return null;
    const content = readFileSync(PRODUCTION_MD_PATH, 'utf8');
    const match = content.match(new RegExp(`${key}:\\s*(.+)`));
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

function getEnvValue(context: APIContext, key: string): string | undefined {
  const runtimeEnv = getRuntimeEnv(context);
  const runtimeValue = runtimeEnv[key];
  if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
    return runtimeValue.trim();
  }

  const processValue = process.env[key];
  if (typeof processValue === 'string' && processValue.trim()) {
    return processValue.trim();
  }

  return undefined;
}

function getSiteUrl(context: APIContext): string {
  return getEnvValue(context, 'SITE_URL') || SITE_URL_FALLBACK;
}

function getSearchConsoleSiteUrl(context: APIContext): string {
  return getEnvValue(context, 'SEARCH_CONSOLE_SITE_URL') || SEARCH_CONSOLE_SITE_FALLBACK;
}

function getGa4MeasurementId(context: APIContext): string {
  return getEnvValue(context, 'GA4_MEASUREMENT_ID') || GA4_MEASUREMENT_ID_FALLBACK;
}

function loadGoogleCredentials(context: APIContext): Record<string, unknown> {
  const rawJson = getEnvValue(context, 'GOOGLE_SA_KEY_JSON');
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  const keyFile = getEnvValue(context, 'GOOGLE_SA_KEY_FILE');
  if (keyFile && existsSync(keyFile)) {
    return JSON.parse(readFileSync(keyFile, 'utf8'));
  }

  for (const candidate of GOOGLE_JSON_CANDIDATES) {
    if (existsSync(candidate)) {
      return JSON.parse(readFileSync(candidate, 'utf8'));
    }
  }

  throw new Error('Missing Google service account credentials.');
}

function getDatabaseUrl(context: APIContext): string {
  const databaseUrl = getEnvValue(context, 'DATABASE_URL') || readProductionMdValue('database-url');
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL (Postgres locale Contabo).');
  }
  return databaseUrl;
}

function getPgPool(context: APIContext): Pool {
  const databaseUrl = getDatabaseUrl(context);
  const local =
    databaseUrl.includes('127.0.0.1') ||
    databaseUrl.includes('localhost') ||
    databaseUrl.includes('@postgres:');
  return new Pool({
    connectionString: databaseUrl,
    ssl: local ? false : { rejectUnauthorized: false },
    max: 2,
  });
}

function getGoogleAuth(context: APIContext, scopes: string[]) {
  return new google.auth.GoogleAuth({
    credentials: loadGoogleCredentials(context),
    scopes,
  });
}

function buildAbsoluteUrl(siteUrl: string, routePath: string): string {
  const base = `${siteUrl.replace(/\/$/, '')}/`;
  const path = routePath === '/' ? '/' : `${routePath.replace(/\/$/, '')}/`;
  return new URL(path, base).toString();
}

function parseGoogleError(error: unknown): { message: string; activationUrl?: string; raw?: unknown } {
  const maybeError = error as {
    message?: string;
    response?: { data?: { error?: { message?: string; details?: Array<Record<string, unknown>> } } };
  };

  const detailItems = maybeError.response?.data?.error?.details || [];
  const helpLink = detailItems
    .flatMap((item) => (Array.isArray(item.links) ? item.links : []))
    .find((link) => typeof link?.url === 'string');

  return {
    message:
      maybeError.response?.data?.error?.message ||
      maybeError.message ||
      'Unknown Google API error',
    activationUrl: typeof helpLink?.url === 'string' ? helpLink.url : undefined,
    raw: maybeError.response?.data || undefined,
  };
}

function formatPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 100;
}

function computeDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round((((current - previous) / previous) * 100) * 100) / 100;
}

function normalizeSearchRow(row: SearchConsoleRow) {
  return {
    key: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: formatPercent((row.ctr || 0) * 100),
    position: row.position || 0,
  };
}

function getHeadTargetRows(siteUrl: string, pageRows: ReturnType<typeof normalizeSearchRow>[]) {
  const rowsByUrl = new Map(pageRows.map((row) => [row.key, row]));
  return HEAD_TARGETS.map((target) => {
    const absoluteUrl = buildAbsoluteUrl(siteUrl, target.path);
    const metrics = rowsByUrl.get(absoluteUrl);
    return {
      ...target,
      url: absoluteUrl,
      clicks: metrics?.clicks || 0,
      impressions: metrics?.impressions || 0,
      ctr: metrics?.ctr || 0,
      position: metrics?.position || 0,
    };
  });
}

async function runSearchAnalytics(context: APIContext) {
  const auth = getGoogleAuth(context, ['https://www.googleapis.com/auth/webmasters.readonly']);
  const searchConsole = google.searchconsole({ version: 'v1', auth });
  const siteUrl = getSearchConsoleSiteUrl(context);
  const WINDOW_DAYS = 14;
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() - 2); // delay 2gg per dati GSC stabili
  const start = new Date(end);
  start.setDate(start.getDate() - (WINDOW_DAYS - 1));
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (WINDOW_DAYS - 1));

  const dateString = (value: Date) => value.toISOString().slice(0, 10);
  const commonBody = {
    type: 'web',
    dataState: 'all',
  };

  const [currentTotals, previousTotals, pageReport, queryReport] = await Promise.all([
    searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        ...commonBody,
        startDate: dateString(start),
        endDate: dateString(end),
        rowLimit: 1,
      },
    }),
    searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        ...commonBody,
        startDate: dateString(previousStart),
        endDate: dateString(previousEnd),
        rowLimit: 1,
      },
    }),
    searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        ...commonBody,
        startDate: dateString(start),
        endDate: dateString(end),
        dimensions: ['page'],
        rowLimit: 100,
      },
    }),
    searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        ...commonBody,
        startDate: dateString(start),
        endDate: dateString(end),
        dimensions: ['query'],
        rowLimit: 50,
      },
    }),
  ]);

  const currentRow = normalizeSearchRow((currentTotals.data.rows || [])[0] || {});
  const previousRow = normalizeSearchRow((previousTotals.data.rows || [])[0] || {});
  const pageRows = (pageReport.data.rows || []).map(normalizeSearchRow);
  const queryRows = (queryReport.data.rows || []).map(normalizeSearchRow);
  const siteUrlPublic = getSiteUrl(context);
  const headTargets = getHeadTargetRows(siteUrlPublic, pageRows);

  return {
    status: 'ok',
    source: 'Google Search Console Search Analytics',
    siteUrl,
    sitePublicUrl: siteUrlPublic,
    windowDays: WINDOW_DAYS,
    currentPeriod: {
      startDate: dateString(start),
      endDate: dateString(end),
      clicks: currentRow.clicks,
      impressions: currentRow.impressions,
      ctr: currentRow.ctr,
      position: currentRow.position,
    },
    previousPeriod: {
      startDate: dateString(previousStart),
      endDate: dateString(previousEnd),
      clicks: previousRow.clicks,
      impressions: previousRow.impressions,
      ctr: previousRow.ctr,
      position: previousRow.position,
    },
    deltas: {
      clicks: computeDelta(currentRow.clicks, previousRow.clicks),
      impressions: computeDelta(currentRow.impressions, previousRow.impressions),
      ctr: computeDelta(currentRow.ctr, previousRow.ctr),
      position: previousRow.position ? Math.round((currentRow.position - previousRow.position) * 100) / 100 : null,
    },
    topPages: pageRows,
    topQueries: queryRows,
    headTargets,
  };
}

async function runUrlInspection(context: APIContext) {
  const auth = getGoogleAuth(context, ['https://www.googleapis.com/auth/webmasters.readonly']);
  const siteUrl = getSearchConsoleSiteUrl(context);
  const token = await auth.getAccessToken();
  const siteUrlPublic = getSiteUrl(context);

  const results = await Promise.all(
    HEAD_TARGETS.map(async (target) => {
      const url = buildAbsoluteUrl(siteUrlPublic, target.path);
      try {
        const response = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${typeof token === 'string' ? token : token?.token || ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inspectionUrl: url,
            siteUrl,
            languageCode: 'it-IT',
          }),
        });

        if (!response.ok) {
          throw new Error(`${response.status}: ${(await response.text()).slice(0, 400)}`);
        }

        const payload = await response.json();
        const inspection = payload.inspectionResult || {};
        const indexStatus = inspection.indexStatusResult || {};

        return {
          ...target,
          url,
          status: 'ok',
          verdict: indexStatus.verdict || null,
          coverageState: indexStatus.coverageState || null,
          indexingState: indexStatus.indexingState || null,
          pageFetchState: indexStatus.pageFetchState || null,
          lastCrawlTime: indexStatus.lastCrawlTime || null,
          inspectionResultLink: inspection.inspectionResultLink || null,
          indexed: Boolean(indexStatus.lastCrawlTime) || String(indexStatus.verdict || '').toUpperCase() === 'PASS',
        };
      } catch (error) {
        return {
          ...target,
          url,
          status: 'error',
          error: String((error as Error)?.message || error),
          indexed: false,
        };
      }
    }),
  );

  return {
    status: 'ok',
    source: 'Google URL Inspection API',
    siteUrl,
    results,
    summary: {
      total: results.length,
      indexed: results.filter((row) => row.indexed).length,
      unknown: results.filter((row) => !row.indexed && row.status === 'ok').length,
      errors: results.filter((row) => row.status === 'error').length,
    },
  };
}

async function loadImportStatus(context: APIContext) {
  const pool = getPgPool(context);
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM epg_sync_logs
      ORDER BY started_at DESC
      LIMIT 1
    `);
    return {
      status: 'ok',
      source: 'Postgres epg_sync_logs',
      latestRun: rows[0] ?? null,
    };
  } finally {
    await pool.end();
  }
}

async function loadGoogleIndexingReport(context: APIContext) {
  try {
    if (existsSync(LOCAL_GOOGLE_INDEXING_REPORT)) {
      return {
        status: 'ok',
        payload: JSON.parse(readFileSync(LOCAL_GOOGLE_INDEXING_REPORT, 'utf8')),
      };
    }
  } catch (error) {
    return {
      status: 'warning',
      payload: null,
      error: String((error as Error)?.message || error),
    };
  }

  const requestUrl = new URL(context.request.url);
  const reportUrl = new URL('/search-console/google-indexing-latest.json', requestUrl.origin);
  try {
    const response = await fetch(reportUrl.toString(), { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) {
      throw new Error(`${response.status}`);
    }
    const payload = await response.json();
    return {
      status: 'ok',
      payload,
    };
  } catch (error) {
    return {
      status: 'warning',
      payload: null,
      error: String((error as Error)?.message || error),
    };
  }
}

async function loadWebSubReport(context: APIContext) {
  try {
    if (existsSync(LOCAL_WEBSUB_REPORT)) {
      return {
        status: 'ok',
        payload: JSON.parse(readFileSync(LOCAL_WEBSUB_REPORT, 'utf8')),
      };
    }
  } catch (error) {
    return {
      status: 'warning',
      payload: null,
      error: String((error as Error)?.message || error),
    };
  }

  const requestUrl = new URL(context.request.url);
  const reportUrl = new URL('/search-console/websub-latest.json', requestUrl.origin);
  try {
    const response = await fetch(reportUrl.toString(), { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) {
      throw new Error(`${response.status}`);
    }
    const payload = await response.json();
    return {
      status: 'ok',
      payload,
    };
  } catch (error) {
    return {
      status: 'warning',
      payload: null,
      error: String((error as Error)?.message || error),
    };
  }
}

async function loadGa4Status(context: APIContext) {
  const propertyId = getEnvValue(context, 'GA4_PROPERTY_ID');
  const measurementId = getGa4MeasurementId(context);
  if (!propertyId) {
    return {
      status: 'warning',
      measurementId,
      propertyId: null,
      message: 'GA4 property ID non configurato. La dashboard può mostrare GSC live ma non ancora i dati API GA4.',
      action: 'Aggiungi GA4_PROPERTY_ID nelle env di Cloudflare Pages.',
    };
  }

  try {
    const auth = getGoogleAuth(context, ['https://www.googleapis.com/auth/analytics.readonly']);
    const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
        limit: 10,
      },
    });

    return {
      status: 'ok',
      measurementId,
      propertyId,
      rows: response.data.rows || [],
    };
  } catch (error) {
    const parsed = parseGoogleError(error);
    return {
      status: 'error',
      measurementId,
      propertyId,
      message: parsed.message,
      activationUrl: parsed.activationUrl,
      action: parsed.activationUrl
        ? 'Abilita Google Analytics Data API nel progetto del service account e verifica i permessi sulla property.'
        : 'Verifica che Google Analytics Data API sia abilitata e che il service account abbia accesso alla property.',
    };
  }
}

function buildInsights(payload: {
  importStatus: Awaited<ReturnType<typeof loadImportStatus>>;
  searchPerformance: Awaited<ReturnType<typeof runSearchAnalytics>>;
  inspection: Awaited<ReturnType<typeof runUrlInspection>>;
  ga4: Awaited<ReturnType<typeof loadGa4Status>>;
}) {
  const insights: Array<Record<string, unknown>> = [];
  const actions: Array<Record<string, unknown>> = [];
  const latestRun = payload.importStatus.latestRun;
  const unknownTargets = payload.inspection.results.filter((row) => !row.indexed && row.status === 'ok');
  const headByImpressions = [...payload.searchPerformance.headTargets].sort((a, b) => b.impressions - a.impressions);
  const lowCtrTargets = headByImpressions.filter((row) => row.impressions >= 5 && row.ctr > 0 && row.ctr < 2.5);
  const zeroImpressionTargets = payload.searchPerformance.headTargets.filter((row) => row.impressions === 0);

  if (latestRun?.status !== 'success') {
    actions.push({
      priority: 'high',
      title: 'Verificare l’ultimo import EPG',
      detail: 'La pipeline import non risulta in stato success. Prima di lavorare sul SEO va stabilizzata la freschezza dei dati.',
      target: latestRun?.started_at || null,
    });
  } else {
    insights.push({
      priority: 'info',
      title: 'Import EPG regolare',
      detail: `Ultimo import chiuso con successo. ${latestRun.total_channels || 0} canali e ${latestRun.total_programs || 0} programmi caricati.`,
    });
  }

  const siteUrlPublic = payload.searchPerformance.sitePublicUrl || 'https://www.intvstasera.it';
  const scResource = encodeURIComponent('sc-domain:intvstasera.it');

  if (unknownTargets.length > 0) {
    actions.push({
      priority: 'high',
      title: `${unknownTargets.length} head page non ancora riconosciute da Google`,
      detail: 'Sono le candidate prioritarie per sitemap, internal linking e Google Indexing API. Usa il link "Ispeziona in GSC" nella tabella per richiedere la scansione manuale.',
      target: unknownTargets.slice(0, 6).map((row) => row.label),
      gscLinks: unknownTargets.slice(0, 6).map((row) => ({
        label: row.label,
        url: `https://search.google.com/search-console/inspect?resource_id=${scResource}&url=${encodeURIComponent(row.url)}`,
      })),
    });
  }

  if (lowCtrTargets.length > 0) {
    actions.push({
      priority: 'medium',
      title: 'CTR basso su pagine con buona visibilità',
      detail: `${lowCtrTargets.length} head page hanno impressioni ma CTR < 2.5%. Ottimizza title (includi "stasera" / canale / ora) e meta description (aggiungi call-to-action: "scopri cosa va in onda").`,
      target: lowCtrTargets.slice(0, 5).map((row) => `${row.label} — ${row.ctr}% CTR, pos. ${row.position > 0 ? row.position.toFixed(1) : '—'}`),
    });
  }

  const highPosTarGets = payload.inspection.results.filter(
    (row) => row.indexed && (payload.searchPerformance.headTargets.find((h) => h.url === row.url)?.position ?? 0) > 20,
  );
  if (highPosTarGets.length > 0) {
    actions.push({
      priority: 'medium',
      title: `${highPosTarGets.length} pagine indicizzate ma in posizione > 20`,
      detail: "Pagine presenti in SERP ma lontane dalla prima pagina. Aumenta l'autorità con internal linking da home e hub, aggiungi schema.org BroadcastEvent aggiornato, verifica la freschezza del contenuto.",
      target: highPosTarGets.slice(0, 4).map((row) => row.label),
    });
  }

  if (zeroImpressionTargets.length > 0) {
    actions.push({
      priority: 'medium',
      title: `${zeroImpressionTargets.length} head page senza impression nei ${payload.searchPerformance.windowDays} giorni`,
      detail: 'Nessun segnale di visibilità: indica scarso crawl budget o pagine non ancora scoperte. Collega esplicitamente dalla homepage, aggiorna la sitemap XML e verifica robots.txt.',
      target: zeroImpressionTargets.slice(0, 5).map((row) => row.label),
    });
  }

  const topPages = payload.searchPerformance.topPages || [];
  const nonHeadPages = topPages.filter((row) => {
    const isHead = HEAD_TARGETS.some((t) => row.key.endsWith(t.path) || row.key.endsWith(t.path + '/'));
    return !isHead && row.impressions > 10;
  });
  if (nonHeadPages.length > 0) {
    insights.push({
      priority: 'info',
      title: 'Pagine long-tail con traffico emergente',
      detail: `${nonHeadPages.length} pagine al di fuori delle head page stanno già generando impression. Valuta di potenziarle con internal linking dalla pagina canale e meta description più specifici.`,
      target: nonHeadPages.slice(0, 4).map((row) => {
        try { return new URL(row.key).pathname; } catch { return row.key; }
      }),
    });
  }

  const sp = payload.searchPerformance;
  if (sp.currentPeriod.impressions > 0) {
    const deltaStr = sp.deltas?.impressions != null
      ? ` (${sp.deltas.impressions > 0 ? '+' : ''}${sp.deltas.impressions}% vs periodo precedente)`
      : '';
    insights.push({
      priority: 'info',
      title: `${sp.windowDays} giorni: ${sp.currentPeriod.impressions.toLocaleString('it-IT')} impression, ${sp.currentPeriod.clicks.toLocaleString('it-IT')} click`,
      detail: `CTR medio ${sp.currentPeriod.ctr}%, posizione media ${typeof sp.currentPeriod.position === 'number' ? sp.currentPeriod.position.toFixed(1) : '—'}${deltaStr}.`,
    });
  }

  if (payload.ga4.status !== 'ok') {
    actions.push({
      priority: 'medium',
      title: 'Completare il layer GA4 server-side',
      detail: payload.ga4.action,
      target: payload.ga4.activationUrl || payload.ga4.message,
    });
  }

  return { insights, actions };
}

export async function buildSeoDashboardPayload(context: APIContext) {
  const cacheKey = 'seo-dashboard';
  const cached = combinedCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const [importStatus, searchPerformance, inspection, googleIndexing, websub, ga4] = await Promise.all([
    loadImportStatus(context),
    runSearchAnalytics(context),
    runUrlInspection(context),
    loadGoogleIndexingReport(context),
    loadWebSubReport(context),
    loadGa4Status(context),
  ]);

  const { insights, actions } = buildInsights({
    importStatus,
    searchPerformance,
    inspection,
    ga4,
  });

  const payload = {
    ok: true,
    generatedAt: new Date().toISOString(),
    timeZone: TIME_ZONE,
    siteUrl: getSiteUrl(context),
    searchConsoleSiteUrl: getSearchConsoleSiteUrl(context),
    importStatus,
    googleIndexing,
    websub,
    searchPerformance,
    inspection,
    ga4,
    insights,
    actions,
  };

  combinedCache.set(cacheKey, {
    expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    payload,
  });

  return payload;
}
