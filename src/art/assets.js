// ============================================================================
//  ASSET MANIFEST
//  Every texture the game uses is listed here by key. By default each one is
//  generated procedurally. To swap any of them for a hand-made/CC0 image,
//  add it to FILE_OVERRIDES below — Boot loads the file and skips the generator.
//  (Spritesheets need frameWidth/frameHeight; keep the same frame layout.)
// ============================================================================
import { P, SKIES } from './palette.js';
import { generateCharacters } from './characters.js';
import { makeSky, makeSun, makeGlow, makeBeam, makeStars, makeCloud, makeRange, makeMesas, makeNearLayer, makeDesertFloor, makeJoshuaSprite, makeCactus, makeTumbleweed, makeLedge } from './environment.js';
import { makeVan, makeUFO, makeCampfire, makeCoins } from './props.js';
import { generateEnemies } from './enemies.js';
import { makePortraits } from './portraits.js';
import { makeLabTiles, makeLabFar, makeLabMid, makeLabProps, makeCombatFX } from './lab.js';
import { makeLogo, makeSign, makePost, makePanel, makeIcons, makeTouchArt, makeGlyphs, makeRatingStar } from './ui.js';

/** key -> { url, frameWidth?, frameHeight? }   e.g.  van: { url: 'assets/sprites/van.png' } */
export const FILE_OVERRIDES = {
};

/** Ordered generation steps (Boot shows progress as these run). */
export const ART_STEPS = [
  { keys: ['ben', 'zeus'], gen: (s) => generateCharacters(s, {}) },
  { keys: ['glow'], gen: (s) => { makeGlow(s, 'glow', 128, 2.2); makeGlow(s, 'glow_soft', 128, 3.5); makeBeam(s, 'beam'); } },
  { keys: ['stars'], gen: (s) => makeStars(s) },
  // --- title scene: sunset backdrop
  { keys: ['sky_sunset'], gen: (s) => makeSky(s, 'sky_sunset', SKIES.sunset, 640, 280) },
  { keys: ['sun'], gen: (s) => makeSun(s, 'sun', 58) },
  { keys: ['clouds'], gen: (s) => {
    makeCloud(s, 'cloud_a', 180, 18, 3, { top: P.sky2, mid: P.sky4, under: P.sky6 });
    makeCloud(s, 'cloud_b', 130, 14, 9, { top: P.sky3, mid: P.sky5, under: P.sky7 });
    makeCloud(s, 'cloud_c', 220, 20, 17, { top: P.sky3, mid: P.sky5, under: P.sky8 });
    makeCloud(s, 'cloud_d', 90, 10, 23, { top: P.sky1, mid: P.sky3, under: P.sky5 });
  } },
  { keys: ['range_far'], gen: (s) => makeRange(s, 'range_far', 640, 70, { color: '#7a3270', haze: P.sky5, rim: P.sky7, seed: 5 }) },
  { keys: ['mesa_mid'], gen: (s) => makeMesas(s, 'mesa_mid', 640, 132, { seed: 12, count: 4, base: P.mauve1, dark: P.mauve2, light: P.mauve0, rim: P.sky8, haze: P.sky4, minH: 0.4, maxH: 0.72 }) },
  { keys: ['mesa_near'], gen: (s) => makeMesas(s, 'mesa_near', 640, 120, { seed: 31, count: 3, base: '#5a2438', dark: '#3e1a30', light: '#7a3040', rim: P.sky8, haze: P.mauve3, minH: 0.32, maxH: 0.62 }) },
  { keys: ['ridge'], gen: (s) => makeNearLayer(s, 'ridge', 640, 90, { seed: 4, ground: P.terra4, ground2: '#2c1620', rim: P.sky7, trees: 7, poles: 3, silhouette: '#2a1428' }) },
  { keys: ['floor'], gen: (s) => makeDesertFloor(s, 'floor', 640, 90, { seed: 8, c0: P.terra2, c1: P.terra3, c2: P.terra4, c3: '#2c1620', rim: P.sky6 }) },
  { keys: ['joshua'], gen: (s) => {
    makeJoshuaSprite(s, 'joshua_big', 70, 77, { trunk: P.terra4, trunk2: '#2c1620', leaf: P.sage3, leaf2: P.sage4, tip: P.sky6 });
    makeJoshuaSprite(s, 'joshua_med', 44, 12, { trunk: P.terra4, trunk2: '#2c1620', leaf: P.sage3, leaf2: P.sage4, tip: P.sky6 });
    makeCactus(s, 'cactus', 3);
    makeTumbleweed(s, 'tumbleweed');
    makeLedge(s, 'ledge');
  } },
  // --- props
  { keys: ['van'], gen: (s) => makeVan(s, 'van') },
  { keys: ['ufo'], gen: (s) => makeUFO(s, 'ufo') },
  { keys: ['campfire'], gen: (s) => makeCampfire(s, 'campfire') },
  { keys: ['coin', 'golden'], gen: (s) => makeCoins(s) },
  // --- UI
  { keys: ['logo'], gen: (s) => makeLogo(s) },
  { keys: ['signs'], gen: (s) => {
    makeSign(s, 'sign', 132, 24, { seed: 4 });
    makeSign(s, 'sign_orange', 132, 24, { fill: '#d9781e', fill2: '#a85410', border: P.cream, seed: 9 });
    makeSign(s, 'sign_small', 64, 20, { seed: 6 });
    makePost(s, 'post', 190);
  } },
  { keys: ['panels'], gen: (s) => {
    makePanel(s, 'panel', 300, 230);
    makePanel(s, 'panel_wide', 400, 120, { accent: P.btc });
  } },
  { keys: ['icons'], gen: (s) => { makeIcons(s); makeGlyphs(s); makeTouchArt(s); makeRatingStar(s); } },
  // --- Chapter 5: underground labs
  { keys: ['soldier', 'agent', 'grey', 'drone'], gen: (s) => generateEnemies(s) },
  { keys: ['portrait_ben', 'portrait_zeus'], gen: (s) => makePortraits(s) },
  { keys: ['labtiles'], gen: (s) => makeLabTiles(s) },
  { keys: ['lab_far', 'lab_far_glow'], gen: (s) => makeLabFar(s) },
  { keys: ['lab_mid', 'lab_mid_glow'], gen: (s) => makeLabMid(s) },
  { keys: ['tank', 'rack', 'terminal', 'rig'], gen: (s) => makeLabProps(s) },
  { keys: ['bolt', 'boom'], gen: (s) => makeCombatFX(s) },
];
