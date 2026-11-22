import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');

console.log('[Build] Preparing deployment bundle for Vercel...');

// 1. Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 2. Copy public directory to dist directory
fs.cpSync(publicDir, distDir, { recursive: true });
console.log('[Build] Copied public/ to dist/ successfully.');

// 3. Also copy public/index.html to root index.html so both root and dist are always up-to-date
fs.copyFileSync(path.join(publicDir, 'index.html'), path.join(rootDir, 'index.html'));
fs.copyFileSync(path.join(publicDir, 'app.js'), path.join(rootDir, 'app.js'));
fs.copyFileSync(path.join(publicDir, 'style.css'), path.join(rootDir, 'style.css'));
console.log('[Build] Synced root index.html, app.js, and style.css.');

console.log('[Build] Build complete! Ready for Vercel production deployment.');
