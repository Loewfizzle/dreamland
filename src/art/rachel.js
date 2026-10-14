// ============================================================================
//  RACHEL, NEVADA — Chapter 2 art (3/4 top-down).
//  Ground, the Little A'Le'Inn (neon sign, UFO on a tow truck out front),
//  mobile homes, the Black Mailbox, props, diner interior, dig-up items.
//  Emissive parts (neon, lit windows) go on separate *_glow textures.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, addPixelTexture, rng, dither } from './pixel.js';
import { textMask, FONT_HEAD, FONT_BODY } from './ui.js';

export const TOWN_W = 1600, TOWN_H = 960;
export const ROAD_Y = 600, ROAD_H = 60;

function stamp(pc, text, cx, y, color, px = 8, font = FONT_HEAD, outline = null) {
  const m = textMask(text, px, font);
  const ox = Math.round(cx - (m.bounds.maxX - m.bounds.minX + 1) / 2) - m.bounds.minX;
  const oy = Math.round(y) - m.bounds.minY;
  const at = (x, yy) => x >= 0 && yy >= 0 && x < m.w && yy < m.h && m.mask[yy * m.w + x];
  if (outline) for (let yy = -1; yy <= m.h; yy++) for (let x = -1; x <= m.w; x++) {
    if (!at(x, yy) && (at(x - 1, yy) || at(x + 1, yy) || at(x, yy - 1) || at(x, yy + 1))) pc.px(ox + x, oy + yy, outline);
  }
  for (let yy = 0; yy < m.h; yy++) for (let x = 0; x < m.w; x++) if (at(x, yy)) pc.px(ox + x, oy + yy, color);
}

// ---------------------------------------------------------------------------
//  Tiny hand-made 3x5 pixel font for labels too small for a real font
// ---------------------------------------------------------------------------
const TINY = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'], G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], L: ['#..', '#..', '#..', '#..', '###'], M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['#.#', '###', '###', '###', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'], K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  ' ': ['...', '...', '...', '...', '...'],
};
/** Draw centred tiny text (3x5 glyphs, 1px spacing). */
export function tiny(pc, text, cx, y, color) {
  const w = text.length * 4 - 1;
  let x = Math.round(cx - w / 2);
  for (const ch of text.toUpperCase()) {
    const g = TINY[ch];
    if (g) pc.map(g, { '#': color }, x, y);
    x += 4;
  }
}

