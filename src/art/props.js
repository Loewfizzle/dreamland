// ============================================================================
//  PROPS — Ben's van, the UFO, campfire, sats coins and golden bitcoins.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, buildSheet, addPixelTexture, rng, dither } from './pixel.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
//  THE VAN (side view, facing right). 96 x 58.
//  paint: { c0, c1, c2, c3 } lower-body colors (cosmetic van paint jobs)
// ---------------------------------------------------------------------------
export const VAN_PAINTS = {
  teal:   { c0: P.van0, c1: P.van1, c2: P.van2, c3: P.van3 },
  sunset: { c0: '#ffb27a', c1: '#f07a50', c2: '#c0503a', c3: '#80302a' },
  alien:  { c0: '#c8ffb0', c1: '#7fe08a', c2: '#3fa86a', c3: '#22664a' },
  stealth:{ c0: '#6a6a80', c1: '#4a4a60', c2: '#33334a', c3: '#202033' },
};

export function drawVan(pc, paint = VAN_PAINTS.teal, { headlight = false } = {}) {
  const oy = 12;
  const r = rng(42);
  const frontX = (y) => (y < oy + 18 ? Math.round(86 + (y - oy - 6) * 0.5) : 92);
  // --- body silhouette
  for (let y = oy + 5; y <= oy + 37; y++) {
    let x0 = 3, x1 = frontX(y);
    if (y === oy + 5) { x0 = 9; x1 = 84; }
    if (y === oy + 6) { x0 = 6; x1 = 86; }
    if (y === oy + 37) { x0 = 5; x1 = 90; }
    for (let x = x0; x <= x1; x++) {
      let c;
      if (y < oy + 20) c = y === oy + 6 || y === oy + 7 ? P.vanTop0 : P.vanTop1;
      else if (y === oy + 20) c = P.chrome1;
      else if (y >= oy + 35) c = paint.c3;
      else if (y >= oy + 33) c = paint.c2;
      else c = paint.c1;
      if (y >= oy + 21 && y <= oy + 22) c = paint.c0;           // lit edge below the trim
      pc.px(x, y, c);
    }
  }
  pc.hline(9, 84, oy + 5, P.vanTop0);
  pc.vline(3, oy + 8, oy + 36, mix(paint.c2, P.vanTop2, 0.3));   // rear edge shade
  // faded racing stripes
  for (let x = 6; x <= 89; x++) {
    if (x > 34 && x < 46) continue;
    if (!dither(x, 0, 0.85)) continue;
    pc.px(x, oy + 25, P.sky7);
    pc.px(x, oy + 27, P.sky5);
  }
  // --- windows with sunset reflections
  const glass = (x0, x1, y0, y1, slant = 0) => {
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / (y1 - y0);
      const end = x1 + Math.round(slant * (y - y0));
      for (let x = x0; x <= end; x++) {
        let c = t < 0.35 ? P.glass0 : t < 0.7 ? P.glass1 : P.glass2;
        if (dither(x, y, (t * 3) % 1) && t < 0.7) c = t < 0.35 ? P.glass1 : P.glass2;
        if ((x - y * 0.8 + 100) % 13 < 2) c = mix(c, P.white, 0.6);   // diagonal glint
        pc.px(x, y, c);
      }
    }
  };
  glass(8, 24, oy + 9, oy + 17);
  glass(28, 48, oy + 9, oy + 17);
  glass(53, 70, oy + 9, oy + 17);
  glass(74, 83, oy + 9, oy + 17);
  glass(86, 87, oy + 9, oy + 17, 0.5);
  // cozy orange curtains in the back window
  for (let y = oy + 9; y <= oy + 17; y++) {
    for (const x of [8, 9, 10, 22, 23, 24]) pc.px(x, y, (x + y) % 3 === 0 ? P.btc2 : P.btc);
    pc.px(11 + ((y + 1) % 2), y, P.btc2);
  }
  // window frames
  for (const [a, b] of [[7, 25], [27, 49], [52, 71], [73, 84]]) {
    pc.hline(a, b, oy + 8, P.vanTop2);
    pc.hline(a, b, oy + 18, P.vanTop2);
  }
  // --- doors & details
  pc.vline(51, oy + 8, oy + 36, mix(paint.c3, P.vanTop2, 0.4));
  pc.vline(72, oy + 8, oy + 36, mix(paint.c3, P.vanTop2, 0.4));
  pc.rect(68, oy + 23, 3, 1, P.chrome0);
  pc.rect(48, oy + 23, 2, 1, P.chrome0);
  // ₿ sticker
  pc.circle(40, oy + 28, 4, P.btc);
  pc.circle(40, oy + 28, 3, P.btc1);
  pc.map(['##.', '#.#', '##.', '#.#', '##.'], { '#': P.white }, 39, oy + 26);
  pc.px(40, oy + 25, P.white); pc.px(40, oy + 31, P.white);
  // rust patches (it's been through a lot)
  for (let i = 0; i < 9; i++) {
    const cx = [9, 14, 30, 33, 62, 66, 86, 88, 57][i], cy = oy + 30 + Math.floor(r() * 5);
    pc.px(cx, cy, P.rust0); pc.px(cx + 1, cy, P.rust1); pc.px(cx, cy + 1, P.rust1);
    if (r() < 0.6) pc.px(cx + 1, cy - 1, P.rust0);
  }
  // dent
  pc.px(60, oy + 29, paint.c2); pc.px(61, oy + 30, paint.c0);
  // lights & bumpers
  pc.circle(90, oy + 25, 2, headlight ? P.white : P.cream);
  pc.px(89, oy + 24, P.white);
  pc.rect(90, oy + 29, 2, 2, P.btc);
  pc.rect(3, oy + 23, 2, 5, P.red);
  pc.px(3, oy + 23, '#ff8a8a');
  pc.rect(88, oy + 33, 8, 3, P.chrome1); pc.hline(88, 95, oy + 33, P.chrome0); pc.hline(88, 95, oy + 35, P.chrome2);
  pc.rect(0, oy + 33, 6, 3, P.chrome1); pc.hline(0, 5, oy + 33, P.chrome0); pc.hline(0, 5, oy + 35, P.chrome2);
  // --- wheels
  for (const cx of [22, 76]) {
    pc.ellipse(cx, oy + 37, 9, 7, P.ink2);                 // arch shadow
    pc.circle(cx, oy + 38, 7, P.tire);
    pc.circle(cx, oy + 38, 5, P.tire2);
    pc.circle(cx, oy + 38, 3, P.chrome1);
    pc.px(cx - 1, oy + 37, P.chrome0); pc.px(cx, oy + 38, P.chrome2);
    pc.px(cx + 1, oy + 39, P.chrome2);
    for (let a = 0; a < 8; a++) pc.px(cx + Math.round(Math.cos(a * TAU / 8) * 6), oy + 38 + Math.round(Math.sin(a * TAU / 8) * 6), P.tire2); // tread
  }
  // --- roof rack and conspiracy gear
  pc.hline(10, 76, oy + 2, P.chrome2);
  for (const x of [12, 40, 74]) pc.vline(x, oy + 2, oy + 4, P.chrome2);
  // rolled sleeping bag
  pc.ellipse(20, oy - 1, 7, 3, P.khaki1);
  pc.hline(14, 26, oy - 3, P.khaki0);
  for (const x of [16, 24]) pc.vline(x, oy - 3, oy + 1, P.capR2);
  pc.circle(13, oy - 1, 2, P.khaki2);
  // jerry can
  pc.rect(30, oy - 5, 8, 7, P.capR);
  pc.hline(30, 37, oy - 5, '#e86a5a');
  pc.line(31, oy - 3, 36, oy + 1, P.capR2);
  pc.rect(32, oy - 7, 3, 2, P.ink3);
  // satellite dish (for picking up... signals): a tilted parabolic bowl
  pc.vline(60, oy - 4, oy + 1, P.chrome2);
  pc.line(57, oy - 2, 63, oy - 2, P.chrome2);
  for (let i = 0; i < 9; i++) {
    const y = oy - 13 + i;
    const depth = Math.round(Math.sin((i / 8) * Math.PI) * 3);
    pc.hline(56 + 3 - depth, 59, y, i < 4 ? P.chrome0 : P.chrome1);
    pc.px(59 + 1, y, P.chrome2);
  }
  pc.line(60, oy - 9, 64, oy - 10, P.chrome2);
  pc.px(65, oy - 10, P.red);
  // antenna with a tinfoil ball
  pc.vline(84, oy - 7, oy + 4, P.chrome2);
  pc.circle(84, oy - 8, 1, P.foil1);
  pc.px(83, oy - 9, P.foil0);
  pc.outline(P.outline);
}

