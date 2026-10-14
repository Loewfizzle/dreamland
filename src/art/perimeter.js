// ============================================================================
//  THE PERIMETER — Chapter 3 art (top-down, night).
//  Moonlit desert floor with a dirt patrol road, granite boulders, hiding
//  bushes, the chain-link boundary fence, real-style Area 51 warning signs,
//  searchlight towers, motion sensors and the camo dudes' white pickup.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, addPixelTexture, rng, dither, buildSheet } from './pixel.js';
import { tiny } from './rachel.js';

export const PW = 960, PH = 1800;

export function makePerimeterGround(scene) {
  const pc = new PixelCanvas(PW, PH);
  const r = rng(51);
  const night = ['#2a2a4a', '#30304f', '#26264a', '#2c2d50'];
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const n = Math.sin(x * 0.011 + Math.sin(y * 0.013) * 2.2) + Math.sin(y * 0.009 - x * 0.006);
    let c = night[n > 0.7 ? 1 : n > 0 ? 0 : n > -0.7 ? 3 : 2];
    if (dither(x, y, 0.1)) c = night[2];
    pc.px(x, y, c);
  }
  // patrol road along the fence and a winding cattle track up from the south
  const road = (pts, w, col, col2) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.hypot(x1 - x0, y1 - y0);
      for (let s = 0; s < n; s++) {
        const x = x0 + ((x1 - x0) * s) / n, y = y0 + ((y1 - y0) * s) / n;
        for (let k = -w; k <= w; k++) for (let j = -w; j <= w; j++) {
          if (k * k + j * j > w * w) continue;
          pc.px(x + k, y + j, dither(x + k, y + j, 0.3) ? col2 : col);
        }
      }
    }
  };
  road([[0, 196], [960, 196]], 14, '#3a3a58', '#34344f');
  road([[480, 1800], [470, 1640], [520, 1480], [460, 1300], [500, 1120], [480, 960], [430, 820], [480, 640], [520, 420], [480, 220]], 7, '#36365a', '#323254');
  // tire tracks on the patrol road
  for (let x = 0; x < PW; x++) { pc.px(x, 188, '#28283f'); pc.px(x, 204, '#28283f'); }
  // pebbles, dry grass, moonlit sand sparkle
  for (let i = 0; i < 4200; i++) {
    const x = Math.floor(r() * PW), y = Math.floor(r() * PH), k = r();
    if (k < 0.45) pc.px(x, y, k < 0.2 ? '#4a4a6a' : '#1e1e38');
    else if (k < 0.75) { pc.px(x, y, '#3a4a4a'); pc.px(x + 1, y - 1, '#4a5a5a'); pc.px(x - 1, y - 1, '#2e3e3e'); }
    else if (k < 0.78) pc.px(x, y, '#8a8ab8');
  }
  // the restricted zone: a painted boundary line of orange posts (real Area 51 style)
  for (let x = 20; x < PW; x += 80) { pc.rect(x, 252, 2, 6, '#c86a2a'); pc.px(x, 251, '#f78a45'); }
  return addPixelTexture(scene, 'perimeter_ground', pc);
}

