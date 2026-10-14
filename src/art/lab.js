// ============================================================================
//  UNDERGROUND LAB ART — Chapter 5. Auto-tiling steel tileset, layered
//  parallax backdrops, specimen tanks, server racks, Ben's rig, pickups,
//  projectiles and explosions.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, buildSheet, addPixelTexture, rng, dither } from './pixel.js';

export const L = {
  // authored bright: the lighting system supplies the darkness
  s0: '#eef3fb', s1: '#b9c5dd', s2: '#8a97ba', s3: '#626e97', s4: '#465076', s5: '#2e3456', s6: '#1d2140',
  haz: '#f5c542', haz2: '#b88a1e', teal: '#1b3b4a', teal2: '#2a5a66',
  tank0: '#b6ffcf', tank1: '#5dff9a', tank2: '#22a868', tank3: '#0f5a3e', tank4: '#08301f',
};
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
//  Tileset: 16 auto-tile variants (bitmask of exposed sides: 1=up 2=right
//  4=down 8=left) + 16..19 extras (catwalk, catwalk end, vent, pipes).
// ---------------------------------------------------------------------------
export const TILE = { CATWALK: 16, CATWALK_END: 17, VENT: 18, PIPES: 19, HAZARD: 20 };

function drawPanel(pc, ox, mask, variant, r) {
  const up = mask & 1, right = mask & 2, down = mask & 4, left = mask & 8;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    // dark brushed steel with panel seams every 8px
    let c = (x + y * 3) % 7 === 0 ? L.s4 : L.s3;
    if (dither(x, y, 0.15)) c = L.s4;
    if (x === 0 || y === 8) c = L.s4;
    if (x === 15 || y === 7) c = L.s2;
    pc.px(ox + x, y, c);
  }
  // rivets at panel corners
  for (const [x, y] of [[2, 2], [13, 2], [2, 10], [13, 10]]) { pc.px(ox + x, y, L.s1); pc.px(ox + x + 1, y + 1, L.s5); }
  if (variant === 'vent') {
    for (let y = 3; y < 13; y += 2) { pc.hline(ox + 3, ox + 12, y, L.s5); pc.hline(ox + 3, ox + 12, y + 1, L.s2); }
  }
  if (variant === 'pipes') {
    for (const py of [4, 10]) { pc.hline(ox, ox + 15, py, L.s2); pc.hline(ox, ox + 15, py + 1, L.s1); pc.hline(ox, ox + 15, py + 2, L.s4); }
    pc.rect(ox + 6, 3, 2, 10, L.s4);
  }
  if (up) {
    // lit steel lip + hazard stripes on top surfaces
    pc.hline(ox, ox + 15, 0, L.s0);
    pc.hline(ox, ox + 15, 1, L.s1);
    for (let x = 0; x < 16; x++) pc.px(ox + x, 2, ((x + (r() < 0.5 ? 0 : 0)) % 6) < 3 ? L.haz : P.ink);
    pc.hline(ox, ox + 15, 3, L.s5);
  }
  if (down) { pc.hline(ox, ox + 15, 15, L.s6); pc.hline(ox, ox + 15, 14, L.s5); }
  if (left) { pc.vline(ox, up ? 1 : 0, 15, L.s1); pc.vline(ox + 1, up ? 4 : 0, 15, L.s4); }
  if (right) { pc.vline(ox + 15, up ? 1 : 0, 15, L.s5); }
  if (up && left) pc.px(ox, 0, L.s1);
}

function drawCatwalk(pc, ox, end) {
  // grated walkway: top rail + see-through grating + truss underneath
  pc.hline(ox, ox + 15, 0, L.s0);
  pc.hline(ox, ox + 15, 1, L.s1);
  pc.hline(ox, ox + 15, 2, L.s3);
  for (let x = 0; x < 16; x += 2) pc.px(ox + x, 3, L.s2);
  pc.hline(ox, ox + 15, 4, L.s4);
  for (let x = 0; x < 16; x++) pc.px(ox + x, 5 + ((x % 8) < 4 ? (x % 4) : 3 - (x % 4)), L.s4); // truss zigzag
  if (end) { pc.vline(ox + 15, 0, 9, L.s2); pc.vline(ox, 0, 9, L.s2); }
}

