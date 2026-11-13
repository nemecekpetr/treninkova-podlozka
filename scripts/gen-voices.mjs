// Vygeneruje hlasové hlášky průvodce jako MP3 z databáze src/content/phrases.json.
// Spuštění: node scripts/gen-voices.mjs [styl ...] && node scripts/trim-voices.mjs   (už existující soubory přeskočí, takže jde bezpečně opakovat)
//
// Styly:
//   trener – neuronový hlas Antonín (Microsoft Edge TTS, zdarma)
//   david  – hlas „David – The Patient Teacher“ z ElevenLabs; potřebuje proměnnou ELEVENLABS_API_KEY
//            a hlas přidaný do vlastní knihovny ElevenLabs (Voice Library → Add).
import { EdgeTTS } from 'node-edge-tts';
import fs from 'node:fs';

const STYLES = {
  trener: { provider: 'edge', voice: 'cs-CZ-AntoninNeural', rate: '-2%', pitch: '-3Hz' },
  david: {
    provider: 'elevenlabs',
    voiceId: '86X949t0MXIzJxICJiaV',
    model: 'eleven_multilingual_v2',
    settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 1.0 },
  },
};
const db = JSON.parse(fs.readFileSync('src/content/phrases.json', 'utf8'));
const TEXT = { ...db.fixed };
for (const [g, list] of Object.entries(db.groups)) list.forEach((t, i) => { TEXT[`${g}_${i + 1}`] = t; });

// Krátké povely (jedno slovo) dostanou vykřičník, ať je ElevenLabs vysloví jako povel, ne jako otázku nebo útržek.
const SHORT = /^(zone_|side_|dir_|countdown_)/;
const forEleven = (key, text) => (SHORT.test(key) && !/[.!?]$/.test(text) ? `${text}!` : text);

async function elevenlabs(cfg, key, text, file) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('chybí ELEVENLABS_API_KEY');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: forEleven(key, text), model_id: cfg.model, language_code: 'cs', voice_settings: cfg.settings }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

const only = process.argv.slice(2);
for (const [style, cfg] of Object.entries(STYLES)) {
  if (only.length ? !only.includes(style) : cfg.provider !== 'edge' && !process.env.ELEVENLABS_API_KEY) continue;
  const dir = `voice-src/${style}`; // zdrojové MP3; pro aplikaci se ořežou a převedou na WAV skriptem trim-voices.mjs
  fs.mkdirSync(dir, { recursive: true });
  const tts = cfg.provider === 'edge'
    ? new EdgeTTS({ voice: cfg.voice, lang: 'cs-CZ', outputFormat: 'audio-24khz-48kbitrate-mono-mp3', rate: cfg.rate, pitch: cfg.pitch, timeout: 20000 })
    : null;
  for (const [key, text] of Object.entries(TEXT)) {
    const file = `${dir}/${key}.mp3`;
    if (fs.existsSync(file) && fs.statSync(file).size > 1000) continue;
    let ok = false;
    for (let attempt = 1; attempt <= 6 && !ok; attempt++) {
      try {
        if (tts) await tts.ttsPromise(text, file); else await elevenlabs(cfg, key, text, file);
        ok = true; console.log('OK', style, key, fs.statSync(file).size);
      } catch (e) { console.log('opakuji', style, key, attempt, String(e.message || e).slice(0, 120)); await new Promise((r) => setTimeout(r, 4000 * attempt)); }
    }
    await new Promise((r) => setTimeout(r, tts ? 700 : 150));
  }
}
console.log('HOTOVO');
