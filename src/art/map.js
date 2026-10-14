// ============================================================================
//  CHAPTER MAP ART — an illustrated Nevada road atlas at dusk.
//  Value-noise terrain with hill shading, dry lake beds, Rachel, the Area 51
//  runway, SR-375 (paved) turning into dirt roads, Joshua trees, a compass.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, addPixelTexture, rng, dither } from './pixel.js';
import { sampleRoute, HOME } from '../data/route.js';

// --- tiny deterministic value noise -------------------------------------------
function makeNoise(seed) {
  const r = rng(seed);
  const G = 64;
  const grid = Array.from({ length: G * G }, () => r());
  const at = (x, y) => grid[(((y % G) + G) % G) * G + (((x % G) + G) % G)];
  const smooth = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = smooth(x - x0), fy = smooth(y - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  return (x, y, oct = 5) => {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += n(x * f, y * f) * amp; amp *= 0.5; f *= 2; }
    return v;
  };
}

const LAKES = [
  { x: 440, y: 104, rx: 50, ry: 24, name: 'GROOM LAKE' },
  { x: 498, y: 222, rx: 22, ry: 11, name: 'PAPOOSE LAKE' },
];

export function makeWorldMap(scene) {
  const W = 640, H = 360;
  const pc = new PixelCanvas(W, H);
  const noise = makeNoise(51);
  const ridge = makeNoise(7);
  // --- heightmap: basins, two mountain ranges, foothills
  const hgt = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let h = noise(x / 90, y / 90) * 0.55;
    // ridged mountain ranges running SW→NE
    const r1 = 1 - Math.abs(ridge(x / 55, y / 55, 4) * 2 - 1);
    const band1 = Math.exp(-Math.pow((y - (330 - x * 0.45)) / 38, 2));
    const band2 = Math.exp(-Math.pow((y - (190 - x * 0.18)) / 26, 2)) * (0.4 + 0.6 * Math.min(1, Math.max(0, (x - 220) / 160)));
    h += r1 * r1 * (band1 * 0.55 + band2 * 0.5);
    // flatten lake beds
    for (const l of LAKES) {
      const d = ((x - l.x) / l.rx) ** 2 + ((y - l.y) / l.ry) ** 2;
      if (d < 1.6) h = h * Math.min(1, Math.max(0, d - 0.6)) + 0.18 * (1 - Math.min(1, Math.max(0, d - 0.6)));
    }
    hgt[y * W + x] = h;
  }
  const H_ = (x, y) => hgt[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  const ramp = ['#d9a066', '#c98a56', '#b5704a', '#9a5a48', '#7e4a4e', '#634056', '#4c3458'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const h = H_(x, y);
    // hill shading, light from the upper left (the setting sun)
    const sl = (H_(x + 1, y + 1) - H_(x - 1, y - 1)) * 18;
    let t = Math.min(0.999, Math.max(0, h * 1.25)) * (ramp.length - 1);
    t = Math.min(ramp.length - 1.001, Math.max(0, t + sl * 1.2));
    const i = Math.floor(t);
    let c = dither(x, y, t - i) ? ramp[i + 1] : ramp[i];
    if (sl < -0.35) c = mix(c, '#fff0c8', 0.18);           // sunlit slopes
    pc.px(x, y, c);
  }
  // contour lines (atlas feel)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const a = Math.floor(H_(x, y) * 14), b = Math.floor(H_(x + 1, y) * 14), c = Math.floor(H_(x, y + 1) * 14);
    if ((a !== b || a !== c) && a > 5 && (x + y) % 2 === 0) pc.px(x, y, '#5a3a4a60');
  }
  // dry lake beds with cracks
  const r = rng(3);
  for (const l of LAKES) {
    for (let y = -l.ry; y <= l.ry; y++) for (let x = -l.rx; x <= l.rx; x++) {
      const d = (x / l.rx) ** 2 + (y / l.ry) ** 2;
      if (d > 1) continue;
      pc.px(l.x + x, l.y + y, d > 0.8 ? '#d9c4a0' : dither(x, y, 0.2) ? '#e2d2b4' : '#eadcc0');
    }
    for (let k = 0; k < l.rx; k++) {
      let cx = l.x + (r() - 0.5) * l.rx * 1.6, cy = l.y + (r() - 0.5) * l.ry * 1.4;
      for (let s = 0; s < 6; s++) {
        const nx = cx + (r() - 0.5) * 8, ny = cy + (r() - 0.5) * 6;
        const inside = ((nx - l.x) / l.rx) ** 2 + ((ny - l.y) / l.ry) ** 2 < 0.9;
        if (inside) pc.line(cx, cy, nx, ny, '#cdb89a');
        cx = nx; cy = ny;
      }
    }
  }
  // Area 51: runways on the lake shore + hangar blocks
  pc.line(402, 128, 478, 92, '#5a5060', 2);
  pc.line(410, 136, 470, 112, '#5a5060');
  for (let k = 0; k < 7; k++) pc.rect(416 + k * 7, 128 - k * 3, 5, 3, k === 3 ? '#8a8a9a' : '#6a6a7a');
  pc.rect(436, 118, 8, 5, '#9a9aaa');                     // Hangar 18 (shh)
  // Rachel: a handful of buildings
  for (const [bx, by, bw, bh] of [[254, 180, 6, 4], [262, 183, 5, 4], [268, 179, 4, 3], [258, 188, 4, 3], [266, 189, 7, 4]]) {
    pc.rect(bx, by, bw, bh, '#e8d8b8'); pc.hline(bx, bx + bw - 1, by + bh, '#6a4a40');
  }
  pc.px(262, 186, '#ff5a7a');                              // diner neon
  // Ben's place
  pc.rect(HOME.x - 4, HOME.y - 3, 8, 5, '#e8d8b8'); pc.poly([[HOME.x - 5, HOME.y - 3], [HOME.x, HOME.y - 7], [HOME.x + 5, HOME.y - 3]], '#a84a3a');
  // Joshua trees scattered across the basins
  for (let k = 0; k < 160; k++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H);
    if (H_(x, y) > 0.48 || H_(x, y) < 0.2) continue;
    pc.vline(x, y - 3, y, '#4a3a2a'); pc.px(x - 1, y - 3, '#4f6b3f'); pc.px(x + 1, y - 4, '#4f6b3f'); pc.px(x, y - 4, '#7a9a5a');
  }
  // the route: paved SR-375 until Rachel, dirt tracks after
  const pts = sampleRoute(18);
  const rachelIdx = pts.findIndex((p) => p.stop === 'ch2');
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (i < rachelIdx) {
      pc.line(a.x, a.y + 1, b.x, b.y + 1, '#3a2a30', 4);  // shadow
      pc.line(a.x, a.y, b.x, b.y, '#4a3c46', 4);
      pc.line(a.x, a.y, b.x, b.y, '#5e5058', 2);
    } else {
      pc.line(a.x, a.y, b.x, b.y, '#8a5a3a', 2);
      if (i % 2) pc.line(a.x, a.y, b.x, b.y, '#a87050');
    }
  }
  for (let i = 0; i < rachelIdx; i += 3) pc.px(pts[i].x, pts[i].y, P.haz ?? '#f5c542');
  for (let i = 0; i < rachelIdx; i += 3) pc.px(pts[i].x, pts[i].y, '#f5c542');
  // atlas grid
  for (let x = 0; x < W; x += 80) for (let y = 0; y < H; y += 2) pc.px(x, y, '#ffffff22');
  for (let y = 0; y < H; y += 80) for (let x = 0; x < W; x += 2) pc.px(x, y, '#ffffff22');
  // compass rose (bottom right)
  const cx = 600, cy = 314;
  pc.circle(cx, cy, 15, '#2a1e3060'); pc.circle(cx, cy, 13, '#f2e6c8'); pc.circle(cx, cy, 12, '#e2d2b4');
  pc.poly([[cx, cy - 14], [cx + 3, cy], [cx, cy + 14], [cx - 3, cy]], '#7a3a3a');
  pc.poly([[cx - 14, cy], [cx, cy - 3], [cx + 14, cy], [cx, cy + 3]], '#5a4a40');
  pc.poly([[cx, cy - 14], [cx + 3, cy], [cx - 3, cy]], '#c8423a');
  pc.circle(cx, cy, 2, '#f2e6c8');
  pc.map(['#..#', '##.#', '#.##', '#..#'], { '#': '#2a1e30' }, cx - 1, cy - 22);   // N
  // paper frame
  for (let x = 0; x < W; x++) for (let k = 0; k < 6; k++) { pc.px(x, k, k < 2 ? '#1a1228' : '#e8dcc0'); pc.px(x, H - 1 - k, k < 2 ? '#1a1228' : '#e8dcc0'); }
  for (let y = 0; y < H; y++) for (let k = 0; k < 6; k++) { pc.px(k, y, k < 2 ? '#1a1228' : '#e8dcc0'); pc.px(W - 1 - k, y, k < 2 ? '#1a1228' : '#e8dcc0'); }
  for (let x = 6; x < W - 6; x++) { pc.px(x, 6, '#8a6a4a'); pc.px(x, H - 7, '#8a6a4a'); }
  for (let y = 6; y < H - 6; y++) { pc.px(6, y, '#8a6a4a'); pc.px(W - 7, y, '#8a6a4a'); }
  for (let x = 6; x < W - 6; x += 10) { pc.rect(x, 2, 5, 2, '#8a6a4a'); pc.rect(x + 5, H - 4, 5, 2, '#8a6a4a'); }
  return addPixelTexture(scene, 'worldmap', pc);
}

