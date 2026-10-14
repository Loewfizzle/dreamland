// ============================================================================
//  CHARACTER SPRITES — Ben and Zeus, side view.
//  Each frame is posed by a parameter object and drawn pixel by pixel, so the
//  animations are real poses (strides, arm swings, tail wags), not squashes.
//  Cosmetic colors (cap, bandana) are parameters -> recolor without redrawing.
// ============================================================================
import { P } from './palette.js';
import { buildSheet } from './pixel.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
//  BEN  (24 x 32 frame, facing right, feet on row 31)
// ---------------------------------------------------------------------------
export const BEN_W = 24, BEN_H = 32;

function benLeg(pc, hx, hy, fx, fy, near) {
  const shorts = near ? P.khaki1 : P.khaki2;
  const skin = near ? P.skin1 : P.skin2;
  const dx = fx - hx, dy = fy - hy;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const half = 5.2;
  const bend = Math.sqrt(Math.max(0, half * half - (dist / 2) * (dist / 2)));
  const kx = (hx + fx) / 2 + (dy / dist) * bend;
  const ky = (hy + fy) / 2 - (dx / dist) * bend;
  pc.line(hx, hy, kx, ky, shorts, 3);           // thigh in cargo shorts
  pc.line(kx, ky + 1, fx, fy - 2, skin, 2);     // shin
  // sneaker: cream upper, orange stripe, dark sole; toe points forward
  pc.rect(Math.round(fx) - 1, Math.round(fy) - 1, 4, 1, near ? P.cream : P.cream2);
  pc.px(Math.round(fx) + 1, Math.round(fy) - 1, P.btc);
  pc.rect(Math.round(fx) - 1, Math.round(fy), 4, 1, P.ink3);
}

function benArm(pc, sx, sy, hx, hy, near, gun) {
  const sleeve = near ? P.hood1 : P.hood2;
  pc.line(sx, sy, hx, hy, sleeve, 2);
  pc.rect(Math.round(hx), Math.round(hy), 2, 2, near ? P.skin1 : P.skin2);
  if (gun) {
    // Confiscated alien blaster: chunky grey body with a glowing cyan tip.
    const gx = Math.round(hx) + 1, gy = Math.round(hy) - 1;
    pc.rect(gx, gy, 5, 2, P.chrome2);
    pc.rect(gx + 1, gy - 1, 3, 1, P.chrome1);
    pc.px(gx + 5, gy, P.cyan1);
    pc.px(gx + 5, gy + 1, P.cyan2);
    pc.px(gx + 1, gy + 2, P.ink3);
  }
}

/**
 * pose: { bob, feet:[[x,y],[x,y]] (far, near), hands:[[x,y],[x,y]], eyes, mouth, gun, lean }
 * opts: { cap, capDark }
 */
