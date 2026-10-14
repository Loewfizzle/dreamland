// ============================================================================
//  FINALE ART — Chapter 6 and the ending.
//  Hover-sled (Ben + Zeus riding), the UFO Enforcer boss, Satoshi's ship,
//  Satoshi himself (side sprite + portrait), the glowing alien collar,
//  the upgraded rig, a Milky Way night sky and the post-credits portal.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, addPixelTexture, buildSheet, rng, dither } from './pixel.js';
import { PORTRAITS } from './portraits.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
//  Night sky with the Milky Way (640 x 360) — base + glow layer
// ---------------------------------------------------------------------------
export function makeNightSky(scene) {
  const W = 640, H = 360;
  const pc = new PixelCanvas(W, H);
  const glow = new PixelCanvas(W, H);
  const r = rng(2140);
  const ramp = ['#05060f', '#080b1e', '#0c1230', '#121a40', '#1a2350', '#2a2a5e', '#3e2e66'];
  for (let y = 0; y < H; y++) {
    const t = Math.min(0.999, Math.pow(y / H, 1.2) * (ramp.length - 1));
    const i = Math.floor(t);
    for (let x = 0; x < W; x++) pc.px(x, y, dither(x, y, t - i) ? ramp[i + 1] : ramp[i]);
  }
  // Milky Way: a diagonal band of dust + dense stars + dark lanes
  const band = (x, y) => {
    const d = (y - (60 + x * 0.32)) / 46;
    return Math.exp(-d * d);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const b = band(x, y);
    const lane = Math.abs((y - (64 + x * 0.32 + Math.sin(x / 40) * 6)) / 7) < 1 ? 0.55 : 1;
    if (dither(x, y, b * 0.55 * lane)) glow.px(x, y, b > 0.75 ? '#3a3468' : '#24224a');
    if (b > 0.5 && dither(x + 3, y + 1, b * 0.18 * lane)) glow.px(x, y, '#5a4a7a');
  }
  for (let i = 0; i < 1400; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H * 0.8);
    const b = band(x, y);
    if (r() > 0.25 + b * 0.75) continue;
    const c = r() < 0.08 ? '#ffd9a8' : r() < 0.12 ? '#a8c8ff' : '#e8e8ff';
    glow.px(x, y, r() < 0.7 ? mix(c, '#000000', 0.55) : c);
  }
  addPixelTexture(scene, 'nightsky_glow', glow);
  return addPixelTexture(scene, 'nightsky', pc);
}

// ---------------------------------------------------------------------------
//  Hover-sled with Ben & Zeus (64 x 40), 2 frames (thruster flicker)
// ---------------------------------------------------------------------------
export function makeSled(scene) {
  buildSheet(scene, 'sled', 64, 40, [0, 1].map((f) => (pc) => {
    // hull: sleek alien tech, silver with cyan trim
    pc.poly([[6, 26], [52, 26], [62, 22], [58, 30], [10, 32]], '#b5c0cc');
    pc.hline(8, 56, 26, '#f0f4f8'); pc.hline(10, 54, 31, '#6b7686');
    pc.hline(14, 50, 28, '#3cf2ff');
    pc.rect(2, 24, 8, 6, '#6b7686');                                   // engine pod
    pc.px(1, 26, f ? '#d6fffb' : '#7ff8ff'); pc.px(1, 27, f ? '#7ff8ff' : '#3cf2ff');
    pc.rect(50, 18, 3, 8, '#8a94a4');                                  // windshield post
    pc.poly([[50, 18], [57, 16], [55, 22]], '#7ff8ff80');
    // Ben (seated, gripping the handlebar, cap)
    pc.rect(30, 14, 9, 11, P.hood1); pc.vline(30, 14, 24, P.hood2);
    pc.map(['##.', '#.#', '##.'], { '#': P.btc }, 34, 17);
    pc.rect(31, 6, 8, 8, P.skin1); pc.rect(33, 11, 6, 3, P.beard);
    pc.px(37, 9, P.ink);
    pc.rect(30, 3, 9, 4, P.capR); pc.hline(36, 42, 6, P.capR2); pc.hline(37, 42, 7, P.foil1);
    pc.line(38, 18, 49, 20, P.hood1, 2); pc.rect(48, 19, 2, 2, P.skin1);           // arm to handlebar
    pc.rect(36, 23, 8, 3, P.khaki1);                                                // leg
    // Zeus in front of Ben, head into the wind, ears streaming
    pc.ellipse(20, 20, 7, 4, P.gold2); pc.hline(14, 26, 17, P.gold1);
    pc.ellipse(26, 14, 3, 3, P.gold2); pc.rect(28, 13, 3, 2, P.gold1); pc.px(31, 13, P.nose);
    pc.px(27, 12, P.ink);
    const e = f ? -1 : 0;
    pc.line(24, 12, 19, 10 + e, P.gold3, 2);
    pc.px(29, 16, P.tongue); pc.px(29, 17 + f, P.tongue);
    pc.line(13, 19, 8, 15 - f, P.gold1, 2);                          // tail
    pc.hline(23, 26, 17, P.collar);
  }), { outline: P.outline });
  if (!scene.anims.exists('sled_fly')) scene.anims.create({ key: 'sled_fly', frames: scene.anims.generateFrameNumbers('sled', { start: 0, end: 1 }), frameRate: 12, repeat: -1 });
}

