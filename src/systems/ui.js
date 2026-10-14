// ============================================================================
//  UI KIT — themed text, road-sign buttons, sliders, toggles, transitions.
//  Every interactive element gives hover + press feedback and a sound.
// ============================================================================
import Phaser from 'phaser';
import { P, hexNum } from '../art/palette.js';
import { FONT_HEAD, FONT_BODY } from '../art/ui.js';
import { Audio } from './audio.js';
import { vibrate } from './fx.js';

/** Header text (Press Start 2P). Sizes should be multiples of 8 for crispness. */
export function headText(scene, x, y, str, size = 8, color = P.white, opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT_HEAD, fontSize: `${size}px`, color, align: opts.align ?? 'center',
    stroke: opts.stroke ?? P.ink, strokeThickness: opts.strokeThickness ?? 0,
    shadow: opts.shadow === false ? undefined : { offsetX: 0, offsetY: size >= 16 ? 2 : 1, color: P.ink, blur: 0, fill: true },
    lineSpacing: opts.lineSpacing ?? 4,
  });
  t.setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
  return t;
}

/** Body text (VT323). */
export function bodyText(scene, x, y, str, size = 16, color = P.white, opts = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT_BODY, fontSize: `${size}px`, color, align: opts.align ?? 'left',
    wordWrap: opts.wrap ? { width: opts.wrap } : undefined, lineSpacing: opts.lineSpacing ?? 0,
    shadow: opts.shadow === false ? undefined : { offsetX: 0, offsetY: 1, color: P.ink, blur: 0, fill: true },
  });
  t.setOrigin(opts.ox ?? 0, opts.oy ?? 0);
  return t;
}

/**
 * Road-sign button. Returns a Container with .setEnabled(bool).
 * opts: { texture, size, color, onClick, sfx, icon, arrow }
 */
export function signButton(scene, x, y, label, onClick, opts = {}) {
  const c = scene.add.container(x, y);
  const tex = opts.texture ?? 'sign';
  const bg = scene.add.image(0, 0, tex).setOrigin(0.5);
  const text = headText(scene, opts.arrow ? -6 : 0, -1, label, opts.size ?? 8, opts.color ?? P.cream, { shadow: true });
  c.add([bg, text]);
  if (opts.arrow) {
    const arrow = headText(scene, bg.width / 2 - 14, -1, '>', 8, opts.color ?? P.cream);
    c.add(arrow);
    c.arrow = arrow;
  }
  c.bg = bg;
  c.label = text;
  c.setSize(bg.width, bg.height);
  c.setInteractive({ useHandCursor: true });
  c.enabled = true;

  const base = { sx: 1, sy: 1 };
  c.on('pointerover', () => {
    if (!c.enabled) return;
    Audio.sfx('ui_hover', { volume: 0.7 });
    scene.tweens.add({ targets: c, scaleX: 1.06, scaleY: 1.06, angle: opts.tilt ?? 0, duration: 140, ease: 'Back.Out' });
    if (c.arrow) scene.tweens.add({ targets: c.arrow, x: bg.width / 2 - 10, duration: 160, ease: 'Sine.Out' });
    bg.setTint(0xffffff);
  });
  c.on('pointerout', () => {
    scene.tweens.add({ targets: c, scaleX: base.sx, scaleY: base.sy, angle: 0, duration: 160, ease: 'Sine.Out' });
    if (c.arrow) scene.tweens.add({ targets: c.arrow, x: bg.width / 2 - 14, duration: 160 });
  });
  c.on('pointerdown', () => {
    if (!c.enabled) return;
    vibrate(8);
    scene.tweens.add({ targets: c, scaleX: 0.94, scaleY: 0.9, duration: 60, ease: 'Quad.Out' });
  });
  c.on('pointerup', () => {
    if (!c.enabled) return;
    Audio.sfx(opts.sfx ?? 'ui_click');
    // squash & stretch bounce, then fire
    scene.tweens.add({
      targets: c, scaleX: 1.08, scaleY: 1.1, duration: 90, ease: 'Quad.Out', yoyo: true,
      onComplete: () => c.setScale(1),
    });
    onClick?.();
  });
  c.setEnabled = (on) => {
    c.enabled = on;
    c.setAlpha(on ? 1 : 0.45);
    text.setColor(on ? (opts.color ?? P.cream) : P.cream2);
    return c;
  };
  return c;
}