export function drawBen(pc, pose, opts = {}) {
  const cap = opts.cap ?? P.capR, capDark = opts.capDark ?? P.capR2;
  const b = pose.bob ?? 0;
  const lean = pose.lean ?? 0;
  const hipY = 21 + b;
  const [farFoot, nearFoot] = pose.feet;
  const [farHand, nearHand] = pose.hands;

  // far arm + far leg (darker, behind body)
  benArm(pc, 11 + lean, 14 + b, farHand[0], farHand[1], false, false);
  benLeg(pc, 11, hipY, farFoot[0], farFoot[1], false);

  // --- hoodie torso
  const tx = 8 + lean, ty = 13 + b;
  pc.rect(tx + 1, ty, 6, 8, P.hood1);
  pc.rect(tx, ty + 1, 8, 6, P.hood1);
  pc.vline(tx, ty + 1, ty + 6, P.hood2);                 // back shadow
  pc.hline(tx + 1, tx + 6, ty + 7, P.hood2);             // hem shadow
  pc.hline(tx + 2, tx + 6, ty, P.hood0);                 // shoulder highlight
  pc.rect(tx - 1, ty - 1, 3, 3, P.hood2);                // bunched hood at back of neck
  pc.px(tx, ty - 1, P.hood1);
  pc.px(tx + 1, ty + 6, P.hood2); pc.px(tx + 7, ty + 6, P.hood2); // kangaroo pocket corners
  // orange ₿ on the chest
  const bx = tx + 2, by = ty + 1;
  pc.map(['##.', '#.#', '##.', '#.#', '##.'], { '#': P.btc }, bx, by);
  pc.px(bx + 1, by - 1, P.btc1); pc.px(bx + 1, by + 5, P.btc1);
  pc.px(bx, by, P.btc1);
  pc.px(tx + 7, ty + 1, P.cream); pc.px(tx + 7, ty + 2, P.cream2);   // drawstring

  // --- cargo shorts (waist)
  pc.rect(9, hipY - 1, 6, 3, P.khaki1);
  pc.hline(9, 14, hipY - 1, P.khaki0);
  pc.px(10, hipY + 1, P.khaki2);                         // pocket flap

  // near leg
  benLeg(pc, 13, hipY, nearFoot[0], nearFoot[1], true);

  // --- head
  const hx = 10 + lean, hy = 5 + b;
  pc.rect(hx + 1, hy, 6, 7, P.skin1);
  pc.rect(hx, hy + 1, 8, 5, P.skin1);
  pc.vline(hx, hy + 1, hy + 4, P.beard);                 // hair at back
  pc.px(hx + 2, hy + 3, P.skin2); pc.px(hx + 2, hy + 4, P.skin2);   // ear
  pc.px(hx + 8, hy + 4, P.skin1);                        // nose
  pc.px(hx + 8, hy + 5, P.skin2);
  // scruffy beard
  pc.rect(hx + 3, hy + 5, 5, 2, P.beard);
  pc.px(hx + 7, hy + 4, P.beard);
  pc.px(hx + 3, hy + 4, P.beard);
  pc.px(hx + 4, hy + 7, P.beard2); pc.px(hx + 5, hy + 7, P.beard); pc.px(hx + 6, hy + 7, P.beard2);
  // mouth
  if (pose.mouth === 'open') { pc.px(hx + 6, hy + 5, P.ink); pc.px(hx + 7, hy + 5, P.ink); pc.px(hx + 6, hy + 6, P.tongue); }
  else if (pose.mouth === 'smile') { pc.px(hx + 6, hy + 5, P.skin0); pc.px(hx + 7, hy + 5, P.ink3); }
  // eye + brow
  if (pose.eyes === 'closed') pc.hline(hx + 5, hx + 6, hy + 3, P.ink);
  else if (pose.eyes === 'x') { pc.px(hx + 5, hy + 2, P.ink); pc.px(hx + 6, hy + 3, P.ink); pc.px(hx + 5, hy + 4, P.ink); pc.px(hx + 6, hy + 2, P.ink); pc.px(hx + 6, hy + 4, P.ink); }
  else { pc.px(hx + 6, hy + 3, P.ink); pc.px(hx + 5, hy + 3, P.white); pc.hline(hx + 5, hx + 7, hy + 2, P.beard); }
  pc.px(hx + 1, hy + 1, P.skin0);

  // --- tinfoil-lined trucker cap
  const cy = hy - 3;
  pc.rect(hx + 1, cy, 6, 4, cap);
  pc.rect(hx, cy + 1, 8, 3, cap);
  pc.hline(hx + 2, hx + 5, cy - 1, cap);
  pc.rect(hx, cy + 1, 3, 3, capDark);                    // mesh back panel
  pc.px(hx + 1, cy + 2, cap); pc.px(hx + 2, cy + 1, cap);   // mesh texture
  pc.hline(hx + 3, hx + 6, cy, mixCap(cap));             // crown highlight
  pc.px(hx + 4, cy - 1, P.white);                        // button
  // brim with shiny foil underneath
  pc.hline(hx + 6, hx + 11, cy + 3, capDark);
  pc.hline(hx + 7, hx + 11, cy + 4, P.foil1);
  pc.px(hx + 9, cy + 4, P.foil0);
  pc.px(hx + 0, cy + 4, P.foil2);                        // foil peeking out the back

  // near arm (in front)
  benArm(pc, 13 + lean, 14 + b, nearHand[0], nearHand[1], true, pose.gun);
}
function mixCap(c) { return c === P.capR ? '#e86a5a' : P.white; }