// ---------------------------------------------------------------------------
//  THE ENFORCER — boss UFO (220 x 120), 3 frames: normal, hurt, enraged
// ---------------------------------------------------------------------------
export function makeBoss(scene) {
  buildSheet(scene, 'boss', 220, 120, [0, 1, 2].map((f) => (pc) => {
    const cx = 110;
    const metal = f === 2 ? ['#d8a0a0', '#a86a6a', '#6a3a3a', '#3a1e22'] : ['#d8e0ea', '#a3aebc', '#6b7686', '#3a4050'];
    // dome with the Grey enforcer inside
    for (let y = -34; y <= 0; y++) for (let x = -34; x <= 34; x++) {
      if ((x * x) / 1156 + (y * y) / 1156 > 1) continue;
      let c = f === 2 ? '#c03050' : '#2bd16b';
      if (y < -20 && x < -6) c = f === 2 ? '#ff7a8a' : '#9dff8a';
      pc.px(cx + x, 46 + y, c);
    }
    // enforcer silhouette (big head, scowl)
    pc.ellipse(cx, 30, 11, 10, '#0e2a1a'); pc.rect(cx - 4, 39, 8, 8, '#0e2a1a');
    pc.poly([[cx - 9, 27], [cx - 2, 30], [cx - 2, 34], [cx - 8, 32]], f === 1 ? '#ffffff' : '#000000');
    pc.poly([[cx + 9, 27], [cx + 2, 30], [cx + 2, 34], [cx + 8, 32]], f === 1 ? '#ffffff' : '#000000');
    pc.line(cx - 9, 24, cx - 2, 28, '#000000'); pc.line(cx + 9, 24, cx + 2, 28, '#000000');      // angry brows
    // main disc
    for (let y = -16; y <= 16; y++) for (let x = -108; x <= 108; x++) {
      if ((x * x) / (108 * 108) + (y * y) / 256 > 1) continue;
      let c = y < -6 ? metal[0] : y < 2 ? metal[1] : y < 10 ? metal[2] : metal[3];
      if (y === -6 && Math.abs(x) < 90) c = '#ffffff';
      if ((x + 200) % 24 < 2 && y > -6) c = metal[3];
      pc.px(cx + x, 62 + y, c);
    }
    // armour plating & battle damage
    const r = rng(9 + f);
    for (let i = 0; i < (f === 2 ? 26 : 8); i++) { const x = cx - 90 + r() * 180, y = 58 + r() * 12; pc.px(x, y, '#2a2a30'); pc.px(x + 1, y, metal[3]); }
    // rim lights (red when enraged)
    for (let i = 0; i < 13; i++) {
      const x = cx - 96 + i * 16;
      pc.circle(x, 64, 2, f === 2 ? '#ff3b4f' : (i % 2 ? '#5dff9a' : '#f5c542'));
      pc.px(x - 1, 63, '#ffffff');
    }
    // underside: twin cannons + the tractor emitter (the weak core)
    pc.ellipse(cx, 80, 46, 10, metal[2]); pc.ellipse(cx, 82, 40, 7, metal[3]);
    for (const dx of [-60, 60]) { pc.rect(cx + dx - 6, 74, 12, 14, metal[2]); pc.rect(cx + dx - 3, 86, 6, 8, '#1a1a22'); pc.px(cx + dx, 92, '#ff3b4f'); }
    pc.circle(cx, 88, 9, '#1a1a22'); pc.circle(cx, 88, 6, f === 2 ? '#ff3b4f' : '#3cf2ff'); pc.circle(cx - 2, 86, 2, '#ffffff');
    // antenna fins
    pc.poly([[cx - 104, 60], [cx - 118, 50], [cx - 96, 56]], metal[1]);
    pc.poly([[cx + 104, 60], [cx + 118, 50], [cx + 96, 56]], metal[1]);
    if (f === 1) for (let y = 0; y < 120; y++) for (let x = 0; x < 220; x++) if (pc.get(x, y) && dither(x, y, 0.4)) pc.px(x, y, '#ffffff80');
  }), { outline: P.outline });
}

