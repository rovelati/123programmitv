import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const sourceDir = path.join(process.cwd(), 'public', 'search-console');
const destinationDir = path.join(process.cwd(), 'dist', 'client', 'search-console');
const distDir = path.join(process.cwd(), 'dist');
const clientDir = path.join(distDir, 'client');

if (!existsSync(sourceDir)) {
  console.error(`Missing source directory: ${sourceDir}`);
  process.exit(1);
}

mkdirSync(destinationDir, { recursive: true });
cpSync(sourceDir, destinationDir, { recursive: true, force: true });

console.log(`Synced search-console assets to ${destinationDir}`);

if (existsSync(distDir) && existsSync(clientDir)) {
  for (const fileName of readdirSync(distDir)) {
    if (/^sitemap.*\.xml$/i.test(fileName)) {
      copyFileSync(path.join(distDir, fileName), path.join(clientDir, fileName));
      console.log(`Synced ${fileName} to ${clientDir}`);
    }
  }
}