export function makeLabTiles(scene) {
  const n = 21;
  const pc = new PixelCanvas(16 * n, 16);
  const r = rng(5);
  for (let m = 0; m < 16; m++) drawPanel(pc, m * 16, m, null, r);
  drawCatwalk(pc, 16 * TILE.CATWALK, false);
  drawCatwalk(pc, 16 * TILE.CATWALK_END, true);
  drawPanel(pc, 16 * TILE.VENT, 0, 'vent', r);
  drawPanel(pc, 16 * TILE.PIPES, 0, 'pipes', r);
  // hazard block: full yellow/black diagonal stripes (electrified floor marker)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) pc.px(16 * TILE.HAZARD + x, y, ((x + y) % 8) < 4 ? L.haz : P.ink);
  return addPixelTexture(scene, 'labtiles', pc);
}

// ---------------------------------------------------------------------------
//  Far backdrop: a vast teal-lit cavern full of machinery silhouettes,
//  with a colossal ring structure. Makes a base + an emissive glow layer.
// ---------------------------------------------------------------------------
export const FAR_W = 1024, MID_W = 1280;

export function makeLabFar(scene) {
  const w = FAR_W, h = 360;
  const pc = new PixelCanvas(w, h);
  const glow = new PixelCanvas(w, h);
  const r = rng(91);
  const sky = ['#0b1226', '#0f1a34', '#132642', '#17344e', '#1c4458', '#235466'];
  for (let y = 0; y < h; y++) {
    const t = Math.min(0.999, (y / h) * (sky.length - 1));
    const i = Math.floor(t);
    for (let x = 0; x < w; x++) pc.px(x, y, dither(x, y, t - i) ? sky[i + 1] : sky[i]);
  }
  const sil = '#0a1022', sil2 = '#122038', rim = '#2f6f80';
  // light shafts falling from openings far above (emissive)
  for (const [sx, sw] of [[90, 18], [380, 10], [700, 24], [930, 12]]) {
    for (let y = 0; y < h; y++) {
      const span = sw + y * 0.12;
      for (let x = 0; x < span; x++) {
        const a = (1 - y / h) * (1 - Math.abs(x / span - 0.5) * 2);
        if (dither(sx + x, y, a * 0.5)) glow.px(sx + x - y * 0.06, y, '#1d5a6a');
      }
    }
  }
  // colossal ring (a gate? a reactor?) — dark body, glowing inner rim
  const cx = 560, cy = 165;
  for (let a = 0; a < Math.PI * 2; a += 0.0025) {
    for (let rr = 76; rr < 96; rr++) {
      const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr);
      let c = sil;
      if (rr > 93) c = rim;
      else if ((Math.floor(a * 24) % 2) === 0 && rr > 84 && rr < 88) c = sil2;
      pc.px(x, y, c);
      if (rr === 76 || rr === 77) glow.px(x, y, rr === 76 ? '#7ff8ff' : '#2aa6c0');
    }
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * 86), y = Math.round(cy + Math.sin(a) * 86);
    pc.rect(x - 3, y - 3, 7, 7, sil2);
    glow.px(x, y, k % 3 ? '#3cf2ff' : '#f7931a');
  }
  // inner haze of the ring
  for (let y = -74; y < 74; y++) for (let x = -74; x < 74; x++) {
    const d = Math.hypot(x, y) / 74;
    if (d < 1 && dither(cx + x, cy + y, (1 - d) * 0.22)) glow.px(cx + x, cy + y, '#123e4c');
  }
  // gantry columns & truss bridges
  for (let i = 0; i < 7; i++) {
    const x = Math.round((i + 0.15) * (w / 7) + r() * 40);
    if (Math.abs(x - cx) < 110) continue;
    const cw = 12 + Math.floor(r() * 16);
    pc.rect(x, 0, cw, h, sil);
    pc.vline(x + cw - 1, 0, h, rim);
    for (let y = 30 + Math.floor(r() * 30); y < h; y += 46 + Math.floor(r() * 30)) {
      pc.rect(x - 4, y, cw + 8, 4, sil);
      glow.px(x + 2, y + 1, i % 2 ? '#3cf2ff' : '#ffb347');
      glow.px(x + cw - 3, y + 1, '#ff5060');
    }
  }
  for (const by of [70, 250]) {
    pc.rect(0, by, w, 3, sil); pc.rect(0, by + 12, w, 2, sil);
    for (let x = 0; x < w; x += 12) { pc.line(x, by + 3, x + 12, by + 12, sil); pc.line(x + 12, by + 3, x, by + 12, sil); }
    pc.hline(0, w - 1, by, rim);
    for (let x = 6; x < w; x += 48) glow.px(x, by + 13, '#ffb347');
  }
  // hanging cables
  for (let i = 0; i < 10; i++) {
    const x0 = Math.floor(r() * w), span = 60 + r() * 80, sag = 20 + r() * 30, y0 = 74;
    for (let x = 0; x < span; x++) pc.px((x0 + x) % w, y0 + Math.sin((x / span) * Math.PI) * sag, sil);
  }
  // distant windows & pinprick lights
  for (let i = 0; i < 160; i++) {
    const c = r() < 0.55 ? '#3cf2ff' : r() < 0.5 ? '#ffb347' : '#5dff9a';
    const x = Math.floor(r() * w), y = Math.floor(r() * h * 0.9);
    glow.px(x, y, r() < 0.7 ? mix(c, '#000000', 0.5) : c);
  }
  // fog bank at the bottom (lit teal)
  for (let y = h - 110; y < h; y++) for (let x = 0; x < w; x++) if (dither(x, y, ((y - (h - 110)) / 110) * 0.8)) pc.px(x, y, '#2a6070');
  addPixelTexture(scene, 'lab_far_glow', glow);
  return addPixelTexture(scene, 'lab_far', pc);
}

