// ============================================================================
//  SETTINGS — overlay panel usable from the title screen and the pause menu.
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Save } from '../systems/save.js';
import { Audio } from '../systems/audio.js';
import { headText, bodyText, slider, toggle, signButton } from '../systems/ui.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;

export default class SettingsScene extends Phaser.Scene {
  constructor() { super('Settings'); }

  init(data) { this.from = data?.from; }

  create() {
    const parent = this.from && this.scene.get(this.from);
    if (parent?.input) parent.input.enabled = false;

    const dim = this.add.rectangle(0, 0, W, H, hexNum(P.ink), 0.0).setOrigin(0).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.65, duration: 200 });

    const panel = this.add.container(W / 2, H / 2);
    const bg = this.add.image(0, 0, 'panel');
    panel.add(bg);
    panel.add(headText(this, 0, -100, 'SETTINGS', 16, P.btc));
    panel.add(this.add.rectangle(0, -86, 200, 1, hexNum(P.cyan3)));

    const s = Save.settings;
    const rows = [
      { label: 'MUSIC', type: 'slider', key: 'music', min: 0, max: 1, color: P.btc },
      { label: 'SOUND FX', type: 'slider', key: 'sfx', min: 0, max: 1, color: P.btc,
        after: () => Audio.sfx('coin', { volume: 0.8, minGap: 250 }) },
      { label: 'CONTROL SIZE', type: 'slider', key: 'controlSize', min: 0.75, max: 1.35, color: P.cyan2 },
      { label: 'CONTROL OPACITY', type: 'slider', key: 'controlOpacity', min: 0.25, max: 1, color: P.cyan2 },
      { label: 'SCREEN SHAKE', type: 'toggle', key: 'shake' },
      { label: 'VIBRATION', type: 'toggle', key: 'vibration' },
      { label: 'FILM GRAIN', type: 'toggle', key: 'film' },
    ];
    rows.forEach((row, i) => {
      const y = -70 + i * 21;
      panel.add(bodyText(this, -128, y, row.label, 16, P.cream, { oy: 0.5 }));
      if (row.type === 'slider') {
        const sl = slider(this, 10, y, 110, s[row.key], (v) => { Save.setSetting(row.key, v); row.after?.(); }, { min: row.min, max: row.max, color: row.color });
        panel.add(sl);
      } else {
        panel.add(toggle(this, 100, y, s[row.key], (v) => Save.setSetting(row.key, v)));
      }
    });

    const back = signButton(this, 52, 92, 'DONE', () => this.close(), { texture: 'sign_small', sfx: 'ui_back' });
    // escape hatch if sound ever stops: rebuilds the whole audio engine
    const reset = signButton(this, -52, 92, 'RESET AUDIO', () => { Audio.hardReset('settings button'); this.time.delayedCall(400, () => Audio.sfx('ui_confirm')); }, { texture: 'sign_small', size: 8 });
    reset.label.setScale(0.6);
    panel.add(reset);
    panel.add(back);
    this.input.keyboard?.on('keydown-ESC', () => this.close());

    panel.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.Out' });
    this.panel = panel;
    this.dim = dim;
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    this.tweens.add({ targets: this.panel, scale: 0.9, alpha: 0, duration: 160 });
    this.tweens.add({
      targets: this.dim, fillAlpha: 0, duration: 180, onComplete: () => {
        const parent = this.from && this.scene.get(this.from);
        if (parent?.input) parent.input.enabled = true;
        parent?.events.emit('settings-closed');
        this.scene.stop();
      },
    });
  }
}
