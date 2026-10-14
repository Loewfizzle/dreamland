// ============================================================================
//  SAVE SYSTEM — everything persistent lives in one localStorage JSON blob.
//  All storage access is wrapped in try/catch: private browsing, blocked
//  storage or a full quota must never crash the game (we just don't persist).
// ============================================================================
import { GAME, AUDIO, CONTROLS } from '../config.js';

const DEFAULTS = () => ({
  version: 1,
  seenIntro: false,
  sats: 0,
  // chapters: { ch1: { done: true, stars: 2, golden: [true,false,true], bestTime: 182.4, bestSats: 340 } }
  chapters: {},
  upgrades: {},                 // { benHealth: 1, zeusSniff: 2, ... }
  cosmetics: { owned: [], equipped: { bandana: null, cap: null, van: null } },
  settings: {
    music: AUDIO.MUSIC_DEFAULT,
    sfx: AUDIO.SFX_DEFAULT,
    controlSize: CONTROLS.SIZE_DEFAULT,
    controlOpacity: CONTROLS.OPACITY_DEFAULT,
    shake: true,
    vibration: true,
    film: true,                 // film grain + scanlines overlay
  },
});

// Deep-merge saved data over defaults so new fields appear for old saves.
function merge(base, saved) {
  if (saved === null || typeof saved !== 'object' || Array.isArray(saved)) return saved ?? base;
  const out = { ...base };
  for (const k of Object.keys(saved)) {
    const b = base?.[k];
    out[k] = b && typeof b === 'object' && !Array.isArray(b) ? merge(b, saved[k]) : saved[k];
  }
  return out;
}

class SaveSystem {
  constructor() {
    this.data = DEFAULTS();
    this.listeners = new Set();
    this.load();
  }

  load() {
    try {
      const raw = window.localStorage.getItem(GAME.SAVE_KEY);
      if (raw) this.data = merge(DEFAULTS(), JSON.parse(raw));
    } catch (e) {
      console.warn('[save] could not load, using defaults', e);
      this.data = DEFAULTS();
    }
    return this.data;
  }

  persist() {
    try {
      window.localStorage.setItem(GAME.SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[save] could not write', e);
    }
  }

  /** True if the player has actually made progress worth "Continue"-ing. */
  hasProgress() {
    return this.data.seenIntro || Object.keys(this.data.chapters).length > 0 || this.data.sats > 0;
  }

  get settings() { return this.data.settings; }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.persist();
    this.listeners.forEach((fn) => fn(key, value));
  }

  /** Subscribe to settings changes. Returns an unsubscribe fn. */
  onSettingChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  addSats(n) {
    this.data.sats = Math.max(0, Math.round(this.data.sats + n));
    this.persist();
    return this.data.sats;
  }

  /** Wipe progress but keep the player's settings. */
  resetProgress() {
    const settings = this.data.settings;
    this.data = DEFAULTS();
    this.data.settings = settings;
    this.persist();
  }
}

export const Save = new SaveSystem();
