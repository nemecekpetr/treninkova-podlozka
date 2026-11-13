// Build webové verze, která jde otevřít dvojklikem (file://) – bez serveru: jeden klasický skript místo ES modulů.
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const classicScript = () => ({
  name: 'classic-script',
  enforce: 'post',
  transformIndexHtml(html) {
    // moduly na file:// nefungují → klasický skript s defer
    return html.replace(/<script type="module" crossorigin/g, '<script defer').replace(/ crossorigin/g, '');
  },
});

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version) },
  publicDir: 'assets',
  plugins: [classicScript()],
  build: {
    target: 'es2019',
    outDir: 'Fotbal-web',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});