/** All of Ben's animation poses. */
function benPoses() {
  const poses = {};
  // idle: gentle breathing (4 frames)
  poses.idle = [0, 0, 1, 1].map((b, i) => ({
    bob: b, feet: [[10, 31], [14, 31]], hands: [[10, 20 + b], [14, 20 + b + (i === 2 ? 1 : 0)]],
    eyes: i === 3 ? 'closed' : 'open',
  }));
  // run: 8 frames, proper stride with opposite arm swing
  poses.run = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const foot = (ph) => [12 + 5 * Math.sin(a + ph), 31 - Math.max(0, Math.cos(a + ph)) * 3];
    const hand = (ph) => [12 + 4 * Math.sin(a + ph + Math.PI), 19 - Math.abs(Math.sin(a + ph)) * 1];
    poses.run.push({ bob: -Math.round(Math.abs(Math.cos(a))), feet: [foot(Math.PI), foot(0)], hands: [hand(Math.PI), hand(0)], lean: 1 });
  }
  poses.jump = [{ bob: -1, feet: [[9, 28], [15, 27]], hands: [[8, 12], [16, 11]], mouth: 'open' }];
  poses.fall = [{ bob: 0, feet: [[10, 31], [15, 30]], hands: [[7, 15], [17, 14]] }];
  poses.hurt = [{ bob: 0, lean: -1, feet: [[9, 31], [14, 30]], hands: [[6, 15], [16, 15]], eyes: 'x', mouth: 'open' }];
  poses.shoot = [
    { bob: 0, feet: [[9, 31], [15, 31]], hands: [[11, 19], [17, 15]], gun: true },
    { bob: 0, lean: -1, feet: [[9, 31], [15, 31]], hands: [[11, 19], [16, 15]], gun: true },
  ];
  // run & gun: legs keep striding, near arm holds the blaster level
  poses.runshoot = poses.run.map((p) => ({ ...p, hands: [p.hands[0], [17, 15 + (p.bob ?? 0)]], gun: true }));
  poses.jumpshoot = [{ bob: -1, feet: [[9, 28], [15, 27]], hands: [[8, 12], [17, 14]], gun: true, mouth: 'open' }];
  poses.fallshoot = [{ bob: 0, feet: [[10, 31], [15, 30]], hands: [[7, 15], [17, 15]], gun: true }];
  poses.point = [{ bob: 0, feet: [[10, 31], [14, 31]], hands: [[10, 20], [19, 8]], mouth: 'open' }];
  poses.talk = [
    { bob: 0, feet: [[10, 31], [14, 31]], hands: [[10, 20], [16, 16]], mouth: 'open' },
    { bob: 0, feet: [[10, 31], [14, 31]], hands: [[10, 20], [17, 15]], mouth: 'smile' },
  ];
  return poses;
}

// ---------------------------------------------------------------------------
//  ZEUS  (28 x 20 frame, facing right, paws on row 19) — a very good boy
// ---------------------------------------------------------------------------
export const ZEUS_W = 28, ZEUS_H = 20;

function zeusLeg(pc, x, top, footX, footY, near) {
  const c = near ? P.gold2 : P.gold3;
  pc.line(x, top, footX, footY - 1, c, 2);
  pc.rect(Math.round(footX), Math.round(footY) - 1, 3, 1, near ? P.gold1 : P.gold2); // paw
  pc.px(Math.round(footX) + 2, Math.round(footY) - 1, near ? P.gold0 : P.gold1);
  pc.px(Math.round(footX) - 1, Math.round(footY - 3), near ? P.gold1 : P.gold2);   // feathering
}

