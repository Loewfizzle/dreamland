// ============================================================================
//  LIGHTING — a screen-sized lightmap multiplied over the scene.
//  Each frame the map is filled with the ambient (dark) color, then every
//  visible light is stamped on additively. Lights are plain objects you can
//  move/tweak freely: { x, y, radius, color, intensity, flicker, beam, ... }
//  Cheap enough for phones: one 640x360 render texture + a few dozen stamps.
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';

export class Lighting {
  constructor(scene, { ambient = 0x262038, depth = 900 } = {}) {
    this.scene = scene;
    this.ambient = ambient;
    this.lights = new Set();
    this.enabled = scene.renderer.type === Phaser.WEBGL;
    if (!this.enabled) return;
    this.rt = scene.add.renderTexture(0, 0, GAME.WIDTH, GAME.HEIGHT)
      .setOrigin(0).setScrollFactor(0).setDepth(depth).setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  /**
   * Add a light. opts:
   *  x, y        world position (or set `follow` to a game object + offset ox/oy)
   *  radius      px
   *  color       0xRRGGBB
   *  intensity   0..1+
   *  flicker     0..1 random flicker amount (fluorescent tubes, fire)
   *  pulse       { speed, amount } smooth breathing
   *  beam        true -> cone pointing down (uses 'beam' texture, w/h = width/length)
   */
  add(opts) {
    const l = { x: 0, y: 0, radius: 80, color: 0xffffff, intensity: 1, flicker: 0, on: true, ...opts };
    this.lights.add(l);
    return l;
  }

  remove(l) { this.lights.delete(l); }

  /** A brief light burst (muzzle flash, explosion) that fades out. */
  flash(x, y, radius, color, duration = 120, intensity = 1) {
    const l = this.add({ x, y, radius, color, intensity });
    this.scene.tweens.add({ targets: l, intensity: 0, radius: radius * 1.2, duration, ease: 'Quad.Out', onComplete: () => this.remove(l) });
    return l;
  }

  update(time) {
    if (!this.enabled) return;
    const cam = this.scene.cameras.main;
    const rt = this.rt;
    rt.fill(this.ambient, 1);
    const pad = 40;
    for (const l of this.lights) {
      if (!l.on || l.intensity <= 0.01) continue;
      let x = l.x, y = l.y;
      if (l.follow) {
        if (!l.follow.active) { this.lights.delete(l); continue; }
        x = l.follow.x + (l.ox ?? 0);
        y = l.follow.y + (l.oy ?? 0);
      }
      const sx = (x - cam.scrollX) * cam.zoom, sy = (y - cam.scrollY) * cam.zoom;
      const r = l.beam ? Math.max(l.w ?? 60, l.h ?? 160) : l.radius;
      if (sx < -r - pad || sx > GAME.WIDTH + r + pad || sy < -r - pad || sy > GAME.HEIGHT + r + pad) continue;
      let a = l.intensity;
      if (l.flicker) a *= 1 - Math.random() * l.flicker;
      if (l.pulse) a *= 1 - l.pulse.amount * (0.5 + 0.5 * Math.sin(time * 0.001 * l.pulse.speed + (l.phase ?? 0)));
      if (l.beam) {
        rt.stamp('beam', null, sx, sy, {
          originX: 0.5, originY: 0, scaleX: (l.w ?? 60) / 64, scaleY: (l.h ?? 160) / 256,
          tint: l.color, alpha: Math.min(1, a), blendMode: Phaser.BlendModes.ADD, angle: l.angle ?? 0,
        });
      } else {
        rt.stamp('glow', null, sx, sy, {
          scale: (l.radius * 2) / 128, tint: l.color, alpha: Math.min(1, a), blendMode: Phaser.BlendModes.ADD,
        });
      }
    }
  }

  destroy() {
    this.lights.clear();
    this.rt?.destroy();
  }
}
