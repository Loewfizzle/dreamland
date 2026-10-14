// ============================================================================
//  ENEMY SPRITES — camo soldiers, CIA agents, security drones, Grey aliens.
//  Humanoids share one posable rig (same skeleton as Ben) with different
//  "looks", so every enemy gets proper walk / aim / hurt / knocked-down frames.
// ============================================================================
import { P } from './palette.js';
import { buildSheet } from './pixel.js';

const TAU = Math.PI * 2;
export const HUM_W = 28, HUM_H = 32;

const LOOKS = {
  soldier: {
    pants: [P.sage2, P.sage3], boots: P.ink3, skin: [P.skin1, P.skin2],
    torso: [P.sage2, P.sage3, P.sage1], camo: [P.terra3, P.sage3, P.khaki2],
    head: 'helmet', gun: 'rifle',
  },
  agent: {
    pants: ['#34344c', '#24243a'], boots: P.ink, skin: [P.skin0, P.skin1],
    torso: ['#3a3a56', '#26263c', '#6a6a94'], suit: true, head: 'slick', gun: 'pistol',
  },
};

function leg(pc, hx, hy, fx, fy, near, L) {
  const pants = near ? L.pants[0] : L.pants[1];
  const dx = fx - hx, dy = fy - hy;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const half = 5.2;
  const bend = Math.sqrt(Math.max(0, half * half - (dist / 2) * (dist / 2)));
  const kx = (hx + fx) / 2 + (dy / dist) * bend;
  const ky = (hy + fy) / 2 - (dx / dist) * bend;
  pc.line(hx, hy, kx, ky, pants, 3);
  pc.line(kx, ky, fx, fy - 2, pants, 2);
  pc.rect(Math.round(fx) - 1, Math.round(fy) - 2, 4, 2, L.boots);   // chunky boot
  if (near) pc.px(Math.round(fx) + 1, Math.round(fy) - 2, L.boots === P.ink ? P.ink4 : P.ink4);
}

function arm(pc, sx, sy, hx, hy, near, L, gun) {
  pc.line(sx, sy, hx, hy, near ? L.torso[0] : L.torso[1], 2);
  pc.rect(Math.round(hx), Math.round(hy), 2, 2, near ? L.skin[0] : L.skin[1]);
  if (!gun) return;
  const gx = Math.round(hx) + 1, gy = Math.round(hy) - 1;
  if (gun === 'rifle') {
    pc.rect(gx - 3, gy, 11, 2, P.ink2);
    pc.rect(gx + 8, gy, 3, 1, P.ink3);
    pc.px(gx - 1, gy + 2, P.ink2); pc.px(gx + 2, gy + 2, P.ink2);
    pc.px(gx + 4, gy - 1, P.chrome2);
  } else {
    pc.rect(gx, gy, 5, 2, P.ink2);
    pc.px(gx + 1, gy + 2, P.ink2);
    pc.px(gx + 2, gy - 1, P.chrome2);
  }
}