// ---------------------------------------------------------------------------
//  Mid backdrop: lab walls with varied windows. Base + emissive glow layer.
// ---------------------------------------------------------------------------
export function makeLabMid(scene) {
  const w = MID_W, h = 360;
  const pc = new PixelCanvas(w, h);
  const glow = new PixelCanvas(w, h);
  const wallA = '#3a4370', wallB = '#333b64', seam = '#252b4c', hi = '#56628f', lo = '#2a3155';
  const panel = (y0, y1) => {
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
      let c = (Math.floor(x / 64) + Math.floor(y / 48)) % 2 ? wallA : wallB;
      if (x % 64 === 0 || y % 48 === 0) c = seam;
      else if (x % 64 === 1 || y % 48 === 1) c = hi;
      else if (x % 64 === 63) c = lo;
      if ((x * 13 + y * 7) % 97 === 0) c = hi;   // scuffs
      pc.px(x, y, c);
    }
  };
  panel(0, 60);
  panel(150, h);
  // trims
  pc.rect(0, 56, w, 6, '#4a5584'); pc.hline(0, w - 1, 56, '#7a88b8'); pc.hline(0, w - 1, 61, seam);
  pc.rect(0, 150, w, 8, '#4a5584'); pc.hline(0, w - 1, 150, '#7a88b8'); pc.hline(0, w - 1, 157, seam);
  for (let x = 0; x < w; x += 4) pc.px(x, 153, (x % 8) < 4 ? '#f5c542' : '#1a1a1a');
  // ducts across the cavern gap
  for (const [y, t] of [[88, 7], [118, 4]]) {
    pc.rect(0, y, w, t, '#2c3358'); pc.hline(0, w - 1, y, '#5a6698'); pc.hline(0, w - 1, y + t - 1, '#1b2040');
    for (let x = 30; x < w; x += 90) { pc.rect(x, y - 2, 5, t + 4, '#3a4372'); pc.vline(x + 4, y - 2, y + t + 1, '#1b2040'); }
  }
  // --- windows: different rooms behind the glass
  const kinds = ['tanks', 'servers', 'dark', 'office', 'tanks', 'alien'];
  const rooms = {
    tanks: ['#0f3a2c', '#1f8a5a'], servers: ['#0c2236', '#3cf2ff'], dark: ['#111428', '#2a3050'],
    office: ['#3a2416', '#ffb347'], alien: ['#24103a', '#c070ff'],
  };
  kinds.forEach((kind, i) => {
    const wx = 40 + i * 210, wy = 190, ww = 120, wh = 62;
    const room = rooms[kind];
    for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
      const t = y / wh;
      pc.px(wx + x, wy + y, dither(x, y, t * 0.6) ? mix(room[0], '#000000', 0.3) : room[0]);
      if (kind !== 'dark' && dither(x, y, 0.5 - t * 0.4)) glow.px(wx + x, wy + y, mix(room[1], '#000000', 0.72));
    }
    if (kind === 'tanks') {
      for (let k = 0; k < 4; k++) {
        const tx = wx + 10 + k * 28;
        pc.rect(tx - 1, wy + 8, 16, 3, '#0b2a20'); pc.rect(tx - 1, wy + 50, 16, 4, '#0b2a20');
        glow.rect(tx + 1, wy + 11, 12, 39, '#1f9a5e');
        glow.ellipse(tx + 7, wy + 20, 3, 3, '#0d3b28'); glow.rect(tx + 6, wy + 23, 3, 14, '#0d3b28');
        glow.px(tx + 3, wy + 30, '#b6ffcf'); glow.px(tx + 10, wy + 40, '#b6ffcf');
      }
    } else if (kind === 'servers') {
      for (let k = 0; k < 5; k++) {
        const rx = wx + 8 + k * 22;
        pc.rect(rx, wy + 10, 16, 50, '#0a1626');
        for (let u = 0; u < 9; u++) for (let l = 0; l < 4; l++) if ((u * 3 + l + k) % 3) glow.px(rx + 3 + l * 3, wy + 13 + u * 5, (u + l) % 4 ? '#3cf2ff' : '#f7931a');
      }
    } else if (kind === 'office') {
      pc.rect(wx + 10, wy + 40, 60, 4, '#2a1a10'); pc.rect(wx + 14, wy + 44, 3, 16, '#2a1a10');
      pc.rect(wx + 24, wy + 26, 20, 14, '#1a1410'); glow.rect(wx + 26, wy + 28, 16, 10, '#7ff8ff');
      pc.rect(wx + 84, wy + 18, 22, 42, '#2a1a10');
      for (let d = 0; d < 3; d++) pc.hline(wx + 86, wx + 103, wy + 30 + d * 10, '#4a3020');
      for (let y = 0; y < 26; y++) for (let x = -30; x < 30; x++) {
        const d = Math.hypot(x / 30, y / 26);
        if (d < 1 && dither(wx + 60 + x, wy + y, (1 - d) * 0.45)) glow.px(wx + 60 + x, wy + y, '#6a4a20');
      }
      glow.rect(wx + 56, wy, 8, 2, '#ffd9a0');
      // a corkboard of conspiracy-grade evidence
      pc.rect(wx + 50, wy + 12, 26, 18, '#6a4a2a');
      for (const [px, py] of [[54, 15], [62, 18], [70, 14], [57, 24], [68, 25]]) pc.rect(wx + px, wy + py, 4, 3, '#f2e6c8');
      pc.line(wx + 56, wy + 16, wx + 70, wy + 26, '#c8423a'); pc.line(wx + 64, wy + 19, wx + 58, wy + 25, '#c8423a');
    } else if (kind === 'alien') {
      // a Grey silhouette pressed against the glass. Watching.
      for (let y = -30; y < 30; y++) for (let x = -50; x < 50; x++) {
        const d = Math.hypot(x / 50, y / 30);
        if (d < 1 && dither(wx + 60 + x, wy + 30 + y, (1 - d) * 0.5)) glow.px(wx + 60 + x, wy + 30 + y, '#3a1660');
      }
      pc.ellipse(wx + 60, wy + 26, 10, 9, '#0a0612'); pc.rect(wx + 57, wy + 34, 6, 28, '#0a0612');
      pc.line(wx + 57, wy + 38, wx + 40, wy + 20, '#0a0612'); pc.line(wx + 63, wy + 38, wx + 80, wy + 20, '#0a0612');
      for (const hx of [38, 81]) pc.rect(wx + hx, wy + 16, 3, 5, '#0a0612');
      glow.poly([[wx + 52, wy + 24], [wx + 57, wy + 26], [wx + 57, wy + 29], [wx + 53, wy + 28]], '#5dff9a');
      glow.poly([[wx + 68, wy + 24], [wx + 63, wy + 26], [wx + 63, wy + 29], [wx + 67, wy + 28]], '#5dff9a');
    } else {
      for (let k = 0; k < 30; k++) pc.px(wx + 8 + k, wy + 6 + k, '#3a4270');
    }
    // frame, sill, label plate, glare
    pc.rect(wx - 4, wy - 4, ww + 8, 4, '#56628f'); pc.rect(wx - 4, wy + wh, ww + 8, 5, '#56628f'); pc.hline(wx - 4, wx + ww + 3, wy + wh + 4, seam);
    pc.rect(wx - 4, wy, 4, wh, '#4a5584'); pc.rect(wx + ww, wy, 4, wh, '#2e3660');
    for (let k = 0; k < 22; k++) glow.px(wx + 4 + k, wy + 2 + k, '#2a3a50');
    pc.rect(wx + 40, wy + wh + 12, 40, 8, '#c8a030');
    for (let x = 0; x < 40; x += 5) pc.rect(wx + 40 + x, wy + wh + 12, 2, 8, '#1a1a1a');
    // little wall lamp above each window, with a soft pool of light
    pc.rect(wx + 56, wy - 14, 8, 4, '#626e97'); glow.rect(wx + 57, wy - 11, 6, 1, '#fff0c8');
    for (let y = 0; y < 30; y++) for (let x = -12 - y / 2; x < 12 + y / 2; x++) {
      if (dither(wx + 60 + x, wy - 10 + y, (1 - y / 30) * 0.25)) glow.px(wx + 60 + x, wy - 10 + y, '#5a4a30');
    }
  });
  // vertical pipes between windows
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 210 + 150;
    pc.rect(x, 150, 8, 210, '#4a5584'); pc.vline(x, 150, 359, '#7a88b8'); pc.vline(x + 7, 150, 359, '#252b4c');
    for (let y = 170; y < h; y += 40) pc.rect(x - 2, y, 12, 4, '#56628f');
    if (i % 2) glow.px(x + 3, 280, '#ff5060');
  }
  // big stencils
  const big = { S: ['####', '#...', '####', '...#', '####'], 4: ['#..#', '#..#', '####', '...#', '...#'], '-': ['....', '....', '####', '....', '....'] };
  for (const sx of [180, 820]) {
    let x = sx;
    for (const ch of ['S', '-', '4']) {
      for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 4; xx++) if (big[ch][yy][xx] === '#') pc.rect(x + xx * 3, 290 + yy * 3, 3, 3, '#5a6596');
      x += 15;
    }
  }
  addPixelTexture(scene, 'lab_mid_glow', glow);
  return addPixelTexture(scene, 'lab_mid', pc);
}

