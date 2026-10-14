// ============================================================================
//  HACKING MINI-GAMES (Chapter 4) — touch-friendly overlays.
//   wires(scene)  connect each colour on the left to its match on the right
//   simon(scene)  watch the light sequence, repeat it (3 rounds)
//   mine(scene)   "mine the block": tap the hash that starts with 000
//  Each returns a Promise that resolves to true (solved) or false (quit).
//  opts.onMistake() is called on every error (the scene applies a penalty).
// ============================================================================
import Phaser from 'phaser';
import { GAME, CH4 } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { vibrate, shake } from './fx.js';
import { headText, bodyText, pinToScreen } from './ui.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;

/** Shared frame: dim + terminal panel + title + close X. */
function frame(scene, title, subtitle, accent = P.green2) {
  const prevLayout = Input.layout;
  Input.configure({ mode: 'tap' });
  Audio.setLayer('hack', 1, 0.4);
  Audio.setLayer('hbell', 1, 0.4);
  Audio.sfx('ui_confirm', { volume: 0.6 });
  const root = scene.add.container(W / 2, H / 2).setDepth(3000);
  const dim = scene.add.rectangle(0, 0, W, H, 0x000000, 0.65).setInteractive();
  const g = scene.add.graphics();
  g.fillStyle(0x07120c, 0.96).fillRect(-200, -140, 400, 280);
  for (let y = -138; y < 140; y += 2) g.fillStyle(0x0f2418, 0.5).fillRect(-198, y, 396, 1);   // CRT lines
  g.lineStyle(2, hexNum(accent), 1).strokeRect(-200, -140, 400, 280);
  g.lineStyle(1, hexNum(accent), 0.4).strokeRect(-194, -134, 388, 268);
  const t = headText(scene, 0, -118, title, 8, accent);
  const st = bodyText(scene, 0, -102, subtitle, 16, P.cream2, { ox: 0.5, oy: 0.5 });
  const x = headText(scene, 184, -124, 'X', 8, P.cream);
  x.setInteractive(new Phaser.Geom.Rectangle(-10, -10, x.width + 20, x.height + 20), Phaser.Geom.Rectangle.Contains);
  root.add([dim, g, t, st, x]);
  root.setScale(0.9).setAlpha(0);
  scene.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 200, ease: 'Back.Out' });
  const api = {
    root, x,
    close(ok) {
      Audio.setLayer('hack', 0, 1);
      Audio.setLayer('hbell', 0, 1);
      scene.tweens.add({ targets: root, alpha: 0, scale: 0.95, duration: 180, onComplete: () => root.destroy() });
      Input.configure(prevLayout);
      return ok;
    },
    status(text, color = P.cream) {
      api.statusText?.destroy();
      api.statusText = headText(scene, 0, 118, text, 8, color);
      root.add(api.statusText);
      pinToScreen(root);
    },
    finalize() { pinToScreen(root); },
  };
  return api;
}

function granted(scene, api, resolve) {
  Audio.sfx('checkpoint');
  api.status('ACCESS GRANTED', P.green1);
  const flash = scene.add.rectangle(0, 0, 400, 280, hexNum(P.green2), 0.3).setBlendMode(Phaser.BlendModes.ADD);
  api.root.add(flash);
  pinToScreen(api.root);
  scene.tweens.add({ targets: flash, alpha: 0, duration: 600 });
  scene.time.delayedCall(900, () => resolve(api.close(true)));
}

function mistake(scene, api, opts, text = 'ERROR') {
  Audio.sfx('laser_zap', { volume: 0.5 });
  vibrate(40);
  shake(scene, 120, 0.004);
  api.status(text, P.red);
  opts.onMistake?.();
}

