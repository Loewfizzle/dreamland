// ============================================================================
//  HANGAR 18 — Chapter 4 art (side view).
//  Vast arched hangar: truss ceiling, corrugated walls, polished concrete,
//  a flying saucer hidden under a tarp (glowing at the edges), blast doors,
//  hacking terminals, a tall pallet rack, forklift, hanging sodium lamps.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, addPixelTexture, buildSheet, rng, dither } from './pixel.js';
import { tiny } from './rachel.js';
import { textMask, FONT_HEAD } from './ui.js';

function stampBig(pc, text, cx, y, color, px = 16) {
  const m = textMask(text, px, FONT_HEAD);
  const ox = Math.round(cx - (m.bounds.maxX - m.bounds.minX + 1) / 2) - m.bounds.minX;
  for (let yy = 0; yy < m.h; yy++) for (let x = 0; x < m.w; x++) if (m.mask[yy * m.w + x]) pc.px(ox + x, y - m.bounds.minY + yy, color);
}

/** Far layer (1024 wide, tileable): arched truss roof, corrugated wall, high windows. */
export function makeHangarFar(scene) {
  const W = 1024, H = 360;
  const pc = new PixelCanvas(W, H);
  const glow = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // corrugated wall: vertical ribs, darker toward the top
    const rib = (x % 8);
    let c = rib < 2 ? '#2a3044' : rib < 5 ? '#323a52' : '#2c344a';
    if (y < 120) c = mix(c, '#141826', (120 - y) / 160);
    if (dither(x, y, 0.06)) c = mix(c, '#000000', 0.2);
    pc.px(x, y, c);
  }
  // high clerestory windows: night sky outside
  for (let wx = 40; wx < W; wx += 128) {
    pc.rect(wx, 70, 80, 30, '#0c1024');
    for (let k = 0; k < 6; k++) glow.px(wx + 4 + ((k * 37) % 72), 74 + ((k * 13) % 22), '#5a5a8a');
    for (const x of [wx + 26, wx + 53]) pc.vline(x, 70, 99, '#1a1e2e');
    pc.hline(wx, wx + 79, 85, '#1a1e2e');
    pc.rect(wx - 2, 68, 84, 2, '#4a526a'); pc.rect(wx - 2, 100, 84, 3, '#4a526a');
  }
  // arched truss roof: big curved beams with cross-bracing
  for (let i = 0; i < 4; i++) {
    const bx = i * 256;
    for (let x = 0; x < 256; x++) {
      const y = 12 + Math.round(Math.pow((x - 128) / 128, 2) * 30);
      pc.rect(bx + x, y, 1, 4, '#4a526a');
      pc.px(bx + x, y + 4, '#1a1e2e');
      if (x % 16 === 0) pc.line(bx + x, y + 4, bx + x + 8, 0, '#3a4258');
    }
  }
  for (let x = 0; x < W; x += 2) pc.px(x, 0, '#3a4258');
  // gantry crane rail
  pc.rect(0, 130, W, 6, '#3a4258'); pc.hline(0, W - 1, 130, '#5a627a');
  for (let x = 0; x < W; x += 32) { pc.line(x, 136, x + 16, 150, '#2a3044'); pc.line(x + 32, 136, x + 16, 150, '#2a3044'); }
  // lower wall: a painted band + stencilled hazard
  for (let y = 236; y < H; y++) for (let x = 0; x < W; x++) pc.px(x, y, (x % 8) < 2 ? '#3a3020' : '#4a3e28');
  for (let x = 0; x < W; x++) pc.px(x, 236, '#6a5a3a');
  for (let x = 0; x < W; x += 4) pc.px(x, 240, (x % 8) < 4 ? '#c8a030' : '#1a1a1a');
  addPixelTexture(scene, 'hangar_far_glow', glow);
  return addPixelTexture(scene, 'hangar_far', pc);
}

/** Polished concrete floor tile (256 x 80) with painted lines & reflections. */
export function makeHangarFloor(scene) {
  const W = 256, H = 80;
  const pc = new PixelCanvas(W, H);
  const r = rng(18);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = y < 3 ? '#6a7088' : (y + Math.floor(x / 64)) % 2 ? '#3e4258' : '#3a3e54';
    if (x % 64 === 0 && y > 3) c = '#2e3246';
    if (r() < 0.02) c = mix(c, '#000000', 0.25);
    pc.px(x, y, c);
  }
  // painted lane lines
  for (let x = 0; x < W; x++) { if ((x % 24) < 14) pc.px(x, 18, '#c8a030'); pc.px(x, 60, '#c8a030'); }
  // soft reflections streaks
  for (let x = 0; x < W; x += 3) if (dither(x, 0, 0.3)) pc.vline(x, 4, 10, '#4a5068');
  return addPixelTexture(scene, 'hangar_floor', pc);
}

