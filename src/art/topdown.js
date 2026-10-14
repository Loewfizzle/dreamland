// ============================================================================
//  TOP-DOWN CHARACTERS (3/4 view) — for Chapter 2 (Rachel) and Chapter 3.
//  Front & back walk cycles for Ben and Zeus (their side views reuse the
//  side-scroller sheets), plus a generic townsperson rig for NPCs.
// ============================================================================
import { P } from './palette.js';
import { buildSheet } from './pixel.js';

// ---------------------------------------------------------------------------
//  Generic front/back humanoid (24 x 36, feet on row 35)
// ---------------------------------------------------------------------------
function drawPerson(pc, pose, L, back = false) {
  pc.oy = 4;                                   // headroom for hats & antennae (frames are 24x36)
  const b = pose.bob ?? 0;
  const [liftL, liftR] = pose.lift ?? [0, 0];
  // shoes + legs
  for (const [x, lift] of [[8, liftL], [13, liftR]]) {
    const fy = 31 - lift;
    if (L.legs === 'pants') pc.rect(x + 1, 21 + b, 2, fy - 21 - b - 1, L.pants);
    else pc.rect(x + 1, 25 + b, 2, fy - 25 - b - 1, L.skin);
    pc.rect(x, fy - 1, 4, 2, L.shoes ?? P.cream);
    pc.hline(x, x + 3, fy, P.ink3);
  }
  // lower garment
  if (L.legs === 'shorts') { pc.rect(8, 21 + b, 8, 5, L.pants); pc.vline(15, 21 + b, 25 + b, L.pants2 ?? L.pants); pc.vline(12, 23 + b, 25 + b, L.pants2 ?? L.pants); }
  if (L.legs === 'skirt') pc.poly([[8, 20 + b], [16, 20 + b], [18, 27 + b], [6, 27 + b]], L.pants);
  if (L.legs === 'pants') pc.rect(8, 21 + b, 8, 3, L.pants);
  // arms (behind torso edges)
  const [aL, aR] = pose.arms ?? [0, 0];
  pc.rect(5, 13 + b + aL, 2, 7, L.shirt2); pc.rect(17, 13 + b + aR, 2, 7, L.shirt2);
  pc.rect(5, 20 + b + aL, 2, 2, L.skin); pc.rect(17, 20 + b + aR, 2, 2, L.skin);
  // torso
  pc.rect(7, 13 + b, 10, 9, L.shirt);
  pc.vline(16, 13 + b, 21 + b, L.shirt2);
  pc.hline(8, 15, 13 + b, L.shirtHi ?? L.shirt);
  if (!back) {
    if (L.logo === 'btc') pc.map(['##.', '#.#', '##.', '#.#', '##.'], { '#': P.btc }, 11, 15 + b);
    if (L.apron) { pc.rect(9, 16 + b, 6, 7, L.apron); pc.hline(9, 14, 16 + b, P.white); }
    if (L.nametag) pc.rect(13, 15 + b, 3, 2, P.white);
    if (L.strings) { pc.vline(10, 14 + b, 16 + b, P.cream); pc.vline(13, 14 + b, 16 + b, P.cream); }
    if (L.camera) { pc.rect(10, 16 + b, 5, 3, P.ink3); pc.px(12, 17 + b, P.cyan1); pc.line(9, 13 + b, 10, 16 + b, P.ink3); }
    if (L.vest) { pc.rect(7, 13 + b, 2, 9, L.vest); pc.rect(15, 13 + b, 2, 9, L.vest); }
    if (L.camo) for (const [x, y, c] of [[8, 14, 0], [13, 16, 1], [9, 19, 2], [14, 20, 0], [11, 13, 2]]) { pc.px(x, y + b, L.camo[c]); pc.px(x + 1, y + b, L.camo[c]); }
    if (L.rifle) { pc.line(6, 21 + b, 17, 14 + b, '#1a1a22', 2); pc.px(17, 13 + b, '#4a4a52'); pc.px(5, 21 + b, '#3a2a1a'); }
  } else {
    if (L.hood) pc.rect(9, 13 + b, 6, 3, L.shirt2);
    if (L.pack) { pc.rect(8, 14 + b, 8, 7, L.pack); pc.hline(8, 15, 14 + b, L.shirtHi ?? L.pack); pc.rect(9, 17 + b, 6, 2, L.shirt2); }
    if (L.rifle) pc.line(7, 13 + b, 16, 21 + b, '#1a1a22');
  }
  // neck + head
  pc.rect(10, 11 + b, 4, 2, L.skin2 ?? L.skin);
  pc.rect(8, 4 + b, 8, 8, L.skin);
  pc.rect(9, 3 + b, 6, 1, L.skin);
  pc.px(7, 8 + b, L.skin2 ?? L.skin); pc.px(16, 8 + b, L.skin2 ?? L.skin);   // ears
  if (!back) {
    if (pose.blink) { pc.hline(9, 10, 8 + b, P.ink); pc.hline(13, 14, 8 + b, P.ink); }
    else { pc.px(10, 8 + b, P.ink); pc.px(13, 8 + b, P.ink); pc.px(9, 8 + b, P.white); pc.px(14, 8 + b, P.white); }
    pc.px(11, 9 + b, L.skin2 ?? L.skin); pc.px(12, 9 + b, L.skin2 ?? L.skin);
    if (L.beard) { pc.rect(8, 9 + b, 8, 3, L.beard); pc.rect(9, 12 + b, 6, 1, L.beard); }
    if (L.glasses) { pc.rect(9, 7 + b, 2, 2, L.glasses); pc.rect(13, 7 + b, 2, 2, L.glasses); pc.px(11, 7 + b, L.glasses); pc.px(12, 7 + b, L.glasses); }
    pc.hline(10, 13, 11 + b, pose.mouth ? P.ink : (L.beard ? P.beard2 : L.skin2 ?? '#b87858'));
    if (pose.mouth) pc.px(11, 11 + b, P.tongue);
    if (L.lips) pc.hline(10, 13, 11 + b, L.lips);
  }
  // hair / headwear
  const H = L.hair;
  if (H.style === 'cap') {
    pc.rect(8, 1 + b, 8, 4, H.color); pc.hline(9, 14, 0 + b, H.color);
    if (!back) {
      pc.hline(9, 13, 1 + b, H.hi ?? H.color);
      pc.rect(7, 5 + b, 10, 1, H.dark); pc.hline(7, 16, 6 + b, P.foil1); pc.px(14, 6 + b, P.foil0);
    } else {
      pc.rect(9, 2 + b, 6, 3, H.dark);
      for (let x = 9; x < 15; x += 2) pc.px(x, 3 + b, H.color);
      pc.hline(10, 13, 5 + b, P.foil1);                        // foil peeking out the back
      pc.rect(8, 5 + b, 8, 3, P.beard);                          // hair under the cap
    }
  } else if (H.style === 'beehive') {
    pc.ellipse(12, 1 + b, 5, 4, H.color); pc.rect(7, 3 + b, 10, 3, H.color);
    pc.px(10, -1 + b, H.hi); pc.px(9, 1 + b, H.hi);
    if (back) pc.rect(8, 4 + b, 8, 6, H.color);
    else { pc.vline(7, 4 + b, 9 + b, H.color); pc.vline(16, 4 + b, 9 + b, H.color); }
  } else if (H.style === 'hat') {
    pc.rect(5, 3 + b, 14, 2, H.color); pc.rect(8, 0 + b, 8, 4, H.color); pc.hline(8, 15, 2 + b, H.band ?? H.dark);
    if (back) pc.rect(8, 5 + b, 8, 4, P.cream2);
  } else if (H.style === 'bucket') {
    pc.rect(7, 2 + b, 10, 4, H.color); pc.rect(6, 5 + b, 12, 1, H.dark);
    pc.vline(9, -3 + b, 1 + b, P.ink3); pc.vline(14, -3 + b, 1 + b, P.ink3);       // alien antenna headband
    pc.circle(9, -4 + b, 1, P.green1); pc.circle(14, -4 + b, 1, P.green1);
  } else if (H.style === 'helmet') {
    pc.ellipse(12, 3 + b, 6, 4, H.color); pc.rect(6, 3 + b, 12, 3, H.color);
    pc.hline(7, 16, 6 + b, H.dark);
    pc.px(9, 1 + b, H.hi); pc.px(14, 2 + b, H.dark); pc.px(10, 3 + b, H.dark);
    if (!back) { pc.rect(9, 5 + b, 6, 2, '#1a2a2a'); pc.px(10, 5 + b, '#5a8a8a'); }   // night-vision goggles flipped up
  } else if (H.style === 'foil') {
    pc.poly([[7, 5 + b], [12, -4 + b], [17, 5 + b]], P.foil1);
    pc.line(9, 3 + b, 12, -3 + b, P.foil0); pc.px(14, 2 + b, P.foil2);
    if (!back) { pc.rect(7, 5 + b, 2, 4, H.color); pc.rect(15, 5 + b, 2, 4, H.color); pc.circle(8, 6 + b, 1, '#e8a0c0'); pc.circle(16, 6 + b, 1, '#e8a0c0'); }
    else pc.rect(8, 5 + b, 8, 5, H.color);
  } else {
    pc.rect(8, 2 + b, 8, 3, H.color);
    if (back) pc.rect(8, 4 + b, 8, 5, H.color);
  }
}