export function makeMapIcons(scene) {
  // top-down van (16x10), facing right
  let pc = new PixelCanvas(16, 10);
  pc.rect(1, 1, 14, 8, P.van1); pc.rect(2, 2, 10, 6, P.vanTop0);
  pc.rect(12, 2, 3, 6, P.glass1); pc.px(14, 2, P.glass0);
  pc.hline(2, 11, 1, P.van0); pc.hline(2, 11, 8, P.van2);
  pc.px(5, 4, P.btc); pc.px(6, 5, P.btc);
  pc.rect(3, 0, 2, 1, P.tire); pc.rect(11, 0, 2, 1, P.tire); pc.rect(3, 9, 2, 1, P.tire); pc.rect(11, 9, 2, 1, P.tire);
  pc.outline(P.outline);
  addPixelTexture(scene, 'van_top', pc);
  // location pin ring (17x17)
  pc = new PixelCanvas(17, 17);
  pc.circle(8, 8, 7, P.ink); pc.circle(8, 8, 6, P.white); pc.circle(8, 8, 5, '#ffffff00');
  for (let y = 0; y < 17; y++) for (let x = 0; x < 17; x++) { const d = Math.hypot(x - 8, y - 8); if (d < 5) pc.clearPx(x, y); }
  addPixelTexture(scene, 'pin_ring', pc);
  pc = new PixelCanvas(11, 11);
  pc.circle(5, 5, 5, P.white);
  addPixelTexture(scene, 'pin_dot', pc);
  pc = new PixelCanvas(9, 10);
  pc.map(['..###..', '.#...#.', '.#...#.', '#######', '###.###', '###.###', '#######'], { '#': P.white }, 1, 1);
  pc.outline(P.ink);
  addPixelTexture(scene, 'icon_lock', pc);
}