// ---------------------------------------------------------------------------
//  Ground
// ---------------------------------------------------------------------------
export function makeTownGround(scene) {
  const pc = new PixelCanvas(TOWN_W, TOWN_H);
  const r = rng(375);
  const sand = ['#d8a670', '#cf9c66', '#c4905c', '#d2a06a'];
  for (let y = 0; y < TOWN_H; y++) for (let x = 0; x < TOWN_W; x++) {
    const n = Math.sin(x * 0.013 + Math.sin(y * 0.02) * 2) + Math.sin(y * 0.017 + x * 0.004);
    let c = sand[(n > 0.6 ? 0 : n > 0 ? 1 : n > -0.6 ? 3 : 2)];
    if (dither(x, y, 0.08)) c = sand[2];
    pc.px(x, y, c);
  }
  // gravel lot in front of the diner
  for (let y = 470; y < ROAD_Y; y++) for (let x = 560; x < 1060; x++) {
    const v = r();
    pc.px(x, y, v < 0.3 ? '#a89a8a' : v < 0.6 ? '#9a8c7c' : v < 0.85 ? '#b8aa98' : '#8a7c6c');
  }
  for (let x = 560; x < 1060; x++) { pc.px(x, 470, '#c8b8a0'); pc.px(x, 599, '#7a6c5c'); }
  // dirt paths
  const path = (pts, w) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const steps = Math.hypot(x1 - x0, y1 - y0);
      for (let s = 0; s < steps; s++) {
        const x = x0 + ((x1 - x0) * s) / steps, y = y0 + ((y1 - y0) * s) / steps;
        for (let k = -w; k <= w; k++) for (let j = -w; j <= w; j++) if (k * k + j * j <= w * w && !dither(x + k, y + j, 0.15)) pc.px(x + k, y + j, '#e4b884');
      }
    }
  };
  path([[330, 470], [420, 560], [560, 560]], 6);
  path([[1260, 420], [1180, 520], [1060, 540]], 6);
  path([[440, 820], [480, 700], [520, 662]], 5);
  path([[1480, 700], [1440, 662]], 4);
  // SR-375
  for (let y = ROAD_Y; y < ROAD_Y + ROAD_H; y++) for (let x = 0; x < TOWN_W; x++) {
    let c = (x * 7 + y * 13) % 19 === 0 ? '#5a4e58' : '#4a3e48';
    if (y === ROAD_Y || y === ROAD_Y + ROAD_H - 1) c = '#3a2e38';
    if (y === ROAD_Y + 3 || y === ROAD_Y + ROAD_H - 4) c = '#e8dcc0';
    if ((y === ROAD_Y + 29 || y === ROAD_Y + 30) && (x % 24) < 14) c = '#f5c542';
    pc.px(x, y, c);
  }
  // cracks & tar patches on the road
  for (let i = 0; i < 40; i++) { const x = r() * TOWN_W, y = ROAD_Y + 6 + r() * 48; pc.line(x, y, x + (r() - 0.5) * 20, y + (r() - 0.5) * 8, '#3a2e38'); }
  // cattle guard grate
  for (let x = 60; x < 84; x += 3) pc.rect(x, ROAD_Y + 4, 2, ROAD_H - 8, '#7a7a8a');
  // tire tracks off into the desert
  for (let x = 1060; x < 1600; x++) { const y = 700 + Math.sin(x / 60) * 18; pc.px(x, y, '#b88a58'); pc.px(x, y + 7, '#b88a58'); }
  // pebbles, dry grass, small cracks
  for (let i = 0; i < 1800; i++) {
    const x = Math.floor(r() * TOWN_W), y = Math.floor(r() * TOWN_H);
    if (y >= ROAD_Y - 2 && y < ROAD_Y + ROAD_H + 2) continue;
    const k = r();
    if (k < 0.5) pc.px(x, y, k < 0.25 ? '#b08050' : '#e8c090');
    else if (k < 0.8) { pc.px(x, y, '#9a8a5a'); pc.px(x + 1, y - 1, '#b0a070'); pc.px(x - 1, y - 1, '#8a7a4a'); }
    else pc.line(x, y, x + (r() - 0.5) * 8, y + (r() - 0.5) * 4, '#b88a58');
  }
  return addPixelTexture(scene, 'town_ground', pc);
}