export function makePerimeterProps(scene) {
  const r = rng(7);
  // granite boulders (3 sizes) — blockers & cover
  for (const [key, w, h] of [['rock_s', 40, 28], ['rock_m', 72, 44], ['rock_l', 120, 60]]) {
    const pc = new PixelCanvas(w, h);
    const blobs = Math.max(3, Math.round(w / 14));
    for (let i = 0; i < blobs; i++) {
      const rx = w * (0.14 + r() * 0.12), ry = h * (0.26 + r() * 0.1);
      const cx = rx + 2 + r() * (w - 2 * rx - 4), cy = h * (0.45 + r() * 0.2);
      pc.ellipse(cx, cy, rx, ry, '#4a4a66');
      pc.ellipse(cx - rx * 0.2, cy - ry * 0.35, rx * 0.7, ry * 0.5, '#5e5e80');
      pc.ellipse(cx - rx * 0.35, cy - ry * 0.55, rx * 0.35, ry * 0.25, '#7a7aa0');
    }
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (pc.get(x, y) && !pc.get(x, y + 1) && y > h * 0.5) pc.px(x, y, '#2e2e48');
    pc.outline(P.outline);
    addPixelTexture(scene, key, pc);
  }
  // hiding bush (big, round, dark sage) + a rustle frame
  buildSheet(scene, 'hidebush', 48, 40, [0, 1].map((f) => (pc) => {
    const rr = rng(33);
    for (let i = 0; i < 26; i++) {
      const a = rr() * Math.PI * 2, d = rr() * 15;
      pc.circle(24 + Math.cos(a) * d + (f ? (rr() - 0.5) * 2 : 0), 22 + Math.sin(a) * d * 0.7, 5 + rr() * 3, i % 3 ? '#2f4a3a' : '#25392f');
    }
    for (let i = 0; i < 18; i++) pc.px(10 + rr() * 28, 8 + rr() * 22, rr() < 0.5 ? '#4f6b4f' : '#5f7f5a');
    for (let x = 6; x < 42; x++) if (pc.get(x, 34)) pc.px(x, 34, '#1a2a22');
  }), { outline: P.outline });
  // chain-link fence tile (64 wide) with barbed wire on top
  let pc = new PixelCanvas(64, 44);
  for (const x of [0, 32]) { pc.rect(x, 4, 3, 40, '#7a7a8a'); pc.vline(x, 4, 43, '#a0a0b0'); }
  for (let y = 12; y < 42; y++) for (let x = 0; x < 64; x++) if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) pc.px(x, y, '#6a6a80');
  pc.hline(0, 63, 12, '#9a9aaa'); pc.hline(0, 63, 41, '#5a5a6a');
  for (const y of [4, 8]) for (let x = 0; x < 64; x++) { pc.px(x, y + (x % 8 < 4 ? 0 : 1), '#8a8a9a'); if (x % 6 === 0) { pc.px(x, y - 1, '#c0c0d0'); pc.px(x + 1, y + 1, '#c0c0d0'); } }
  addPixelTexture(scene, 'fence_tile', pc);
  // the cut gap (after Ben's done)
  pc = new PixelCanvas(64, 44);
  for (const x of [0]) { pc.rect(x, 4, 3, 40, '#7a7a8a'); }
  for (let y = 12; y < 42; y++) for (let x = 0; x < 64; x++) {
    const inGap = x > 18 && x < 46 && y > 18;
    if (!inGap && ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0)) pc.px(x, y, '#6a6a80');
  }
  pc.line(18, 18, 14, 40, '#9a9aaa'); pc.line(46, 18, 50, 40, '#9a9aaa');
  pc.hline(0, 63, 12, '#9a9aaa');
  for (const y of [4, 8]) for (let x = 0; x < 64; x++) pc.px(x, y + (x % 8 < 4 ? 0 : 1), '#8a8a9a');
  addPixelTexture(scene, 'fence_cut', pc);
  // warning signs on posts
  const sign = (key, lines, bg = '#e8e4dc', fg = '#c8423a') => {
    const s = new PixelCanvas(64, 62);
    s.rect(30, 34, 4, 28, '#6a5a4a');
    s.rect(0, 0, 64, 36, bg); s.rect(1, 1, 62, 34, bg); s.hline(0, 63, 35, mix(bg, '#000000', 0.3));
    let y = 3;
    for (const [text, col] of lines) { tiny(s, text, 32, y, col ?? fg); y += 7; }
    s.outline(P.outline);
    addPixelTexture(scene, key, s);
  };
  sign('sign_warning', [['WARNING', '#c8423a'], ['RESTRICTED', '#2a2a3a'], ['AREA', '#2a2a3a'], ['NO TRESPASSING', '#2a2a3a'], ['- USAF -', '#2a2a3a']]);
  sign('sign_force', [['USE OF', '#c8423a'], ['DEADLY FORCE', '#c8423a'], ['AUTHORIZED', '#c8423a'], ['', null], ['NO PHOTOGRAPHY', '#2a2a3a']]);
  // searchlight tower (seen from above-ish): legs, platform, lamp housing
  pc = new PixelCanvas(48, 96);
  for (const [x0, x1] of [[8, 2], [40, 46]]) pc.line(x0, 30, x1, 95, '#6a6a7a', 2);
  pc.line(8, 50, 40, 80, '#5a5a6a'); pc.line(40, 50, 8, 80, '#5a5a6a'); pc.line(6, 70, 42, 70, '#5a5a6a');
  pc.rect(2, 22, 44, 10, '#4a4a5a'); pc.hline(2, 45, 22, '#7a7a8a');
  pc.rect(14, 6, 20, 16, '#2a2a36'); pc.ellipse(24, 8, 10, 4, '#3a3a46'); pc.ellipse(24, 14, 7, 5, '#fff6d0');
  pc.outline(P.outline);
  addPixelTexture(scene, 'searchtower', pc);
  // motion sensor post with a blinking eye (2 frames)
  buildSheet(scene, 'sensor', 14, 30, [0, 1].map((f) => (s) => {
    s.rect(6, 8, 3, 22, '#6a6a7a'); s.rect(2, 0, 10, 9, '#3a3a46'); s.hline(2, 11, 0, '#5a5a66');
    s.circle(7, 4, 2, f ? '#ff3b4f' : '#5a1a22'); if (f) s.px(6, 3, '#ffb0b8');
  }), { outline: P.outline });
  if (!scene.anims.exists('sensor_blink')) scene.anims.create({ key: 'sensor_blink', frames: scene.anims.generateFrameNumbers('sensor', { start: 0, end: 1 }), frameRate: 2, repeat: -1 });
  // the camo dudes' white pickup (top-down 3/4), headlights on
  pc = new PixelCanvas(92, 56);
  pc.rect(6, 14, 80, 30, '#d8dce4'); pc.hline(6, 85, 14, '#ffffff'); pc.rect(6, 40, 80, 4, '#a0a6b0');
  pc.rect(52, 6, 30, 12, '#c8ccd4'); pc.rect(56, 8, 22, 8, '#2a3a4a'); pc.line(58, 9, 62, 15, '#5a7a8a');
  pc.rect(10, 18, 38, 20, '#b8bcc4'); pc.rect(12, 20, 34, 16, '#9aa0aa');               // truck bed
  for (const x of [16, 72]) { pc.rect(x - 6, 42, 12, 8, '#1a1a22'); pc.rect(x - 3, 44, 6, 3, '#6a6a7a'); }
  pc.rect(84, 20, 4, 6, '#fff6d0'); pc.rect(84, 32, 4, 6, '#fff6d0');
  pc.rect(4, 20, 3, 5, '#c8423a'); pc.rect(4, 33, 3, 5, '#c8423a');
  pc.rect(60, 2, 10, 4, '#3a3a46'); pc.px(62, 3, '#ff3b4f'); pc.px(67, 3, '#3a6aff');      // light bar
  pc.outline(P.outline);
  addPixelTexture(scene, 'pickup', pc);
  // bolt cutters (pickup icon)
  pc = new PixelCanvas(16, 16);
  pc.line(2, 14, 8, 8, '#c8423a', 2); pc.line(6, 14, 9, 9, '#c8423a', 2); pc.line(8, 8, 13, 2, '#9aa0aa', 2); pc.line(9, 9, 14, 4, '#7a808a', 2);
  pc.outline(P.outline);
  addPixelTexture(scene, 'item_cutters', pc);
  // "?" and "!" alert bubbles
  for (const [key, ch, col] of [['bub_q', '?', '#f5c542'], ['bub_x', '!', '#ff3b4f']]) {
    const b = new PixelCanvas(12, 14);
    b.rect(1, 1, 10, 10, '#fff6e0'); b.poly([[4, 11], [8, 11], [5, 13]], '#fff6e0');
    if (ch === '!') { b.rect(5, 2, 2, 5, col); b.rect(5, 8, 2, 2, col); }
    else { b.map(['.##.', '#..#', '..#.', '.#..', '....', '.#..'], { '#': col }, 4, 2); }
    b.outline(P.outline);
    addPixelTexture(scene, key, b);
  }
}