// ---------------------------------------------------------------------------
//  1. WIRES
// ---------------------------------------------------------------------------
export function wires(scene, opts = {}) {
  return new Promise((resolve) => {
    const api = frame(scene, 'SECURITY DOOR A', 'Drag each wire to the matching colour.');
    const cols = [P.red, P.btc1, P.cyan2, P.green2, '#c070ff'].slice(0, CH4.WIRES);
    const n = cols.length;
    const rightOrder = Phaser.Utils.Array.Shuffle([...cols.keys()]);
    const ys = cols.map((_, i) => -70 + i * (150 / (n - 1)));
    const left = [], right = [];
    const g = scene.add.graphics();
    api.root.add(g);
    cols.forEach((c, i) => {
      const l = scene.add.circle(-140, ys[i], 10, hexNum(c)).setStrokeStyle(2, 0xffffff);
      l.setInteractive({ useHandCursor: true, draggable: false });
      l.idx = i;
      left.push(l);
      const ri = rightOrder[i];
      const r = scene.add.circle(140, ys[i], 10, hexNum(cols[ri])).setStrokeStyle(2, 0xffffff);
      r.idx = ri;
      right.push(r);
      api.root.add([scene.add.rectangle(-160, ys[i], 30, 8, hexNum(cols[i]), 0.6), scene.add.rectangle(160, ys[i], 30, 8, hexNum(cols[ri]), 0.6), l, r]);
    });
    const done = new Set();
    let dragging = null;
    const redraw = (px, py) => {
      g.clear();
      for (const i of done) {
        const r = right.find((rr) => rr.idx === i);
        g.lineStyle(5, hexNum(cols[i]), 1).lineBetween(-140, ys[i], 140, r.y);
        g.lineStyle(1, 0xffffff, 0.6).lineBetween(-140, ys[i] - 1, 140, r.y - 1);
      }
      if (dragging !== null) g.lineStyle(5, hexNum(cols[dragging]), 0.85).lineBetween(-140, ys[dragging], px, py);
    };
    const toLocal = (p) => ({ x: p.x - W / 2, y: p.y - H / 2 });
    left.forEach((l) => l.on('pointerdown', () => { if (!done.has(l.idx)) { dragging = l.idx; Audio.sfx('ui_click', { volume: 0.5 }); } }));
    const move = (p) => { if (dragging !== null) { const q = toLocal(p); redraw(q.x, q.y); } };
    const up = (p) => {
      if (dragging === null) return;
      const q = toLocal(p);
      const hit = right.find((r) => Phaser.Math.Distance.Between(q.x, q.y, r.x, r.y) < 24);
      if (hit && hit.idx === dragging) {
        done.add(dragging);
        Audio.sfx('snip', { volume: 0.8 });
        Audio.sfx('ui_toggle', { on: true });
        hit.setStrokeStyle(3, hexNum(P.green1));
        api.status(`${done.size} / ${n} CONNECTED`, P.green1);
      } else if (hit) mistake(scene, api, opts, 'WRONG WIRE! -' + CH4.HACK_MISTAKE_PENALTY + 's');
      dragging = null;
      redraw();
      if (done.size === n) { cleanup(); granted(scene, api, resolve); }
    };
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', up);
    const cleanup = () => { scene.input.off('pointermove', move); scene.input.off('pointerup', up); };
    const quit = () => { cleanup(); resolve(api.close(false)); };
    api.x.on('pointerup', () => { Audio.sfx('ui_back'); quit(); });
    opts.registerAbort?.(quit);
    api.status('0 / ' + n + ' CONNECTED');
    api.finalize();
  });
}

// ---------------------------------------------------------------------------
//  2. SIMON (pattern / sequence)
// ---------------------------------------------------------------------------
export function simon(scene, opts = {}) {
  return new Promise((resolve) => {
    const api = frame(scene, 'SECURITY DOOR B', 'Watch the lights. Repeat the pattern.', P.cyan2);
    const pads = [
      { col: P.red, x: -64, y: -36, f: 330, glyph: '▲' }, { col: P.btc1, x: 64, y: -36, f: 392, glyph: '●' },
      { col: P.cyan2, x: -64, y: 52, f: 494, glyph: '■' }, { col: P.green2, x: 64, y: 52, f: 587, glyph: '◆' },
    ].map((p, i) => {
      const r = scene.add.rectangle(p.x, p.y, 104, 74, hexNum(p.col), 0.25).setStrokeStyle(2, hexNum(p.col));
      r.setInteractive({ useHandCursor: true });
      r.idx = i;
      api.root.add(r);
      // a little symbol so it's not colour-only
      const sym = scene.add.graphics();
      sym.fillStyle(hexNum(p.col), 0.8);
      if (i === 0) sym.fillTriangle(p.x, p.y - 12, p.x - 12, p.y + 10, p.x + 12, p.y + 10);
      if (i === 1) sym.fillCircle(p.x, p.y, 11);
      if (i === 2) sym.fillRect(p.x - 10, p.y - 10, 20, 20);
      if (i === 3) sym.fillPoints([{ x: p.x, y: p.y - 13 }, { x: p.x + 13, y: p.y }, { x: p.x, y: p.y + 13 }, { x: p.x - 13, y: p.y }], true);
      api.root.add(sym);
      return { ...p, r };
    });
    const light = (i, ms = 350) => {
      if (closed) return;
      const p = pads[i];
      p.r.setFillStyle(hexNum(p.col), 0.95);
      Audio.sfx('blip', { pitch: p.f, wave: 'triangle', volume: 0.9, minGap: 0 });
      scene.time.delayedCall(ms, () => { if (p.r.active) p.r.setFillStyle(hexNum(p.col), 0.25); });
    };
    let round = 0, seq = [], pos = 0, accepting = false, closed = false;
    const play = () => {
      accepting = false;
      pos = 0;
      api.status(`ROUND ${round + 1} / ${CH4.SIMON_ROUNDS.length}  -  WATCH`, P.cyan1);
      seq.forEach((s, k) => scene.time.delayedCall(700 + k * 520, () => !closed && light(s)));
      scene.time.delayedCall(700 + seq.length * 520, () => { if (!closed) { accepting = true; api.status('YOUR TURN', P.cream); } });
    };
    const newRound = () => {
      seq = Array.from({ length: CH4.SIMON_ROUNDS[round] }, () => Phaser.Math.Between(0, 3));
      play();
    };
    pads.forEach((p, i) => p.r.on('pointerdown', () => {
      if (!accepting) return;
      light(i, 200);
      if (seq[pos] !== i) {
        accepting = false;
        mistake(scene, api, opts, 'WRONG! -' + CH4.HACK_MISTAKE_PENALTY + 's  REPLAYING...');
        scene.time.delayedCall(900, () => !closed && play());
        return;
      }
      pos++;
      if (pos === seq.length) {
        accepting = false;
        round++;
        Audio.sfx('ui_confirm', { volume: 0.6 });
        if (round >= CH4.SIMON_ROUNDS.length) { closed = true; granted(scene, api, resolve); }
        else scene.time.delayedCall(500, () => !closed && newRound());
      }
    }));
    const quit = () => { closed = true; resolve(api.close(false)); };
    api.x.on('pointerup', () => { Audio.sfx('ui_back'); quit(); });
    opts.registerAbort?.(quit);
    api.finalize();
    newRound();
  });
}

