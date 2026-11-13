// Ukázkový hráč pro vyzkoušení: odkaz ...?demo vytvoří hráče „Jakub“ s trochou postupu (XP, týden, karty).
// Nic nemaže: pokud už v prohlížeči nějací hráči jsou, nedělá se nic.
// Ukázkový hráč žije jen v demu: při běžném spuštění (bez ?demo) ho removeDemoPlayers() smaže.
import { listProfiles, createProfile, saveProfile, addHistory, deleteProfile, listHistory } from '../domain/profiles.js';
import { allCards } from '../domain/extras.js';
import { storage } from '../storage/index.js';

export async function ensureDemoPlayer() {
  if ((await listProfiles()).length) return null;
  const p = await createProfile({ name: 'Jakub', jersey: '24', team: 'cze' });
  for (let i = 0; i < 3; i++) await addHistory(p.id, { durationSec: 360, xp: 60, drills: ['sole-taps', 'side-push-left', 'drag-back'], stars: 3 - (i % 2) });
  const hist = await storage.list('history');
  hist.forEach((h, i) => { h.date = Date.now() - (hist.length - 1 - i) * 2 * 86400000; storage.put('history', h); });
  const fresh = await storage.get('profiles', p.id);
  fresh.cards = Object.fromEntries(allCards().filter((_, i) => i % 4 === 0 || i < 4).map((c) => [c.id, 1]));
  fresh.level = 2; fresh.matches = 2; fresh.demo = true;
  await saveProfile(fresh);
  return fresh;
}

/** Smaže ukázkové hráče. Starší demo bez značky pozná podle jména, čísla, týmu a typické ukázkové historie. */
export async function removeDemoPlayers() {
  for (const p of await listProfiles()) {
    let isDemo = p.demo === true;
    if (!isDemo && p.name === 'Jakub' && String(p.jersey) === '24' && p.team === 'cze') {
      const hist = await listHistory(p.id);
      isDemo = hist.length <= 3 && hist.every((e) => e.durationSec === 360 && e.xp === 60);
    }
    if (isDemo) await deleteProfile(p.id);
  }
}