function zeusTail(pc, bx, by, angle, wagLen = 8) {
  // Feathery tail drawn as a curved series of points, thick at the base.
  for (let i = 0; i <= wagLen; i++) {
    const t = i / wagLen;
    const a = angle + t * 0.6;
    const x = bx - Math.cos(a) * i;
    const y = by - Math.sin(a) * i + t * t * 2;
    pc.px(x, y, P.gold2);
    pc.px(x, y - 1, P.gold1);
    if (i > 2) pc.px(x + 0.5, y + 1, i % 2 ? P.gold0 : P.gold1); // feather fringe
    if (i < wagLen - 2) pc.px(x, y + 1, P.gold3);
  }
}

function zeusHead(pc, hx, hy, pose) {
  // skull
  pc.ellipse(hx, hy, 3, 3, P.gold2);
  pc.hline(hx - 2, hx + 1, hy - 3, P.gold1);
  pc.px(hx - 1, hy - 2, P.gold0);
  // snout
  const open = pose.mouth === 'open';
  pc.rect(hx + 2, hy, 3, 2, P.gold1);
  pc.px(hx + 2, hy - 1, P.gold1);                  // the "stop" between brow and muzzle
  pc.px(hx + 3, hy - 1, P.gold1);
  pc.px(hx + 5, hy, P.nose);                       // nose
  pc.px(hx + 5, hy - 1, P.nose);
  pc.px(hx + 4, hy + 1, P.gold0);                  // muzzle highlight
  pc.px(hx + 1, hy + 2, P.gold3);                  // jowl
  if (open) {
    pc.rect(hx + 2, hy + 2, 3, 1, P.ink);
    pc.rect(hx + 2, hy + 3, 3, 1, P.gold2);        // lower jaw dropped
    pc.px(hx + 3, hy + 2, P.tongue);
  } else {
    pc.hline(hx + 2, hx + 4, hy + 2, P.gold3);     // jaw line
    if (pose.mouth === 'tongue') { pc.px(hx + 3, hy + 3, P.tongue); pc.px(hx + 3, hy + 4, P.tongue); pc.px(hx + 4, hy + 3, '#c84a5a'); }
  }
  // eye
  if (pose.eyes === 'closed' || pose.eyes === 'happy') { pc.px(hx + 1, hy - 1, P.ink); pc.px(hx + 2, hy - 1, P.ink); }
  else if (pose.eyes === 'x') { pc.px(hx + 1, hy - 2, P.ink); pc.px(hx + 2, hy - 1, P.ink); pc.px(hx + 1, hy, P.ink); pc.px(hx + 3, hy - 2, P.ink); pc.px(hx + 3, hy, P.ink); }
  else { pc.px(hx + 1, hy - 1, P.ink); pc.px(hx + 2, hy - 1, P.ink); pc.px(hx + 1, hy - 2, P.white); pc.px(hx + 2, hy - 2, P.gold3); }
  // floppy ear (flaps with pose.ear: -1 up, 0 normal, 1 swinging)
  const e = pose.ear ?? 0;
  pc.rect(hx - 2, hy - 2 - (e < 0 ? 1 : 0), 2, 4, P.gold3);
  pc.px(hx - 3 - (e > 0 ? 1 : 0), hy + 1 + (e < 0 ? -1 : 0), P.gold3);
  pc.px(hx - 2, hy + 2, P.gold4);
  pc.px(hx - 1, hy - 2, P.gold4);
}

function zeusCollar(pc, x, y, bandana) {
  pc.vline(x, y, y + 2, P.collar);
  pc.vline(x + 1, y, y + 2, P.collar2);
  pc.px(x + 1, y + 3, P.btc1);   // tag
  if (bandana) {
    pc.rect(x - 1, y, 3, 3, bandana);
    pc.px(x, y + 3, bandana);
    pc.px(x, y + 4, bandana);
  }
}

/**
 * pose: { mode:'stand'|'sit'|'lie', phase (0..1 trot), tail (radians), head:[dx,dy], mouth, eyes, ear, bob }
 */