// ---------------------------------------------------------------------------
//  Props
// ---------------------------------------------------------------------------
export function makeLabProps(scene) {
  // --- specimen tank (32x64): steel caps, green liquid, a Grey floating inside
  let pc = new PixelCanvas(32, 64);
  pc.rect(2, 0, 28, 7, L.s3); pc.hline(2, 29, 0, L.s1); pc.rect(4, 7, 24, 2, L.s4);
  pc.rect(2, 56, 28, 8, L.s3); pc.hline(2, 29, 56, L.s1); pc.rect(4, 54, 24, 2, L.s4);
  for (let y = 9; y < 54; y++) for (let x = 4; x < 28; x++) {
    const t = (y - 9) / 45;
    let c = t < 0.15 ? L.tank1 : t < 0.6 ? L.tank2 : L.tank3;
    if (dither(x, y, (t * 3) % 1)) c = t < 0.15 ? L.tank2 : L.tank3;
    if (x < 7) c = mix(c, '#ffffff', 0.25);
    if (x > 24) c = mix(c, '#000000', 0.3);
    pc.px(x, y, c);
  }
  // floating figure
  pc.ellipse(16, 22, 5, 5, '#3e7a5c'); pc.ellipse(15, 21, 4, 3, '#5a9a78');
  pc.poly([[11, 21], [14, 22], [14, 24], [12, 23]], L.tank4); pc.poly([[21, 21], [18, 22], [18, 24], [20, 23]], L.tank4);
  pc.rect(14, 27, 4, 14, '#3e7a5c'); pc.line(14, 29, 9, 38, '#3e7a5c'); pc.line(17, 29, 22, 38, '#3e7a5c');
  pc.line(15, 41, 13, 52, '#3e7a5c'); pc.line(17, 41, 19, 52, '#3e7a5c');
  pc.vline(16, 9, 18, L.s2);                          // feeding tube
  for (const y of [14, 30, 44]) pc.px(6, y, L.tank0);
  pc.outline(P.outline);
  addPixelTexture(scene, 'tank', pc);

  // --- server rack (24x48), 2 frames of blinking LEDs
  buildSheet(scene, 'rack', 24, 48, [0, 1].map((f) => (p) => {
    p.rect(0, 0, 24, 48, L.s4); p.rect(1, 1, 22, 46, L.s5);
    for (let u = 0; u < 9; u++) {
      const y = 3 + u * 5;
      p.rect(2, y, 20, 4, L.s3); p.hline(2, 21, y, L.s2);
      for (let k = 0; k < 4; k++) p.px(4 + k * 2, y + 2, ((u * 3 + k + f * 2) % 5) < 2 ? (k % 2 ? P.green1 : P.cyan1) : L.s5);
      p.px(19, y + 2, (u + f) % 3 === 0 ? P.btc : L.s5);
    }
  }), { outline: P.outline });
  if (!scene.anims.exists('rack_blink')) scene.anims.create({ key: 'rack_blink', frames: scene.anims.generateFrameNumbers('rack', { start: 0, end: 1 }), frameRate: 3, repeat: -1 });

  // --- terminal / checkpoint (24x28): frame 0 idle red, frame 1 active green
  buildSheet(scene, 'terminal', 24, 28, [0, 1].map((f) => (p) => {
    p.rect(4, 18, 16, 10, L.s3); p.hline(4, 19, 18, L.s1);
    p.rect(9, 14, 6, 4, L.s4);
    p.rect(1, 0, 22, 15, L.s2); p.rect(3, 2, 18, 11, f ? '#0a3a24' : '#3a0a14');
    for (let y = 3; y < 12; y += 2) p.hline(4, 4 + ((y * 7 + f * 5) % 12), y, f ? P.green2 : P.red);
    p.hline(1, 22, 0, L.s1);
    p.px(18, 22, f ? P.green1 : P.red);
  }), { outline: P.outline });

  // --- crate (24x20) & hazard barrel (14x20)
  pc = new PixelCanvas(24, 20);
  pc.rect(0, 0, 24, 20, '#4a4a2e'); pc.rect(1, 1, 22, 18, '#5e5e38');
  pc.line(1, 1, 22, 18, '#4a4a2e', 2); pc.hline(0, 23, 0, '#7a7a4a');
  pc.map(['###.###', '#...#.#', '###.#.#', '..#.#.#', '###.###'], { '#': '#c8c890' }, 8, 7); // "51"
  pc.outline(P.outline);
  addPixelTexture(scene, 'crate', pc);
  pc = new PixelCanvas(14, 20);
  pc.rect(0, 1, 14, 18, L.haz2); pc.rect(1, 1, 4, 18, L.haz);
  pc.hline(0, 13, 4, P.ink); pc.hline(0, 13, 15, P.ink); pc.ellipse(7, 1, 6, 1, L.haz);
  pc.circle(7, 10, 3, P.ink); pc.px(7, 10, P.green2); pc.px(6, 9, P.green2); pc.px(8, 9, P.green2); pc.px(7, 12, P.green2);
  pc.outline(P.outline);
  addPixelTexture(scene, 'barrel', pc);

  // --- ceiling lamp fixture (18x8)
  pc = new PixelCanvas(18, 8);
  pc.vline(9, 0, 2, L.s2); pc.rect(2, 3, 14, 3, L.s3); pc.hline(2, 15, 3, L.s1); pc.hline(3, 14, 6, '#fff3c8');
  pc.outline(P.outline);
  addPixelTexture(scene, 'lamp', pc);

  // --- elevator platform (48x12)
  pc = new PixelCanvas(48, 12);
  pc.rect(0, 0, 48, 8, L.s3); pc.hline(0, 47, 0, L.s0); pc.hline(0, 47, 1, L.s1);
  for (let x = 0; x < 48; x++) pc.px(x, 3, (x % 6) < 3 ? L.haz : P.ink);
  pc.rect(4, 8, 4, 4, L.s4); pc.rect(40, 8, 4, 4, L.s4); pc.hline(0, 47, 7, L.s5);
  pc.outline(P.outline);
  addPixelTexture(scene, 'elevator', pc);

  // --- laser emitter (12x8)
  pc = new PixelCanvas(12, 8);
  pc.rect(1, 0, 10, 6, L.s3); pc.hline(1, 10, 0, L.s1); pc.rect(4, 6, 4, 2, P.red2); pc.px(5, 7, P.red); pc.px(6, 7, P.red);
  pc.outline(P.outline);
  addPixelTexture(scene, 'emitter', pc);

  // --- blast door (24x48), 2 frames: closed / open
  buildSheet(scene, 'door', 24, 48, [0, 1].map((f) => (p) => {
    p.rect(0, 0, 24, 48, L.s4); p.rect(2, 2, 20, 46, f ? '#05060c' : L.s3);
    if (!f) {
      for (let y = 2; y < 48; y++) p.px(12, y, L.s5);
      for (let y = 6; y < 46; y += 8) for (let x = 3; x < 22; x++) p.px(x, y, ((x + y) % 6) < 3 ? L.haz : P.ink);
      p.px(18, 24, P.red);
    } else p.px(18, 24, P.green1);
    p.hline(0, 23, 0, L.s1);
  }), { outline: P.outline });

  // --- Ben's mining rig (44x34): open frame, GPUs with spinning fans, ₿ sticker
  buildSheet(scene, 'rig', 44, 34, [0, 1, 2].map((f) => (p) => {
    p.rect(0, 30, 44, 4, L.s4); p.hline(0, 43, 30, L.s1);
    for (const x of [1, 42]) p.vline(x, 4, 30, L.s1);
    p.hline(1, 42, 4, L.s1);
    for (let g = 0; g < 4; g++) {
      const gx = 4 + g * 9;
      p.rect(gx, 8, 8, 20, L.s3); p.vline(gx, 8, 27, L.s2);
      for (const fy of [13, 22]) {
        p.circle(gx + 4, fy, 3, L.s5);
        const a = (f / 3) * TAU + g;
        p.line(gx + 4, fy, gx + 4 + Math.round(Math.cos(a) * 2), fy + Math.round(Math.sin(a) * 2), L.s1);
        p.line(gx + 4, fy, gx + 4 - Math.round(Math.cos(a) * 2), fy - Math.round(Math.sin(a) * 2), L.s1);
      }
      p.hline(gx, gx + 7, 8, f === g % 3 ? P.btc1 : P.btc);   // RGB strip (orange, naturally)
    }
    p.circle(38, 17, 3, P.btc); p.px(38, 17, P.white); p.px(37, 16, P.white);
    p.rect(2, 2, 40, 2, L.s2);
    p.px(6, 3, P.green1); p.px(9, 3, f ? P.green1 : P.green4);
  }), { outline: P.outline });
  if (!scene.anims.exists('rig_spin')) scene.anims.create({ key: 'rig_spin', frames: scene.anims.generateFrameNumbers('rig', { start: 0, end: 2 }), frameRate: 14, repeat: -1 });

  // --- hot dog health pickup (16x9). Ben's fuel.
  pc = new PixelCanvas(16, 9);
  pc.ellipse(8, 5, 7, 3, '#e8b070'); pc.hline(2, 13, 7, '#b8804a');
  pc.ellipse(8, 4, 6, 1, '#c8483a'); pc.hline(3, 13, 3, '#e86a5a');
  for (let x = 3; x < 13; x += 3) { pc.px(x, 3, P.haz); pc.px(x + 1, 4, P.haz); }
  pc.outline(P.outline);
  addPixelTexture(scene, 'hotdog', pc);

  // --- HUD heart (9x8): frame 0 full, 1 empty
  buildSheet(scene, 'heart', 9, 8, [0, 1].map((f) => (p) => {
    const rows = ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
    p.map(rows, { '#': f ? '#3a2448' : P.red }, 0, 0);
    if (!f) { p.px(1, 1, '#ffb0b8'); p.px(2, 1, '#ffb0b8'); p.px(1, 2, '#ff8090'); }
  }), { outline: P.ink });
}

