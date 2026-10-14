// ============================================================================
//  DIALOGUE PORTRAITS (48 x 48) — expressive faces, several emotions each.
//  Frame order per character is listed in PORTRAITS so dialogue scripts can
//  ask for e.g.  { who: 'ben', mood: 'shocked' }.
// ============================================================================
import { P } from './palette.js';
import { buildSheet } from './pixel.js';

export const PORTRAITS = {
  ben: ['happy', 'shocked', 'angry', 'smug', 'sad', 'talk'],
  zeus: ['happy', 'alert', 'sad', 'excited'],
};

// ---------------------------------------------------------------------------
function benFace(pc, mood) {
  // hoodie shoulders
  pc.ellipse(24, 50, 21, 12, P.hood1);
  pc.ellipse(24, 52, 21, 10, P.hood2);
  pc.ellipse(17, 42, 6, 4, P.hood0);
  pc.rect(19, 38, 10, 6, P.hood2);                     // hood opening
  pc.vline(20, 40, 46, P.cream); pc.vline(28, 40, 46, P.cream2);   // drawstrings
  pc.map(['##.', '#.#', '##.', '#.#'], { '#': P.btc }, 32, 43);
  // neck
  pc.rect(19, 33, 10, 7, P.skin2);
  // head
  pc.ellipse(24, 23, 11, 13, P.skin1);
  pc.ellipse(27, 25, 8, 11, P.skin1);
  for (let y = 14; y < 34; y++) pc.px(34 - Math.abs(y - 24) * 0.3, y, P.skin2);   // shaded right side
  pc.ellipse(18, 25, 3, 2, P.skin0);                  // cheek light
  pc.ellipse(12, 24, 2, 3, P.skin2); pc.ellipse(36, 24, 2, 3, P.skin2);           // ears
  // beard
  pc.ellipse(24, 32, 10, 6, P.beard);
  pc.rect(14, 26, 3, 6, P.beard); pc.rect(31, 26, 3, 6, P.beard);
  pc.ellipse(24, 34, 8, 5, P.beard2);
  for (const [x, y] of [[16, 30], [20, 35], [27, 36], [31, 31], [24, 37]]) pc.px(x, y, P.beard);
  // nose
  pc.vline(25, 22, 26, P.skin2); pc.hline(23, 26, 27, P.skin2); pc.px(22, 26, P.skin2);
  pc.px(24, 23, P.skin0);
  // mustache + mouth by mood
  pc.hline(19, 29, 29, P.beard2);
  const mouth = {
    happy: () => { pc.rect(20, 30, 9, 3, P.ink); pc.hline(21, 27, 30, P.white); pc.hline(22, 26, 32, P.tongue); },
    talk: () => { pc.rect(21, 30, 7, 3, P.ink); pc.hline(22, 26, 30, P.white); },
    shocked: () => { pc.ellipse(24, 32, 3, 3, P.ink); pc.px(24, 34, P.tongue); },
    angry: () => { pc.rect(20, 30, 9, 2, P.white); pc.hline(20, 28, 31, P.ink3); pc.px(20, 30, P.ink); pc.px(28, 30, P.ink); },
    smug: () => { pc.hline(22, 28, 31, P.ink); pc.px(28, 30, P.ink); pc.px(29, 30, P.ink); },
    sad: () => { pc.hline(21, 27, 32, P.ink); pc.px(20, 33, P.ink); pc.px(28, 33, P.ink); },
  };
  mouth[mood]();
  // eyes + brows by mood
  const eye = (x, y, kind) => {
    if (kind === 'wide') { pc.rect(x - 2, y - 2, 5, 5, P.white); pc.px(x, y, P.ink); }
    else if (kind === 'lid') { pc.rect(x - 2, y, 5, 2, P.white); pc.rect(x, y, 2, 2, P.ink); pc.hline(x - 2, x + 2, y - 1, P.skin2); }
    else if (kind === 'squint') { pc.hline(x - 2, x + 2, y, P.ink); pc.px(x - 2, y + 1, P.ink); pc.px(x + 2, y + 1, P.ink); }
    else { pc.rect(x - 2, y - 1, 5, 4, P.white); pc.rect(x, y - 1, 2, 3, P.ink); pc.px(x, y - 1, P.white); }
  };
  const brow = (x0, y0, x1, y1) => { pc.line(x0, y0, x1, y1, P.beard2); pc.line(x0, y0 + 1, x1, y1 + 1, P.beard); };
  const ex = [18, 30], ey = 21;
  if (mood === 'shocked') { eye(ex[0], ey, 'wide'); eye(ex[1], ey, 'wide'); brow(15, 15, 21, 14); brow(27, 14, 33, 15); }
  else if (mood === 'angry') { eye(ex[0], ey + 1, 'lid'); eye(ex[1], ey + 1, 'lid'); brow(15, 17, 21, 19); brow(27, 19, 33, 17); }
  else if (mood === 'smug') { eye(ex[0], ey + 1, 'lid'); eye(ex[1], ey, 'n'); brow(15, 18, 21, 18); brow(27, 16, 33, 15); }
  else if (mood === 'sad') { eye(ex[0], ey, 'n'); eye(ex[1], ey, 'n'); brow(15, 18, 21, 16); brow(27, 16, 33, 18); }
  else if (mood === 'happy') { eye(ex[0], ey, 'squint'); eye(ex[1], ey, 'squint'); brow(15, 16, 21, 16); brow(27, 16, 33, 16); }
  else { eye(ex[0], ey, 'n'); eye(ex[1], ey, 'n'); brow(15, 17, 21, 17); brow(27, 17, 33, 17); }
  // tinfoil-lined trucker cap
  pc.ellipse(24, 11, 13, 8, P.capR);
  pc.rect(11, 11, 27, 4, P.capR);
  pc.ellipse(20, 7, 6, 3, '#e86a5a');                  // crown highlight
  pc.ellipse(32, 11, 5, 5, P.capR2);                   // mesh side panel
  for (let y = 8; y < 15; y += 2) for (let x = 29; x < 37; x += 2) pc.px(x, y, P.capR);
  pc.px(24, 3, P.white); pc.px(25, 3, P.cream2);       // button
  // brim (front-facing) with shiny foil peeking underneath
  pc.ellipse(24, 15, 15, 3, P.capR2);
  pc.hline(10, 38, 14, P.capR);
  pc.hline(11, 37, 17, P.foil1);
  for (const x of [14, 19, 26, 33]) pc.px(x, 17, P.foil0);
  pc.px(9, 16, P.foil2); pc.px(39, 16, P.foil2);
  pc.outline(P.outline);
}

