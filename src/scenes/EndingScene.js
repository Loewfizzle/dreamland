// ============================================================================
//  ENDING — "Sunrise Over Dreamland"
//  The sled and Satoshi's ship land in the desert as dawn breaks. Satoshi
//  says goodbye, gives Ben his rig back (upgraded with alien tech) and Zeus a
//  tiny glowing collar, then launches into the sunrise. Then: the credits.
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Save } from '../systems/save.js';
import { Dialogue } from '../systems/dialogue.js';
import { applyFilm, shake } from '../systems/fx.js';
import { headText, goTo } from '../systems/ui.js';
import endingSong from '../audio/music/ending.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const GROUND = 318;

export default class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }

  create() {
    Input.configure({ mode: 'none' });
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(1500, 0, 0, 0);
    Audio.playMusic(endingSong, { section: 'dawn', fade: 3 });
    Audio.playAmbience('desert_day');
    applyFilm(this, { vignette: 1.05 });
    this.skipped = false;
    const skip = headText(this, W - 14, H - 12, 'SKIP >>', 8, P.cream, { ox: 1 }).setDepth(3000).setAlpha(0.7);
    skip.setInteractive({ useHandCursor: true }).on('pointerup', () => this.finish());
    this.build();
    this.run();
  }

  build() {
    // dawn sky with the sun rising behind the mesas
    this.add.image(0, 0, 'sky_dawn').setOrigin(0).setDisplaySize(W, 280);
    this.sunGlow = this.add.image(W / 2 + 40, 250, 'glow').setScale(5).setTint(0xffd59a).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.sun = this.add.image(W / 2 + 40, 280, 'sun').setTint(0xfff4d0);
    this.tweens.add({ targets: this.sun, y: 222, duration: 26000, ease: 'Sine.Out' });
    this.tweens.add({ targets: this.sunGlow, y: 214, alpha: 0.85, duration: 26000, ease: 'Sine.Out' });
    // god rays
    for (let i = 0; i < 5; i++) {
      const r = this.add.image(W / 2 + 40, 230, 'beam').setOrigin(0.5, 0).setScale(1.4, 1.4).setAngle(-70 + i * 35).setTint(0xffe6b0).setAlpha(0.06).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: r, alpha: 0.12, angle: r.angle + 3, duration: 4000 + i * 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    this.add.tileSprite(0, 200, W, 70, 'range_far').setOrigin(0).setTint(0xd8a8c0);
    this.add.tileSprite(0, 170, W, 132, 'mesa_mid').setOrigin(0).setTint(0xe8b8c0).setTilePosition(300, 0);
    this.add.tileSprite(0, 254, W, 90, 'ridge').setOrigin(0).setTint(0xb88aa0);
    this.add.tileSprite(0, GROUND - 10, W, 90, 'floor').setOrigin(0).setTint(0xffd0c0);
    this.add.image(W / 2 + 40, 250, 'glow_soft').setScale(10, 1).setTint(0xffc890).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    // dust motes in the morning light
    this.add.particles(0, 0, 'mote', {
      x: { min: 0, max: W }, y: { min: 160, max: H }, lifespan: 6000, speedX: { min: 4, max: 14 }, speedY: { min: -4, max: 2 },
      scale: { min: 0.3, max: 0.7 }, alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.5 },
      tint: [0xffe0a0, 0xffc890], frequency: 160, blendMode: 'ADD',
    });
    // the ship and the sled come down to land
    this.ship = this.add.image(-160, 120, 'sship').setDepth(5);
    this.shipGlow = this.add.image(-160, 120, 'sship_glow').setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
    this.sled = this.add.sprite(-80, 160, 'sled').play('sled_fly').setDepth(8);
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }
  tween(cfg) { return new Promise((r) => this.tweens.add({ ...cfg, onComplete: r })); }

  async run() {
    await this.wait(1200);
    Audio.sfx('whoosh', { dur: 1.2 });
    this.tween({ targets: [this.ship, this.shipGlow], x: 430, y: GROUND - 34, duration: 3600, ease: 'Sine.Out' });
    await this.tween({ targets: this.sled, x: 200, y: GROUND - 12, duration: 3200, ease: 'Sine.Out' });
    Audio.sfx('land');
    shake(this, 200, 0.004);
    this.sled.stop();
    if (this.skipped) return;
    // everyone climbs out
    this.ben = this.add.sprite(214, GROUND, 'ben').setOrigin(0.5, 1).play('ben_idle').setDepth(10).setAlpha(0);
    this.zeus = this.add.sprite(186, GROUND, 'zeus').setOrigin(0.5, 1).play('zeus_sit').setDepth(10).setAlpha(0);
    this.sat = this.add.sprite(372, GROUND, 'satoshi').setOrigin(0.5, 1).play('satoshi_idle').setDepth(10).setAlpha(0).setFlipX(true);
    this.tweens.add({ targets: [this.ben, this.zeus], alpha: 1, x: '+=40', duration: 700 });
    this.ben.play('ben_run'); this.zeus.play('zeus_trot');
    await this.wait(900);
    this.ben.play('ben_idle'); this.zeus.play('zeus_sit');
    Audio.sfx('door', { volume: 0.4 });
    await this.tween({ targets: this.sat, alpha: 1, x: 330, duration: 900 });
    if (this.skipped) return;
    await Dialogue.play(this, [
      { who: 'satoshi', mood: 'happy', text: 'Fifteen years. I had forgotten how a sunrise looks without walls around it.' },
      { who: 'ben', mood: 'talk', text: 'So it\'s true. You made Bitcoin... to buy a ride HOME?' },
      { who: 'satoshi', mood: 'wise', text: 'A stranded alien cannot open a bank account, Ben-human. So I built money that needs no permission.' },
      { who: 'satoshi', mood: 'wise', text: 'Every block was a tiny signal. Proof of work... proof that someone was still out here, listening.' },
      { who: 'ben', mood: 'shocked', text: 'And MY rig picked it up. I KNEW the hash rate was special!' },
      { who: 'satoshi', mood: 'happy', text: 'Your rig. They took it from you because of me. Let me return it... improved.' },
    ]);
    if (this.skipped) return;
    // the gift: Ben's rig, upgraded with alien crystals
    this.sat.play('satoshi_wave');
    const rig = this.add.sprite(this.sat.x - 30, GROUND - 60, 'rig2').play('rig2_glow').setDepth(12).setAlpha(0).setScale(0.5);
    const rigGlow = this.add.image(rig.x, rig.y, 'glow').setTint(0x5dff9a).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(11);
    Audio.sfx('reveal');
    this.tweens.add({ targets: rigGlow, alpha: 0.8, scale: 1.4, duration: 800 });
    await this.tween({ targets: rig, alpha: 1, scale: 1, duration: 800, ease: 'Back.Out' });
    await this.tween({ targets: [rig, rigGlow], x: this.ben.x + 34, y: GROUND - 2, duration: 1200, ease: 'Sine.InOut' });
    rig.setOrigin(0.5, 1).y = GROUND;
    rigGlow.setAlpha(0.4);
    this.sat.play('satoshi_idle');
    await Dialogue.play(this, [
      { who: 'ben', mood: 'shocked', text: 'Are those... alien crystals in my GPUs?! The hash rate on this thing must be—' },
      { who: 'satoshi', mood: 'wise', text: 'Use it kindly. And Zeus-dog... this is for you.' },
    ]);
    if (this.skipped) return;
    // the gift for Zeus: a tiny glowing collar
    const collar = this.add.image(this.sat.x, GROUND - 40, 'collar_alien').setDepth(12).setScale(0.3).setAlpha(0);
    this.tween({ targets: collar, alpha: 1, scale: 1, duration: 500, ease: 'Back.Out' });
    Audio.sfx('sparkle', { count: 10 });
    await this.wait(600);
    await this.tween({ targets: collar, x: this.zeus.x + 10, y: this.zeus.y - 22, scale: 0.6, duration: 1000, ease: 'Sine.InOut' });
    collar.destroy();
    const zg = this.add.image(this.zeus.x + 10, this.zeus.y - 14, 'glow').setTint(0x5dff9a).setScale(0.35).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(11);
    this.tweens.add({ targets: zg, alpha: 0.4, duration: 900, yoyo: true, repeat: -1 });
    this.zeus.play('zeus_bark');
    Audio.sfx('bark2');
    this.zeus.once('animationcomplete', () => this.zeus.play('zeus_sit'));
    Save.data.zeusCollar = true;          // he keeps it! (see the post-credits scene)
    Save.persist();
    await Dialogue.play(this, [
      { who: 'zeus', mood: 'excited', text: '*the proudest boof*' },
      { who: 'satoshi', mood: 'happy', text: 'It suits him. Thank you, both of you. Tell Dolores the apple pie was the best thing on this planet.' },
      { who: 'ben', mood: 'sad', text: 'Will we ever see you again?' },
      { who: 'satoshi', mood: 'wise', text: 'Keep your node running, Ben-human. Watch the blocks. You never know who is listening.' },
    ]);
    if (this.skipped) return;
    // goodbye: Satoshi boards, the ship lifts off into the sunrise
    Audio.queueSection('liftoff');
    this.sat.play('satoshi_wave');
    await this.wait(900);
    await this.tween({ targets: this.sat, x: 410, alpha: 0, duration: 900 });
    Audio.sfx('teleport');
    const engine = Audio.loop('ufo_hum', { volume: 0.5 });
    this.tweens.add({ targets: [this.ship, this.shipGlow], y: '-=14', duration: 400, yoyo: true, repeat: 2 });
    await this.wait(1300);
    this.ben.play('ben_point');
    const trail = this.add.particles(0, 0, 'px2', { follow: this.ship, followOffset: { x: -70, y: 0 }, lifespan: 800, speedX: { min: -80, max: -30 }, scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0x7ff8ff, 0xffc35c], frequency: 20, blendMode: 'ADD' }).setDepth(4);
    Audio.sfx('whoosh', { dur: 2 });
    this.tween({ targets: [this.ship, this.shipGlow], x: W / 2 + 40, y: 150, scale: 0.6, duration: 3200, ease: 'Sine.In' });
    await this.wait(3000);
    // it streaks into the sun and is gone
    this.tween({ targets: [this.ship, this.shipGlow], y: -60, scale: 0.1, duration: 900, ease: 'Quad.In' });
    await this.wait(700);
    engine.stop(1);
    trail.stop();
    this.cameras.main.flash(900, 255, 240, 200);
    Audio.sfx('golden');
    this.zeus.play('zeus_bark');
    this.zeus.once('animationcomplete', () => this.zeus.play('zeus_sit'));
    await this.wait(1500);
    this.ben.play('ben_idle');
    await Dialogue.play(this, [
      { who: 'ben', mood: 'happy', text: 'Safe travels, Satoshi.' },
      { who: 'ben', mood: 'smug', text: '...Zeus. We just broke into Area 51, beat a UFO, and our rig is now part alien.' },
      { who: 'ben', mood: 'happy', text: 'Let\'s go get some pie.' },
      { who: 'zeus', mood: 'excited', text: '*BOOF!*' },
    ]);
    // walk off into the morning
    this.ben.play('ben_run').setFlipX(true);
    this.zeus.play('zeus_trot').setFlipX(true);
    this.tweens.add({ targets: [this.ben, this.zeus, rig, rigGlow], x: '-=340', duration: 4200 });
    await this.wait(2600);
    this.finish();
  }

  finish() {
    if (this.skipped) return;
    this.skipped = true;
    Save.data.gameComplete = true;
    Save.persist();
    goTo(this, 'Credits', { ending: true }, { duration: 1500, color: 0x000000 });
  }
}