// ---------------------------------------------------------------------------
//  3. MINE THE BLOCK (hash matching)
// ---------------------------------------------------------------------------
const HEX = '0123456789abcdef';
const randHash = (valid) => {
  let h = valid ? '000' : HEX[1 + Math.floor(Math.random() * 15)] + HEX[Math.floor(Math.random() * 16)];
  while (h.length < 12) h += HEX[Math.floor(Math.random() * 16)];
  return h;
};

export function mine(scene, opts = {}) {
  return new Promise((resolve) => {
    const api = frame(scene, 'VAULT LIFT  -  PROOF OF WORK', 'Tap the hash that starts with 000. Mine 3 blocks!', P.btc);
    api.root.add(headText(scene, 0, -82, 'TARGET  < 000fffffffff', 8, P.btc1));
    const cells = [];
    for (let i = 0; i < 8; i++) {
      const x = i % 2 ? 84 : -84, y = -50 + Math.floor(i / 2) * 34;
      const bg = scene.add.rectangle(x, y, 156, 26, 0x1a1408).setStrokeStyle(1, hexNum(P.btc2));
      bg.setInteractive({ useHandCursor: true });
      const t = bodyText(scene, x, y, '', 16, P.cream, { ox: 0.5, oy: 0.5 });
      api.root.add([bg, t]);
      cells.push({ bg, t, valid: false });
    }
    const blocks = [];
    for (let b = 0; b < CH4.MINE_BLOCKS; b++) {
      const r = scene.add.rectangle(-30 + b * 30, 96, 22, 16, 0x1a1408).setStrokeStyle(1, hexNum(P.btc2));
      api.root.add(r);
      blocks.push(r);
    }
    let mined = 0, closed = false, rolls = 0;
    const roll = () => {
      if (closed) return;
      rolls++;
      // roughly every other roll contains exactly one valid hash (always by the 3rd roll)
      const hasValid = rolls % 3 === 0 || Math.random() < 0.5;
      const vi = hasValid ? Phaser.Math.Between(0, 7) : -1;
      cells.forEach((c, i) => {
        c.valid = i === vi;
        c.t.setText(randHash(c.valid)).setColor(P.cream);
        c.bg.setFillStyle(0x1a1408);
      });
      Audio.sfx('ui_hover', { volume: 0.3, minGap: 0 });
    };
    cells.forEach((c) => c.bg.on('pointerdown', () => {
      if (closed) return;
      if (c.valid) {
        c.valid = false;
        c.bg.setFillStyle(hexNum(P.btc2));
        c.t.setColor(P.white);
        blocks[mined].setFillStyle(hexNum(P.btc));
        mined++;
        Audio.sfx('coin', { combo: mined * 2 });
        api.status(`BLOCK ${mined} MINED!`, P.btc1);
        if (mined >= CH4.MINE_BLOCKS) { closed = true; timer.remove(); granted(scene, api, resolve); }
        else { timer.reset({ delay: CH4.MINE_ROLL_MS, loop: true, callback: roll }); scene.time.delayedCall(250, () => !closed && roll()); }
      } else {
        c.bg.setFillStyle(0x3a0a10);
        mistake(scene, api, opts, 'INVALID HASH! -' + CH4.HACK_MISTAKE_PENALTY + 's');
      }
    }));
    const timer = scene.time.addEvent({ delay: CH4.MINE_ROLL_MS, loop: true, callback: roll });
    const quit = () => { closed = true; timer.remove(); resolve(api.close(false)); };
    api.x.on('pointerup', () => { Audio.sfx('ui_back'); quit(); });
    opts.registerAbort?.(quit);
    api.status('0 / ' + CH4.MINE_BLOCKS + ' BLOCKS');
    api.finalize();
    roll();
  });
}
