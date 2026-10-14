// ============================================================================
//  ROAD ART — Chapter 1 (pseudo-3D driving).
//  Van from behind (with Zeus's head out the window, ears flapping), black
//  SUVs, roadblocks, cattle, and the roadside: poles, signs, billboards.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, buildSheet, addPixelTexture, rng, dither } from './pixel.js';
import { VAN_PAINTS } from './props.js';
import { textMask, FONT_HEAD } from './ui.js';

/** Stamp hard-edged pixel text (needs the font loaded — Boot guarantees it). */
function stampText(pc, text, x, y, color, px = 8, font = FONT_HEAD) {
  const m = textMask(text, px, font);
  const ox = Math.round(x - (m.bounds.maxX - m.bounds.minX + 1) / 2) - m.bounds.minX;
  const oy = Math.round(y) - m.bounds.minY;
  for (let yy = 0; yy < m.h; yy++) for (let xx = 0; xx < m.w; xx++) if (m.mask[yy * m.w + xx]) pc.px(ox + xx, oy + yy, color);
}

// ---------------------------------------------------------------------------
//  The van from behind: 3 frames (straight, lean left, lean right)
// ---------------------------------------------------------------------------
export function makeVanRear(scene, paint = VAN_PAINTS.teal) {
  const frames = [0, -1, 1].map((lean) => (pc) => {
    const ox = 4, oy = 6;
    const sh = lean;                              // top shifts with lean
    // body (lower)
    pc.rect(ox, oy + 20, 64, 18, paint.c1);
    pc.hline(ox, ox + 63, oy + 20, paint.c0);
    pc.rect(ox, oy + 34, 64, 4, paint.c2);
    // upper body / roof (shifted for lean)
    pc.rect(ox + 2 + sh, oy + 2, 60, 18, P.vanTop1);
    pc.hline(ox + 4 + sh, ox + 59 + sh, oy + 1, P.vanTop0);
    pc.hline(ox + 2 + sh, ox + 61 + sh, oy + 2, P.vanTop0);
    // rear windows with orange curtains
    for (const wx of [ox + 8 + sh, ox + 35 + sh]) {
      pc.rect(wx, oy + 5, 21, 12, P.glass2);
      pc.rect(wx, oy + 5, 4, 12, P.btc); pc.rect(wx + 17, oy + 5, 4, 12, P.btc);
      pc.line(wx + 5, oy + 6, wx + 9, oy + 14, P.glass1);
    }
    pc.rect(ox + 2 + sh, oy + 19, 60, 1, P.chrome1);
    // spare tire with a ₿ cover
    pc.circle(ox + 32 + Math.round(sh / 2), oy + 27, 7, P.tire);
    pc.circle(ox + 32 + Math.round(sh / 2), oy + 27, 5, P.btc);
    pc.map(['##.', '#.#', '##.', '#.#', '##.'], { '#': P.white }, ox + 31 + Math.round(sh / 2), oy + 25);
    // tail lights + Nevada plate "HODL"
    pc.rect(ox + 1, oy + 22, 5, 8, P.red2); pc.rect(ox + 2, oy + 23, 3, 6, P.red);
    pc.rect(ox + 58, oy + 22, 5, 8, P.red2); pc.rect(ox + 59, oy + 23, 3, 6, P.red);
    pc.rect(ox + 22, oy + 32, 20, 6, '#e8d8a0'); pc.hline(ox + 22, ox + 41, oy + 32, '#2a5a9a');
    pc.map(['#.#.###.##..#..', '###.#.#.#.#.#..', '#.#.###.##..###'], { '#': '#2a2a4a' }, ox + 25, oy + 34);
    // bumper, rust, mud
    pc.rect(ox - 2, oy + 38, 68, 3, P.chrome1); pc.hline(ox - 2, ox + 65, oy + 38, P.chrome0);
    pc.px(ox + 10, oy + 36, P.rust0); pc.px(ox + 50, oy + 35, P.rust1); pc.px(ox + 51, oy + 36, P.rust0);
    // roof rack gear
    pc.rect(ox + 10 + sh, oy - 3, 18, 4, P.khaki1); pc.rect(ox + 34 + sh, oy - 4, 9, 5, P.capR);
    pc.vline(ox + 52 + sh, oy - 6, oy + 1, P.chrome2); pc.ellipse(ox + 54 + sh, oy - 7, 3, 2, P.chrome1);
    // wheels (bottom corners)
    pc.rect(ox + 2, oy + 38, 10, 6, P.tire); pc.rect(ox + 52, oy + 38, 10, 6, P.tire);
    pc.hline(ox + 3, ox + 10, oy + 39, P.tire2); pc.hline(ox + 53, ox + 60, oy + 39, P.tire2);
  });
  buildSheet(scene, 'van_rear', 72, 52, frames, { outline: P.outline });
}

