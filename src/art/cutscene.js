// ============================================================================
//  CUTSCENE ART — Ben's trailer (inside at night, outside at dawn), black
//  government SUVs, and the mysterious note with coordinates.
// ============================================================================
import { P, mix, SKIES } from './palette.js';
import { PixelCanvas, addPixelTexture, buildSheet, rng, dither } from './pixel.js';
import { makeSky } from './environment.js';

// ---------------------------------------------------------------------------
//  INT. BEN'S TRAILER — NIGHT  (640x360 + glow layer)
// ---------------------------------------------------------------------------
export function makeTrailerInterior(scene) {
  const W = 640, H = 360;
  const pc = new PixelCanvas(W, H);
  const glow = new PixelCanvas(W, H);
  const r = rng(4);
  // faux wood paneling, darker than the van's (it's 3 AM)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = Math.floor(x / 26) % 2 ? '#3a2a30' : '#33242a';
    if (x % 26 === 0) c = '#20161c';
    if (y > 296) c = (x + y) % 9 === 0 ? '#1e1418' : '#2a1c22';                // carpet
    pc.px(x, y, c);
  }
  pc.rect(0, 294, W, 3, '#4a3438');                                             // baseboard
  // window with the desert night and a far-off light
  const wx = 60, wy = 90, ww = 150, wh = 96;
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) pc.px(wx + x, wy + y, dither(x, y, y / wh) ? '#1a1640' : '#0e0c2a');
  for (let i = 0; i < 40; i++) glow.px(wx + Math.floor(r() * ww), wy + Math.floor(r() * 60), '#8a86b8');
  for (let x = 0; x < ww; x++) { const m = 70 + Math.round(Math.sin(x / 17) * 6); for (let y = m; y < wh; y++) pc.px(wx + x, wy + y, '#221630'); }
  pc.rect(wx - 5, wy - 5, ww + 10, 5, '#5a4448'); pc.rect(wx - 5, wy + wh, ww + 10, 6, '#5a4448');
  pc.rect(wx - 5, wy, 5, wh, '#5a4448'); pc.rect(wx + ww, wy, 5, wh, '#5a4448'); pc.rect(wx + ww / 2 - 1, wy, 3, wh, '#5a4448');
  // blinds, half open
  for (let y = wy; y < wy + 40; y += 4) pc.hline(wx, wx + ww - 1, y, '#8a7a70');
  // posters
  pc.rect(250, 80, 54, 70, '#14102a'); pc.ellipse(277, 108, 16, 6, '#b5c0cc'); pc.ellipse(277, 103, 6, 4, '#7ff8ff');
  for (let y = 116; y < 140; y++) for (let x = 268 - (y - 116) / 2; x < 286 + (y - 116) / 2; x++) if (dither(x, y, 0.4)) pc.px(x, y, '#5dff9a');
  glow.ellipse(277, 103, 5, 3, '#3cf2ff');
  pc.rect(250, 142, 54, 8, '#c8423a');                                            // poster caption strip
  pc.rect(322, 86, 40, 52, '#f7931a'); pc.map(['##.', '#.#', '##.', '#.#', '##.'], { '#': '#fff6e0' }, 336, 104);
  pc.rect(334, 102, 1, 2, '#fff6e0');
  // desk + chair
  pc.rect(392, 222, 210, 8, '#5a3a2a'); pc.hline(392, 601, 222, '#8a5a3a');
  pc.rect(398, 230, 8, 66, '#3a2418'); pc.rect(588, 230, 8, 66, '#3a2418');
  // monitors (glowing)
  pc.rect(412, 168, 70, 48, '#151520'); pc.rect(440, 216, 14, 6, '#151520');
  glow.rect(416, 172, 62, 40, '#1a3a5a');
  for (let y = 176; y < 208; y += 4) glow.hline(420, 420 + Math.floor(r() * 50), y, '#3cf2ff');
  pc.rect(492, 176, 50, 38, '#151520'); glow.rect(495, 179, 44, 32, '#2a1a40');
  for (let k = 0; k < 6; k++) glow.rect(498 + k * 7, 205 - k * 4, 5, 4 + k * 4, '#f7931a');           // price chart going up
  // keyboard, energy drink cans, pizza box
  pc.rect(420, 218, 50, 4, '#2a2a3a');
  for (const x of [552, 560, 568]) { pc.rect(x, 206, 6, 16, '#5dbf6a'); pc.hline(x, x + 5, 206, '#c8d4e0'); }
  pc.rect(470, 284, 60, 10, '#c8a070'); pc.hline(470, 529, 284, '#e8c090');
  pc.rect(0, 0, W, 6, '#1a1014');
  addPixelTexture(scene, 'trailer_in_glow', glow);
  return addPixelTexture(scene, 'trailer_in', pc);
}

