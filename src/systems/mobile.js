// ============================================================================
//  MOBILE GUARDS — stop scroll / pinch-zoom / double-tap-zoom, and run the
//  animated "rotate your phone" screen (Zeus tilting his head) in portrait.
// ============================================================================
import { PixelCanvas } from '../art/pixel.js';
import { P } from '../art/palette.js';

export function installMobileGuards() {
  const stop = (e) => e.preventDefault();
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('gesturechange', stop, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  let lastEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastEnd < 300 && e.cancelable) e.preventDefault();
    lastEnd = now;
  }, { passive: false });
  document.addEventListener('contextmenu', stop);
}

/** Front-facing Zeus head (32x32) for the rotate screen. */
function drawZeusFace(pc, blink) {
  const g = { a: P.gold0, b: P.gold1, c: P.gold2, d: P.gold3, e: P.gold4 };
  // ears
  pc.ellipse(6, 15, 4, 8, g.d); pc.ellipse(25, 15, 4, 8, g.d);
  pc.ellipse(6, 17, 3, 6, g.e); pc.ellipse(25, 17, 3, 6, g.e);
  // head
  pc.ellipse(16, 14, 10, 10, g.c);
  pc.ellipse(16, 10, 8, 6, g.b);
  pc.ellipse(14, 7, 4, 2, g.a);
  // muzzle
  pc.ellipse(16, 21, 6, 5, g.b);
  pc.ellipse(16, 20, 4, 3, g.a);
  // nose
  pc.rect(14, 17, 5, 3, P.nose); pc.px(15, 17, '#5a4040');
  pc.px(16, 20, P.nose); pc.hline(14, 18, 21, P.nose);
  // tongue
  pc.rect(15, 22, 3, 3, P.tongue); pc.px(16, 24, '#c84a5a');
  // eyes
  if (blink) { pc.hline(10, 12, 13, P.ink); pc.hline(19, 21, 13, P.ink); }
  else {
    pc.rect(10, 11, 3, 3, P.ink); pc.rect(19, 11, 3, 3, P.ink);
    pc.px(10, 11, P.white); pc.px(19, 11, P.white);
  }
  // brows (the puppy-eyes tilt)
  pc.hline(9, 12, 9, g.d); pc.hline(19, 22, 9, g.d);
  // collar
  pc.rect(9, 27, 14, 3, P.collar); pc.rect(15, 29, 3, 3, P.btc1);
  pc.outline(P.outline);
}

export function initRotateScreen(game) {
  const el = document.getElementById('rotate');
  const cv = document.getElementById('rotate-zeus');
  if (cv) {
    const frames = [false, true].map((b) => { const pc = new PixelCanvas(32, 32); drawZeusFace(pc, b); return pc.toCanvas(); });
    const ctx = cv.getContext('2d');
    let i = 0;
    const draw = () => { ctx.clearRect(0, 0, 32, 32); ctx.drawImage(frames[i], 0, 0); };
    draw();
    setInterval(() => { i = Math.random() < 0.12 ? 1 : 0; draw(); }, 220);
  }
  // Pause the game loop while the rotate screen is showing (saves battery).
  const mq = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
  const apply = () => {
    const portrait = mq.matches;
    el?.classList.toggle('show', portrait);
    if (portrait) game.loop.sleep();
    else {
      game.loop.wake();
      // the scale manager doesn't update while asleep: re-measure after rotation settles
      [50, 300, 800].forEach((ms) => setTimeout(() => game.scale.refresh(), ms));
    }
  };
  mq.addEventListener?.('change', apply);
  window.addEventListener('resize', apply);
  apply();
}