export function drawZeus(pc, pose, opts = {}) {
  const mode = pose.mode ?? 'stand';
  const bob = pose.bob ?? 0;
  const [hdx, hdy] = pose.head ?? [0, 0];

  if (mode === 'stand') {
    const ph = (pose.phase ?? 0) * TAU;
    const moving = pose.phase != null;
    const legX = (base, off) => base + (moving ? Math.sin(ph + off) * 2.5 : 0);
    const lift = (off) => (moving ? Math.max(0, Math.cos(ph + off)) * 1.6 : 0);
    // far legs
    zeusLeg(pc, 9, 13 + bob, legX(8, Math.PI), 19 - lift(Math.PI), false);
    zeusLeg(pc, 18, 13 + bob, legX(17, 0), 19 - lift(0), false);
    zeusTail(pc, 6, 9 + bob, pose.tail ?? 0.6);
    // body
    pc.ellipse(13, 11 + bob, 7, 3, P.gold2);
    pc.hline(8, 18, 8 + bob, P.gold1);                 // sunlit back
    pc.hline(10, 16, 8 + bob, P.gold0);
    pc.hline(8, 18, 14 + bob, P.gold3);                // belly shadow
    for (let x = 9; x <= 17; x += 2) pc.px(x, 15 + bob, P.gold1);   // belly fringe
    pc.ellipse(19, 11 + bob, 2, 3, P.gold1);           // chest fluff
    pc.px(20, 13 + bob, P.gold0);
    pc.ellipse(7, 11 + bob, 2, 3, P.gold2);            // haunch
    pc.px(6, 10 + bob, P.gold1);
    // near legs
    zeusLeg(pc, 8, 13 + bob, legX(7, 0), 19 - lift(0), true);
    zeusLeg(pc, 19, 13 + bob, legX(18, Math.PI), 19 - lift(Math.PI), true);
    zeusCollar(pc, 19, 7 + bob + hdy, opts.bandana);
    zeusHead(pc, 22 + hdx, 6 + bob + hdy, pose);
  } else if (mode === 'sit') {
    zeusTail(pc, 8, 18, pose.tail ?? 0.1, 6);
    // upright torso, leaning back slightly like a proper good-boy sit
    pc.poly([[11, 18], [13, 8], [16, 5], [20, 6], [20, 18]], P.gold2);
    pc.line(13, 9, 15, 6, P.gold1);
    pc.line(16, 5, 19, 5, P.gold1);
    // haunch: rounded thigh folded on the ground
    pc.ellipse(12, 15, 4, 3, P.gold2);
    pc.line(9, 14, 11, 12, P.gold1);
    pc.px(10, 13, P.gold0);
    pc.hline(9, 15, 18, P.gold3);
    pc.rect(13, 18, 4, 1, P.gold1);                    // hind paw peeking out
    pc.px(16, 18, P.gold0);
    pc.ellipse(19, 11, 2, 4, P.gold1);                 // fluffy chest
    pc.px(20, 13, P.gold0); pc.px(19, 9, P.gold0);
    // front legs
    zeusLeg(pc, 17, 12, 17, 19, false);
    zeusLeg(pc, 19, 12, 19, 19, true);
    zeusCollar(pc, 18, 5 + hdy, opts.bandana);
    zeusHead(pc, 21 + hdx, 4 + hdy, pose);
  } else if (mode === 'lie') {
    zeusTail(pc, 5, 16, -0.2, 7);
    pc.ellipse(12, 16, 8, 3, P.gold2);
    pc.hline(6, 17, 13, P.gold1);
    pc.hline(8, 15, 13, P.gold0);
    pc.hline(5, 19, 18, P.gold3);
    pc.rect(18, 17, 7, 2, P.gold1);                    // paws stretched forward
    pc.px(24, 17, P.gold0);
    zeusCollar(pc, 18, 12 + hdy, opts.bandana);
    zeusHead(pc, 21 + hdx, 13 + hdy, pose);
  }
}