// ---------------------------------------------------------------------------
function zeusFace(pc, mood) {
  const g0 = P.gold0, g1 = P.gold1, g2 = P.gold2, g3 = P.gold3, g4 = P.gold4;
  const up = mood === 'alert' || mood === 'excited';
  // ears (perk up when alert)
  pc.ellipse(9, up ? 20 : 25, 6, 11, g3); pc.ellipse(39, up ? 20 : 25, 6, 11, g3);
  pc.ellipse(9, up ? 22 : 27, 4, 8, g4); pc.ellipse(39, up ? 22 : 27, 4, 8, g4);
  // chest fluff + collar
  pc.ellipse(24, 49, 18, 10, g2); pc.ellipse(24, 47, 12, 6, g1);
  for (const x of [12, 17, 31, 36]) pc.px(x, 43, g0);
  pc.rect(12, 38, 24, 4, P.collar); pc.hline(12, 35, 38, '#ff6a6a'); pc.rect(22, 41, 5, 5, P.btc1); pc.px(23, 42, P.white);
  // head
  pc.ellipse(24, 22, 15, 15, g2);
  pc.ellipse(24, 16, 12, 9, g1);
  pc.ellipse(21, 11, 6, 3, g0);
  // muzzle
  pc.ellipse(24, 30, 9, 7, g1);
  pc.ellipse(24, 28, 6, 4, g0);
  // nose
  pc.ellipse(24, 25, 4, 2, P.nose); pc.px(22, 24, '#5a4040'); pc.px(23, 24, '#4a3030');
  pc.vline(24, 27, 29, P.nose);
  // mouth
  if (mood === 'excited') {
    pc.ellipse(24, 33, 6, 4, P.ink); pc.ellipse(24, 35, 4, 3, P.tongue); pc.hline(19, 29, 30, P.nose);
  } else if (mood === 'sad') {
    pc.line(19, 31, 24, 30, P.nose); pc.line(24, 30, 29, 31, P.nose);
  } else if (mood === 'alert') {
    pc.hline(20, 28, 31, P.nose);
  } else {
    pc.line(18, 30, 24, 31, P.nose); pc.line(24, 31, 30, 30, P.nose);
    pc.rect(22, 32, 5, 6, P.tongue); pc.vline(24, 33, 37, '#c84a5a');
  }
  // eyes
  const ex = [16, 32], ey = 19;
  for (const x of ex) {
    if (mood === 'happy') { pc.line(x - 3, ey + 1, x, ey - 1, P.ink); pc.line(x, ey - 1, x + 3, ey + 1, P.ink); }
    else {
      const big = mood === 'sad' || mood === 'alert';
      pc.ellipse(x, ey, big ? 3 : 2, big ? 3 : 2, P.ink);
      pc.px(x - 1, ey - 1, P.white);
      if (big) pc.px(x + 1, ey + 1, '#4a3a5a');
    }
  }
  // brows (dogs have expressive brow tufts)
  if (mood === 'sad') { pc.line(12, 15, 18, 13, g3); pc.line(30, 13, 36, 15, g3); }
  else if (mood === 'alert') { pc.line(12, 13, 18, 14, g3); pc.line(30, 14, 36, 13, g3); }
  else { pc.hline(13, 18, 14, g3); pc.hline(30, 35, 14, g3); }
  pc.outline(P.outline);
}