/** The saucer under a tarp (360 x 150) + glow layer. */
export function makeTarpSaucer(scene) {
  const W = 360, H = 150;
  const pc = new PixelCanvas(W, H);
  const glow = new PixelCanvas(W, H);
  const cx = W / 2;
  // landing struts peeking below
  for (const x of [cx - 120, cx, cx + 120]) { pc.rect(x - 3, 126, 6, 22, '#6a7080'); pc.rect(x - 10, 146, 20, 4, '#4a5060'); }
  // underside glow leaking out (emissive)
  for (let y = 112; y < 140; y++) for (let x = 0; x < W; x++) {
    const d = Math.abs(x - cx) / 170;
    const a = (1 - d) * (1 - (y - 112) / 28);
    if (a > 0 && dither(x, y, a * 0.9)) glow.px(x, y, y < 126 ? '#3cf2ff' : '#1aa6c9');
  }
  // tarp silhouette: dome + wide disc, draped with folds
  const top = (x) => {
    const dx = (x - cx) / 172;
    if (Math.abs(dx) > 1) return null;
    const disc = 104 - Math.sqrt(Math.max(0, 1 - dx * dx)) * 30;
    const dome = Math.abs(dx) < 0.38 ? 104 - Math.sqrt(Math.max(0, 1 - Math.pow(dx / 0.38, 2))) * 92 : 999;
    return Math.min(disc, dome);
  };
  for (let x = 0; x < W; x++) {
    const ty = top(x);
    if (ty === null) continue;
    const fold = Math.sin(x * 0.11) * 3 + Math.sin(x * 0.037) * 2;
    for (let y = Math.round(ty); y < 120 + Math.round(fold); y++) {
      const shade = Math.sin(x * 0.11 + y * 0.02);
      let c = shade > 0.55 ? '#5a6040' : shade > -0.2 ? '#4a5034' : '#3a3e28';
      if (y < ty + 2) c = '#6a7050';                       // rim highlight
      if (y > 112 + fold) c = '#2e3220';                    // hem in shadow
      pc.px(x, y, c);
    }
    // a hem lit cyan from beneath
    glow.px(x, 119 + Math.round(fold), '#1aa6c9');
  }
  // ropes & tie-downs
  for (const [x0, x1] of [[cx - 150, cx - 90], [cx + 90, cx + 150], [cx - 40, cx - 60], [cx + 40, cx + 60]]) pc.line(x0, 70, x1, 122, '#c8b07a');
  // stencil on the tarp
  stampBig(pc, 'PROPERTY OF USAF', cx, 92, '#6a7050', 8);
  pc.outline(P.outline);
  addPixelTexture(scene, 'tarp_saucer_glow', glow);
  return addPixelTexture(scene, 'tarp_saucer', pc);
}

