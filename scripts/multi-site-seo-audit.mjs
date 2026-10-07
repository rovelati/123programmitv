import fs from 'fs';
import path from 'path';

// Sites to audit
const SITES = [
  { id: 'intvstasera', name: 'inTVstasera.it (IT)', url: 'https://www.intvstasera.it/', country: 'IT' },
  { id: 'fernsehheute', name: 'FernsehHeute.de (DE)', url: 'https://fernsehheute.de/', country: 'DE' },
  { id: 'programmecesoir', name: 'ProgrammeCeSoir.fr (FR)', url: 'https://programmecesoir.fr/', country: 'FR' },
];

function getBingApiKey() {
  const possiblePaths = [
    '/Users/romolovelati/Desktop/123PROGRAMMITV/key-bing.env',
    '/Users/romolovelati/Desktop/fernsehheute.de/key-bing.env',
    '/Users/romolovelati/Desktop/programmecesoir.fr/key-bing.env',
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8').trim();
      if (content && !content.includes('\n')) return content;
      if (content.includes('=')) return content.split('=')[1].trim();
      return content.split('\n')[0].trim();
    }
  }
  return process.env.BING_API_KEY || null;
}

async function fetchBingStats(siteUrl, apiKey) {
  if (!apiKey) return { error: 'No Bing API key found' };

  try {
    const [crawlRes, queryRes, quotaRes] = await Promise.all([
      fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetCrawlStats?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${apiKey}`).then(r => r.json()),
      fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${apiKey}`).then(r => r.json()),
      fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${apiKey}`).then(r => r.json()),
    ]);

    const crawlList = crawlRes.d || [];
    const latestCrawl = crawlList[crawlList.length - 1] || crawlList[0] || {};
    const queries = queryRes.d || [];
    const quota = quotaRes.d || {};

    return {
      status: 'ok',
      inIndex: latestCrawl.InIndex ?? 'N/A',
      crawledPages: latestCrawl.CrawledPages ?? 'N/A',
      crawlErrors: latestCrawl.CrawlErrors ?? 0,
      code2xx: latestCrawl.Code2xx ?? 0,
      code301: latestCrawl.Code301 ?? 0,
      code4xx: latestCrawl.Code4xx ?? 0,
      dailyQuotaRemaining: quota.DailyQuotaRemaining ?? 'N/A',
      monthlyQuotaRemaining: quota.MonthlyQuotaRemaining ?? 'N/A',
      topQueries: queries.slice(0, 5).map(q => ({
        query: q.Query,
        clicks: q.Clicks,
        impressions: q.Impressions,
        position: q.AvgPosition,
      })),
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function runAudit() {
  const bingKey = getBingApiKey();
  console.log('🔍 Avvio Audit SEO Multi-Sito (Google + Bing + GA4)\n');
  console.log(`🔑 Bing API Key: ${bingKey ? 'Presente (' + bingKey.slice(0, 6) + '...)' : 'Non trovata'}\n`);

  for (const site of SITES) {
    console.log(`========================================`);
    console.log(`📡 SITO: ${site.name}`);
    console.log(`🔗 URL: ${site.url}`);
    console.log(`========================================`);

    const bing = await fetchBingStats(site.url, bingKey);
    if (bing.error) {
      console.log(`❌ Bing Webmaster: ${bing.error}`);
    } else {
      console.log(`🔵 Bing Webmaster:`);
      console.log(`   - Pagine nell'Indice Bing: ${bing.inIndex}`);
      console.log(`   - Pagine Scansionate: ${bing.crawledPages}`);
      console.log(`   - Errori di Crawl: ${bing.crawlErrors} (4xx: ${bing.code4xx}, 301: ${bing.code301}, 200: ${bing.code2xx})`);
      console.log(`   - Quota Invio URL Rimanente: ${bing.dailyQuotaRemaining}/giorno`);
      if (bing.topQueries.length > 0) {
        console.log(`   - Top Query Bing:`);
        bing.topQueries.forEach(q => console.log(`     • "${q.query}": ${q.clicks} clicks, ${q.impressions} imp, pos #${q.position}`));
      } else {
        console.log(`   - Top Query Bing: Dati storici in accumulo`);
      }
    }
    console.log('\n');
  }
}

runAudit();