// ---------------------------------------------------------------------------
function agentFace(pc, mood) {
  const s0 = P.skin0, s1 = P.skin1, s2 = P.skin2;
  // black suit, white shirt, thin tie
  pc.ellipse(24, 52, 22, 13, '#26263c');
  pc.poly([[18, 38], [24, 48], [30, 38]], P.white);
  pc.poly([[23, 40], [25, 40], [26, 47], [24, 49], [22, 47]], P.red2);
  pc.line(17, 39, 22, 47, '#3a3a56'); pc.line(31, 39, 26, 47, '#3a3a56');      // lapels
  pc.rect(20, 33, 9, 7, s2);
  // square jaw
  pc.ellipse(24, 23, 11, 13, s1);
  pc.rect(14, 24, 21, 10, s1);
  pc.hline(15, 33, 34, s2);
  for (let y = 16; y < 34; y++) pc.px(34, y, s2);
  pc.ellipse(18, 27, 3, 2, s0);
  pc.ellipse(12, 24, 2, 3, s2); pc.ellipse(36, 24, 2, 3, s2);
  pc.vline(37, 24, 32, '#b5c0cc'); pc.px(37, 33, '#8a94a4');                    // earpiece coil
  // slick hair
  pc.ellipse(24, 12, 12, 6, P.ink); pc.rect(12, 12, 4, 8, P.ink); pc.rect(32, 12, 4, 6, P.ink);
  pc.line(16, 9, 30, 8, '#3a3a56');
  // sunglasses (never come off)
  pc.rect(14, 19, 9, 5, P.ink); pc.rect(26, 19, 9, 5, P.ink); pc.hline(22, 26, 20, P.ink);
  pc.hline(15, 20, 20, '#5a5a7a'); pc.hline(27, 32, 20, '#5a5a7a');
  if (mood === 'smug') { pc.px(16, 21, P.white); pc.px(28, 21, P.white); }
  // mouth
  pc.vline(25, 24, 27, s2); pc.hline(23, 26, 28, s2);
  if (mood === 'smug') { pc.hline(21, 27, 30, '#7a4040'); pc.px(28, 29, '#7a4040'); }
  else pc.hline(20, 28, 30, '#7a4040');
  pc.outline(P.outline);
}
PORTRAITS.agent = ['stern', 'smug'];

export function makePortraits(scene) {
  buildSheet(scene, 'portrait_agent', 48, 48, PORTRAITS.agent.map((m) => (pc) => agentFace(pc, m)));
  buildSheet(scene, 'portrait_ben', 48, 48, PORTRAITS.ben.map((m) => (pc) => benFace(pc, m)));
  buildSheet(scene, 'portrait_zeus', 48, 48, PORTRAITS.zeus.map((m) => (pc) => zeusFace(pc, m)));
}

/** Frame index for a character's mood (falls back to the first). */
export function portraitFrame(who, mood) {
  const list = PORTRAITS[who] ?? [];
  return Math.max(0, list.indexOf(mood));
}
