// ============================================================================
//  PAUSE — overlay for every chapter: resume, restart, settings, quit.
//  Launch with: this.scene.launch('Pause', { from: this.scene.key })
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { headText, signButton } from '../systems/ui.js';
import { goFullscreen } from '../systems/mobile.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;

export default class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  init(data) { this.from = data.from; }

  create() {
    this.prevLayout = Input.layout;
    Input.configure({ mode: 'none' });
    this.scene.pause(this.from);
    Audio.duck(true);
    Audio.sfx('ui_back');

    const dim = this.add.rectangle(0, 0, W, H, hexNum(P.ink), 0).setOrigin(0).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.7, duration: 160 });
    const title = headText(this, W / 2, 70, 'PAUSED', 16, P.btc);
    const sub = headText(this, W / 2, 92, 'ZEUS IS GUARDING THE SNACKS', 8, P.cream2);
    const items = [
      ['RESUME', () => this.resume(), 'sign_orange'],
      ['RESTART CHAPTER', () => this.leave(() => this.scene.get(this.from).scene.restart())],
      ['SETTINGS', () => { this.scene.launch('Settings', { from: 'Pause' }); this.scene.bringToTop('Settings'); }],
      ['QUIT TO TITLE', () => this.leave(() => this.scene.get(this.from).scene.start('Title'))],
    ];
    const btns = items.map(([label, fn, tex], i) => signButton(this, W / 2, 130 + i * 32, label, fn, { texture: tex ?? 'sign' }));
    [title, sub, ...btns].forEach((o, i) => {
      o.setAlpha(0);
      const y = o.y;
      o.y += 10;
      this.tweens.add({ targets: o, alpha: 1, y, duration: 220, delay: i * 40, ease: 'Back.Out' });
    });
    if (this.scale.fullscreen.available) {
      signButton(this, W / 2, 130 + 4 * 32, 'FULLSCREEN', () => (this.scale.isFullscreen ? this.scale.stopFullscreen() : goFullscreen(this)), { texture: 'sign' });
    }
    this.input.keyboard?.on('keydown-ESC', () => this.resume());
    this.input.keyboard?.on('keydown-P', () => this.resume());
  }

  resume() {
    Audio.duck(false);
    Input.configure(this.prevLayout);
    this.scene.resume(this.from);
    this.scene.stop();
  }

  leave(fn) {
    Audio.duck(false);
    Input.configure({ mode: 'none' });
    this.scene.resume(this.from);
    this.scene.stop();
    fn();
  }
}