// ---------------------------------------------------------------------------
//  The Little A'Le'Inn (exterior, 3/4 view) — 260 x 176 + glow layer
// ---------------------------------------------------------------------------
export function makeDiner(scene) {
  const W = 300, H = 176;
  const pc = new PixelCanvas(W, H);
  const glow = new PixelCanvas(W, H);
  pc.ox = glow.ox = 20;        // building is 260 wide, centred in a 300 canvas; the sign overhangs it
  // roof (seen from above): tar & gravel with an AC unit
  for (let y = 44; y < 96; y++) for (let x = 8; x < 252; x++) pc.px(x, y, ((x * 3 + y * 7) % 11) < 2 ? '#5a5050' : (y % 6 === 0 ? '#625858' : '#6a6060'));
  pc.hline(8, 251, 44, '#8a8080'); pc.hline(8, 251, 95, '#3a3030');
  pc.rect(196, 54, 30, 22, '#9aa0aa'); pc.hline(196, 225, 54, '#c0c6ce'); for (let x = 200; x < 222; x += 3) pc.vline(x, 58, 72, '#6a707a');
  // the big rooftop sign (posts + board)
  for (const x of [52, 196]) pc.rect(x, 30, 5, 22, '#4a4a52');
  pc.rect(-14, 0, 288, 36, '#2a1a3a'); pc.rect(-12, 2, 284, 32, '#3a2450');
  for (let x = -12; x < 272; x += 6) { pc.px(x, 2, '#5a3a70'); pc.px(x + 3, 33, '#5a3a70'); }
  stamp(pc, "LITTLE A'LE'INN", 140, 9, '#ffd0e8', 16, FONT_HEAD, '#a02a6a');
  stamp(glow, "LITTLE A'LE'INN", 140, 9, '#ff5aa8', 16, FONT_HEAD, '#7a1a50');
  // neon alien head on the sign's left, clear of the lettering
  pc.ellipse(-2, 18, 7, 9, '#2a6a3a'); glow.ellipse(-2, 18, 7, 9, '#3a9a4a');
  pc.ellipse(-2, 17, 5, 7, '#5dff9a'); glow.ellipse(-2, 17, 5, 7, '#5dff9a');
  for (const [x0, d] of [[-5, -1], [1, 1]]) { pc.poly([[x0, 16], [x0 + d * 3, 14], [x0 + d * 3, 18], [x0, 19]], P.ink); glow.poly([[x0, 16], [x0 + d * 3, 14], [x0 + d * 3, 18], [x0, 19]], '#000000'); }
  // front wall: weathered siding
  for (let y = 96; y < 160; y++) for (let x = 8; x < 252; x++) {
    let c = (y % 6 === 0) ? '#a07a52' : '#b88c60';
    if ((x * 13 + y) % 37 === 0) c = '#8a6a48';
    pc.px(x, y, c);
  }
  // green awning over the porch
  for (let y = 96; y < 108; y++) for (let x = 4; x < 256; x++) pc.px(x, y, (Math.floor(x / 10) % 2) ? '#2f7a4f' : '#e8dcc0');
  for (let x = 4; x < 256; x += 10) { pc.px(x + 2, 108, '#2f7a4f'); pc.px(x + 7, 108, '#e8dcc0'); }
  // windows (warm light inside)
  for (const wx of [30, 74, 168, 212]) {
    pc.rect(wx, 116, 30, 24, '#3a2a20'); pc.rect(wx + 2, 118, 26, 20, '#ffcf7a');
    glow.rect(wx + 2, 118, 26, 20, '#ffb347');
    pc.vline(wx + 15, 118, 137, '#3a2a20'); pc.hline(wx + 2, wx + 27, 127, '#3a2a20');
    pc.rect(wx + 4, 130, 6, 7, '#6a3a2a');                          // a diner silhouette
  }
  // door with OPEN sign
  pc.rect(116, 112, 28, 46, '#5a3a24'); pc.rect(119, 115, 22, 20, '#ffcf7a'); glow.rect(119, 115, 22, 20, '#d08a30');
  pc.rect(121, 120, 18, 7, '#1a1a2a');
  tiny(pc, 'OPEN', 130, 121, '#ff7a9a');
  tiny(glow, 'OPEN', 130, 121, '#ff3a5a');
  pc.px(139, 140, '#e8c060');
  // little alien mural by the door
  pc.ellipse(102, 136, 7, 9, '#4ac06a'); pc.rect(100, 145, 4, 12, '#4ac06a');
  pc.poly([[98, 134], [101, 133], [101, 137], [99, 137]], P.ink); pc.poly([[106, 134], [103, 133], [103, 137], [105, 137]], P.ink);
  tiny(pc, 'EARTHLINGS', 173, 143, '#fff6e0');   // between the porch posts
  tiny(pc, 'WELCOME', 173, 150, '#fff6e0');
  // porch posts, bench, foundation
  for (const x of [8, 64, 112, 148, 196, 248]) pc.rect(x, 108, 3, 52, '#6a4a2a');
  pc.rect(20, 150, 30, 4, '#6a4a2a'); pc.rect(22, 154, 3, 5, '#4a2a1a'); pc.rect(45, 154, 3, 5, '#4a2a1a');
  pc.rect(4, 160, 252, 8, '#7a6050'); pc.hline(4, 255, 160, '#9a7a60');
  pc.rect(114, 160, 32, 6, '#8a7a6a');                               // steps
  pc.ox = glow.ox = 0;
  pc.outline(P.outline);
  addPixelTexture(scene, 'diner_glow', glow);
  return addPixelTexture(scene, 'diner', pc);
}

