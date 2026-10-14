// ============================================================================
//  BOOT — wait for fonts, load any file overrides, then generate every
//  procedural texture step by step with an animated loading bar.
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { ART_STEPS, FILE_OVERRIDES } from '../art/assets.js';
import { P, hexNum } from '../art/palette.js';
import { FONT_HEAD, FONT_BODY } from '../art/ui.js';
import { applyCosmetics } from '../systems/progress.js';

const QUIPS = [
  'LINING HAT WITH TINFOIL...',
  'SYNCING THE BLOCKCHAIN...',
  'TEACHING ZEUS TO SIT...',
  'POLISHING THE RUST ON THE VAN...',
  'TRIANGULATING GROOM LAKE...',
  'DECRYPTING SUSPICIOUS SIGNAL...',
  'HIDING FROM BLACK SUVS...',
];

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    for (const [key, def] of Object.entries(FILE_OVERRIDES)) {
      if (def.frameWidth) this.load.spritesheet(key, def.url, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
      else this.load.image(key, def.url);
    }
  }

  async create() {
    const W = GAME.WIDTH, H = GAME.HEIGHT;
    this.cameras.main.setBackgroundColor(P.ink);
    // bar frame (drawn with shapes so it shows before fonts are ready)
    const bw = 260, bh = 8, bx = (W - bw) / 2, by = H / 2 + 10;
    this.add.rectangle(W / 2, by + bh / 2, bw + 6, bh + 6, hexNum(P.ink3)).setStrokeStyle(1, hexNum(P.ink4));
    const fill = this.add.rectangle(bx, by, 1, bh, hexNum(P.btc)).setOrigin(0, 0);
    const shine = this.add.rectangle(bx, by, 1, 2, hexNum(P.btc0)).setOrigin(0, 0);
    // pulsing glow dot riding the bar's tip
    const tip = this.add.rectangle(bx, by + bh / 2, 4, bh + 4, hexNum(P.btc1));
    this.tweens.add({ targets: tip, alpha: 0.3, duration: 300, yoyo: true, repeat: -1 });

    await this.waitForFonts();

    const title = this.add.text(W / 2, by - 26, 'DREAMLAND HEIST', { fontFamily: FONT_HEAD, fontSize: '16px', color: P.btc }).setOrigin(0.5);
    title.setShadow(0, 2, P.sky3, 0, false, true);
    const quip = this.add.text(W / 2, by + 26, QUIPS[0], { fontFamily: FONT_BODY, fontSize: '16px', color: P.cream2 }).setOrigin(0.5);
    this.tweens.add({ targets: title, alpha: { from: 0, to: 1 }, duration: 400 });

    const steps = ART_STEPS.filter((s) => !s.keys.every((k) => this.textures.exists(k) && FILE_OVERRIDES[k]));
    let done = 0;
    const setProgress = (t) => {
      fill.width = Math.max(1, bw * t);
      shine.width = fill.width;
      tip.x = bx + fill.width;
    };
    for (const step of steps) {
      try {
        step.gen(this);
      } catch (e) {
        console.error('[boot] art step failed', step.keys, e);
      }
      done++;
      setProgress(done / steps.length);
      if (done % 3 === 0) quip.setText(QUIPS[(done / 3) % QUIPS.length | 0]);
      // yield a frame so the bar animates and the browser stays responsive
      await new Promise((r) => requestAnimationFrame(() => r()));
    }
    applyCosmetics(this);   // re-skin Ben, Zeus and the van with equipped cosmetics
    setProgress(1);
    quip.setText('READY.');

    this.scene.launch('Controls');
    this.time.delayedCall(250, () => {
      this.cameras.main.fadeOut(300, 11, 10, 26);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        // dev shortcut: #Chapter5 or #Chapter5@120 (start column) jumps straight in
        const m = /^#(\w+)(?:@(\d+))?/.exec(window.location.hash);
        if (m && this.scene.manager.keys[m[1]]) {
          this.registry.set('debugCol', m[2] ? parseInt(m[2], 10) : null);
          this.scene.start(m[1]);
        } else this.scene.start('Title');
        this.scene.bringToTop('Controls');
      });
    });
  }

  async waitForFonts() {
    if (!document.fonts?.load) return;
    const timeout = new Promise((r) => setTimeout(r, 3500));
    try {
      await Promise.race([
        Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('16px "VT323"')]),
        timeout,
      ]);
    } catch (_) { /* fall back to monospace */ }
  }
}