// ---------------------------------------------------------------------------
//  Projectiles & explosions
// ---------------------------------------------------------------------------
export function makeCombatFX(scene) {
  let pc = new PixelCanvas(12, 5);
  pc.hline(0, 3, 2, '#3cf2ff60'); pc.hline(3, 7, 2, P.cyan2); pc.rect(6, 1, 5, 3, P.cyan1); pc.hline(7, 11, 2, P.cyan0);
  addPixelTexture(scene, 'bolt', pc);
  pc = new PixelCanvas(6, 6);
  pc.circle(3, 3, 2, P.red); pc.px(2, 2, '#ffd0d0'); pc.px(3, 2, P.white);
  addPixelTexture(scene, 'ebullet', pc);
  pc = new PixelCanvas(9, 9);
  pc.circle(4, 4, 4, '#5dff9a80'); pc.circle(4, 4, 3, P.green2); pc.circle(4, 4, 1, P.green0);
  addPixelTexture(scene, 'orb', pc);
  // explosion: 8 frames, 40x40
  buildSheet(scene, 'boom', 40, 40, [0, 1, 2, 3, 4, 5, 6, 7].map((f) => (p) => {
    const r = rng(300 + f);
    const t = f / 7;
    const R = 6 + t * 13;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + r() * 0.5;
      const d = t * 8 * r();
      const cx = 20 + Math.cos(a) * d, cy = 20 + Math.sin(a) * d - t * 4;
      const rr = R * (0.45 + r() * 0.35) * (1 - t * 0.35);
      const outer = t < 0.3 ? P.fire1 : t < 0.6 ? P.fire2 : t < 0.85 ? '#5a4a5a' : '#3a3442';
      p.circle(cx, cy, rr, outer);
      if (t < 0.7) p.circle(cx - 1, cy - 1, rr * 0.6, t < 0.3 ? P.white : P.fire1);
      if (t < 0.4) p.circle(cx - 1, cy - 1, rr * 0.3, P.fire0);
    }
    if (t > 0.75) for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (p.get(x, y) && !dither(x, y, 1 - (t - 0.75) * 3.5)) p.clearPx(x, y);
  }));
  if (!scene.anims.exists('boom')) scene.anims.create({ key: 'boom', frames: scene.anims.generateFrameNumbers('boom', { start: 0, end: 7 }), frameRate: 18, repeat: 0 });
}