export function makeVan(scene, key = 'van', paint = VAN_PAINTS.teal) {
  const pc = new PixelCanvas(96, 58);
  drawVan(pc, paint);
  return addPixelTexture(scene, key, pc);
}

// ---------------------------------------------------------------------------
//  UFO (48 x 24), 4 frames of chasing rim lights. A tiny Grey pilot inside.
// ---------------------------------------------------------------------------
export function makeUFO(scene, key = 'ufo') {
  const frames = [0, 1, 2, 3].map((f) => (pc) => {
    // dome
    for (let y = -7; y <= 0; y++) for (let x = -9; x <= 9; x++) {
      if ((x * x) / 81 + (y * y) / 49 > 1) continue;
      let c = y < -4 ? P.cyan2 : P.cyan3;
      if (x < -4 && y < -2 && y > -6) c = P.cyan1;
      pc.px(24 + x, 10 + y, c);
    }
    // little Grey pilot silhouette
    pc.ellipse(25, 6, 2, 2, P.cyan4);
    pc.rect(24, 8, 3, 2, P.cyan4);
    pc.px(24, 6, P.ink); pc.px(26, 6, P.ink);
    pc.px(19, 5, P.cyan0); pc.px(20, 4, P.cyan0);
    // saucer disc
    for (let y = -4; y <= 4; y++) for (let x = -23; x <= 23; x++) {
      if ((x * x) / 529 + (y * y) / 16 > 1) continue;
      let c = y < 0 ? P.chrome1 : y === 0 ? P.chrome0 : y < 3 ? P.chrome2 : P.ink4;
      if (y === -3 && Math.abs(x) < 14) c = P.chrome0;
      pc.px(24 + x, 14 + y, c);
    }
    // chasing rim lights
    for (let i = 0; i < 8; i++) {
      const lx = 24 + Math.round(-19 + i * 5.4);
      const on = (i + f) % 4 === 0;
      pc.px(lx, 15, on ? P.green1 : P.green4);
      if (on) pc.px(lx + 1, 15, P.green0);
    }
    // underside emitter
    pc.ellipse(24, 19, 7, 2, P.green3);
    pc.hline(20, 28, 19, f % 2 ? P.green1 : P.green0);
  });
  buildSheet(scene, key, 48, 24, frames, { outline: P.outline });
  if (!scene.anims.exists('ufo_spin')) {
    scene.anims.create({ key: 'ufo_spin', frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
  }
}

// ---------------------------------------------------------------------------
//  Campfire (24 x 26), 6 flickering frames.
// ---------------------------------------------------------------------------
export function makeCampfire(scene, key = 'campfire') {
  const frames = [0, 1, 2, 3, 4, 5].map((f) => (pc) => {
    const r = rng(100 + f * 7);
    // flames: column heights from layered sines (seamless flicker)
    for (let x = 4; x <= 19; x++) {
      const cx = (x - 11.5) / 8;
      const env = Math.max(0, 1 - cx * cx);
      const hgt = env * (12 + Math.sin(x * 1.3 + f * 1.1) * 3 + Math.sin(x * 0.7 - f * 2.1) * 2 + r() * 2);
      for (let y = 0; y < hgt; y++) {
        const t = y / hgt;
        const c = t > 0.8 ? P.fire3 : t > 0.55 ? P.fire2 : (Math.abs(cx) < 0.45 && t < 0.45 ? P.fire0 : P.fire1);
        pc.px(x, 20 - y, c);
      }
    }
    // embers above
    for (let i = 0; i < 2; i++) pc.px(7 + Math.floor(r() * 10), 2 + Math.floor(r() * 4), r() < 0.5 ? P.fire1 : P.fire2);
    // crossed logs
    pc.line(4, 22, 19, 18, P.terra3, 2);
    pc.line(4, 18, 19, 22, P.terra4, 2);
    pc.px(4, 22, P.fire2); pc.px(19, 22, P.fire2);
    // stone ring
    for (const [sx, sy] of [[1, 23], [5, 24], [10, 25], [15, 24], [20, 23], [22, 21], [0, 21]]) {
      pc.rect(sx, sy, 3, 2, P.mauve1);
      pc.px(sx, sy, P.mauve0);
    }
  });
  buildSheet(scene, key, 24, 27, frames, { outline: P.outline });
  if (!scene.anims.exists('fire_burn')) {
    scene.anims.create({ key: 'fire_burn', frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
  }
}

// ---------------------------------------------------------------------------
//  Sats coin (12 x 12) & golden bitcoin (18 x 18), 8-frame spins.
// ---------------------------------------------------------------------------
function coinFrame(pc, size, f, cols) {
  const R = (size - 2) / 2;
  const c = size / 2 - 0.5;
  const w = Math.abs(Math.cos((f / 8) * TAU));
  const rx = Math.max(0.6, R * w);
  for (let y = -R; y <= R; y++) for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
    if ((x * x) / (rx * rx + 0.3) + (y * y) / (R * R + 0.3) > 1) continue;
    const edge = (x * x) / (rx * rx + 0.3) + (y * y) / (R * R + 0.3) > 0.6;
    let col = edge ? cols.edge : cols.face;
    if (x < 0 && y < 0 && !edge) col = cols.light;
    if (w < 0.35) col = x <= 0 ? cols.edge : cols.dark;
    pc.px(Math.round(c + x), Math.round(c + y), col);
  }
  if (w > 0.7) {
    const s = size > 14 ? 1 : 0;
    const bx = Math.round(c - 1 - s), by = Math.round(c - 2 - s);
    const B = s ? ['###.', '#..#', '###.', '#..#', '###.'] : ['##.', '#.#', '##.', '#.#', '##.'];
    pc.map(B, { '#': cols.mark }, bx, by + (s ? 0 : 0));
    pc.px(bx + 1, by - 1, cols.mark); pc.px(bx + 1, by + 5, cols.mark);
  }
  if (f === 0 || f === 4) pc.px(Math.round(c - R * 0.5), Math.round(c - R * 0.5), P.white);
}

export function makeCoins(scene) {
  buildSheet(scene, 'coin', 12, 12, [0, 1, 2, 3, 4, 5, 6, 7].map((f) => (pc) => coinFrame(pc, 12, f,
    { face: P.btc, edge: P.btc2, light: P.btc1, dark: P.btc3, mark: P.btc0 })), { outline: P.outline });
  buildSheet(scene, 'golden', 18, 18, [0, 1, 2, 3, 4, 5, 6, 7].map((f) => (pc) => coinFrame(pc, 18, f,
    { face: P.gold1, edge: P.gold3, light: P.gold0, dark: P.gold4, mark: P.btc2 })), { outline: P.outline });
  for (const k of ['coin', 'golden']) {
    if (!scene.anims.exists(`${k}_spin`)) {
      scene.anims.create({ key: `${k}_spin`, frames: scene.anims.generateFrameNumbers(k, { start: 0, end: 7 }), frameRate: k === 'coin' ? 12 : 9, repeat: -1 });
    }
  }
}
