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
  console.error('Failed to generate SEO dashboard JSON');
  console.error(error);
  process.exit(1);
});