const walkPoses = (n = 4) => Array.from({ length: n }, (_, i) => ({
  bob: i % 2 ? -1 : 0,
  lift: [[2, 0], [0, 0], [0, 2], [0, 0]][i % 4],
  arms: [[1, -1], [0, 0], [-1, 1], [0, 0]][i % 4],
}));

export const LOOKS = {
  guard: {
    skin: P.skin1, skin2: P.skin2, shirt: P.sage2, shirt2: P.sage3, shirtHi: P.sage1, camo: [P.terra3, P.sage3, P.khaki2],
    pants: P.sage3, legs: 'pants', shoes: P.ink3, rifle: true, pack: P.khaki2,
    hair: { style: 'helmet', color: P.sage2, dark: P.sage3, hi: P.sage1 },
  },
  ben: (cos = {}) => ({
    skin: P.skin1, skin2: P.skin2, shirt: P.hood1, shirt2: P.hood2, shirtHi: P.hood0, logo: 'btc', strings: true, hood: true,
    pants: P.khaki1, pants2: P.khaki2, legs: 'shorts', shoes: P.cream, beard: P.beard,
    hair: { style: 'cap', color: cos.cap ?? P.capR, dark: cos.capDark ?? P.capR2, hi: cos.cap ? P.white : '#e86a5a' },
  }),
  dolores: {
    skin: P.skin0, skin2: P.skin1, shirt: '#e86a8a', shirt2: '#b84a6a', shirtHi: '#ff9ab0', apron: P.white, nametag: true,
    pants: '#e86a8a', legs: 'skirt', shoes: P.white, glasses: '#c8423a', lips: '#c8423a',
    hair: { style: 'beehive', color: '#d8d8e8', hi: '#ffffff' },
  },
  earl: {
    skin: P.skin2, skin2: P.skin3, shirt: '#8a4a3a', shirt2: '#6a3428', vest: '#5a4a3a', pants: '#4a5a7a', legs: 'pants', shoes: '#4a3020',
    beard: '#e8e8e8', hair: { style: 'hat', color: '#8a6a4a', dark: '#5a4028', band: '#3a2418' },
  },
  mabel: {
    skin: P.skin0, skin2: P.skin1, shirt: '#7aa8c8', shirt2: '#5a88a8', pants: '#7aa8c8', legs: 'skirt', shoes: '#e8a0c0', glasses: '#3a3a5a',
    hair: { style: 'foil', color: '#c8c8d8' },
  },
  tourist: {
    skin: '#f0b8a0', skin2: '#d89880', shirt: '#5dbf6a', shirt2: '#3a9a4a', camera: true, pants: '#c8b07a', pants2: '#a89060', legs: 'shorts', shoes: P.white,
    glasses: P.ink, hair: { style: 'bucket', color: '#e8dcc0', dark: '#c8b894' },
  },
};

