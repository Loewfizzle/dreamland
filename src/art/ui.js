// ============================================================================
//  UI ART — logo, road-sign buttons, retro-terminal panels, icons, touch pads.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, addPixelTexture, rng, dither } from './pixel.js';

export const FONT_HEAD = '"Press Start 2P", monospace';
export const FONT_BODY = '"VT323", monospace';

/** Rasterize text into a hard-edged 1-bit mask (no blurry anti-aliasing). */
export function textMask(text, px, font = FONT_HEAD, letterSpacing = 0) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `${px}px ${font}`;
  const w = Math.ceil(ctx.measureText(text).width + letterSpacing * text.length) + 4;
  const h = Math.ceil(px * 1.3) + 4;
  c.width = w;
  c.height = h;
  ctx.font = `${px}px ${font}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  if (letterSpacing) {
    let x = 2;
    for (const ch of text) { ctx.fillText(ch, x, 2); x += ctx.measureText(ch).width + letterSpacing; }
  } else ctx.fillText(text, 2, 2);
  const img = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let i = 0; i < w * h; i++) {
    if (img[i * 4 + 3] > 110) {
      mask[i] = 1;
      const x = i % w, y = (i / w) | 0;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  return { w, h, mask, bounds: { minX, maxX, minY, maxY } };
}

/**
 * The DREAMLAND HEIST logo: sunset-chrome letters with a deep 3D extrude,
 * and neon-cyan "HEIST" underneath. Also emits a separate glow mask texture.
 */
export function makeLogo(scene) {
  const top = textMask('DREAMLAND', 32, FONT_HEAD, 1);
  const bot = textMask('HEIST', 24, FONT_HEAD, 6);
  const W = 340, H = 104;
  const pc = new PixelCanvas(W, H);
  const glow = new PixelCanvas(W, H);
  const tw = top.bounds.maxX - top.bounds.minX + 1;
  const ox = Math.round((W - tw) / 2) - top.bounds.minX;
  const oy = 6 - top.bounds.minY;
  const at = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.mask[y * m.w + x];
  const ramp = [P.sun0, P.sun1, P.sun1, P.sun2, P.sun3, P.sun4, P.sky4];
  const th = top.bounds.maxY - top.bounds.minY + 1;

  // extrude: stack shifted copies, darkest at the back
  const depth = 6;
  for (let d = depth; d >= 1; d--) {
    const c = mix(P.sky2, P.ink, d / depth * 0.6);
    for (let y = 0; y < top.h; y++) for (let x = 0; x < top.w; x++) {
      if (at(top, x, y)) pc.px(ox + x + Math.round(d * 0.5), oy + y + d, c);
    }
  }
  // outline
  for (let y = -2; y < top.h + 2; y++) for (let x = -2; x < top.w + 2; x++) {
    if (at(top, x, y)) continue;
    if (at(top, x - 1, y) || at(top, x + 1, y) || at(top, x, y - 1) || at(top, x, y + 1)) pc.px(ox + x, oy + y, P.ink);
  }
  // face: horizontal sunset chrome bands + highlight + a horizon line
  for (let y = 0; y < top.h; y++) for (let x = 0; x < top.w; x++) {
    if (!at(top, x, y)) continue;
    const t = (y - top.bounds.minY) / th;
    const ti = t * (ramp.length - 1);
    const i = Math.min(ramp.length - 2, Math.floor(ti));
    let c = dither(x, y, ti - i) ? ramp[i + 1] : ramp[i];
    if (!at(top, x, y - 1)) c = P.white;                     // top-edge shine
    if (Math.abs(t - 0.52) < 0.04) c = P.sky5;               // chrome horizon split
    pc.px(ox + x, oy + y, c);
    glow.px(ox + x, oy + y, P.white);
  }

  // HEIST — neon tube letters
  const bw = bot.bounds.maxX - bot.bounds.minX + 1;
  const bx = Math.round((W - bw) / 2) - bot.bounds.minX;
  const by = 62 - bot.bounds.minY;
  for (let y = -2; y < bot.h + 2; y++) for (let x = -2; x < bot.w + 2; x++) {
    const inside = at(bot, x, y);
    const edge = !inside && (at(bot, x - 1, y) || at(bot, x + 1, y) || at(bot, x, y - 1) || at(bot, x, y + 1));
    if (inside) {
      const border = !at(bot, x - 1, y) || !at(bot, x + 1, y) || !at(bot, x, y - 1) || !at(bot, x, y + 1);
      pc.px(bx + x, by + y, border ? P.cyan2 : P.cyan0);
      glow.px(bx + x, by + y, P.white);
    } else if (edge) {
      pc.px(bx + x, by + y, P.cyan4);
      pc.px(bx + x + 1, by + y + 2, P.ink);
    }
  }
  // little ₿ diamonds flanking HEIST
  for (const sx of [bx + bot.bounds.minX - 18, bx + bot.bounds.maxX + 10]) {
    const sy = by + bot.bounds.minY + 6;
    pc.map(['..#..', '.###.', '##o##', '.###.', '..#..'], { '#': P.btc, o: P.btc0 }, sx, sy);
    glow.map(['..#..', '.###.', '#####', '.###.', '..#..'], { '#': P.white }, sx, sy);
  }
  addPixelTexture(scene, 'logo', pc);
  addPixelTexture(scene, 'logo_glow', glow);
}

// ---------------------------------------------------------------------------
//  Road-sign button (sun-bleached green highway sign)
// ---------------------------------------------------------------------------
export function makeSign(scene, key, w, h, { fill = P.sign, fill2 = P.sign2, border = P.cream, seed = 1 } = {}) {
  const pc = new PixelCanvas(w, h + 2);
  const r = rng(seed);
  const round = (x, y) => (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
  // drop shadow
  for (let y = 2; y < h + 2; y++) for (let x = 2; x < w; x++) pc.px(x, y, '#0b0a1a90');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (round(x, y)) continue;
    let c = fill;
    if (y > h * 0.55 && dither(x, y, (y - h * 0.55) / (h * 0.6))) c = fill2;
    // sun bleaching speckles
    if (r() < 0.05) c = mix(fill, P.cream, 0.25);
    pc.px(x, y, c);
  }
  // inset border
  for (let x = 2; x < w - 2; x++) { pc.px(x, 1, border); pc.px(x, h - 2, mix(border, fill2, 0.25)); }
  for (let y = 2; y < h - 2; y++) { pc.px(1, y, border); pc.px(w - 2, y, mix(border, fill2, 0.2)); }
  // bolts + rust drip
  for (const bx of [4, w - 5]) {
    pc.px(bx, 3, P.chrome1); pc.px(bx, 4, P.chrome2);
    if (r() < 0.7) for (let k = 0; k < 2 + r() * 3; k++) pc.px(bx, 5 + k, k % 2 ? P.rust1 : mix(P.rust0, fill, 0.4));
  }
  // top glint
  for (let x = 3; x < w - 3; x++) if (dither(x, 0, 0.35)) pc.px(x, 2, mix(fill, P.white, 0.25));
  return addPixelTexture(scene, key, pc);
}

/** Wooden post that the menu signs hang from. */
export function makePost(scene, key, h) {
  const pc = new PixelCanvas(8, h);
  for (let y = 0; y < h; y++) {
    pc.px(1, y, P.terra3); pc.px(2, y, P.terra2); pc.px(3, y, P.terra1);
    pc.px(4, y, P.terra2); pc.px(5, y, P.terra3); pc.px(6, y, P.terra4);
    if (y % 9 === 3) { pc.px(3, y, P.terra3); pc.px(4, y + 1, P.terra4); }
  }
  pc.hline(1, 6, 0, P.sand2);
  pc.outline(P.outline);
  return addPixelTexture(scene, key, pc);
}

// ---------------------------------------------------------------------------
//  Retro terminal panel (9-slice friendly: corners are 6px)
// ---------------------------------------------------------------------------
export function makePanel(scene, key, w, h, { accent = P.cyan2, fill = P.ink2 } = {}) {
  const pc = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const corner = (x < 3 && y < 3 && x + y < 3) || (x > w - 4 && y < 3 && (w - 1 - x) + y < 3) ||
      (x < 3 && y > h - 4 && x + (h - 1 - y) < 3) || (x > w - 4 && y > h - 4 && (w - 1 - x) + (h - 1 - y) < 3);
    if (corner) continue;
    let c = y % 2 ? fill : mix(fill, P.ink3, 0.35);           // scanline texture
    pc.px(x, y, c);
  }
  // border with chamfered corners
  for (let x = 3; x < w - 3; x++) { pc.px(x, 0, accent); pc.px(x, h - 1, mix(accent, P.ink, 0.5)); }
  for (let y = 3; y < h - 3; y++) { pc.px(0, y, accent); pc.px(w - 1, y, mix(accent, P.ink, 0.5)); }
  for (let i = 0; i < 3; i++) {
    pc.px(i, 3 - i, accent); pc.px(w - 1 - i, 3 - i, accent);
    pc.px(i, h - 4 + i, mix(accent, P.ink, 0.5)); pc.px(w - 1 - i, h - 4 + i, mix(accent, P.ink, 0.5));
  }
  // inner hairline
  for (let x = 4; x < w - 4; x++) pc.px(x, 2, mix(accent, fill, 0.7));
  // corner ticks
  pc.rect(4, 4, 2, 1, accent); pc.rect(w - 6, 4, 2, 1, accent);
  return addPixelTexture(scene, key, pc);
}

// ---------------------------------------------------------------------------
//  Icons (11x11) — fullscreen, pause, gear, speaker, back arrow
// ---------------------------------------------------------------------------
const ICONS = {
  fullscreen: ['###.....###', '#.........#', '#.........#', '...........', '...........', '...........', '...........', '...........', '#.........#', '#.........#', '###.....###'],
  pause: ['...........', '..##...##..', '..##...##..', '..##...##..', '..##...##..', '..##...##..', '..##...##..', '..##...##..', '..##...##..', '..##...##..', '...........'],
  gear: ['....#.#....', '..#.###.#..', '.#########.', '..##...##..', '###.....###', '.##.....##.', '###.....###', '..##...##..', '.#########.', '..#.###.#..', '....#.#....'],
  back: ['...........', '....#......', '...##......', '..#######..', '.########..', '..#######..', '...##......', '....#......', '...........', '...........', '...........'],
  check: ['...........', '.........##', '........##.', '.......##..', '##....##...', '.##..##....', '..####.....', '...##......', '...........', '...........', '...........'],
};
export function makeIcons(scene) {
  for (const [name, rows] of Object.entries(ICONS)) {
    const pc = new PixelCanvas(13, 13);
    pc.map(rows, { '#': P.white }, 1, 1);
    pc.outline(P.ink);
    addPixelTexture(scene, `icon_${name}`, pc);
  }
}

// ---------------------------------------------------------------------------
//  Touch controls art: joystick base/knob and action buttons
// ---------------------------------------------------------------------------
export function makeTouchArt(scene) {
  const ring = (r, fillA, ringC, inner) => {
    const s = r * 2 + 3;
    const pc = new PixelCanvas(s, s);
    const c = r + 1;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d <= r + 0.5) {
        let col = fillA;
        if (d > r - 1.5) col = ringC;
        else if (inner && d > r - 4 && d < r - 2.5) col = inner;
        else if (y < c - r * 0.4 && d < r - 2 && dither(x, y, 0.15)) col = '#ffffff22';
        pc.px(x, y, col);
      }
    }
    return pc;
  };
  addPixelTexture(scene, 'pad_base', ring(36, '#0b0a1a66', '#fff6e0aa', '#3cf2ff55'));
  // direction ticks on the base
  const knob = ring(15, '#fff6e0cc', '#ffffff', null);
  knob.circle(16, 14, 9, '#ffffff');
  knob.circle(16, 17, 10, '#d9c9a6');
  knob.circle(16, 16, 9, '#fff6e0');
  knob.circle(13, 12, 2, '#ffffff');
  addPixelTexture(scene, 'pad_knob', knob);
  addPixelTexture(scene, 'btn_a', ring(26, '#f7931a55', '#ffc35ccc', '#ffe9b066'));
  addPixelTexture(scene, 'btn_b', ring(26, '#3cf2ff40', '#7ff8ffcc', '#d6fffb55'));
  addPixelTexture(scene, 'btn_c', ring(22, '#c23d6850', '#ff8aa0cc', '#ffd0d855'));
  addPixelTexture(scene, 'btn_small', ring(13, '#0b0a1a88', '#fff6e0aa', null));
}

// Paw print icon (for Zeus buttons) & ₿ glyph for HUD
export function makeGlyphs(scene) {
  let pc = new PixelCanvas(11, 11);
  pc.map(['..##...##..', '..##...##..', '...........', '##.......##', '##..###..##', '...#####...', '..#######..', '..#######..', '...##.##...'], { '#': P.white }, 0, 1);
  pc.outline(P.ink);
  addPixelTexture(scene, 'glyph_paw', pc);
  pc = new PixelCanvas(9, 11);
  pc.map(['..#.#....', '.######..', '.##...##.', '.##...##.', '.######..', '.##...##.', '.##...##.', '.######..', '..#.#....'], { '#': P.btc }, 0, 1);
  pc.outline(P.ink);
  addPixelTexture(scene, 'glyph_btc', pc);
}

/** Chunky 5-point rating star (17x16) for results screens. */
export function makeRatingStar(scene) {
  const rows = [
    '........#........',
    '.......###.......',
    '.......###.......',
    '......#####......',
    '#################',
    '.###############.',
    '..#############..',
    '...###########...',
    '....#########....',
    '....#########....',
    '...#####.#####...',
    '...####...####...',
    '..###.......###..',
    '..##.........##..',
    '.#.............#.',
  ];
  const pc = new PixelCanvas(19, 17);
  pc.map(rows, { '#': P.white }, 1, 1);
  pc.outline(P.ink);
  addPixelTexture(scene, 'rating_star', pc);
}