/** Zeus's head out of the passenger window, ears flapping (4 frames, 18x16). */
export function makeZeusWindow(scene) {
  const frames = [0, 1, 2, 3].map((f) => (pc) => {
    // head seen from behind/side, snout pointing forward-right
    pc.ellipse(8, 9, 5, 5, P.gold2); pc.ellipse(7, 7, 4, 3, P.gold1); pc.px(6, 5, P.gold0);
    pc.rect(12, 8, 3, 3, P.gold1); pc.px(15, 9, P.nose);
    // tongue flapping in the wind
    pc.px(13, 11 + (f % 2), P.tongue); pc.px(12, 12, P.tongue);
    // ears streaming back, flapping
    const e = [0, -2, -1, 1][f];
    pc.line(5, 6, 0, 4 + e, P.gold3, 2);
    pc.line(9, 5, 4, 2 + e, P.gold3, 2);
    pc.px(10, 7, P.ink);
    pc.rect(6, 13, 5, 2, P.collar);
  });
  buildSheet(scene, 'zeus_window', 18, 16, frames, { outline: P.outline });
  if (!scene.anims.exists('zeus_window_flap')) scene.anims.create({ key: 'zeus_window_flap', frames: scene.anims.generateFrameNumbers('zeus_window', { start: 0, end: 3 }), frameRate: 14, repeat: -1 });
}

// ---------------------------------------------------------------------------
//  Black SUV from behind (2 frames: dash lights flicker)
// ---------------------------------------------------------------------------
export function makeSuvRear(scene) {
  buildSheet(scene, 'suv_rear', 64, 48, [0, 1].map((f) => (pc) => {
    const ox = 2, oy = 4;
    pc.rect(ox + 4, oy, 52, 16, '#16161e'); pc.hline(ox + 6, ox + 53, oy, '#3a3a4a');
    pc.rect(ox + 8, oy + 3, 44, 10, '#24243a'); pc.line(ox + 12, oy + 4, ox + 18, oy + 12, '#4a4a6a');
    pc.rect(ox, oy + 16, 60, 20, '#1c1c26'); pc.hline(ox, ox + 59, oy + 16, '#4a4a5a');
    pc.rect(ox + 2, oy + 19, 8, 9, P.red2); pc.rect(ox + 3, oy + 20, 6, 7, P.red);
    pc.rect(ox + 50, oy + 19, 8, 9, P.red2); pc.rect(ox + 51, oy + 20, 6, 7, P.red);
    pc.rect(ox + 20, oy + 26, 20, 7, '#f2e6c8'); pc.map(['###.###.#.#', '#...#.#.#.#', '#.#.#.#.#.#', '###.###..#.'], { '#': '#1a1a3a' }, ox + 25, oy + 28);
    pc.rect(ox - 1, oy + 35, 62, 3, '#3a3a4a');
    // dash lights glowing through the rear window
    pc.px(ox + 26, oy + 9, f ? P.red : '#4a4aff'); pc.px(ox + 33, oy + 9, f ? '#4a4aff' : P.red);
    pc.rect(ox + 2, oy + 38, 12, 6, '#0a0a10'); pc.rect(ox + 46, oy + 38, 12, 6, '#0a0a10');
  }), { outline: P.outline });
  if (!scene.anims.exists('suv_rear_lights')) scene.anims.create({ key: 'suv_rear_lights', frames: scene.anims.generateFrameNumbers('suv_rear', { start: 0, end: 1 }), frameRate: 5, repeat: -1 });
}