export function makeHangarProps(scene) {
  // blast door panel (52 x 200): heavy steel with hazard chevrons
  let pc = new PixelCanvas(52, 200);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 52; x++) {
    let c = (Math.floor(y / 40) % 2) ? '#5a627a' : '#525a72';
    if (x < 2 || x > 49) c = '#3a4258';
    if (y % 40 === 0) c = '#3a4258';
    pc.px(x, y, c);
  }
  for (let y = 160; y < 196; y++) for (let x = 2; x < 50; x++) pc.px(x, y, ((x + y) % 12) < 6 ? '#f5c542' : '#1a1a1a');
  for (const y of [20, 60, 100, 140]) for (const x of [8, 44]) { pc.px(x, y, '#9aa2ba'); pc.px(x, y + 1, '#2a3044'); }
  pc.rect(20, 80, 12, 30, '#3a4258'); pc.rect(22, 82, 8, 26, '#2a3044');
  pc.outline(P.outline);
  addPixelTexture(scene, 'blastdoor', pc);
  // door frame (72 x 230): pillars + lintel with a status lamp
  pc = new PixelCanvas(72, 230);
  for (const x of [0, 62]) { pc.rect(x, 20, 10, 210, '#3a4258'); pc.vline(x, 20, 229, '#5a627a'); }
  pc.rect(0, 0, 72, 22, '#3a4258'); pc.hline(0, 71, 0, '#5a627a');
  for (let x = 4; x < 68; x += 8) pc.rect(x, 8, 4, 6, '#2a3044');
  pc.outline(P.outline);
  addPixelTexture(scene, 'doorframe', pc);
  // hacking terminal (36 x 60), 2 frames: locked (red) / unlocked (green)
  buildSheet(scene, 'hackterm', 36, 60, [0, 1].map((f) => (s) => {
    s.rect(10, 34, 16, 26, '#3a4258'); s.hline(10, 25, 34, '#5a627a');
    s.rect(2, 2, 32, 32, '#2a3044'); s.rect(4, 4, 28, 24, f ? '#0a3a24' : '#1a0a14');
    for (let y = 6; y < 26; y += 3) s.hline(6, 6 + ((y * 7) % 20), y, f ? '#5dff9a' : '#ff3b4f');
    s.rect(8, 30, 20, 3, '#1a1e2e');
    s.px(30, 31, f ? '#5dff9a' : '#ff3b4f');
  }), { outline: P.outline });
  // tall pallet rack (96 x 210) with crates; keycard sits on top (separate sprite)
  pc = new PixelCanvas(96, 210);
  for (const x of [2, 90]) pc.rect(x, 0, 5, 210, '#c86a2a');
  for (const y of [40, 100, 160, 206]) { pc.rect(0, y, 96, 4, '#d87a3a'); pc.hline(0, 95, y, '#f78a45'); }
  const crate = (x, y, w, h, c) => { pc.rect(x, y, w, h, c); pc.hline(x, x + w - 1, y, mix(c, '#ffffff', 0.25)); pc.line(x, y, x + w - 1, y + h - 1, mix(c, '#000000', 0.25)); };
  crate(10, 70, 34, 30, '#6a5a3a'); crate(48, 76, 36, 24, '#5a6a4a');
  crate(12, 128, 30, 32, '#5a5a6a'); crate(46, 130, 40, 30, '#6a5a3a');
  crate(16, 180, 70, 26, '#4a5a4a');
  tiny(pc, 'TOP SECRET', 48, 186, '#c8423a');
  pc.outline(P.outline);
  addPixelTexture(scene, 'palletrack', pc);
  // forklift (84 x 64)
  pc = new PixelCanvas(84, 64);
  pc.rect(20, 24, 48, 28, '#e8a020'); pc.hline(20, 67, 24, '#ffc850');
  pc.rect(30, 4, 28, 22, '#2a2a2a'); pc.rect(32, 6, 24, 18, '#3a4a5a');
  pc.rect(6, 0, 6, 54, '#4a4a4a'); pc.rect(0, 46, 22, 4, '#6a6a6a');
  for (const x of [30, 60]) { pc.circle(x, 54, 8, '#1a1a1a'); pc.circle(x, 54, 3, '#6a6a6a'); }
  pc.outline(P.outline);
  addPixelTexture(scene, 'forklift', pc);
  // hanging sodium lamp (24 x 40)
  pc = new PixelCanvas(24, 40);
  pc.vline(12, 0, 26, '#2a3044'); pc.poly([[2, 36], [8, 26], [16, 26], [22, 36]], '#3a4258'); pc.hline(3, 20, 37, '#ffd28a');
  pc.outline(P.outline);
  addPixelTexture(scene, 'hlamp', pc);
  // HANGAR 18 wall stencil (220 x 60)
  pc = new PixelCanvas(220, 60);
  stampBig(pc, 'HANGAR', 110, 4, '#5a627a', 16);
  stampBig(pc, '18', 110, 26, '#c8a030', 16);
  addPixelTexture(scene, 'hangar18', pc);
  // elevator platform frame (beyond door 3)
  pc = new PixelCanvas(120, 240);
  for (const x of [0, 112]) pc.rect(x, 0, 8, 240, '#3a4258');
  for (let y = 0; y < 240; y += 24) { pc.line(8, y, 112, y + 24, '#2a3044'); pc.line(112, y, 8, y + 24, '#2a3044'); }
  pc.rect(8, 214, 104, 10, '#5a627a'); for (let x = 8; x < 112; x += 6) pc.rect(x, 214, 3, 3, '#f5c542');
  tiny(pc, 'LIFT TO S-4', 60, 228, '#f5c542');
  pc.outline(P.outline);
  addPixelTexture(scene, 'liftframe', pc);
}
