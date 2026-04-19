import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildSeoDashboardPayload } from '../src/lib/seoDashboard.ts';

const outputPath = path.join(process.cwd(), 'public', 'search-console', 'seo-dashboard-latest.json');
const siteUrl = process.env.SITE_URL || 'https://123programmitv.it';

async function main() {
  const fakeContext = {
    request: new Request(`${siteUrl.replace(/\/$/, '')}/admin-url-inspection`),
    locals: {
      runtime: {
        env: process.env,
      },
    },
  };

  const payload = await buildSeoDashboardPayload(fakeContext);
  writeFileSync(outputPath, JSON.stringify(payload, null, 2));

  console.log(`SEO dashboard written to ${outputPath}`);
  console.log(`Generated at: ${payload.generatedAt}`);
}

main().catch((error) => {
  console.warn('⚠️  SEO dashboard generation skipped (likely missing credentials in CI):');
  console.warn(error?.message || error);
  // Write a placeholder so the dashboard page loads without crashing
  try {
    const { mkdirSync } = await import('node:fs');
    const dir = path.dirname(outputPath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(outputPath, JSON.stringify({
      ok: false,
      generatedAt: new Date().toISOString(),
      error: error?.message || 'Credentials not available at build time',
    }, null, 2));
    console.warn(`Placeholder written to ${outputPath}`);
  } catch (_) { /* ignore */ }
  process.exit(0); // non-fatal: don't break the build
});
