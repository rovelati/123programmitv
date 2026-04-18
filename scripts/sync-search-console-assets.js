import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const sourceDir = path.join(process.cwd(), 'public', 'search-console');
const destinationDir = path.join(process.cwd(), 'dist', 'client', 'search-console');

if (!existsSync(sourceDir)) {
  console.error(`Missing source directory: ${sourceDir}`);
  process.exit(1);
}

mkdirSync(destinationDir, { recursive: true });
cpSync(sourceDir, destinationDir, { recursive: true, force: true });

console.log(`Synced search-console assets to ${destinationDir}`);
