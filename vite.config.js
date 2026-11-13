import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version) },
  publicDir: 'assets', // assets/img, assets/audio se kopírují do kořene buildu
  build: { target: 'es2019', outDir: 'dist', assetsInlineLimit: 0 },
  server: { host: true, port: 5173 },
});