function registerAnims(scene, key, defs) {
  for (const [name, [start, end, rate, repeat]] of Object.entries(defs)) {
    const k = `${key}_${name}`;
    if (scene.anims.exists(k)) scene.anims.remove(k);
    scene.anims.create({ key: k, frames: scene.anims.generateFrameNumbers(key, { start, end }), frameRate: rate, repeat });
  }
}

export function makeTopdownBen(scene, cos = {}) {
  const L = LOOKS.ben(cos);
  const frames = [
    ...walkPoses().map((p) => (pc) => drawPerson(pc, p, L, false)),     // 0-3 down
    ...walkPoses().map((p) => (pc) => drawPerson(pc, p, L, true)),      // 4-7 up
    (pc) => drawPerson(pc, { blink: true }, L, false),                  // 8 blink
    (pc) => drawPerson(pc, { mouth: true }, L, false),                  // 9 talk
  ];
  buildSheet(scene, 'ben_td', 24, 36, frames, { outline: P.outline });
  registerAnims(scene, 'ben_td', {
    down: [0, 3, 8, -1], up: [4, 7, 8, -1], idle_down: [0, 0, 1, 0], idle_up: [4, 4, 1, 0],
  });
}

/** Perimeter guard ("camo dude"): front/back walk cycles + idle. Side view reuses 'soldier'. */
export function makeGuardTD(scene) {
  const L = LOOKS.guard;
  const frames = [
    ...walkPoses().map((p) => (pc) => drawPerson(pc, p, L, false)),
    ...walkPoses().map((p) => (pc) => drawPerson(pc, p, L, true)),
    (pc) => drawPerson(pc, {}, L, false),
    (pc) => drawPerson(pc, {}, L, true),
  ];
  buildSheet(scene, 'guard_td', 24, 36, frames, { outline: P.outline });
  registerAnims(scene, 'guard_td', { down: [0, 3, 7, -1], up: [4, 7, 7, -1], idle_down: [8, 8, 1, 0], idle_up: [9, 9, 1, 0] });
}

