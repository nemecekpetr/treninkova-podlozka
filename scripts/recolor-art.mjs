// Přebarví zelenou neonovou záři v hotové grafice (assets/img/art/*.webp a ikony/splash v android/…/res) na jiný odstín.
// Mění jen pixely se zeleným odstínem (80–175°, s měkkými hranami); zlatá, stříbrná, bílá a ostatní barvy zůstávají.
// Potřebuje dwebp a cwebp v PATH (brew install webp) a balíček pngjs.
//
//   node scripts/recolor-art.mjs --measure            vypíše podíl zelených pixelů v každém obrázku
//   node scripts/recolor-art.mjs 209 [soubor ...]     posune zelenou na odstín 209° (modrá Rapid Plzeň)
//   node scripts/recolor-art.mjs 209 android          jen ikony a banner pro Android
//
//   node scripts/recolor-art.mjs 209 avatary          postavičky (av_*): zelené pozadí, kroužek i zelené dresy
//
// Bez výčtu se postavičky (av_*) nepřebarvují: zelená je tam i oblečení, přebarvují se jen na vyžádání.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';

const DIR = 'assets/img/art';
const SKIP = /^av_/;
const HUE_FROM = 80; const HUE_TO = 175; // rozsah „zelené“
const GREEN_CENTER = 143;                 // odstín původního akcentu #16C45A
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'recolor-'));

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`${cmd}: ${r.stderr}`); };

function toHsl(r, g, b) {
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const l = (mx + mn) / 2; const d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, l];
}
function fromHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s; const x = c * (1 - Math.abs(((h / 60) % 2) - 1)); const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}

const args = process.argv.slice(2);
const measure = args[0] === '--measure';
const target = measure ? 0 : Number(args[0]);
if (!measure && !(target >= 0 && target < 360)) { console.log('Použití: node scripts/recolor-art.mjs <odstín 0–359> [soubor ...] | --measure'); process.exit(1); }
const only = args.slice(1);
const onlyWebp = only.filter((x) => x !== 'android');
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.webp') && (!only.length ? !SKIP.test(f) : onlyWebp.includes(f) || (onlyWebp.includes('avatary') && SKIP.test(f))))
  .map((f) => path.join(DIR, f));
// Android: ikony aplikace, TV banner a úvodní obrazovka (PNG)
const RES = 'android/app/src/main/res';
if ((!only.length || only.includes('android')) && fs.existsSync(RES)) {
  for (const d of fs.readdirSync(RES)) {
    if (!/^(mipmap|drawable)/.test(d)) continue;
    for (const f of fs.readdirSync(path.join(RES, d))) if (/^(ic_launcher.*|tv_banner|splash)\.png$/.test(f)) files.push(path.join(RES, d, f));
  }
}

let changed = 0;
for (const file of files) {
  const f = path.basename(file); const isWebp = f.endsWith('.webp');
  const png = isWebp ? path.join(TMP, f.replace('.webp', '.png')) : file;
  if (isWebp) run('dwebp', ['-quiet', file, '-o', png]);
  const p = PNG.sync.read(fs.readFileSync(png));
  const d = p.data; let green = 0; let visible = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    visible++;
    const r0 = d[i] / 255; const g0 = d[i + 1] / 255; const b0 = d[i + 2] / 255;
    const [h, s, l] = toHsl(r0, g0, b0);
    // měkké hrany (sytost i odstín), jinak v tmavé záři vznikají skvrny z nepřebarvených pixelů
    const w = smooth(0.02, 0.12, s) * smooth(HUE_FROM - 15, HUE_FROM, h) * (1 - smooth(HUE_TO, HUE_TO + 15, h));
    if (w <= 0) continue;
    if (w > 0.5) green++;
    if (measure) continue;
    // zachová vzájemné odchylky odstínu (přechody v záři), jen je posune kolem nového středu
    const nh = (target + (h - GREEN_CENTER) * 0.6 + 360) % 360;
    const [r, g, b] = fromHsl(nh, s, l);
    d[i] = Math.round((r0 + (r - r0) * w) * 255); d[i + 1] = Math.round((g0 + (g - g0) * w) * 255); d[i + 2] = Math.round((b0 + (b - b0) * w) * 255);
  }
  const share = visible ? (100 * green) / visible : 0;
  if (measure) { console.log(share.toFixed(1).padStart(5), '%', file); continue; }
  if (!green) continue;
  fs.writeFileSync(png, PNG.sync.write(p));
  if (isWebp) run('cwebp', ['-quiet', '-q', '90', '-alpha_q', '100', '-exact', png, '-o', file]);
  changed++;
  console.log('přebarveno', file, `${share.toFixed(1)} %`);
}
fs.rmSync(TMP, { recursive: true, force: true });
if (!measure) console.log('hotovo, přebarveno', changed, 'obrázků');