// ---------------------------------------------------------------------------
//  Satoshi's ship (150 x 70): sleek gold-and-white teardrop with a ₿ crest
// ---------------------------------------------------------------------------
export function makeSatoshiShip(scene) {
  const pc = new PixelCanvas(150, 70);
  const glow = new PixelCanvas(150, 70);
  for (let y = 0; y < 70; y++) for (let x = 0; x < 150; x++) {
    const dx = (x - 70) / 70, dy = (y - 38) / (16 + Math.max(0, 1 - Math.abs(dx)) * 8);
    if (dx * dx + dy * dy > 1 || x > 146) continue;
    let c = y < 30 ? '#fff6e0' : y < 38 ? '#f2e6c8' : y < 46 ? '#ffc35c' : '#c96d0a';
    if (y === 38 || y === 39) c = '#f7931a';
    pc.px(x, y, c);
  }
  // cockpit
  pc.ellipse(92, 30, 18, 9, '#3cf2ff'); pc.ellipse(88, 27, 8, 4, '#d6fffb');
  pc.ellipse(96, 32, 4, 4, '#1aa6c9');                                    // Satoshi's head inside
  // ₿ crest
  pc.circle(48, 38, 8, '#f7931a'); pc.circle(48, 38, 6, '#ffc35c');
  pc.map(['###.', '#..#', '###.', '#..#', '###.'], { '#': '#fff6e0' }, 46, 35);
  pc.px(47, 34, '#fff6e0'); pc.px(47, 40, '#fff6e0');
  // engines (emissive)
  for (const y of [32, 44]) { pc.rect(0, y - 3, 10, 6, '#6b7686'); glow.ellipse(0, y, 6, 3, '#3cf2ff'); }
  for (let x = 20; x < 130; x += 12) { pc.px(x, 47, '#5dff9a'); glow.px(x, 47, '#5dff9a'); }
  pc.outline(P.outline);
  addPixelTexture(scene, 'sship_glow', glow);
  return addPixelTexture(scene, 'sship', pc);
}