// ---------------------------------------------------------------------------
//  Props
// ---------------------------------------------------------------------------
export function makeTownProps(scene) {
  const r = rng(54);
  // mobile home (3/4 view), 2 variants: plain & Mabel's tinfoil roof
  for (const [key, foil] of [['mobilehome', false], ['mabelhome', true]]) {
    const pc = new PixelCanvas(150, 90);
    const glow = new PixelCanvas(150, 90);
    for (let y = 6; y < 40; y++) for (let x = 4; x < 146; x++) {
      const c = foil ? (((x * 3 + y * 5) % 9) < 2 ? '#ffffff' : ((x + y) % 7 === 0 ? '#8a98aa' : '#c8d4e0')) : (y % 5 === 0 ? '#9a9a90' : '#b0b0a6');
      pc.px(x, y, c);
    }
    pc.hline(4, 145, 6, foil ? '#ffffff' : '#c8c8c0');
    for (let y = 40; y < 80; y++) for (let x = 4; x < 146; x++) pc.px(x, y, y % 5 === 0 ? '#c8bc9c' : '#e2d6b8');
    pc.rect(4, 56, 142, 5, foil ? '#c070d0' : '#5a9a90');
    pc.rect(20, 46, 26, 16, '#3a2a30'); pc.rect(22, 48, 22, 12, '#ffcf7a'); glow.rect(22, 48, 22, 12, '#c08a40');
    pc.rect(100, 46, 26, 16, '#3a2a30'); pc.rect(102, 48, 22, 12, foil ? '#c8d4e0' : '#ffcf7a'); if (!foil) glow.rect(102, 48, 22, 12, '#c08a40');
    pc.rect(64, 44, 20, 36, '#8a5a3a'); pc.px(80, 62, '#f5c542');
    pc.rect(60, 80, 28, 6, '#7a7a7a');
    pc.rect(6, 80, 138, 4, '#4a4048');
    if (foil) {
      // extra antennas, a satellite dish and a hand-painted sign
      pc.vline(30, -0, 8, '#8a8a9a'); pc.ellipse(28, 2, 5, 3, '#d0d8e0');
      for (const x of [110, 118, 126]) { pc.vline(x, 0, 8, '#8a8a9a'); pc.px(x, 0, P.red); }
      pc.rect(96, 64, 40, 12, '#e8dcc0'); tiny(pc, 'NO FEDS', 116, 67, '#c8423a');
    }
    pc.outline(P.outline);
    addPixelTexture(scene, `${key}_glow`, glow);
    addPixelTexture(scene, key, pc);
  }

  // tow truck with a flying saucer hanging off the crane (a real Rachel landmark)
  let pc = new PixelCanvas(130, 116);
  const glow = new PixelCanvas(130, 116);
  pc.rect(10, 70, 90, 26, '#a83a2a'); pc.hline(10, 99, 70, '#d85a4a'); pc.rect(64, 56, 34, 22, '#a83a2a');
  pc.rect(70, 59, 22, 11, '#3a4a5a'); pc.line(72, 60, 76, 68, '#6a8aa0');
  pc.rect(98, 74, 10, 14, '#8a8a8a');                               // grille
  for (const x of [26, 84]) { pc.circle(x, 98, 9, '#1a1a22'); pc.circle(x, 98, 4, '#8a94a4'); }
  pc.rect(6, 66, 6, 30, '#6a6a6a');                                  // crane base
  pc.line(9, 66, 40, 8, '#8a8a8a', 3); pc.line(9, 66, 40, 8, '#b0b0b0');
  pc.vline(40, 8, 30, '#6a6a6a');                                    // chain
  for (let y = 10; y < 30; y += 3) pc.px(41, y, '#9a9a9a');
  // the saucer
  pc.ellipse(40, 40, 26, 7, '#c8d0d8'); pc.ellipse(40, 42, 26, 4, '#8a94a4'); pc.hline(14, 66, 40, '#ffffff');
  pc.ellipse(40, 33, 9, 6, '#7ff8ff'); pc.ellipse(37, 31, 3, 2, '#d6fffb');
  for (let k = 0; k < 7; k++) { const x = 19 + k * 7; pc.px(x, 44, '#5dff9a'); glow.px(x, 44, '#5dff9a'); glow.px(x, 45, '#2bd16b'); }
  glow.ellipse(40, 33, 8, 5, '#2aa6c0');
  pc.outline(P.outline);
  addPixelTexture(scene, 'towtruck_glow', glow);
  addPixelTexture(scene, 'towtruck', pc);

  // the Black Mailbox (now famously white-painted, on a post)
  pc = new PixelCanvas(26, 44);
  pc.rect(11, 18, 4, 26, '#6a5a4a');
  pc.rect(2, 4, 22, 16, '#e8e4dc'); pc.ellipse(13, 4, 11, 3, '#e8e4dc'); pc.hline(2, 23, 19, '#a8a49c');
  pc.rect(4, 8, 18, 1, '#a8a49c'); pc.rect(22, 6, 2, 8, P.red);
  tiny(pc, 'ALIEN', 13, 10, '#3a3a5a');
  pc.outline(P.outline);
  addPixelTexture(scene, 'mailbox', pc);

  // old gas pump
  pc = new PixelCanvas(20, 40);
  pc.rect(3, 4, 14, 34, '#c8423a'); pc.rect(5, 8, 10, 10, '#e8dcc0'); pc.rect(6, 10, 8, 4, '#3a3a3a');
  pc.ellipse(10, 4, 7, 4, '#f5c542'); pc.rect(16, 18, 3, 14, '#2a2a2a'); pc.rect(1, 36, 18, 3, '#6a6a6a');
  pc.outline(P.outline);
  addPixelTexture(scene, 'gaspump', pc);

  // water tank on stilts
  pc = new PixelCanvas(56, 100);
  for (const [x0, x1] of [[10, 4], [46, 52]]) pc.line(x0, 46, x1, 99, '#6a5a4a', 2);
  pc.line(10, 60, 46, 90, '#6a5a4a'); pc.line(46, 60, 10, 90, '#6a5a4a');
  pc.rect(6, 10, 44, 38, '#9aa0aa'); pc.ellipse(28, 10, 22, 6, '#c0c6ce'); pc.ellipse(28, 48, 22, 4, '#7a808a');
  for (let x = 8; x < 48; x += 6) pc.vline(x, 12, 46, '#8a909a');
  tiny(pc, 'RACHEL', 28, 26, '#3a3a5a');
  pc.outline(P.outline);
  addPixelTexture(scene, 'watertank', pc);

  // picnic table
  pc = new PixelCanvas(44, 28);
  pc.rect(4, 4, 36, 10, '#8a5a3a'); for (let x = 4; x < 40; x += 6) pc.vline(x, 4, 13, '#6a3a24');
  pc.rect(0, 16, 44, 4, '#7a4a2a'); pc.rect(6, 14, 3, 12, '#5a3420'); pc.rect(35, 14, 3, 12, '#5a3420');
  pc.outline(P.outline);
  addPixelTexture(scene, 'picnic', pc);

  // stargazing telescope on a tripod
  pc = new PixelCanvas(24, 34);
  pc.line(12, 18, 4, 33, '#5a5a6a'); pc.line(12, 18, 20, 33, '#5a5a6a'); pc.line(12, 18, 12, 33, '#5a5a6a');
  pc.line(4, 20, 20, 8, '#e8e8f0', 3); pc.rect(18, 6, 4, 5, '#3a3a4a'); pc.px(21, 7, P.cyan1);
  pc.outline(P.outline);
  addPixelTexture(scene, 'telescope', pc);

  // fuse box (puzzle)
  pc = new PixelCanvas(22, 30);
  pc.rect(1, 1, 20, 26, '#7a8a7a'); pc.rect(3, 3, 16, 22, '#5a6a5a'); pc.hline(1, 20, 1, '#9aaa9a');
  pc.poly([[8, 8], [13, 8], [10, 14], [14, 14], [7, 22], [9, 16], [6, 16]], '#f5c542');
  pc.rect(9, 27, 4, 3, '#3a3a3a');
  pc.outline(P.outline);
  addPixelTexture(scene, 'fusebox', pc);

  // street lamp
  pc = new PixelCanvas(20, 70);
  pc.rect(9, 10, 3, 60, '#4a4a52'); pc.rect(4, 4, 14, 6, '#3a3a42'); pc.rect(6, 10, 10, 2, '#fff0c8');
  pc.outline(P.outline);
  addPixelTexture(scene, 'streetlamp', pc);

  // coyote den: rock pile with a dark hole
  pc = new PixelCanvas(60, 36);
  for (let i = 0; i < 9; i++) { const x = 6 + r() * 48, y = 10 + r() * 18; pc.ellipse(x, y, 7 + r() * 5, 5 + r() * 3, i % 2 ? P.terra2 : P.terra1); }
  pc.ellipse(30, 24, 9, 6, '#2a1a1a'); pc.ellipse(30, 22, 7, 4, '#1a0e0e');
  pc.outline(P.outline);
  addPixelTexture(scene, 'den', pc);

  // fence segment (barbed wire on wooden posts)
  pc = new PixelCanvas(64, 26);
  for (const x of [2, 30, 58]) pc.rect(x, 4, 4, 22, '#7a5a3a');
  for (const y of [8, 15]) for (let x = 0; x < 64; x++) { pc.px(x, y + Math.round(Math.sin(x / 10)), '#8a8a92'); if (x % 7 === 0) pc.px(x, y - 1 + Math.round(Math.sin(x / 10)), '#b0b0b8'); }
  pc.outline(P.outline);
  addPixelTexture(scene, 'fence', pc);

  // dig spot marker (sparkly X) and paw print
  pc = new PixelCanvas(16, 12);
  pc.line(2, 2, 13, 10, '#8a5a3a', 2); pc.line(13, 2, 2, 10, '#8a5a3a', 2);
  addPixelTexture(scene, 'digspot', pc);
  pc = new PixelCanvas(9, 9);
  pc.map(['.#...#.', '.#...#.', '#.....#', '...#...', '..###..', '.#####.', '..###..'], { '#': '#ffffff' }, 1, 1);
  addPixelTexture(scene, 'pawprint', pc);
  pc = new PixelCanvas(20, 12);
  pc.ellipse(10, 7, 9, 4, '#8a5a3a'); pc.ellipse(10, 6, 6, 2, '#a8784a');
  addPixelTexture(scene, 'dughole', pc);

  // dig-up items
  const item = (key, draw, w = 18, h = 14) => { const p = new PixelCanvas(w, h); draw(p); p.outline(P.outline); addPixelTexture(scene, key, p); };
  item('item_wallet', (p) => { p.rect(2, 2, 14, 10, '#2a2a3a'); p.rect(4, 4, 7, 5, '#7ff8ff'); p.rect(12, 4, 2, 2, '#c8c8d8'); p.rect(12, 7, 2, 2, '#c8c8d8'); p.px(6, 6, '#2a2a3a'); p.hline(3, 15, 2, '#4a4a5a'); p.px(14, 10, P.btc); });
  item('item_keycard', (p) => { p.rect(1, 2, 16, 10, '#e8e8f0'); p.rect(1, 2, 16, 3, '#c8423a'); p.rect(3, 6, 5, 5, '#a3b0b8'); p.hline(10, 15, 7, '#3a3a5a'); p.hline(10, 14, 9, '#3a3a5a'); });
  item('item_bone', (p) => { p.rect(4, 6, 10, 3, '#f2ead2'); for (const x of [3, 14]) { p.circle(x, 5, 2, '#f2ead2'); p.circle(x, 9, 2, '#f2ead2'); } });
  item('item_boot', (p) => { p.rect(5, 1, 6, 10, '#6a4a2a'); p.rect(5, 9, 11, 4, '#6a4a2a'); p.hline(5, 15, 12, '#3a2418'); p.px(7, 4, '#8a6a4a'); });
  item('item_can', (p) => { p.rect(5, 2, 8, 11, '#c8d4e0'); p.rect(5, 5, 8, 5, '#c8423a'); p.hline(5, 12, 2, '#ffffff'); });
  item('item_map', (p) => { p.rect(1, 1, 16, 12, '#e8dcc0'); p.line(3, 10, 8, 4, '#c8423a'); p.line(8, 4, 14, 7, '#c8423a'); p.px(14, 7, '#2a2a3a'); p.vline(6, 1, 12, '#c8b894'); p.vline(11, 1, 12, '#c8b894'); });
}