/** pose: { bob, feet:[[x,y],[x,y]], hands:[[x,y],[x,y]], lean, aim, down, hurt } */
function drawHumanoid(pc, pose, L) {
  if (pose.down) return drawDown(pc, L);
  const b = pose.bob ?? 0, lean = pose.lean ?? 0;
  const ox = 2;                                    // shift rig right inside the wider frame
  const hipY = 21 + b;
  const [ff, nf] = pose.feet, [fh, nh] = pose.hands;
  arm(pc, ox + 11 + lean, 14 + b, ox + fh[0], fh[1], false, L, null);
  leg(pc, ox + 11, hipY, ox + ff[0], ff[1], false, L);
  // torso
  const tx = ox + 8 + lean, ty = 13 + b;
  pc.rect(tx + 1, ty, 6, 8, L.torso[0]);
  pc.rect(tx, ty + 1, 8, 6, L.torso[0]);
  pc.vline(tx, ty + 1, ty + 6, L.torso[1]);
  pc.hline(tx + 2, tx + 6, ty, L.torso[2]);
  if (L.camo) {
    for (const [x, y, c] of [[2, 2, 0], [5, 4, 1], [1, 5, 2], [6, 1, 2], [3, 6, 0]]) {
      pc.px(tx + x, ty + y, L.camo[c]); pc.px(tx + x + 1, ty + y, L.camo[c]);
    }
    pc.hline(tx, tx + 7, ty + 6, P.ink3);          // belt
    pc.px(tx + 5, ty + 6, P.btc1);
  }
  if (L.suit) {
    pc.vline(tx + 6, ty, ty + 5, P.white);          // shirt
    pc.vline(tx + 7, ty, ty + 3, P.white);
    pc.vline(tx + 6, ty + 1, ty + 4, P.red2);       // tie
    pc.px(tx + 5, ty + 1, P.ink4); pc.px(tx + 5, ty + 2, P.ink4); // lapel
    pc.px(tx + 1, ty - 1, P.ink3);
    // earpiece coil
    pc.px(tx + 2, ty - 1, P.chrome1);
  }
  pc.rect(ox + 9, hipY - 1, 6, 3, L.pants[0]);
  leg(pc, ox + 13, hipY, ox + nf[0], nf[1], true, L);
  // head
  const hx = ox + 10 + lean, hy = 5 + b;
  pc.rect(hx + 1, hy, 6, 7, L.skin[0]);
  pc.rect(hx, hy + 1, 8, 5, L.skin[0]);
  pc.px(hx + 8, hy + 4, L.skin[0]);
  pc.px(hx + 2, hy + 3, L.skin[1]);
  pc.hline(hx + 4, hx + 7, hy + 6, L.skin[1]);    // jaw shadow
  if (pose.hurt) { pc.px(hx + 5, hy + 3, P.ink); pc.px(hx + 6, hy + 2, P.ink); pc.px(hx + 6, hy + 4, P.ink); pc.rect(hx + 6, hy + 5, 2, 1, P.ink); }
  if (L.head === 'helmet') {
    pc.rect(hx, hy - 2, 8, 4, L.torso[0]);
    pc.rect(hx + 1, hy - 3, 6, 1, L.torso[2]);
    pc.hline(hx - 1, hx + 8, hy + 1, L.torso[1]);  // brim
    pc.px(hx + 2, hy - 1, L.camo[0]); pc.px(hx + 5, hy - 2, L.camo[1]);
    pc.vline(hx + 3, hy + 2, hy + 6, P.ink3);      // chin strap
    if (!pose.hurt) { pc.px(hx + 6, hy + 3, P.ink); pc.hline(hx + 5, hx + 7, hy + 2, L.skin[1]); }
  } else {
    pc.rect(hx, hy - 1, 8, 3, P.ink);              // slicked-back hair
    pc.vline(hx, hy, hy + 3, P.ink);
    pc.px(hx + 6, hy - 1, P.ink3);
    if (!pose.hurt) {
      pc.rect(hx + 4, hy + 3, 4, 1, P.ink);        // sunglasses
      pc.px(hx + 6, hy + 3, P.ink4);
      pc.px(hx + 3, hy + 3, P.ink);
    }
    pc.hline(hx + 5, hx + 7, hy + 5, L.skin[1]);   // stern mouth
  }
  arm(pc, ox + 13 + lean, 14 + b, ox + nh[0], nh[1], true, L, L.gun);
}

/** Knocked out, lying on the floor. */
function drawDown(pc, L) {
  const y = 28;
  pc.rect(6, y, 8, 3, L.pants[0]);
  pc.rect(2, y + 1, 4, 2, L.boots);
  pc.rect(14, y - 1, 8, 4, L.torso[0]);
  pc.rect(22, y - 1, 5, 4, L.skin[0]);
  if (L.head === 'helmet') pc.rect(22, y - 2, 5, 2, L.torso[0]); else pc.rect(24, y - 1, 3, 4, P.ink);
  pc.px(24, y + 1, P.ink);
}

function humanoidPoses() {
  const p = {};
  p.idle = [0, 1].map((b) => ({ bob: b, feet: [[10, 31], [14, 31]], hands: [[11, 19], [16, 17 + b]] }));
  p.walk = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const foot = (ph) => [12 + 4 * Math.sin(a + ph), 31 - Math.max(0, Math.cos(a + ph)) * 2];
    p.walk.push({ bob: -Math.round(Math.abs(Math.cos(a)) * 0.6), feet: [foot(Math.PI), foot(0)], hands: [[11 + 2 * Math.sin(a), 19], [16, 17]] });
  }
  p.aim = [
    { bob: 0, feet: [[9, 31], [15, 31]], hands: [[13, 16], [18, 15]] },
    { bob: 0, lean: -1, feet: [[9, 31], [15, 31]], hands: [[12, 16], [17, 15]] },
  ];
  p.hurt = [{ bob: 0, lean: -1, feet: [[8, 31], [14, 30]], hands: [[6, 14], [17, 13]], hurt: true }];
  p.down = [{ down: true }];
  return p;
}