// ---------------------------------------------------------------------------
//  Satoshi (side sprite 20x32) — a gentle Grey in an orange ₿ hoodie
// ---------------------------------------------------------------------------
const SAT = { s0: '#c9e0d8', s1: '#a3c8bc', s2: '#76a090', eye: '#06080d' };
export function makeSatoshi(scene) {
  buildSheet(scene, 'satoshi', 20, 32, [0, 1, 2].map((f) => (pc) => {
    const b = f === 1 ? 1 : 0;
    pc.line(8, 24, 7, 31, SAT.s2); pc.line(11, 24, 12, 31, SAT.s1);
    pc.rect(5, 14 + b, 10, 11, P.btc); pc.vline(5, 14 + b, 24, P.btc2); pc.hline(6, 14, 14 + b, P.btc1);
    pc.map(['##.', '#.#', '##.'], { '#': '#fff6e0' }, 9, 17 + b);
    pc.line(14, 16 + b, f === 2 ? 18 : 16, f === 2 ? 8 : 22, SAT.s1);        // arm (waving on frame 2)
    pc.ellipse(10, 7 + b, 7, 6, SAT.s1); pc.ellipse(9, 6 + b, 6, 4, SAT.s0); pc.ellipse(11, 11 + b, 3, 2, SAT.s1);
    pc.poly([[10, 6 + b], [15, 5 + b], [15, 8 + b], [12, 9 + b]], SAT.eye);
    pc.px(13, 6 + b, '#5dff9a');
    pc.hline(11, 13, 11 + b, SAT.s2);
  }), { outline: P.outline });
  for (const [k, s, e, fr, rep] of [['satoshi_idle', 0, 1, 2, -1], ['satoshi_wave', 1, 2, 4, -1]]) {
    if (!scene.anims.exists(k)) scene.anims.create({ key: k, frames: scene.anims.generateFrameNumbers('satoshi', { start: s, end: e }), frameRate: fr, repeat: rep });
  }
  // portrait (48x48): happy, sad, talk, smile
  const moods = ['talk', 'happy', 'sad', 'wise'];
  PORTRAITS.satoshi = moods;
  buildSheet(scene, 'portrait_satoshi', 48, 48, moods.map((m) => (pc) => {
    pc.ellipse(24, 52, 20, 12, P.btc); pc.ellipse(24, 54, 20, 10, P.btc2);
    pc.poly([[17, 40], [24, 46], [31, 40]], P.btc1);
    pc.map(['##.', '#.#', '##.', '#.#', '##.'], { '#': '#fff6e0' }, 30, 43);
    pc.rect(21, 34, 6, 6, SAT.s2);
    pc.ellipse(24, 20, 16, 15, SAT.s1); pc.ellipse(22, 15, 12, 9, SAT.s0); pc.ellipse(24, 31, 7, 5, SAT.s1);
    // big, soft, rounded eyes with sparkly highlights: kind, not scary
    for (const cx of [17, 31]) {
      pc.ellipse(cx, 20, 6, m === 'sad' ? 4 : 5, SAT.eye);
      if (m === 'happy') { pc.hline(cx - 6, cx + 6, 15, SAT.s0); pc.hline(cx - 5, cx + 5, 16, SAT.s1); }
      pc.circle(cx - 2, 18, 1, '#ffffff'); pc.px(cx + 2, 22, '#5dff9a'); pc.px(cx + 3, 22, '#9dff8a');
      if (m === 'sad') pc.line(cx - 6, 14, cx + 6, 15 + (cx < 24 ? 2 : -2), SAT.s2);
    }
    pc.px(23, 27, SAT.s2); pc.px(25, 27, SAT.s2);
    if (m === 'happy' || m === 'wise') { pc.line(20, 31, 24, 33, SAT.s2); pc.line(24, 33, 28, 31, SAT.s2); }
    else if (m === 'sad') { pc.line(20, 33, 24, 31, SAT.s2); pc.line(24, 31, 28, 33, SAT.s2); }
    else pc.hline(21, 27, 32, SAT.s2);
    if (m === 'sad') { pc.px(13, 26, '#7ff8ff'); pc.px(13, 27, '#7ff8ff'); }
    pc.outline(P.outline);
  }));
}