// ---------------------------------------------------------------------------
//  EXT. BEN'S TRAILER — DAWN: sky, the trailer itself (sprite), and the ground
// ---------------------------------------------------------------------------
export function makeTrailerExterior(scene) {
  makeSky(scene, 'sky_dawn', SKIES.sunrise, 640, 280);
  // single-wide trailer, 150x64, with satellite dishes and a tinfoil-covered window
  const pc = new PixelCanvas(150, 70);
  const oy = 6;
  pc.rect(4, oy + 10, 140, 46, '#e8dcc0');
  for (let y = oy + 10; y < oy + 56; y += 6) pc.hline(4, 143, y, '#cbbd9a');                       // siding
  pc.rect(4, oy + 34, 140, 6, '#5a9a90'); pc.hline(4, 143, oy + 34, '#7fc0b5');                     // teal stripe
  pc.rect(2, oy + 6, 144, 5, '#8a8070'); pc.hline(2, 145, oy + 6, '#b8ac94');                       // roof edge
  pc.rect(20, oy + 16, 26, 16, '#c8d4e0'); for (let k = 0; k < 8; k++) pc.px(22 + k * 3, oy + 18 + (k % 3) * 4, '#ffffff');   // foil window
  pc.rect(98, oy + 16, 30, 16, '#3a2a40'); pc.rect(100, oy + 18, 26, 12, '#ffb347');                 // lit window
  pc.rect(62, oy + 18, 20, 38, '#8a5a3a'); pc.rect(64, oy + 20, 16, 34, '#a87050'); pc.px(78, oy + 38, '#f5c542');   // door
  pc.rect(58, oy + 56, 28, 4, '#6a6a6a'); pc.rect(62, oy + 60, 20, 4, '#5a5a5a');                    // steps
  pc.rect(6, oy + 56, 136, 4, '#3a3038');                                                            // skirting
  // satellite dishes
  for (const [dx, s] of [[30, 1], [120, 0.7]]) {
    pc.vline(dx, oy - 4, oy + 6, '#8a8a9a');
    pc.ellipse(dx - 3, oy - 8, Math.round(5 * s), Math.round(7 * s), '#d0d8e0');
    pc.line(dx - 3, oy - 8, dx + 4, oy - 12, '#8a8a9a');
  }
  pc.outline(P.outline);
  addPixelTexture(scene, 'trailer_out', pc);
}

// ---------------------------------------------------------------------------
//  Black government SUV (side view, facing left) — 2 frames of grille lights
// ---------------------------------------------------------------------------
export function makeSUV(scene) {
  buildSheet(scene, 'suv', 84, 38, [0, 1].map((f) => (pc) => {
    const oy = 4;
    // body
    pc.rect(4, oy + 12, 78, 16, '#16161e');
    pc.poly([[14, oy + 12], [22, oy + 1], [66, oy + 1], [74, oy + 12]], '#16161e');
    pc.hline(22, 66, oy + 1, '#4a4a5a');
    pc.hline(4, 81, oy + 12, '#3a3a4a');
    // tinted windows with a sky reflection
    pc.poly([[17, oy + 11], [24, oy + 3], [42, oy + 3], [42, oy + 11]], '#2a2a40');
    pc.poly([[45, oy + 11], [45, oy + 3], [64, oy + 3], [70, oy + 11]], '#2a2a40');
    pc.line(27, oy + 4, 23, oy + 10, '#6a6a8a'); pc.line(52, oy + 4, 49, oy + 10, '#6a6a8a');
    // chrome bits, lights
    pc.rect(2, oy + 18, 4, 6, '#b5c0cc');                                   // front bumper (left)
    pc.rect(4, oy + 14, 3, 3, '#fff6e0');                                   // headlight
    pc.rect(80, oy + 14, 2, 4, '#c8423a');                                  // taillight
    pc.px(6, oy + 21, f ? P.red : '#3a3aff'); pc.px(8, oy + 21, f ? '#3a3aff' : P.red);   // flashing grille lights
    pc.hline(10, 76, oy + 20, '#2a2a36');
    // wheels
    for (const cx of [18, 66]) { pc.circle(cx, oy + 28, 7, '#0a0a10'); pc.circle(cx, oy + 28, 4, '#8a94a4'); pc.circle(cx, oy + 28, 2, '#2a2a36'); }
  }), { outline: P.outline });
  if (!scene.anims.exists('suv_lights')) scene.anims.create({ key: 'suv_lights', frames: scene.anims.generateFrameNumbers('suv', { start: 0, end: 1 }), frameRate: 6, repeat: -1 });
}

/** The note left behind: coordinates scrawled on a torn page. */
export function makeNote(scene) {
  const pc = new PixelCanvas(220, 130);
  const r = rng(9);
  for (let y = 0; y < 130; y++) for (let x = 0; x < 220; x++) {
    const tear = (y < 6 && x % 13 < (6 - y)) || (x > 214 && y % 11 < (x - 214));
    if (tear) continue;
    let c = (y % 14 === 13) ? '#b8c8d8' : '#f2ead2';
    if (x === 24) c = '#e09090';
    if (r() < 0.03) c = mix(c, '#c8b890', 0.5);
    pc.px(x, y, c);
  }
  pc.outline('#00000060');
  return addPixelTexture(scene, 'note', pc);
}