export function makeNPCs(scene) {
  for (const id of ['dolores', 'earl', 'mabel', 'tourist']) {
    const L = LOOKS[id];
    const frames = [
      (pc) => drawPerson(pc, {}, L), (pc) => drawPerson(pc, { bob: 1 }, L), (pc) => drawPerson(pc, { blink: true }, L),
      (pc) => drawPerson(pc, { mouth: true }, L), (pc) => drawPerson(pc, { arms: [-2, 0] }, L),
    ];
    buildSheet(scene, `npc_${id}`, 24, 36, frames, { outline: P.outline });
    registerAnims(scene, `npc_${id}`, { idle: [0, 2, 2, -1], talk: [3, 4, 6, -1] });
  }
}

// ---------------------------------------------------------------------------
//  Zeus front / back (22 x 24, paws on row 23)
// ---------------------------------------------------------------------------
function zeusFront(pc, pose, bandana) {
  const b = pose.bob ?? 0;
  const [lL, lR] = pose.lift ?? [0, 0];
  const w = pose.wag ?? 0;
  // tail tip peeking out from behind
  pc.line(16, 14, 19 + w, 9, P.gold2, 2); pc.px(20 + w, 8, P.gold1);
  // front legs
  for (const [x, l] of [[8, lL], [13, lR]]) { pc.rect(x, 17 + b, 2, 6 - l, P.gold2); pc.rect(x - 1, 22 - l, 4, 1, P.gold1); }
  // chest
  pc.ellipse(11, 15 + b, 5, 5, P.gold2); pc.ellipse(11, 16 + b, 3, 4, P.gold1); pc.px(11, 17 + b, P.gold0);
  // collar / bandana
  pc.hline(7, 15, 12 + b, P.collar); pc.px(11, 13 + b, P.btc1);
  if (bandana) pc.poly([[8, 12 + b], [14, 12 + b], [11, 16 + b]], bandana);
  // head
  pc.ellipse(11, 7 + b, 5, 5, P.gold2); pc.ellipse(11, 5 + b, 4, 3, P.gold1); pc.px(10, 3 + b, P.gold0);
  pc.rect(5, 5 + b, 2, 7, P.gold3); pc.rect(15, 5 + b, 2, 7, P.gold3);                 // floppy ears
  pc.px(5, 12 + b, P.gold4); pc.px(16, 12 + b, P.gold4);
  pc.ellipse(11, 10 + b, 3, 2, P.gold1); pc.rect(10, 9 + b, 3, 1, P.nose);              // muzzle + nose
  pc.px(9, 7 + b, P.ink); pc.px(13, 7 + b, P.ink); pc.px(9, 6 + b, P.white);
  if (pose.tongue) { pc.px(11, 12 + b, P.tongue); pc.px(11, 13 + b, P.tongue); }
}
function zeusBack(pc, pose, bandana) {
  const b = pose.bob ?? 0;
  const [lL, lR] = pose.lift ?? [0, 0];
  const w = pose.wag ?? 0;
  for (const [x, l] of [[7, lL], [14, lR]]) { pc.rect(x, 17 + b, 2, 6 - l, P.gold3); pc.rect(x - 1, 22 - l, 4, 1, P.gold2); }
  pc.ellipse(11, 14 + b, 6, 6, P.gold2); pc.ellipse(11, 12 + b, 4, 3, P.gold1);
  // big happy feathery tail
  for (let i = 0; i < 8; i++) { const x = 11 + Math.round(Math.sin(i * 0.4) * w * 1.2); pc.px(x, 15 - i + b, P.gold1); pc.px(x + 1, 15 - i + b, P.gold0); pc.px(x - 1, 15 - i + b, P.gold2); }
  pc.ellipse(11, 5 + b, 4, 4, P.gold2); pc.rect(6, 4 + b, 2, 6, P.gold3); pc.rect(15, 4 + b, 2, 6, P.gold3);
  pc.hline(8, 14, 9 + b, P.collar);
  if (bandana) pc.rect(9, 9 + b, 5, 2, bandana);
}