// ---------------------------------------------------------------------------
//  Small finale props
// ---------------------------------------------------------------------------
export function makeFinaleProps(scene) {
  // energy bolt from the sled (cyan, chunky)
  let pc = new PixelCanvas(14, 6);
  pc.hline(0, 4, 3, '#3cf2ff60'); pc.rect(4, 1, 8, 4, '#7ff8ff'); pc.hline(5, 13, 2, '#ffffff'); pc.hline(5, 12, 3, '#d6fffb');
  addPixelTexture(scene, 'pbolt', pc);
  // boss bullet (magenta orb) & big orb
  // enemy bullets: solid, outlined and bright so they read against the starry sky
  pc = new PixelCanvas(12, 12);
  pc.circle(6, 6, 4, '#ff2a7a'); pc.circle(6, 6, 3, '#ff8ac0'); pc.circle(6, 6, 1, '#ffffff'); pc.px(5, 4, '#ffffff');
  pc.outline('#1a0010');
  addPixelTexture(scene, 'bbullet', pc);
  pc = new PixelCanvas(18, 18);
  pc.circle(9, 9, 7, '#c01040'); pc.circle(9, 9, 5, '#ff5a7a'); pc.circle(8, 8, 2, '#ffffff');
  pc.outline('#1a0010');
  addPixelTexture(scene, 'bbig', pc);
  // glowing alien collar (gift for Zeus)
  pc = new PixelCanvas(24, 14);
  pc.ellipse(12, 6, 10, 4, '#1aa6c9'); pc.ellipse(12, 6, 8, 2, '#00000000');
  for (let y = 0; y < 14; y++) for (let x = 0; x < 24; x++) { const d = ((x - 12) / 9) ** 2 + ((y - 6) / 3) ** 2; if (d < 0.55) pc.clearPx(x, y); }
  pc.circle(12, 10, 3, '#5dff9a'); pc.px(11, 9, '#e4ffd0');
  pc.outline(P.outline);
  addPixelTexture(scene, 'collar_alien', pc);
  // upgraded rig: the old rig with alien crystals (44x34 like the original)
  buildSheet(scene, 'rig2', 44, 34, [0, 1, 2].map((f) => (p) => {
    p.rect(0, 30, 44, 4, '#3a4050'); p.hline(0, 43, 30, '#3cf2ff');
    for (const x of [1, 42]) p.vline(x, 4, 30, '#7ff8ff');
    p.hline(1, 42, 4, '#7ff8ff');
    for (let g = 0; g < 4; g++) {
      const gx = 4 + g * 9;
      p.rect(gx, 8, 8, 20, '#2a3040'); p.vline(gx, 8, 27, '#3cf2ff');
      p.poly([[gx + 4, 10], [gx + 7, 17], [gx + 4, 25], [gx + 1, 17]], (g + f) % 3 === 0 ? '#d6fffb' : '#5dff9a');
    }
    p.circle(38, 17, 3, '#f7931a'); p.px(38, 17, '#fff6e0');
  }), { outline: P.outline });
  if (!scene.anims.exists('rig2_glow')) scene.anims.create({ key: 'rig2_glow', frames: scene.anims.generateFrameNumbers('rig2', { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
  // swirling portal (6 frames, 80x80)
  buildSheet(scene, 'portal', 80, 80, [0, 1, 2, 3, 4, 5].map((f) => (p) => {
    for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) {
      const dx = x - 40, dy = (y - 40) * 1.3, d = Math.hypot(dx, dy);
      if (d > 36) continue;
      const a = Math.atan2(dy, dx) + d * 0.12 - f * 0.5;
      const v = Math.sin(a * 3) * 0.5 + 0.5;
      let c = d > 32 ? '#9dff8a' : v > 0.66 ? '#5dff9a' : v > 0.33 ? '#2bd16b' : '#137a49';
      if (d < 10) c = d < 5 ? '#e4ffd0' : '#9dff8a';
      p.px(x, y, c);
    }
  }));
  if (!scene.anims.exists('portal_spin')) scene.anims.create({ key: 'portal_spin', frames: scene.anims.generateFrameNumbers('portal', { start: 0, end: 5 }), frameRate: 12, repeat: -1 });
}