// ---------------------------------------------------------------------------
//  Grey alien (24 x 32): tall skinny body, huge head, black almond eyes.
// ---------------------------------------------------------------------------
const GREY = { s0: '#c9d3d8', s1: '#a3b0b8', s2: '#76848f', s3: '#4e5a66', eye: '#06080d', eyeHi: '#5dff9a' };
function drawGrey(pc, pose) {
  const b = pose.bob ?? 0;
  const g = GREY;
  if (pose.down) {
    // sprawled on the floor, head to the right
    pc.hline(2, 9, 30, g.s2); pc.hline(3, 9, 31, g.s1);
    pc.rect(9, 28, 8, 3, g.s1); pc.rect(9, 30, 8, 1, P.cyan4);
    pc.ellipse(19, 27, 4, 4, g.s1); pc.ellipse(19, 26, 3, 3, g.s0);
    pc.hline(18, 21, 26, g.eye);
    return;
  }
  // legs (spindly)
  const [f1, f2] = pose.feet ?? [[10, 31], [14, 31]];
  pc.line(11, 22 + b, f1[0], f1[1], g.s2, 1);
  pc.line(13, 22 + b, f2[0], f2[1], g.s1, 1);
  pc.px(f1[0] + 1, f1[1], g.s2); pc.px(f2[0] + 1, f2[1], g.s1);
  // torso — thin with a lab-escapee jumpsuit collar
  pc.rect(10, 14 + b, 5, 9, g.s1);
  pc.vline(10, 14 + b, 22 + b, g.s2);
  pc.hline(11, 14, 14 + b, g.s0);
  pc.rect(10, 19 + b, 5, 4, P.cyan4);              // tattered containment suit
  pc.hline(10, 14, 19 + b, P.cyan3);
  // arms (long, three-fingered)
  const [h1, h2] = pose.hands ?? [[9, 23], [16, 23]];
  pc.line(10, 15 + b, h1[0], h1[1], g.s2, 1);
  pc.line(14, 15 + b, h2[0], h2[1], g.s1, 1);
  for (const [hx, hy, c] of [[h1[0], h1[1], g.s2], [h2[0], h2[1], g.s1]]) { pc.px(hx - 1, hy + 1, c); pc.px(hx, hy + 1, c); pc.px(hx + 1, hy + 1, c); }
  if (pose.orb) { pc.circle(h2[0] + 1, h2[1] - 3, 2, P.green2); pc.px(h2[0] + 1, h2[1] - 3, P.green0); }
  // neck + huge head
  pc.vline(12, 12 + b, 14 + b, g.s2);
  pc.ellipse(13, 6 + b, 7, 6, g.s1);
  pc.ellipse(12, 5 + b, 6, 4, g.s0);
  pc.ellipse(14, 10 + b, 3, 2, g.s1);              // narrow chin
  pc.px(15, 12 + b, g.s1);
  // eyes
  if (pose.hurt) {
    pc.hline(15, 18, 7 + b, g.eye); pc.hline(8, 11, 7 + b, g.eye);
  } else {
    // big black almond eyes, slanting up toward the temples
    pc.poly([[6.5, 4.5 + b], [10, 5.5 + b], [12, 8.5 + b], [10, 9.5 + b], [7.5, 8 + b]], g.eye);
    pc.poly([[19.5, 4.5 + b], [16, 5.5 + b], [14, 8.5 + b], [16, 9.5 + b], [18.5, 8 + b]], g.eye);
    pc.px(8, 6 + b, pose.glow ? g.eyeHi : g.s3);
    pc.px(17, 6 + b, pose.glow ? g.eyeHi : g.s3);
  }
  pc.px(13, 10 + b, g.s2);                          // tiny nose slit
  pc.hline(12, 14, 12 + b, g.s3);                   // mouth line
}
function greyPoses() {
  return {
    idle: [0, 1, 2, 1].map((k) => ({ bob: k === 2 ? 1 : 0, hands: [[9, 23], [16, 23 - (k === 1 ? 1 : 0)]] })),
    walk: [0, 1, 2, 3].map((k) => {
      const a = (k / 4) * TAU;
      return { bob: k % 2 ? -1 : 0, feet: [[12 + 3 * Math.sin(a + Math.PI), 31], [12 + 3 * Math.sin(a), 31]], hands: [[9 - Math.sin(a), 23], [16 + Math.sin(a), 23]] };
    }),
    cast: [
      { bob: 0, hands: [[9, 23], [17, 17]], orb: true, glow: true },
      { bob: -1, hands: [[8, 17], [18, 14]], orb: true, glow: true },
    ],
    hurt: [{ bob: 0, hurt: true, hands: [[6, 18], [19, 18]] }],
    down: [{ down: true }],
  };
}