function zeusPoses() {
  const p = {};
  // trot: 6 frames, ears bounce, tail high and wagging
  p.trot = [];
  for (let i = 0; i < 6; i++) {
    const ph = i / 6;
    p.trot.push({ mode: 'stand', phase: ph, bob: i % 3 === 0 ? 0 : -1 + (i % 3 === 2 ? 1 : 0), tail: 0.7 + Math.sin(ph * TAU * 2) * 0.35, ear: i % 3 === 1 ? -1 : 1, mouth: 'tongue', eyes: 'open' });
  }
  // stand idle: tail wag (4 frames)
  p.stand = [0, 1, 2, 1].map((k) => ({ mode: 'stand', tail: 0.3 + k * 0.35, mouth: 'tongue', eyes: 'open' }));
  // sit + happy tail wag on the ground (4 frames, with a blink)
  p.sit = [0, 1, 2, 1].map((k, i) => ({ mode: 'sit', tail: -0.3 + k * 0.4, mouth: 'tongue', eyes: i === 3 ? 'closed' : 'open' }));
  // sniff the ground (3 frames)
  p.sniff = [0, 1, 2].map((k) => ({ mode: 'stand', head: [1, 6 + (k % 2)], tail: 0.9, eyes: 'open', ear: 1 }));
  // bark (2 frames: wind-up, BARK)
  p.bark = [
    { mode: 'stand', head: [0, -1], tail: 1.0, mouth: 'closed', eyes: 'open', ear: 0 },
    { mode: 'stand', head: [1, -2], tail: 1.2, mouth: 'open', eyes: 'closed', ear: -1, bob: -1 },
  ];
  // dizzy: sitting, X eyes, head wobble (2 frames)
  p.dizzy = [
    { mode: 'sit', head: [-1, 0], tail: -0.4, eyes: 'x', mouth: 'tongue' },
    { mode: 'sit', head: [1, 1], tail: -0.4, eyes: 'x', mouth: 'tongue' },
  ];
  // lying down, sleepy breathing (2 frames)
  p.lie = [
    { mode: 'lie', head: [0, 0], eyes: 'closed' },
    { mode: 'lie', head: [0, 1], eyes: 'closed' },
  ];
  // leap (1 frame)
  p.leap = [{ mode: 'stand', phase: 0.25, bob: -2, tail: 1.1, ear: -1, mouth: 'open', eyes: 'open' }];
  return p;
}

// ---------------------------------------------------------------------------
//  Sheet + animation registration
// ---------------------------------------------------------------------------
const ANIM_SPEC = {
  ben: { idle: 4, run: 14, jump: 1, fall: 1, hurt: 1, shoot: 12, runshoot: 14, jumpshoot: 1, fallshoot: 1, point: 1, talk: 6 },
  zeus: { trot: 14, stand: 7, sit: 6, sniff: 8, bark: 10, dizzy: 5, lie: 2, leap: 1 },
};
const LOOPING = new Set(['idle', 'run', 'runshoot', 'trot', 'stand', 'sit', 'sniff', 'dizzy', 'lie', 'talk']);

function registerSheet(scene, key, w, h, poses, draw, opts, outline) {
  const order = Object.keys(poses);
  const frames = [];
  const ranges = {};
  for (const name of order) {
    ranges[name] = [frames.length, frames.length + poses[name].length - 1];
    for (const pose of poses[name]) frames.push((pc) => draw(pc, pose, opts));
  }
  buildSheet(scene, key, w, h, frames, { outline });
  const fps = ANIM_SPEC[key.split('_')[0]];
  for (const name of order) {
    const animKey = `${key}_${name}`;
    if (scene.anims.exists(animKey)) scene.anims.remove(animKey);
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNumbers(key, { start: ranges[name][0], end: ranges[name][1] }),
      frameRate: fps?.[name] ?? 8,
      repeat: LOOPING.has(name) ? -1 : 0,
    });
  }
}

/** Generate Ben + Zeus sheets. Call again with new cosmetics to recolor. */
export function generateCharacters(scene, cosmetics = {}) {
  registerSheet(scene, 'ben', BEN_W, BEN_H, benPoses(), drawBen, { cap: cosmetics.cap, capDark: cosmetics.capDark }, P.outline);
  registerSheet(scene, 'zeus', ZEUS_W, ZEUS_H, zeusPoses(), drawZeus, { bandana: cosmetics.bandana }, P.outline);
}