export function makeTopdownZeus(scene, cos = {}) {
  const trot = (i) => ({ bob: i % 2 ? -1 : 0, lift: [[2, 0], [0, 0], [0, 2], [0, 0]][i], wag: [-2, 0, 2, 0][i], tongue: true });
  const frames = [
    ...[0, 1, 2, 3].map((i) => (pc) => zeusFront(pc, trot(i), cos.bandana)),   // 0-3 down
    ...[0, 1, 2, 3].map((i) => (pc) => zeusBack(pc, trot(i), cos.bandana)),    // 4-7 up
    ...[0, 1, 2, 1].map((k) => (pc) => zeusFront(pc, { wag: k * 2 - 2, tongue: true }, cos.bandana)), // 8-11 sit wag
    // 12-13 digging (seen from behind, paws flying)
    (pc) => zeusBack(pc, { bob: 1, lift: [3, 0], wag: 2 }, cos.bandana),
    (pc) => zeusBack(pc, { bob: 1, lift: [0, 3], wag: -2 }, cos.bandana),
  ];
  buildSheet(scene, 'zeus_td', 22, 24, frames, { outline: P.outline });
  registerAnims(scene, 'zeus_td', {
    down: [0, 3, 10, -1], up: [4, 7, 10, -1], sit: [8, 11, 7, -1], dig: [12, 13, 14, -1],
  });
}
