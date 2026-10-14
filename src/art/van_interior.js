// ============================================================================
//  THE VAN — cozy interior for the shop screen. Wood paneling, a window onto
//  the desert night, string lights, lava lamp, corkboard of evidence, a plaid
//  blanket for Zeus. Emissive bits are a separate glow layer.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, addPixelTexture, rng, dither } from './pixel.js';

export function makeVanInterior(scene) {
  const W = 640, H = 360;
  const pc = new PixelCanvas(W, H);
  const glow = new PixelCanvas(W, H);
  const r = rng(12);
  // --- curved roof + wood panel walls
  const wood = ['#6a3e2a', '#7a4a32', '#5e3624', '#845238'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const plank = Math.floor(x / 22);
    let c = wood[plank % 4];
    if (x % 22 === 0) c = '#3e2418';
    if (x % 22 === 1) c = '#9a6444';
    if ((x * 7 + y * 3 + plank * 13) % 41 === 0) c = mix(c, '#2a160e', 0.5);     // grain knots
    if (dither(x, y, 0.08)) c = mix(c, '#000000', 0.15);
    pc.px(x, y, c);
  }
  // roof: curved ceiling with ribs
  for (let y = 0; y < 52; y++) for (let x = 0; x < W; x++) {
    const curve = 52 - Math.round(Math.sin((x / W) * Math.PI) * 14);
    if (y < curve) pc.px(x, y, (x % 48) < 2 ? '#2a1a1a' : y < curve - 4 ? '#e8dcc0' : '#bfae8e');
  }
  for (let x = 0; x < W; x += 48) pc.vline(x, 0, 50, '#8a7a60');
  // floor + rug
  for (let y = 300; y < H; y++) for (let x = 0; x < W; x++) pc.px(x, y, (y + Math.floor(x / 30)) % 6 === 0 ? '#3e2418' : '#5a3424');
  for (let y = 306; y < 352; y++) for (let x = 60; x < 360; x++) {
    const stripe = Math.floor((x - 60) / 10) % 3;
    let c = ['#8a3a3a', '#c8a050', '#3a5a6a'][stripe];
    if (y < 309 || y > 348) c = '#c8a050';
    if ((x + y) % 2 === 0) c = mix(c, '#000000', 0.12);
    pc.px(x, y, c);
  }
  // --- window onto the desert night
  const wx = 70, wy = 70, ww = 200, wh = 120;
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
    const t = y / wh;
    pc.px(wx + x, wy + y, dither(x, y, t) ? '#1f1a48' : '#120f33');
  }
  for (let i = 0; i < 60; i++) glow.px(wx + Math.floor(r() * ww), wy + Math.floor(r() * wh * 0.7), r() < 0.2 ? '#fff6e0' : '#8a86b8');
  glow.circle(wx + 150, wy + 26, 9, '#f2ecd8'); glow.circle(wx + 153, wy + 24, 8, '#00000000');
  pc.circle(wx + 150, wy + 26, 9, '#d8d0b8'); pc.circle(wx + 154, wy + 23, 8, '#120f33');      // crescent moon
  for (let x = 0; x < ww; x++) {
    const m = 82 + Math.round(Math.sin(x / 23) * 8 + Math.sin(x / 7) * 2);
    for (let y = m; y < wh; y++) pc.px(wx + x, wy + y, y === m ? '#5a3a6a' : '#2a1838');
  }
  glow.circle(wx + 60, wy + 70, 2, '#5dff9a');                                                 // a light in the sky...
  pc.rect(wx - 6, wy - 6, ww + 12, 6, '#3e2418'); pc.rect(wx - 6, wy + wh, ww + 12, 8, '#3e2418');
  pc.rect(wx - 6, wy, 6, wh, '#3e2418'); pc.rect(wx + ww, wy, 6, wh, '#3e2418');
  pc.hline(wx - 6, wx + ww + 5, wy + wh + 7, '#9a6444');
  // orange curtains (gathered at the sides)
  for (const [cx, dir] of [[wx - 4, 1], [wx + ww + 4, -1]]) {
    for (let y = wy - 8; y < wy + wh + 4; y++) {
      const width = 26 - Math.abs(y - (wy + wh * 0.55)) * 0.12;
      for (let k = 0; k < width; k++) {
        const x = cx + dir * k;
        pc.px(x, y, (k % 5) < 2 ? P.btc2 : (k % 5) === 4 ? '#a85410' : P.btc);
      }
    }
  }
  pc.rect(wx - 14, wy - 12, ww + 28, 4, '#c8b07a');                                             // curtain rod
  // --- string lights across the ceiling
  for (let x = 6; x < W; x += 2) {
    const y = 58 + Math.sin((x / W) * Math.PI * 3) * 6;
    pc.px(x, y, '#2a1a1a');
    if (x % 28 === 0) {
      const c = ['#ffb347', '#ff6a8a', '#7ff8ff', '#9dff8a'][(x / 28) % 4];
      pc.rect(x - 1, y + 1, 3, 4, mix(c, '#000000', 0.3));
      glow.rect(x - 1, y + 1, 3, 4, c);
      glow.px(x, y + 2, '#ffffff');
    }
  }
  // --- corkboard of evidence
  const bx = 300, by = 80;
  pc.rect(bx, by, 110, 80, '#a87850'); pc.rect(bx - 4, by - 4, 118, 4, '#3e2418'); pc.rect(bx - 4, by + 80, 118, 4, '#3e2418');
  pc.rect(bx - 4, by, 4, 80, '#3e2418'); pc.rect(bx + 110, by, 4, 80, '#3e2418');
  for (let i = 0; i < 300; i++) pc.px(bx + Math.floor(r() * 110), by + Math.floor(r() * 80), '#8a6040');
  const notes = [[310, 88, 22, 16, '#f2e6c8'], [342, 96, 18, 22, '#e8e0b0'], [370, 86, 30, 18, '#f2e6c8'], [318, 120, 26, 20, '#d8e8f0'], [356, 128, 20, 16, '#f2e6c8'], [384, 116, 18, 26, '#e8e0b0']];
  for (const [x, y, w, h, c] of notes) {
    pc.rect(x, y, w, h, c);
    for (let k = 3; k < h - 2; k += 3) pc.hline(x + 2, x + w - 3, y + k, '#9a9080');
  }
  // a UFO photo + a Satoshi silhouette with a big "?"
  pc.rect(370, 86, 30, 18, '#2a2a4a'); pc.ellipse(385, 96, 8, 3, '#b5c0cc'); pc.ellipse(385, 93, 3, 2, '#7ff8ff');
  pc.rect(384, 116, 18, 26, '#e8e0b0'); pc.ellipse(393, 124, 5, 6, '#3a3040'); pc.rect(389, 130, 8, 10, '#3a3040');
  pc.map(['.###.', '#...#', '...#.', '..#..', '.....', '..#..'], { '#': P.red }, 398, 112);
  // red string connecting everything (obviously)
  for (const [a, b] of [[[321, 96], [351, 106]], [[351, 106], [385, 95]], [[331, 130], [366, 136]], [[366, 136], [393, 128]], [[351, 106], [366, 136]]]) {
    pc.line(a[0], a[1], b[0], b[1], '#c8423a');
  }
  for (const [x, y] of [[321, 96], [351, 106], [385, 95], [331, 130], [366, 136], [393, 128]]) pc.rect(x - 1, y - 1, 2, 2, '#ff3b4f');
  // --- shelf: tinfoil rolls, hot dog buns, a lava lamp
  pc.rect(296, 190, 130, 5, '#3e2418'); pc.hline(296, 425, 190, '#9a6444');
  for (let k = 0; k < 3; k++) { pc.rect(302 + k * 14, 176, 10, 14, '#c8d4e0'); pc.vline(302 + k * 14, 176, 189, '#ffffff'); pc.ellipse(307 + k * 14, 176, 5, 2, '#9aa8ba'); }
  pc.rect(350, 178, 28, 12, '#e8b070'); pc.hline(350, 377, 178, '#f5c890');
  // lava lamp
  pc.poly([[396, 189], [404, 160], [412, 160], [420, 189]], '#1a3a2a');
  pc.rect(402, 154, 12, 6, '#b5c0cc'); pc.rect(398, 188, 20, 3, '#b5c0cc');
  glow.poly([[398, 187], [405, 162], [411, 162], [418, 187]], '#2bd16b');
  glow.ellipse(408, 170, 3, 4, '#9dff8a'); glow.ellipse(406, 181, 4, 3, '#9dff8a');
  // --- a little stove/fridge unit under the shelf
  pc.rect(440, 200, 70, 100, '#c8c0a8'); pc.rect(444, 204, 62, 44, '#b8b098'); pc.rect(444, 252, 62, 44, '#b8b098');
  pc.rect(498, 220, 3, 12, '#6a6a7a'); pc.rect(498, 266, 3, 12, '#6a6a7a');
  pc.rect(456, 214, 30, 20, '#f7931a'); pc.map(['##.', '#.#', '##.', '#.#', '##.'], { '#': '#fff6e0' }, 469, 219);   // ₿ magnet
  // --- Zeus's plaid blanket on the floor
  for (let y = 286; y < 304; y++) for (let x = 120; x < 260; x++) {
    const px = Math.floor((x - 120) / 8), py = Math.floor((y - 286) / 6);
    let c = (px + py) % 2 ? '#a83a3a' : '#7a2a3a';
    if ((x - 120) % 8 === 0 || (y - 286) % 6 === 0) c = '#e8c070';
    pc.px(x, y, c);
  }
  // window light spilling on the floor
  for (let y = 300; y < 352; y++) for (let x = 0; x < 260; x++) {
    const t = (x - (40 + (y - 300) * 0.6)) / 220;
    if (t > 0 && t < 1 && dither(x, y, (1 - Math.abs(t - 0.5) * 2) * 0.16)) glow.px(x, y, '#2a2650');
  }
  addPixelTexture(scene, 'van_interior_glow', glow);
  return addPixelTexture(scene, 'van_interior', pc);
}
