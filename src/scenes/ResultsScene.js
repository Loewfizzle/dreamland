// ============================================================================
//  RESULTS — shared end-of-chapter screen. Animated tallies, golden bitcoin
//  slots, star stamps, bonus lines, and the sats total flying into the wallet.
//  Start with: this.scene.start('Results', { chapter: 'ch5', sats, coins,
//    coinsTotal, golden: [..3], time, clean, cleanLabel, stats: [[label, value]] })
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Save } from '../systems/save.js';
import { applyFilm, shake } from '../systems/fx.js';
import { headText, bodyText, signButton, goTo, fadeIn } from '../systems/ui.js';
import { recordResult } from '../systems/progress.js';
import { chapterById } from '../data/chapters.js';
import mapSong from '../audio/music/map.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const fmtTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export default class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }

  init(data) { this.data2 = data; }

  create() {
    const d = this.data2;
    const ch = chapterById(d.chapter);
    const res = recordResult(d.chapter, d);
    this.res = res;
    fadeIn(this, 500);
    Input.configure({ mode: 'none' });
    Audio.playMusic(mapSong, { fade: 2 });
    Audio.stopAmbience(1.5);

    // backdrop: night desert sky with drifting stars + horizon glow
    this.add.image(0, 0, 'sky_sunset').setOrigin(0).setTint(0x5a4a90);
    this.add.image(W / 2, 250, 'glow_soft').setScale(10, 1.6).setTint(hexNum(P.sky5)).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(0, 270, 'ridge').setOrigin(0).setTint(0x40305a);
    this.add.particles(0, 0, 'star2', {
      x: { min: 0, max: W }, y: { min: 0, max: 200 }, lifespan: 4000, speedY: { min: 2, max: 6 },
      alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.8 }, frequency: 120, blendMode: 'ADD',
    });

    const panel = this.add.image(W / 2, H / 2 + 6, 'panel').setScale(1.2, 1.18);
    panel.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: panel, scaleX: 1.2, scaleY: 1.18, alpha: 1, duration: 450, ease: 'Back.Out' });

    headText(this, W / 2, 46, `CHAPTER ${ch.num}`, 8, P.cyan1);
    const title = headText(this, W / 2, 64, ch.title, 16, P.btc);
    if (title.width > 300) title.setScale(300 / title.width);
    headText(this, W / 2, 82, 'COMPLETE!', 8, P.cream);

    // tally rows
    const rows = [['SATS COLLECTED', d.sats, 'num'], ...(d.stats ?? []), ['TIME', fmtTime(d.time), 'text']];
    let y = 106;
    let delay = 600;
    for (const [label, val, kind] of rows) {
      this.tally(y, label, val, kind ?? (typeof val === 'number' ? 'num' : 'text'), delay);
      y += 18;
      delay += 320;
    }

    // golden bitcoins
    const gy = y + 10;
    const goldLabel = bodyText(this, W / 2 - 130, gy, 'GOLDEN BITCOINS', 16, P.cream, { oy: 0.5 }).setAlpha(0);
    this.time.delayedCall(delay, () => goldLabel.setAlpha(1));
    for (let i = 0; i < 3; i++) {
      const got = !!d.golden[i];
      const g = this.add.sprite(W / 2 + 60 + i * 24, gy, 'golden', 0).setAlpha(0);
      this.time.delayedCall(delay + 150 + i * 220, () => {
        g.setAlpha(got ? 1 : 0.25).setTint(got ? 0xffffff : 0x666688).setScale(2);
        this.tweens.add({ targets: g, scale: 1, duration: 260, ease: 'Back.Out' });
        if (got) { g.play('golden_spin'); Audio.sfx('sparkle', { count: 5 }); } else Audio.sfx('ui_hover');
      });
    }
    delay += 900;

    // bonuses
    let by = gy + 22;
    for (const b of res.bonuses) {
      const t = bodyText(this, W / 2 - 130, by, `+ ${b.label}`, 16, P.green1, { oy: 0.5 }).setAlpha(0);
      const v = headText(this, W / 2 + 130, by, `+${b.sats}`, 8, P.green1, { ox: 1 }).setAlpha(0);
      this.time.delayedCall(delay, () => { t.setAlpha(1); v.setAlpha(1); Audio.sfx('coin', { combo: 4, volume: 0.6 }); });
      by += 16;
      delay += 260;
    }

    // stars
    const sy = by + 26;
    for (let i = 0; i < 3; i++) {
      const on = i < res.stars;
      const s = this.add.image(W / 2 - 44 + i * 44, sy, 'rating_star').setScale(1.6).setTint(on ? hexNum(P.btc1) : 0x3a3458).setAlpha(0);
      this.time.delayedCall(delay + i * 330, () => {
        s.setAlpha(1).setScale(4).setAngle(-30);
        this.tweens.add({ targets: s, scale: 1.6, angle: 0, duration: 320, ease: 'Back.Out' });
        if (on) {
          Audio.sfx('ui_confirm', { volume: 0.7 });
          shake(this, 80, 0.004);
          const burst = this.add.particles(s.x, s.y, 'px2', { speed: { min: 40, max: 120 }, lifespan: 500, alpha: { start: 1, end: 0 }, tint: hexNum(P.btc1), emitting: false, blendMode: 'ADD' });
          burst.explode(14);
        }
      });
    }
    delay += 1200;

    // wallet total
    const wallet = headText(this, W / 2, sy + 30, '', 8, P.cream).setAlpha(0);
    this.time.delayedCall(delay, () => {
      wallet.setAlpha(1);
      const o = { n: Save.data.sats - res.total };
      this.tweens.add({
        targets: o, n: Save.data.sats, duration: 900, ease: 'Quad.Out',
        onUpdate: () => wallet.setText(`WALLET: ${Math.round(o.n)} SATS`),
      });
      Audio.sfx('golden', { volume: 0.5 });
    });
    delay += 1000;

    this.time.delayedCall(delay, () => {
      const nextKey = d.next ?? 'VanShop';
      const cont = signButton(this, W / 2 + 70, H - 22, d.next ? 'CONTINUE' : 'VAN SHOP', () => goTo(this, nextKey), { texture: 'sign_orange', arrow: true });
      const replay = signButton(this, W / 2 - 70, H - 22, 'REPLAY', () => goTo(this, ch.scene));
      [cont, replay].forEach((b) => { b.setScale(0.85); b.setAlpha(0); this.tweens.add({ targets: b, alpha: 1, duration: 250 }); });
    });

    // tap anywhere to fast-forward the tallies
    this.input.once('pointerdown', () => { this.time.timeScale = 4; this.tweens.timeScale = 4; });
    applyFilm(this);
  }

  tally(y, label, val, kind, delay) {
    const l = bodyText(this, W / 2 - 130, y, label, 16, P.cream, { oy: 0.5 }).setAlpha(0);
    const v = headText(this, W / 2 + 130, y, kind === 'num' ? '0' : String(val), 8, P.white, { ox: 1 }).setAlpha(0);
    this.time.delayedCall(delay, () => {
      l.setAlpha(1); v.setAlpha(1);
      Audio.sfx('ui_hover');
      if (kind === 'num') {
        const o = { n: 0 };
        this.tweens.add({
          targets: o, n: val, duration: Math.min(900, 200 + val), ease: 'Quad.Out',
          onUpdate: () => { v.setText(String(Math.round(o.n))); if (Math.random() < 0.25) Audio.sfx('coin', { volume: 0.2, minGap: 60 }); },
        });
      }
    });
  }
}
