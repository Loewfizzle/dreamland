// ============================================================================
//  PROGRESS — chapter unlocks, results recording, shop upgrades → gameplay
//  stats, and cosmetics → regenerated sprites.
// ============================================================================
import { SHOP, ECONOMY } from '../config.js';
import { Save } from './save.js';
import { CHAPTERS, chapterById } from '../data/chapters.js';
import { generateCharacters } from '../art/characters.js';
import { makeVan, VAN_PAINTS } from '../art/props.js';
import { makeVanRear } from '../art/road.js';

export const upgradeLevel = (id) => Save.data.upgrades[id] ?? 0;
export const upgradeDef = (id) => SHOP.upgrades.find((u) => u.id === id);

/** Gameplay numbers after upgrades. Chapters read these instead of raw config. */
export function stat(name, base) {
  const L = upgradeLevel;
  switch (name) {
    case 'maxHp': return base + L('benHealth');
    case 'runSpeed': return base * (1 + 0.07 * L('benSpeed'));
    case 'blasterDamage': return base + L('blaster');
    case 'blasterCooldown': return base * (1 - 0.12 * L('blaster'));
    case 'sniffRadius': return base + 40 * L('zeusSniff');
    case 'barkStun': return base + 700 * L('zeusBark');
    case 'digTime': return base / (1 + 0.35 * L('zeusDig'));
    case 'tackleCooldown': return base * (1 - 0.25 * L('zeusTackle'));
    default: return base;
  }
}

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------
export const chapterRecord = (id) => Save.data.chapters[id] ?? null;
export const isDone = (id) => !!Save.data.chapters[id]?.done;

/** A chapter is playable once every earlier *built* chapter is finished. */
export function isUnlocked(id) {
  const idx = CHAPTERS.findIndex((c) => c.id === id);
  if (idx < 0 || !CHAPTERS[idx].scene) return false;
  if (isDone(id)) return true;                     // anything you've beaten stays replayable
  return CHAPTERS.slice(0, idx).every((c) => !c.scene || isDone(c.id));
}

/** The chapter the player should do next (first unlocked & unfinished built one). */
export function nextChapter() {
  return CHAPTERS.find((c) => c.scene && isUnlocked(c.id) && !isDone(c.id)) ?? null;
}

/**
 * Store a finished run. result: { sats, coins, coinsTotal, golden:[bool x3], time, clean, extras }
 * Returns the computed breakdown used by the results screen.
 */
export function recordResult(id, result) {
  const ch = chapterById(id);
  const prev = chapterRecord(id) ?? {};
  const goldCount = result.golden.filter(Boolean).length;
  let stars = 1;
  if (result.coinsTotal === 0 || result.coins >= result.coinsTotal * ECONOMY.STAR_COIN_SHARE) stars++;
  if (goldCount === 3) stars++;
  const fast = ch.parTime ? result.time <= ch.parTime : false;
  const bonuses = [{ label: 'CHAPTER CLEAR', sats: ECONOMY.COMPLETE_BONUS }];
  if (fast) bonuses.push({ label: 'SPEEDY', sats: ECONOMY.FAST_BONUS });
  if (result.clean) bonuses.push({ label: result.cleanLabel ?? 'FLAWLESS', sats: ECONOMY.CLEAN_BONUS });
  const bonusTotal = bonuses.reduce((a, b) => a + b.sats, 0);
  const firstClear = !prev.done;
  Save.data.chapters[id] = {
    done: true,
    stars: Math.max(stars, prev.stars ?? 0),
    golden: [0, 1, 2].map((i) => !!(result.golden[i] || prev.golden?.[i])),
    bestTime: Math.min(result.time, prev.bestTime ?? Infinity),
    plays: (prev.plays ?? 0) + 1,
  };
  Save.addSats(result.sats + bonusTotal);
  return { stars, goldCount, bonuses, bonusTotal, total: result.sats + bonusTotal, firstClear, newBestTime: result.time < (prev.bestTime ?? Infinity) };
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
export function buyUpgrade(id) {
  const def = upgradeDef(id);
  const lvl = upgradeLevel(id);
  if (!def || lvl >= def.prices.length) return false;
  const price = def.prices[lvl];
  if (Save.data.sats < price) return false;
  Save.data.sats -= price;
  Save.data.upgrades[id] = lvl + 1;
  Save.persist();
  return true;
}

export const ownsCosmetic = (id) => Save.data.cosmetics.owned.includes(id);
export const equipped = (slot) => {
  const id = Save.data.cosmetics.equipped[slot];
  return id ? SHOP.cosmetics.find((c) => c.id === id) : null;
};

export function buyCosmetic(id) {
  const def = SHOP.cosmetics.find((c) => c.id === id);
  if (!def || ownsCosmetic(id) || Save.data.sats < def.price) return false;
  Save.data.sats -= def.price;
  Save.data.cosmetics.owned.push(id);
  Save.data.cosmetics.equipped[def.slot] = id;
  Save.persist();
  return true;
}

/** Equip (or unequip if already equipped) an owned cosmetic. */
export function toggleCosmetic(id) {
  const def = SHOP.cosmetics.find((c) => c.id === id);
  if (!def || !ownsCosmetic(id)) return false;
  const eq = Save.data.cosmetics.equipped;
  eq[def.slot] = eq[def.slot] === id ? null : id;
  Save.persist();
  return true;
}

/** Rebuild the sprites that show cosmetics (cap, bandana, van paint). */
export function applyCosmetics(scene) {
  const cap = equipped('cap'), bandana = equipped('bandana'), van = equipped('van');
  generateCharacters(scene, { cap: cap?.color, capDark: cap?.dark, bandana: bandana?.color });
  makeVan(scene, 'van', VAN_PAINTS[van?.paint ?? 'teal']);
  makeVanRear(scene, VAN_PAINTS[van?.paint ?? 'teal']);
}
