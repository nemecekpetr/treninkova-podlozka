# Audio – hlasy průvodce, efekty, hudba

Hlášky jsou v databázi `src/content/phrases.json`:
- `fixed`: čísla zón (`zone_1`…`zone_6`), `side_left`/`side_right`, odpočet (`countdown_3…1`) a staré jednotlivé hlášky.
- `groups`: skupiny vět s **více variantami** (`welcome`, `next`, `last`, `go`, `praise`, `half`, `almost`, `rest`, `end`, `aborted`, `levelup`, `pause`, `resume`).
  Při použití se varianta losuje (nikdy 2× po sobě stejná). Klíč souboru je `<skupina>_<číslo>`, např. `praise_7`.
  Další variantu přidáš jako další řádek ve skupině a znovu spustíš generování.

## Soubory
`assets/audio/voice/<styl>/<klíč>.wav`, dva styly (rodič je přepíná v nastavení, Hlas):
- `david`: **výchozí**, hlas „David – The Patient Teacher“ z ElevenLabs (model `eleven_multilingual_v2`).
- `trener`: neuronový hlas Antonín (Microsoft Edge TTS).

Nahrávky jsou uložené přímo v aplikaci a přehrávají se offline. ElevenLabs je potřeba jen při generování nových hlášek, aplikace funguje i bez předplatného.
Vedle nich leží `_meta.json` (kdy v nahrávce skutečně začíná a končí řeč). Podle něj se věty nepřerušují a nečeká se na ticho na konci.

```
node scripts/gen-voices.mjs trener   # vygeneruje chybějící hlášky hlasu Antonín (zdarma), jde opakovat
ELEVENLABS_API_KEY=… node scripts/gen-voices.mjs david   # hlas David (ElevenLabs, spotřebuje znaky z předplatného)
node scripts/trim-voices.mjs         # ořízne MP3 z voice-src/ na čistou řeč a uloží WAV do assets/audio/voice/
# David: WAV pak převzorkovat na 24 kHz (poloviční velikost), např.:
# for f in assets/audio/voice/david/*.wav; do ffmpeg -y -i "$f" -ar 24000 -ac 1 /tmp/r.wav && mv /tmp/r.wav "$f"; done
node scripts/analyze-voices.mjs      # přepočítá _meta.json
```
Chybí-li soubor, mluví TTS zařízení.

## Jak se hlášky řadí
- **call** (čísla zón, strany): přeskočí se, když zrovna zní věta.
- **phrase** (věty): když zní jiná věta, počká ve frontě (max. 2).
- **urgent** (odpočet, „hraj“, pauza): přeruší vše.

## Efekty a hudba
`assets/audio/sfx/<klíč>.mp3`: `click`, `focus`, `tick`, `success`, `levelup`, `confetti`.
`assets/audio/music/bg_main.mp3` (smyčka, klidná).
