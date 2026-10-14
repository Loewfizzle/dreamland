// ============================================================================
//  INTRO CUTSCENE — "Something In The Blockchain"
//  3:12 AM: Ben's rig decodes a hidden signal. Next morning: black SUVs,
//  federal agents, the rig is seized. A note left behind: Groom Lake.
//  Animated in-engine: camera moves, character movement, lights, effects.
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Save } from '../systems/save.js';
import { Dialogue } from '../systems/dialogue.js';
import { applyFilm, shake } from '../systems/fx.js';
import { headText, bodyText, goTo } from '../systems/ui.js';
import introSong from '../audio/music/intro.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;

export default class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  create() {
    Input.configure({ mode: 'none' });
    Audio.stopAmbience(1);
    Audio.playMusic(introSong, { fade: 2.5 });
    this.cameras.main.setBackgroundColor('#000000');
    applyFilm(this, { vignette: 1.25 });
    this.skipped = false;

    const skip = headText(this, W - 14, H - 12, 'SKIP INTRO >>', 8, P.cream, { ox: 1 }).setDepth(3000).setAlpha(0.7).setScrollFactor(0);
    skip.setInteractive({ useHandCursor: true }).on('pointerup', () => this.finish());
    this.run();
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }
  tween(cfg) { return new Promise((r) => this.tweens.add({ ...cfg, onComplete: r })); }

  async card(text, sub) {
    const t = headText(this, W / 2, H / 2 - 6, text, 8, P.cream).setDepth(2000).setAlpha(0).setScrollFactor(0);
    const s = sub ? bodyText(this, W / 2, H / 2 + 12, sub, 16, P.cream2, { ox: 0.5 }).setDepth(2000).setAlpha(0).setScrollFactor(0) : null;
    await this.tween({ targets: [t, s].filter(Boolean), alpha: 1, duration: 500 });
    await this.wait(1300);
    await this.tween({ targets: [t, s].filter(Boolean), alpha: 0, duration: 400 });
    t.destroy(); s?.destroy();
  }

  async run() {
    // ---------------------------------------------------------------- shot 1
    await this.card('OUTSIDE LAS VEGAS, NEVADA', '3:12 AM');
    if (this.skipped) return;
    const room = this.add.container(0, 0);
    room.add(this.add.image(0, 0, 'trailer_in').setOrigin(0).setTint(0xb8a8c8));
    const glow = this.add.image(0, 0, 'trailer_in_glow').setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    room.add(glow);
    const rig = this.add.sprite(560, 222, 'rig').setOrigin(0.5, 1).play('rig_spin');
    const rigGlow = this.add.image(560, 206, 'glow').setScale(1.4).setTint(hexNum(P.btc)).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    const monGlow = this.add.image(470, 194, 'glow_soft').setScale(2.2, 1.4).setTint(0x3c8af2).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    const ben = this.add.sprite(452, 297, 'ben').setOrigin(0.5, 1).play('ben_idle').setScale(2);
    const zeus = this.add.sprite(300, 297, 'zeus').setOrigin(0.5, 1).play('zeus_lie').setScale(2);
    room.add([rig, rigGlow, monGlow, ben, zeus]);
    this.tweens.add({ targets: rigGlow, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
    const zz = this.time.addEvent({
      delay: 900, loop: true, callback: () => {
        const z = headText(this, ben.x + 10, ben.y - 70, 'z', 8, P.cream);
        room.add(z);
        this.tweens.add({ targets: z, y: z.y - 24, x: z.x + 10, alpha: 0, duration: 1600, onComplete: () => z.destroy() });
      },
    });
    this.cameras.main.fadeIn(800, 0, 0, 0);
    // slow push-out from the desk to the whole room (zoom is around the screen centre)
    this.cameras.main.setZoom(1.25);
    this.cameras.main.zoomTo(1, 4000, 'Sine.easeInOut');
    await this.wait(2600);
    if (this.skipped) return;

    // the signal arrives
    zz.remove();
    Audio.queueSection('signal');
    Audio.sfx('glitch', { volume: 0.8 });
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 110, () => {
        const on = i % 2 === 0;
        rigGlow.setTint(on ? hexNum(P.green2) : hexNum(P.btc)).setAlpha(on ? 0.9 : 0.5).setScale(on ? 2.2 : 1.4);
        monGlow.setTint(on ? hexNum(P.green2) : 0x3c8af2).setAlpha(on ? 0.7 : 0.35);
      });
    }
    this.cameras.main.flash(250, 90, 255, 150);
    shake(this, 300, 0.006);
    await this.wait(700);
    rigGlow.setTint(hexNum(P.green2)).setAlpha(0.8).setScale(1.8);
    monGlow.setTint(hexNum(P.green2)).setAlpha(0.6);
    ben.play('ben_jump');
    this.tweens.add({ targets: ben, y: ben.y - 16, duration: 160, yoyo: true, ease: 'Quad.Out' });
    zeus.play('zeus_sit');
    Audio.sfx('whine');
    await this.wait(500);
    ben.play('ben_talk');
    await Dialogue.play(this, [
      { who: 'ben', mood: 'shocked', text: 'Whoa whoa WHOA. Block 840,000... there\'s data hidden in the coinbase!' },
      { who: 'ben', mood: 'talk', text: 'That\'s not a transaction, Zeus. It\'s a SIGNAL. Coordinates... and one word.' },
      { who: 'ben', mood: 'shocked', text: '"HELP."' },
      { who: 'zeus', mood: 'alert', text: '*tilts head*' },
      { who: 'ben', mood: 'smug', text: 'This is it, buddy. I\'m gonna be famous. Or arrested. Probably famous.' },
    ]);
    if (this.skipped) return;
    await this.tween({ targets: room, alpha: 0, duration: 600 });
    room.destroy(true);

    // ---------------------------------------------------------------- shot 2
    await this.card('THE NEXT MORNING');
    if (this.skipped) return;
    const ext = this.add.container(0, 0);
    ext.add(this.add.image(0, 0, 'sky_dawn').setOrigin(0));
    ext.add(this.add.image(420, 230, 'glow').setScale(4).setTint(0xffd59a).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD));
    ext.add(this.add.image(420, 236, 'sun').setTint(0xfff0c0));
    ext.add(this.add.tileSprite(0, 194, W, 70, 'range_far').setOrigin(0).setTint(0xd8b0c8));
    ext.add(this.add.tileSprite(0, 158, W, 132, 'mesa_mid').setOrigin(0).setTint(0xe0b8c0).setTilePosition(200, 0));
    ext.add(this.add.tileSprite(0, 254, W, 90, 'ridge').setOrigin(0).setTint(0xc8a0b0));
    ext.add(this.add.tileSprite(0, 298, W, 90, 'floor').setOrigin(0).setTint(0xf0c8c0));
    const trailer = this.add.image(330, 304, 'trailer_out').setOrigin(0.5, 1).setTint(0xf0d8d0);
    const van = this.add.image(140, 306, 'van').setOrigin(0.5, 1).setTint(0xf0d8d0);
    ext.add([trailer, van]);
    this.cameras.main.setZoom(1).setScroll(0, 0);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    Audio.playAmbience('desert_day');
    await this.wait(900);
    if (this.skipped) return;

    // the SUVs arrive
    Audio.queueSection('raid');
    const suvs = [0, 1].map((i) => {
      const s = this.add.sprite(W + 60 + i * 110, 306, 'suv').setOrigin(0.5, 1).play('suv_lights');
      ext.add(s);
      return s;
    });
    const dust = this.add.particles(0, 0, 'mote', {
      lifespan: 900, speedX: { min: 10, max: 40 }, speedY: { min: -20, max: -5 }, scale: { start: 1, end: 3 },
      alpha: { start: 0.4, end: 0 }, tint: hexNum(P.sand0), emitting: false,
    });
    ext.add(dust);
    const engine = Audio.loop('engine', { volume: 0.5, pan: 0.8 });
    engine.set({ rpm: 0.8 });
    const dustEv = this.time.addEvent({ delay: 40, loop: true, callback: () => suvs.forEach((s) => dust.explode(1, s.x + 36, s.y - 4)) });
    await Promise.all(suvs.map((s, i) => this.tween({ targets: s, x: 470 + i * 96, duration: 1500, ease: 'Cubic.Out' })));
    dustEv.remove();
    engine.set({ rpm: 0.1, pan: 0.3 });
    Audio.sfx('screech', { pan: 0.4 });
    shake(this, 250, 0.008);
    await this.wait(500);
    engine.stop(1);
    if (this.skipped) return;

    // agents step out and knock
    const agents = [0, 1].map((i) => {
      const a = this.add.sprite(suvs[i].x - 10, 306, 'agent').setOrigin(0.5, 1).setFlipX(true).play('agent_walk').setAlpha(0);
      ext.add(a);
      return a;
    });
    Audio.sfx('door', { volume: 0.5, pan: 0.5 });
    agents.forEach((a) => this.tweens.add({ targets: a, alpha: 1, duration: 200 }));
    await Promise.all(agents.map((a, i) => this.tween({ targets: a, x: 380 + i * 16, duration: 1400 + i * 200 })));
    agents.forEach((a) => a.play('agent_idle'));
    Audio.sfx('knock', { pan: 0.1 });
    await this.wait(400);
    await Dialogue.play(this, [
      { who: 'agent', mood: 'stern', text: 'FEDERAL AGENTS. Open up, Mr. Ben.' },
    ]);
    if (this.skipped) return;
    // in they go... out comes the rig
    await Promise.all(agents.map((a) => this.tween({ targets: a, x: 362, alpha: 0, duration: 500 })));
    Audio.sfx('thud', { volume: 0.6 });
    await this.wait(900);
    const carried = this.add.sprite(370, 286, 'rig').setOrigin(0.5, 1).setAlpha(0).play('rig_spin');
    ext.add(carried);
    agents.forEach((a, i) => { a.x = 356 + i * 30; a.play('agent_walk').setFlipX(false); });
    await this.tween({ targets: [...agents, carried], alpha: 1, duration: 300 });
    const benOut = this.add.sprite(362, 306, 'ben').setOrigin(0.5, 1).play('ben_run').setAlpha(0);
    const zeusOut = this.add.sprite(354, 306, 'zeus').setOrigin(0.5, 1).play('zeus_trot').setAlpha(0);
    ext.add([benOut, zeusOut]);
    this.tweens.add({ targets: [...agents], x: '+=90', duration: 1500 });
    this.tweens.add({ targets: carried, x: '+=90', duration: 1500 });
    this.time.delayedCall(500, () => { this.tweens.add({ targets: [benOut, zeusOut], alpha: 1, duration: 200 }); this.tweens.add({ targets: benOut, x: 400, duration: 900 }); this.tweens.add({ targets: zeusOut, x: 380, duration: 800 }); });
    await this.wait(1500);
    agents.forEach((a) => a.play('agent_idle').setFlipX(true));
    benOut.play('ben_talk');
    zeusOut.play('zeus_bark');
    Audio.sfx('bark2');
    await Dialogue.play(this, [
      { who: 'agent', mood: 'stern', text: 'This hardware is now property of the United States government. National Security Directive 51.' },
      { who: 'ben', mood: 'angry', text: 'That\'s MY hash rate! You can\'t seize a man\'s HASH RATE!' },
      { who: 'agent', mood: 'smug', text: 'Watch us. And Mr. Ben? You never saw any signal.' },
      { who: 'zeus', mood: 'excited', text: '*GRRR-BARK!*' },
    ]);
    if (this.skipped) return;

    // they drive off; a note flutters out of a door
    await Promise.all(agents.map((a, i) => this.tween({ targets: a, x: suvs[i].x - 10, alpha: 0, duration: 700 })));
    carried.destroy();
    const engine2 = Audio.loop('engine', { volume: 0.5, pan: 0.5 });
    engine2.set({ rpm: 0.9 });
    const dustEv2 = this.time.addEvent({ delay: 40, loop: true, callback: () => suvs.forEach((s) => dust.explode(1, s.x + 36, s.y - 4)) });
    suvs.forEach((s) => s.setFlipX(true));
    const note = this.add.image(480, 270, 'note').setScale(0.06).setTint(0xffffff);
    ext.add(note);
    this.tweens.add({ targets: note, x: 430, y: 302, angle: 720, duration: 1600, ease: 'Sine.Out' });
    Audio.sfx('whoosh', { volume: 0.5 });
    await Promise.all(suvs.map((s, i) => this.tween({ targets: s, x: W + 120 + i * 120, duration: 1400, ease: 'Cubic.In' })));
    dustEv2.remove();
    engine2.stop(1.2);
    zeusOut.play('zeus_trot');
    await this.tween({ targets: zeusOut, x: 424, duration: 600 });
    zeusOut.play('zeus_sniff');
    Audio.sfx('sniff');
    benOut.play('ben_run');
    await this.tween({ targets: benOut, x: 440, duration: 500 });
    benOut.play('ben_idle');
    await this.wait(300);
    if (this.skipped) return;

    // ---------------------------------------------------------------- the note
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0).setDepth(1500);
    const big = this.add.container(W / 2, H / 2 - 30).setDepth(1501).setScale(0.3).setAlpha(0);
    big.add(this.add.image(0, 0, 'note').setScale(1.4));
    const font = { fontFamily: '"VT323", monospace', fontSize: '28px', color: '#2a2a6a' };
    big.add(this.add.text(-128, -64, '37°14\'06"N  115°48\'40"W', font).setRotation(-0.03));
    big.add(this.add.text(-128, -28, 'HANGAR 18', { ...font, color: '#8a2a2a' }).setRotation(-0.02));
    big.add(this.add.text(-128, 6, 'The signal is real.', font).setRotation(-0.03));
    big.add(this.add.text(-128, 36, 'Get him out.   - D', font).setRotation(-0.025));
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 300 });
    Audio.sfx('ui_confirm', { volume: 0.5 });
    await this.tween({ targets: big, scale: 1, alpha: 1, angle: -3, duration: 450, ease: 'Back.Out' });
    await this.wait(900);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'shocked', text: 'These coordinates... that\'s Groom Lake. That\'s AREA 51.' },
      { who: 'ben', mood: 'talk', text: '"Get HIM out"? Get WHO out? And who\'s "D"?' },
      { who: 'ben', mood: 'angry', text: 'Zeus. Get in the van.' },
      { who: 'zeus', mood: 'excited', text: '*BOOF!*' },
    ]);
    if (this.skipped) return;
    await this.tween({ targets: [big], alpha: 0, scale: 0.6, duration: 250 });
    this.tweens.add({ targets: dim, fillAlpha: 0, duration: 300 });
    Audio.queueSection('resolve');

    // into the van and off into the desert
    benOut.setFlipX(true).play('ben_run');
    zeusOut.setFlipX(true).play('zeus_trot');
    this.tweens.add({ targets: zeusOut, x: 160, duration: 1500 });
    await this.tween({ targets: benOut, x: 170, duration: 1700 });
    benOut.setVisible(false); zeusOut.setVisible(false);
    Audio.sfx('door', { volume: 0.4 });
    await this.wait(400);
    const vEngine = Audio.loop('engine', { volume: 0.55 });
    vEngine.set({ rpm: 0.4 });
    this.tweens.add({ targets: van, y: van.y - 1, duration: 60, yoyo: true, repeat: 8 });
    await this.wait(600);
    vEngine.set({ rpm: 0.9 });
    const vDust = this.time.addEvent({ delay: 30, loop: true, callback: () => dust.explode(2, van.x - 44, van.y - 4) });
    await this.tween({ targets: van, x: W + 140, duration: 2600, ease: 'Quad.In' });
    vDust.remove();
    vEngine.stop(1.5);
    await this.card('DREAMLAND HEIST', 'Ben & Zeus are on the road.');
    this.finish();
  }

  finish() {
    if (this.skipped) return;
    this.skipped = true;
    Save.data.seenIntro = true;
    Save.persist();
    goTo(this, 'Map', {}, { duration: 700, color: 0x000000 });
  }
}
