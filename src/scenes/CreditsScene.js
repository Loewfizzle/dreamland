// ============================================================================
//  CREDITS — slow roll over a starry desert night with the Milky Way.
//  (The full ending credits with the post-credits stinger come in Milestone 4.)
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Input } from '../systems/input.js';
import { applyFilm } from '../systems/fx.js';
import { headText, bodyText, goTo, fadeIn, iconButton } from '../systems/ui.js';
import { CREDITS } from '../data/credits.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;

export default class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }

  create(data) {
    fadeIn(this, 700);
    Input.configure({ mode: 'none' });
    this.returnTo = data?.returnTo ?? 'Title';
    this.cameras.main.setBackgroundColor(P.night0);

    // night sky: stars + a soft Milky Way band
    const band = this.add.image(W / 2, H / 2 - 30, 'glow_soft').setScale(10, 1.4).setAngle(-18).setTint(hexNum(P.night5)).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    void band;
    const r = new Phaser.Math.RandomDataGenerator(['credits']);
    for (let i = 0; i < 220; i++) {
      // denser along the galactic band
      let x = r.between(0, W), y = r.between(0, H - 40);
      if (i < 120) { const t = r.frac(); x = t * W; y = H / 2 - 30 - (t - 0.5) * W * Math.tan(18 * Math.PI / 180) + r.normal() * 22; }
      const k = r.frac() < 0.06 ? 'star3' : r.frac() < 0.25 ? 'star2' : 'star1';
      const s = this.add.image(x, y, k).setAlpha(r.realInRange(0.3, 1)).setBlendMode(Phaser.BlendModes.ADD);
      if (r.frac() < 0.3) s.setTint(r.pick([hexNum(P.cyan1), hexNum(P.btc0), hexNum(P.sky9)]));
      this.tweens.add({ targets: s, alpha: s.alpha * 0.3, duration: r.between(800, 3000), yoyo: true, repeat: -1, delay: r.between(0, 2000) });
    }
    this.add.image(0, H - 70, 'ridge').setOrigin(0).setTint(0x302040);

    // roll
    const roll = this.add.container(W / 2, H + 10);
    let y = 0;
    for (const line of CREDITS) {
      if (line.gap) { y += 22 * line.gap; continue; }
      if (line.h) { y += 6; roll.add(headText(this, 0, y, line.h, 8, P.btc)); y += 20; }
      if (line.t) { roll.add(bodyText(this, 0, y, line.t, 16, P.cream, { ox: 0.5 })); y += 16; }
    }
    this.tweens.add({ targets: roll, y: -y - 20, duration: (y + H) * 38, ease: 'Linear', onComplete: () => this.leave() });

    iconButton(this, 20, 20, 'back', () => this.leave());
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
    applyFilm(this);
  }

  leave() { goTo(this, this.returnTo); }
}