// ---------------------------------------------------------------------------
//  INT. LITTLE A'LE'INN — 640 x 360 + glow
// ---------------------------------------------------------------------------
export function makeDinerInterior(scene) {
  const W = 640, H = 360;
  const pc = new PixelCanvas(W, H);
  const glow = new PixelCanvas(W, H);
  const r = rng(77);
  // checkerboard floor
  for (let y = 120; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = (Math.floor(x / 16) + Math.floor((y - 120) / 16)) % 2;
    let c = ch ? '#e8e0d0' : '#3a2a3a';
    if (r() < 0.02) c = mix(c, '#8a7a6a', 0.3);
    pc.px(x, y, c);
  }
  // back wall: wood paneling covered in UFO photos & posters
  for (let y = 0; y < 76; y++) for (let x = 0; x < W; x++) pc.px(x, y, (x % 20 === 0) ? '#4a2a1a' : (x % 20 === 1 ? '#8a5a3a' : '#6a3e26'));
  for (let i = 0; i < 18; i++) {
    const x = 70 + Math.floor(r() * 400), y = 8 + Math.floor(r() * 40), w = 14 + Math.floor(r() * 10), h = 10 + Math.floor(r() * 8);
    pc.rect(x, y, w, h, '#f2ead2'); pc.rect(x + 2, y + 2, w - 4, h - 5, ['#2a2a4a', '#4a6a8a', '#3a3a3a'][i % 3]);
    if (i % 2) pc.ellipse(x + w / 2, y + h / 2 - 1, 4, 1, '#c8d0d8');
  }
  // poster: "THE TRUTH IS ABOVE" + alien
  pc.rect(20, 10, 40, 54, '#1a2a1a'); pc.ellipse(40, 30, 10, 13, '#5dff9a'); glow.ellipse(40, 30, 10, 13, '#1a6a3a');
  pc.poly([[33, 28], [38, 27], [38, 33], [35, 33]], P.ink); pc.poly([[47, 28], [42, 27], [42, 33], [45, 33]], P.ink);
  // menu board: the pie order is the fuse puzzle clue!
  pc.rect(500, 6, 124, 62, '#1a1a1a'); pc.rect(502, 8, 120, 58, '#2a2a2a');
  stamp(pc, "TODAY'S PIES", 562, 11, '#fff6e0', 16, FONT_BODY);
  stamp(pc, '1. APPLE', 562, 25, '#f5c542', 16, FONT_BODY);
  stamp(pc, '2. LEMON', 562, 37, '#f5c542', 16, FONT_BODY);
  stamp(pc, '3. ELDERBERRY', 562, 49, '#f5c542', 16, FONT_BODY);
  glow.rect(504, 10, 116, 54, '#2a2418');
  // counter (pink formica with chrome edge) and stools
  pc.rect(80, 76, 480, 34, '#d87a9a'); pc.hline(80, 559, 76, '#ffb0c8'); pc.rect(80, 104, 480, 6, '#c0c6ce'); pc.hline(80, 559, 109, '#7a808a');
  for (let x = 110; x < 540; x += 40) { pc.ellipse(x, 124, 9, 5, '#c8423a'); pc.ellipse(x, 122, 9, 4, '#e86a5a'); pc.rect(x - 1, 128, 3, 8, '#9aa0aa'); }
  // pie case on the counter
  pc.rect(440, 62, 60, 30, '#c8e8f0'); pc.rect(442, 64, 56, 26, '#a8d0e0');
  for (const [x, c] of [[450, '#e8b070'], [466, '#f5e070'], [482, '#8a3a6a']]) { pc.ellipse(x, 82, 7, 3, c); pc.ellipse(x, 80, 7, 2, mix(c, '#ffffff', 0.3)); }
  glow.rect(442, 64, 56, 26, '#3a5a60');
  // coffee machine, register, alien plush
  pc.rect(110, 58, 20, 22, '#3a3a42'); pc.rect(114, 62, 12, 6, '#7a4a2a');
  pc.rect(170, 64, 24, 16, '#9aa0aa'); pc.rect(174, 66, 16, 6, '#3a5a3a'); glow.rect(174, 66, 16, 6, '#2a6a3a');
  pc.ellipse(300, 70, 7, 8, '#5dff9a'); pc.poly([[296, 69], [299, 68], [299, 72]], P.ink); pc.poly([[304, 69], [301, 68], [301, 72]], P.ink);
  // jukebox (left wall) — glowing
  pc.rect(16, 140, 44, 70, '#7a3a2a'); pc.ellipse(38, 142, 22, 12, '#7a3a2a');
  pc.rect(22, 150, 32, 20, '#ffcf7a'); glow.rect(22, 150, 32, 20, '#ff9a3a');
  for (let k = 0; k < 4; k++) { pc.vline(26 + k * 8, 176, 206, ['#ff5a7a', '#5dff9a', '#3cf2ff', '#f5c542'][k]); glow.vline(26 + k * 8, 176, 206, ['#ff3a5a', '#3ad16b', '#2ab2d0', '#d5a522'][k]); }
  glow.ellipse(38, 146, 18, 8, '#ff7a3a');
  // booths (bottom left & right)
  for (const bx of [90, 470]) {
    pc.rect(bx, 250, 90, 14, '#c8423a'); pc.hline(bx, bx + 89, 250, '#e86a5a');
    pc.rect(bx + 10, 266, 70, 30, '#e8e0d0'); pc.hline(bx + 10, bx + 79, 266, '#ffffff'); pc.rect(bx + 40, 296, 10, 10, '#9aa0aa');
    pc.rect(bx, 306, 90, 14, '#c8423a'); pc.hline(bx, bx + 89, 306, '#e86a5a');
    pc.circle(bx + 30, 280, 5, '#f2ead2'); pc.circle(bx + 30, 280, 3, '#8a5a3a');    // a coffee cup
  }
  // the exit mat
  pc.rect(296, 340, 48, 20, '#5a3a2a'); tiny(pc, 'COME BACK', 320, 347, '#e8dcc0');
  // window neon "PIE"
  pc.rect(580, 140, 50, 40, '#14102a'); stamp(pc, 'PIE', 605, 152, '#ff9ab0', 16, FONT_HEAD); stamp(glow, 'PIE', 605, 152, '#ff5a8a', 16, FONT_HEAD);
  addPixelTexture(scene, 'diner_in_glow', glow);
  return addPixelTexture(scene, 'diner_in', pc);
}
