// ============================================================================
//  CREDITS — slow roll over the desert night with the Milky Way.
//  After the real ending ({ ending: true }) the roll is followed by the
//  post-credits stinger: Zeus's new collar glows, his eyes go green, and his
//  bark opens a portal... TO BE CONTINUED?
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Input } from '../systems/input.js';
import { Audio } from '../systems/audio.js';
import { applyFilm, shake } from '../systems/fx.js';
import { headText, bodyText, goTo, fadeIn, iconButton } from '../systems/ui.js';
import { CREDITS } from '../data/credits.js';
import endingSong from '../audio/music/ending.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;

export default class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }

  create(data) {
    fadeIn(this, 900);
    Input.configure({ mode: 'none' });
    this.ending = !!data?.ending;
    this.returnTo = data?.returnTo ?? 'Title';
    this.done = false;
    Audio.playMusic(endingSong, { section: 'roll', fade: 2 });
    Audio.playAmbience('desert_night');

    this.add.image(0, 0, 'nightsky').setOrigin(0);
    this.add.image(0, 0, 'nightsky_glow').setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    const r = new Phaser.Math.RandomDataGenerator(['credits']);
    for (let i = 0; i < 50; i++) {
      const s = this.add.image(r.between(0, W), r.between(0, 240), r.frac() < 0.2 ? 'star2' : 'star1').setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: s, alpha: 0.2, duration: r.between(800, 3000), yoyo: true, repeat: -1, delay: r.between(0, 2000) });
    }
    // occasional shooting stars
    this.time.addEvent({
      delay: 4500, loop: true, callback: () => {
        const x = r.between(150, W), y = r.between(10, 90);
        const st = this.add.image(x, y, 'streak').setBlendMode(Phaser.BlendModes.ADD).setAngle(155);
        this.tweens.add({ targets: st, x: x - 90, y: y + 40, alpha: 0, duration: 700, onComplete: () => st.destroy() });
      },
    });
    this.add.tileSprite(0, 220, W, 70, 'range_far').setOrigin(0).setTint(0x3a3a70);
    this.add.tileSprite(0, 262, W, 90, 'ridge').setOrigin(0).setTint(0x2a2448);
    this.add.tileSprite(0, 310, W, 90, 'floor').setOrigin(0).setTint(0x3a3058);
    // a campfire scene: Ben, Zeus and the glowing rig under the stars
    const gy = 336;
    this.add.image(300, gy - 8, 'glow').setScale(2.4).setTint(hexNum(P.fire2)).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    this.add.sprite(300, gy, 'campfire').setOrigin(0.5, 1).play('fire_burn');
    this.ben = this.add.sprite(330, gy, 'ben').setOrigin(0.5, 1).play('ben_idle').setFlipX(true);
    this.zeus = this.add.sprite(268, gy, 'zeus').setOrigin(0.5, 1).play('zeus_lie');
    if (this.ending) {
      this.add.sprite(372, gy, 'rig2').setOrigin(0.5, 1).play('rig2_glow');
      this.collarGlow = this.add.image(this.zeus.x + 8, gy - 8, 'glow').setScale(0.3).setTint(0x5dff9a).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    }
    this.add.image(470, gy + 1, 'van').setOrigin(0.5, 1).setTint(0x9a8ab8);

    // the roll
    const roll = this.add.container(W / 2, H + 10);
    this.roll = roll;
    let y = 0;
    for (const line of CREDITS) {
      if (line.gap) { y += 22 * line.gap; continue; }
      if (line.h) { y += 6; roll.add(headText(this, 0, y, line.h, 8, P.btc)); y += 20; }
      if (line.t) { roll.add(bodyText(this, 0, y, line.t, 16, P.cream, { ox: 0.5 })); y += 16; }
    }
    // dim band behind the text for readability over the scene
    this.band = this.add.rectangle(W / 2, H / 2, 380, H, 0x05060f, 0.55).setDepth(4);
    roll.setDepth(5);
    this.tweens.add({ targets: roll, y: -y - 20, duration: (y + H) * 34, ease: 'Linear', onComplete: () => this.afterRoll() });

    iconButton(this, 20, 20, 'back', () => this.leave());
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
    applyFilm(this);
  }

  async afterRoll() {
    if (!this.ending) return this.leave();
    await this.stinger();
    this.leave();
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }

  /** Post-credits: the collar wakes up. */
  async stinger() {
    if (this.done) return;
    this.tweens.add({ targets: [this.roll, this.band], alpha: 0, duration: 800 });
    this.cameras.main.pan(268, 300, 1500, 'Sine.easeInOut');
    this.cameras.main.zoomTo(2.2, 1500, 'Sine.easeInOut');
    await this.wait(2000);
    Audio.stopMusic(2);
    await this.wait(800);
    // the collar pulses... brighter...
    for (let i = 0; i < 3; i++) {
      Audio.sfx('ufo_warble', { volume: 0.3 + i * 0.2 });
      this.tweens.add({ targets: this.collarGlow, scale: 0.6 + i * 0.3, alpha: 1, duration: 300, yoyo: true });
      await this.wait(900);
    }
    // Zeus wakes up. His eyes glow green.
    this.zeus.play('zeus_sit');
    const eyes = this.add.image(this.zeus.x + 13, this.zeus.y - 14, 'glow').setScale(0.12).setTint(0x5dff9a).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: eyes, scale: 0.22, alpha: 0.7, duration: 200, yoyo: true, repeat: -1 });
    Audio.sfx('teleport');
    await this.wait(1400);
    this.zeus.play('zeus_bark');
    Audio.sfx('bark', { pitch: 0.7, volume: 1 });
    Audio.sfx('explosion', { volume: 0.4 });
    shake(this, 500, 0.01);
    // ...and a portal tears open in the desert
    const portal = this.add.sprite(this.zeus.x - 50, this.zeus.y - 30, 'portal').play('portal_spin').setScale(0.1);
    const pg = this.add.image(portal.x, portal.y, 'glow').setTint(0x5dff9a).setScale(0.1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: portal, scale: 0.8, duration: 700, ease: 'Back.Out' });
    this.tweens.add({ targets: pg, scale: 1.4, alpha: 0.7, duration: 700 });
    const hum = Audio.loop('ufo_hum', { volume: 0.5 });
    this.cameras.main.flash(300, 120, 255, 160);
    await this.wait(1400);
    this.ben.play('ben_jump');
    Audio.sfx('whine');
    await this.wait(900);
    // Ben's reaction (big, centered text since the camera is zoomed)
    const say = (text, delay) => this.time.delayedCall(delay, () => {
      const t = bodyText(this, this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 40, text, 16, P.white, { ox: 0.5 }).setScale(0.5);
      this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 400, onComplete: () => t.destroy() });
    });
    say('...Zeus?', 0);
    say('ZEUS, WHAT DID YOU DO?!', 1500);
    await this.wait(3400);
    hum.stop(1);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    await this.wait(700);
    // final card
    this.cameras.main.setZoom(1).setScroll(0, 0);
    this.children.list.forEach((c) => c.setVisible?.(false));
    this.cameras.main.fadeIn(600, 0, 0, 0);
    const t1 = headText(this, W / 2, H / 2 - 10, 'TO BE CONTINUED...?', 16, P.green1).setScrollFactor(0);
    const t2 = bodyText(this, W / 2, H / 2 + 14, 'Thanks for playing DREAMLAND HEIST.', 16, P.cream, { ox: 0.5 }).setScrollFactor(0);
    [t1, t2].forEach((t) => { t.setVisible(true).setAlpha(0); this.tweens.add({ targets: t, alpha: 1, duration: 900 }); });
    Audio.sfx('bark2', { delay: 1.2 });
    await this.wait(4500);
  }

  leave() {
    if (this.done) return;
    this.done = true;
    goTo(this, this.returnTo, {}, { duration: 900 });
  }
}