// ---------------------------------------------------------------------------
//  Security drone (26 x 16): quad-rotor with a red eye
// ---------------------------------------------------------------------------
function drawDrone(pc, f, alert) {
  // rotor arms
  pc.hline(3, 22, 5, P.chrome2);
  for (const rx of [5, 20]) {
    const blur = f % 2 === 0;
    pc.hline(rx - 4, rx + 4, 3, blur ? '#b5c0cc90' : '#b5c0cc40');
    pc.hline(rx - 2, rx + 2, 3, blur ? P.chrome1 : '#b5c0cca0');
    pc.vline(rx, 3, 5, P.chrome2);
  }
  // body
  pc.ellipse(12, 9, 7, 4, P.ink3);
  pc.hline(7, 17, 6, P.ink4);
  pc.ellipse(12, 10, 5, 2, P.ink2);
  // camera eye
  pc.circle(12, 10, 2, P.ink);
  pc.px(12, 10, alert ? P.red : P.btc);
  pc.px(13, 9, alert ? '#ff9aa0' : P.btc1);
  // antenna + landing skids
  pc.vline(9, 13, 14, P.chrome2); pc.vline(15, 13, 14, P.chrome2);
  pc.hline(7, 10, 15, P.chrome2); pc.hline(14, 17, 15, P.chrome2);
  pc.px(18, 7, f % 4 < 2 ? P.green1 : P.green4);   // status LED
}

// ---------------------------------------------------------------------------
//  Registration
// ---------------------------------------------------------------------------
function register(scene, key, w, h, poses, draw, rates) {
  const frames = [], ranges = {};
  for (const [name, list] of Object.entries(poses)) {
    ranges[name] = [frames.length, frames.length + list.length - 1];
    for (const pose of list) frames.push((pc) => draw(pc, pose));
  }
  buildSheet(scene, key, w, h, frames, { outline: P.outline });
  for (const name of Object.keys(poses)) {
    const k = `${key}_${name}`;
    if (scene.anims.exists(k)) scene.anims.remove(k);
    scene.anims.create({
      key: k, frames: scene.anims.generateFrameNumbers(key, { start: ranges[name][0], end: ranges[name][1] }),
      frameRate: rates[name] ?? 8, repeat: ['idle', 'walk'].includes(name) ? -1 : 0,
    });
  }
}

export function generateEnemies(scene) {
  const rates = { idle: 3, walk: 9, aim: 10, hurt: 1, down: 1, cast: 6 };
  register(scene, 'soldier', HUM_W, HUM_H, humanoidPoses(), (pc, p) => drawHumanoid(pc, p, LOOKS.soldier), rates);
  register(scene, 'agent', HUM_W, HUM_H, humanoidPoses(), (pc, p) => drawHumanoid(pc, p, LOOKS.agent), rates);
  register(scene, 'grey', 24, 32, greyPoses(), drawGrey, rates);
  const droneFrames = [0, 1, 2, 3].map((f) => (pc) => drawDrone(pc, f, false)).concat([0, 1, 2, 3].map((f) => (pc) => drawDrone(pc, f, true)));
  buildSheet(scene, 'drone', 26, 16, droneFrames, { outline: P.outline });
  for (const [k, s] of [['drone_fly', 0], ['drone_alert', 4]]) {
    if (!scene.anims.exists(k)) scene.anims.create({ key: k, frames: scene.anims.generateFrameNumbers('drone', { start: s, end: s + 3 }), frameRate: 20, repeat: -1 });
  }
}