/** Small round icon button (pause, fullscreen, back). */
export function iconButton(scene, x, y, icon, onClick, opts = {}) {
  const c = scene.add.container(x, y);
  const bg = scene.add.image(0, 0, 'btn_small');
  const ic = scene.add.image(0, 0, `icon_${icon}`);
  c.add([bg, ic]);
  c.setSize(bg.width + 6, bg.height + 6);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.12, duration: 120, ease: 'Back.Out' }));
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 120 }));
  c.on('pointerdown', () => { vibrate(8); scene.tweens.add({ targets: c, scale: 0.88, duration: 50 }); });
  c.on('pointerup', () => {
    Audio.sfx(opts.sfx ?? 'ui_click');
    scene.tweens.add({ targets: c, scale: 1, duration: 120, ease: 'Back.Out' });
    onClick?.();
  });
  c.setDepth(opts.depth ?? 500);
  return c;
}

/** Horizontal slider. value 0..1 (mapped to [min,max]). onChange(value) */
export function slider(scene, x, y, w, value, onChange, { min = 0, max = 1, color = P.cyan2, step = 0 } = {}) {
  const c = scene.add.container(x, y);
  const track = scene.add.rectangle(0, 0, w, 4, hexNum(P.ink3)).setOrigin(0, 0.5).setStrokeStyle(1, hexNum(P.ink4));
  const fill = scene.add.rectangle(0, 0, 1, 4, hexNum(color)).setOrigin(0, 0.5);
  const knob = scene.add.rectangle(0, 0, 7, 12, hexNum(P.white)).setStrokeStyle(1, hexNum(P.ink));
  c.add([track, fill, knob]);
  const set = (v, fire) => {
    v = Phaser.Math.Clamp(v, min, max);
    if (step) v = Math.round(v / step) * step;
    const t = (v - min) / (max - min);
    knob.x = t * w;
    fill.width = Math.max(1, t * w);
    c.value = v;
    if (fire) onChange?.(v);
  };
  set(value, false);
  const hit = scene.add.zone(w / 2, 0, w + 16, 26).setInteractive({ useHandCursor: true });
  c.add(hit);
  let dragging = false;
  let lastTick = 0;
  const fromPointer = (p) => {
    const local = p.x - c.getWorldTransformMatrix().tx;
    set(min + (local / w) * (max - min), true);
    if (scene.time.now - lastTick > 70) { Audio.sfx('ui_toggle', { volume: 0.5, minGap: 0 }); lastTick = scene.time.now; }
  };
  hit.on('pointerdown', (p) => { dragging = true; fromPointer(p); scene.tweens.add({ targets: knob, scaleY: 1.3, duration: 80 }); });
  scene.input.on('pointermove', (p) => { if (dragging && p.isDown) fromPointer(p); });
  scene.input.on('pointerup', () => { if (dragging) { dragging = false; scene.tweens.add({ targets: knob, scaleY: 1, duration: 100 }); } });
  c.set = set;
  return c;
}

/** ON/OFF toggle pill. */
export function toggle(scene, x, y, on, onChange) {
  const c = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, 34, 14, hexNum(P.ink3)).setStrokeStyle(1, hexNum(P.ink4));
  const dot = scene.add.rectangle(-8, 0, 14, 10, hexNum(P.cream2));
  const label = headText(scene, 0, 0, '', 8, P.white, { shadow: false });
  label.setScale(0.75);
  c.add([bg, dot, label]);
  const render = (v, anim) => {
    c.value = v;
    bg.setFillStyle(hexNum(v ? P.green4 : P.ink3));
    dot.setFillStyle(hexNum(v ? P.green1 : P.cream2));
    const tx = v ? 8 : -8;
    if (anim) scene.tweens.add({ targets: dot, x: tx, duration: 120, ease: 'Back.Out' }); else dot.x = tx;
  };
  render(on, false);
  c.setSize(40, 20);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerup', () => {
    render(!c.value, true);
    Audio.sfx('ui_toggle', { on: c.value });
    vibrate(8);
    onChange?.(c.value);
  });
  return c;
}

/** Fade out, then start another scene (with an optional music crossfade handled by the target). */
export function goTo(scene, key, data, { duration = 450, color = 0x0b0a1a } = {}) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.input.enabled = false;
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  scene.cameras.main.fadeOut(duration, r, g, b);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

export function fadeIn(scene, duration = 500) {
  scene._leaving = false;
  scene.cameras.main.fadeIn(duration, 11, 10, 26);
}

/**
 * Pin a container (and everything inside it) to the screen. Phaser's
 * container.setScrollFactor() alone doesn't move child hit areas, so taps on
 * buttons inside a scrolled camera would miss. Call after adding children.
 */
export function pinToScreen(container) {
  const walk = (o) => {
    o.setScrollFactor?.(0);
    o.list?.forEach(walk);
  };
  walk(container);
  return container;
}