// ---------------------------------------------------------------------------
//  Roadblock barricade with flashing amber lights (2 frames)
// ---------------------------------------------------------------------------
export function makeRoadblock(scene) {
  buildSheet(scene, 'roadblock', 80, 34, [0, 1].map((f) => (pc) => {
    for (const lx of [6, 70]) { pc.line(lx, 10, lx - 5, 33, '#8a8a8a', 2); pc.line(lx, 10, lx + 5, 33, '#6a6a6a', 2); }
    for (const y of [8, 18]) {
      for (let x = 0; x < 80; x++) pc.px(x, y, ((x + y) % 10) < 5 ? '#f78a45' : '#f2e6c8');
      for (let x = 0; x < 80; x++) pc.px(x, y + 1, ((x + y + 1) % 10) < 5 ? '#d46a2a' : '#d8ccae');
      for (let x = 0; x < 80; x++) pc.px(x, y + 2, ((x + y + 2) % 10) < 5 ? '#d46a2a' : '#d8ccae');
    }
    pc.rect(30, 0, 20, 7, '#2a2a3a'); pc.map(['###.###.#..###.###', '#...#.#.#..#.#.#.#'], {}, 0, 0);
    stampText(pc, 'STOP', 40, 1, P.white, 8);
    for (const lx of [8, 68]) { pc.circle(lx, 4, 3, f ? '#ffb347' : '#7a4a10'); if (f) pc.px(lx - 1, 3, P.white); }
  }), { outline: P.outline });
  if (!scene.anims.exists('roadblock_flash')) scene.anims.create({ key: 'roadblock_flash', frames: scene.anims.generateFrameNumbers('roadblock', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
}

// ---------------------------------------------------------------------------
//  Hereford cow (side view) — 2 walk frames. Open range, baby.
// ---------------------------------------------------------------------------
export function makeCow(scene) {
  buildSheet(scene, 'cow', 44, 30, [0, 1].map((f) => (pc) => {
    const brown = '#8a4a2a', brown2 = '#6a3420', white = '#f2e6d8';
    const lx = f ? 2 : -2;
    for (const [x, near] of [[10, false], [30, false], [12, true], [32, true]]) pc.rect(x + (near ? lx : -lx), 20, 3, 9, near ? brown : brown2);
    pc.ellipse(22, 15, 15, 8, brown);
    pc.ellipse(22, 11, 12, 3, '#9a5a36');
    pc.ellipse(18, 18, 6, 3, white);                       // white belly patch
    pc.line(7, 10, 3, 18, brown2, 2); pc.px(3, 19, '#2a1a10');  // tail
    pc.ellipse(37, 12, 6, 5, white);                       // white Hereford face
    pc.rect(39, 13, 5, 4, white); pc.px(43, 15, '#2a1a1a');
    pc.px(36, 10, P.ink); pc.rect(33, 6, 4, 2, white);     // eye + horn
    pc.ellipse(33, 9, 2, 2, brown);                         // ear
    pc.rect(16, 25, 4, 2, '#e8a0a0');
  }), { outline: P.outline });
  if (!scene.anims.exists('cow_walk')) scene.anims.create({ key: 'cow_walk', frames: scene.anims.generateFrameNumbers('cow', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
}

// ---------------------------------------------------------------------------
//  Roadside furniture
// ---------------------------------------------------------------------------
export function makeRoadside(scene) {
  // telephone pole (14x110)
  let pc = new PixelCanvas(30, 112);
  pc.rect(13, 8, 4, 104, '#5a3a2a'); pc.vline(13, 8, 111, '#7a5a3a'); pc.vline(16, 8, 111, '#3a2418');
  pc.rect(1, 12, 28, 3, '#5a3a2a'); pc.hline(1, 28, 12, '#7a5a3a');
  for (const x of [3, 9, 20, 26]) { pc.rect(x, 9, 2, 3, '#c8d4e0'); }
  pc.rect(6, 22, 18, 2, '#5a3a2a');
  pc.outline(P.outline);
  addPixelTexture(scene, 'pole', pc);

  // EXTRATERRESTRIAL HIGHWAY state sign (green, with a flying saucer)
  pc = new PixelCanvas(112, 84);
  for (const x of [20, 90]) pc.rect(x, 40, 4, 44, '#8a8a9a');
  pc.rect(2, 2, 108, 44, P.sign); pc.rect(4, 4, 104, 40, P.sign);
  for (let x = 4; x < 108; x++) { pc.px(x, 4, P.cream); pc.px(x, 43, P.cream); }
  for (let y = 4; y < 44; y++) { pc.px(4, y, P.cream); pc.px(107, y, P.cream); }
  stampText(pc, 'EXTRATERRESTRIAL', 56, 9, P.white, 8);
  stampText(pc, 'HIGHWAY', 56, 21, P.white, 8);
  pc.ellipse(56, 37, 12, 3, '#b5c0cc'); pc.ellipse(56, 34, 4, 3, '#7ff8ff');
  stampText(pc, '375', 92, 33, P.white, 8);
  for (let i = 0; i < 30; i++) pc.px(6 + Math.floor(Math.random() * 100), 6 + Math.floor(Math.random() * 36), '#3a8a5a');   // sun-bleached
  pc.outline(P.outline);
  addPixelTexture(scene, 'sign_et', pc);

  // OPEN RANGE diamond sign
  pc = new PixelCanvas(40, 64);
  pc.rect(18, 30, 4, 34, '#8a8a9a');
  pc.poly([[20, 0], [40, 20], [20, 40], [0, 20]], '#1a1a1a'); pc.poly([[20, 2], [38, 20], [20, 38], [2, 20]], '#f5c542');
  pc.ellipse(20, 20, 8, 4, '#1a1a1a'); pc.rect(26, 15, 4, 4, '#1a1a1a'); for (const x of [14, 17, 23, 26]) pc.vline(x, 23, 27, '#1a1a1a');
  pc.outline(P.outline);
  addPixelTexture(scene, 'sign_cow', pc);

  // billboards (3 jokes)
  const boards = [
    ['ALIEN JERKY', '12 MILES', '#c8423a'],
    ['LAST GAS', 'FOR 150 MI', '#2a5a9a'],
    ['THEY ARE', 'WATCHING', '#3a2a5a'],
  ];
  boards.forEach(([a, b, bg], i) => {
    const bb = new PixelCanvas(128, 92);
    for (const x of [20, 104]) bb.rect(x, 48, 5, 44, '#5a3a2a');
    bb.rect(0, 0, 128, 50, '#2a2a2a'); bb.rect(3, 3, 122, 44, bg);
    for (let k = 0; k < 40; k++) bb.px(3 + Math.floor(Math.random() * 122), 3 + Math.floor(Math.random() * 44), mix(bg, '#ffffff', 0.25));
    stampText(bb, a, 64, 12, P.white, 8);
    stampText(bb, b, 64, 28, '#ffe08a', 8);
    if (i === 0) { bb.ellipse(110, 40, 6, 3, '#b5c0cc'); bb.ellipse(110, 38, 2, 2, '#7ff8ff'); }
    if (i === 2) { bb.ellipse(14, 24, 5, 6, '#a3b0b8'); bb.rect(10, 22, 3, 2, P.ink); bb.rect(16, 22, 3, 2, P.ink); }
    bb.outline(P.outline);
    addPixelTexture(scene, `billboard${i}`, bb);
  });

  // mile marker
  pc = new PixelCanvas(10, 30);
  pc.rect(3, 8, 4, 22, '#8a8a9a'); pc.rect(0, 0, 10, 12, '#2a6a4a'); pc.rect(1, 1, 8, 10, '#3a8a5a');
  pc.hline(2, 7, 4, P.white); pc.hline(2, 7, 7, P.white);
  pc.outline(P.outline);
  addPixelTexture(scene, 'milemarker', pc);

  // WELCOME TO RACHEL — the finish line
  pc = new PixelCanvas(160, 104);
  for (const x of [26, 130]) pc.rect(x, 60, 6, 44, '#5a3a2a');
  pc.rect(0, 0, 160, 64, '#3a2418'); pc.rect(4, 4, 152, 56, '#c8a070');
  for (let y = 4; y < 60; y += 6) pc.hline(4, 155, y, '#a87850');
  stampText(pc, 'WELCOME TO', 80, 9, '#3a2418', 8);
  stampText(pc, 'RACHEL', 80, 21, '#8a2a1a', 16);
  stampText(pc, 'POP. 54', 80, 43, '#3a2418', 8);
  pc.ellipse(20, 30, 10, 4, '#b5c0cc'); pc.ellipse(20, 27, 4, 3, '#7ff8ff');
  pc.ellipse(140, 30, 10, 4, '#b5c0cc'); pc.ellipse(140, 27, 4, 3, '#5dff9a');
  pc.outline(P.outline);
  addPixelTexture(scene, 'sign_rachel', pc);

  // a boulder
  pc = new PixelCanvas(40, 26);
  pc.ellipse(20, 16, 19, 10, P.terra2); pc.ellipse(16, 12, 13, 7, P.terra1); pc.ellipse(14, 9, 6, 3, P.terra0);
  pc.hline(4, 36, 25, P.terra3);
  pc.outline(P.outline);
  addPixelTexture(scene, 'boulder', pc);

  // sage bush
  pc = new PixelCanvas(24, 14);
  const r = rng(8);
  for (let i = 0; i < 14; i++) pc.circle(4 + r() * 16, 5 + r() * 6, 3, i % 3 ? P.sage1 : P.sage2);
  for (let i = 0; i < 6; i++) pc.px(4 + r() * 16, 3 + r() * 4, P.sage0);
  pc.outline(P.outline);
  addPixelTexture(scene, 'sagebush', pc);

  // speed streak particle
  pc = new PixelCanvas(2, 10);
  for (let y = 0; y < 10; y++) pc.px(0, y, `#fff6e0${Math.round((y / 9) * 200).toString(16).padStart(2, '0')}`);
  addPixelTexture(scene, 'streak_v', pc);
  void dither;
}
