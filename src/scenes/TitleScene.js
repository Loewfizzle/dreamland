// ============================================================================
//  TITLE — sunset over the Nevada desert. Ben and Zeus by a campfire next to
//  the van, a UFO drifting overhead, and the glowing DREAMLAND HEIST logo.
// ============================================================================
import Phaser from 'phaser';
import { GAME, TITLE } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Save } from '../systems/save.js';
import { Input } from '../systems/input.js';
import { applyFilm } from '../systems/fx.js';
import { goFullscreen, isTouch, needsHomeScreenTip } from '../systems/mobile.js';
import { headText, bodyText, signButton, iconButton, goTo, fadeIn } from '../systems/ui.js';
import titleSong from '../audio/music/title.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const BEN_QUIPS = [
  'Birds aren\'t real,\nZeus. Think about it.',
  'Not your keys,\nnot your coins.',
  'That\'s no star.\nThat\'s a satellite.\nOr worse.',
  'They took my rig,\nbuddy. They took\nmy RIG.',
  'Tinfoil? Check.\nHot dogs? Check.',
  'Area 51 is just\n50 areas of cover-up.',
  'Hodl, Zeus.\nHodl.',
];

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    fadeIn(this, 900);
    Input.configure({ mode: 'none' });
    this.started = false;
    this.parallax = [];

    this.buildSky();
    this.buildLand();
    this.buildCamp();
    this.buildLogo();
    this.buildAmbientLife();
    applyFilm(this, { vignette: 1.1 });

    // fullscreen toggle (hidden where unsupported, e.g. iPhone Safari)
    if (this.scale.fullscreen.available) {
      this.fsBtn = iconButton(this, W - 20, 20, 'fullscreen', () => this.scale.toggleFullscreen());
    }
    bodyText(this, W - 6, H - 4, 'v0.3  CHAPTER 5 + HUB', 16, P.cream2, { ox: 1, oy: 1 }).setAlpha(0.55).setDepth(50);

    // "TAP TO START" — the first tap also unlocks audio on mobile.
    this.tapText = headText(this, W / 2, 146, 'TAP TO START', 8, P.cream);
    this.tapText.setDepth(60);
    this.tweens.add({ targets: this.tapText, alpha: 0.25, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.input.once('pointerup', () => this.start());
    this.input.keyboard?.once('keydown', () => this.start());

    // If audio is already unlocked (coming back from another scene), go straight to the menu.
    if (Audio.unlocked) this.time.delayedCall(10, () => this.start(true));
  }

  // ---------------------------------------------------------------------------
  // Scene construction
  // ---------------------------------------------------------------------------
  addLayer(obj, depth, factor) {
    obj.setDepth(depth);
    obj.baseX = obj.x;
    this.parallax.push({ obj, factor });
    return obj;
  }

  buildSky() {
    this.add.image(0, 0, 'sky_sunset').setOrigin(0).setDepth(0).setScale(1, 1);
    // stars only in the upper, darker sky
    this.stars = [];
    const r = new Phaser.Math.RandomDataGenerator(['dreamland']);
    for (let i = 0; i < 70; i++) {
      const y = Math.pow(r.frac(), 1.8) * 130;
      const key = r.frac() < 0.08 ? 'star3' : r.frac() < 0.3 ? 'star2' : 'star1';
      const s = this.add.image(r.between(0, W), y, key).setDepth(1).setAlpha((1 - y / 140) * 0.9);
      s.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: s, alpha: s.alpha * 0.25, duration: r.between(700, 2600), yoyo: true, repeat: -1, delay: r.between(0, 2000), ease: 'Sine.InOut' });
      this.stars.push(s);
    }
    // sun with layered additive glow
    const sx = 380, sy = 222;
    this.sunGlow = this.add.image(sx, sy, 'glow').setDepth(2).setScale(4.2).setTint(hexNum(P.sun3)).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(sx, sy, 'glow').setDepth(2).setScale(2.2).setTint(hexNum(P.sun1)).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.addLayer(this.add.image(sx, sy, 'sun'), 3, 0.01);
    this.tweens.add({ targets: this.sunGlow, scale: 4.6, alpha: 0.45, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    // horizon haze band
    this.add.image(W / 2, 246, 'glow_soft').setDepth(4).setScale(9, 0.9).setTint(hexNum(P.sky7)).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);

    // drifting clouds (some cross in front of the sun)
    this.clouds = [];
    const cdefs = [
      ['cloud_a', 60, 112, 3.2, 0.95], ['cloud_b', 420, 148, 4.4, 0.9], ['cloud_c', 250, 184, 6.0, 0.85],
      ['cloud_d', 560, 92, 2.6, 0.8], ['cloud_b', 150, 200, 7.0, 0.7],
    ];
    for (const [k, x, y, speed, a] of cdefs) {
      const c = this.add.image(x, y, k).setDepth(y > 180 ? 5 : 3.5).setAlpha(a);
      c.speed = speed;
      this.clouds.push(c);
    }
  }

  buildLand() {
    // backdrop strips are tile sprites: parallax just slides their texture
    const strip = (key, y, depth, factor, offset) => {
      const h = this.textures.get(key).getSourceImage().height;
      const t = this.add.tileSprite(0, y, W, h, key).setOrigin(0).setDepth(depth);
      t.tileBase = offset;
      t.tilePositionX = offset;
      this.strips.push({ t, factor });
      return t;
    };
    this.strips = [];
    strip('range_far', 194, 6, 0.02, 40);
    strip('mesa_mid', 158, 7, 0.04, 120);
    strip('mesa_near', 190, 8, 0.07, 210);
    strip('ridge', 254, 9, 0.1, 0);
    // low warm light spilling over the ridge
    this.add.image(380, 300, 'glow_soft').setDepth(9.5).setScale(6, 1.2).setTint(hexNum(P.sky6)).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD);
    this.addLayer(this.add.image(-16, 298, 'floor').setOrigin(0), 10, 0.16);
    // foreground silhouettes frame the shot
    this.addLayer(this.add.image(628, 366, 'joshua_big').setOrigin(0.5, 1), 40, 0.3);
    this.addLayer(this.add.image(292, 352, 'cactus').setOrigin(0.5, 1).setTint(0xb08aa0), 20, 0.2);
  }

  buildCamp() {
    const groundY = 342;
    // van
    this.van = this.addLayer(this.add.image(548, groundY + 1, 'van').setOrigin(0.5, 1).setTint(0xe6c4cc), 21, 0.18);
    // contact shadows
    const shadow = (x, w) => this.addLayer(this.add.ellipse(x, groundY, w, 5, hexNum(P.ink), 0.45), 20.5, 0.18);
    shadow(548, 92);
    shadow(452, 16);
    shadow(386, 22);

    // campfire with flickering light
    this.fireLight = this.add.image(418, groundY - 8, 'glow').setDepth(19).setScale(2.6).setTint(hexNum(P.fire2)).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
    this.fireCore = this.add.image(418, groundY - 10, 'glow').setDepth(23).setScale(0.9).setTint(hexNum(P.fire1)).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.fire = this.addLayer(this.add.sprite(418, groundY + 2, 'campfire').setOrigin(0.5, 1).play('fire_burn'), 22, 0.18);
    this.time.addEvent({
      delay: 70, loop: true, callback: () => {
        const f = 0.85 + Math.random() * 0.3;
        this.fireLight.setScale(2.6 * f).setAlpha(0.45 + Math.random() * 0.2);
        this.fireCore.setScale(0.9 * f);
      },
    });
    // rising sparks
    this.add.particles(418, groundY - 14, 'px1', {
      lifespan: { min: 900, max: 1800 }, speedY: { min: -38, max: -18 }, speedX: { min: -8, max: 10 },
      accelerationX: 6, scale: { start: 1, end: 1 }, alpha: { start: 1, end: 0 },
      tint: [hexNum(P.fire0), hexNum(P.fire1), hexNum(P.fire2)], frequency: 140, blendMode: 'ADD',
    }).setDepth(24);

    // Ben (faces the fire) and Zeus (sits, tail wagging)
    this.ben = this.addLayer(this.add.sprite(452, groundY + 1, 'ben').setOrigin(0.5, 1).setFlipX(true).play('ben_idle'), 22, 0.18);
    this.ben.setTint(0xffe0d0);
    this.zeus = this.addLayer(this.add.sprite(386, groundY + 1, 'zeus').setOrigin(0.5, 1).play('zeus_sit'), 22, 0.18);
    this.zeus.setTint(0xffe8d0);

    // tap Zeus for a bark, tap Ben for a conspiracy theory
    this.zeus.setInteractive({ useHandCursor: true, pixelPerfect: false });
    this.zeus.on('pointerup', () => this.started && this.zeusBark());
    this.ben.setInteractive({ useHandCursor: true });
    this.ben.on('pointerup', () => this.started && this.benQuip());
  }

  buildLogo() {
    const x = W / 2, y = 64;
    this.logoGlow = this.add.image(x, y, 'logo_glow').setDepth(55).setTint(hexNum(P.sky7)).setAlpha(0.0).setBlendMode(Phaser.BlendModes.ADD).setScale(1.04);
    this.logoHalo = this.add.image(x, y + 4, 'glow_soft').setDepth(54).setScale(5.5, 1.6).setTint(hexNum(P.sky5)).setAlpha(0.0).setBlendMode(Phaser.BlendModes.ADD);
    this.logo = this.add.image(x, y, 'logo').setDepth(56).setAlpha(0).setScale(0.6);
    // entrance: pop in with a bounce
    this.tweens.add({ targets: this.logo, alpha: 1, scale: 1, duration: 900, ease: 'Back.Out', delay: 300 });
    this.tweens.add({ targets: [this.logoGlow], alpha: 0.5, duration: 1200, delay: 600 });
    this.tweens.add({ targets: [this.logoHalo], alpha: 0.35, duration: 1200, delay: 600 });
    // idle: gentle float + pulsing glow + occasional neon flicker
    this.tweens.add({ targets: [this.logo, this.logoGlow], y: y + 3, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 1200 });
    this.tweens.add({ targets: this.logoGlow, alpha: 0.18, scale: 1.08, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 1800 });
    this.time.addEvent({
      delay: 4200, loop: true, callback: () => {
        if (Math.random() < 0.6) {
          this.tweens.add({ targets: this.logoGlow, alpha: 0.9, duration: 40, yoyo: true, repeat: 2 });
        }
      },
    });
  }

  buildAmbientLife() {
    // drifting dust motes catching the light
    this.add.particles(0, 0, 'mote', {
      x: { min: -20, max: W }, y: { min: 150, max: H },
      lifespan: 7000, speedX: { min: 6, max: 18 }, speedY: { min: -4, max: 3 },
      scale: { min: 0.3, max: 0.8 },
      // fade in and out over the mote's life
      alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.6 },
      tint: [hexNum(P.sky8), hexNum(P.sun1), hexNum(P.sky6)], frequency: 7000 / TITLE.DUST_COUNT,
      blendMode: 'ADD',
    }).setDepth(30);

    // UFO crossing the sky every so often
    this.ufoGlow = this.add.image(-100, -100, 'glow').setDepth(4.5).setTint(hexNum(P.green2)).setScale(1.1).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
    this.ufo = this.add.sprite(-100, -100, 'ufo').play('ufo_spin').setDepth(4.6);
    this.time.addEvent({ delay: TITLE.UFO_INTERVAL_MS, loop: true, callback: () => this.flyUfo() });
    this.time.delayedCall(2600, () => this.flyUfo());

    // shooting stars
    const scheduleStar = () => {
      const [a, b] = TITLE.SHOOTING_STAR_MS;
      this.time.delayedCall(Phaser.Math.Between(a, b), () => { this.shootingStar(); scheduleStar(); });
    };
    scheduleStar();

    // the occasional tumbleweed bouncing across
    const scheduleWeed = () => this.time.delayedCall(Phaser.Math.Between(7000, 15000), () => { this.tumbleweed(); scheduleWeed(); });
    this.time.delayedCall(4000, () => { this.tumbleweed(); scheduleWeed(); });
  }

  // ---------------------------------------------------------------------------
  // Start: unlock audio, reveal the menu
  // ---------------------------------------------------------------------------
  start(instant = false) {
    if (this.started) return;
    this.started = true;
    // On phones, the first tap also goes fullscreen (where the browser allows it).
    if (!instant && isTouch) goFullscreen(this);
    if (needsHomeScreenTip() && !Save.data.homeTipDismissed) this.time.delayedCall(instant ? 300 : 1400, () => this.showHomeScreenTip());
    Audio.onUnlock(() => {
      Audio.playMusic(titleSong, { fade: instant ? 1.2 : 2.5 });
      Audio.playAmbience('title');
    });
    this.tweens.killTweensOf(this.tapText);
    this.tweens.add({ targets: this.tapText, alpha: 0, y: 140, duration: 250, onComplete: () => this.tapText.destroy() });
    if (!instant) Audio.sfx('ui_confirm');
    this.buildMenu(instant);
  }

  buildMenu(instant) {
    const px = 104;
    const post = this.add.image(px, 346, 'post').setOrigin(0.5, 1).setDepth(25).setTint(0xe8c8c8);
    const hasSave = Save.hasProgress();
    const items = [
      { label: 'PLAY', tex: 'sign_orange', fn: () => this.play(false) },
      { label: 'CONTINUE', fn: () => this.play(true), enabled: hasSave },
      { label: 'SETTINGS', fn: () => this.openSettings() },
      { label: 'CREDITS', fn: () => goTo(this, 'Credits') },
    ];
    this.menu = items.map((it, i) => {
      const b = signButton(this, px, 176 + i * 30, it.label, it.fn, { texture: it.tex ?? 'sign', arrow: true, tilt: i % 2 ? 1.5 : -1.5 });
      b.setDepth(26);
      if (it.enabled === false) b.setEnabled(false);
      // swing in like signs flipping down on a post
      b.setScale(1, 0).setAngle(i % 2 ? 6 : -6);
      this.tweens.add({ targets: b, scaleY: 1, angle: 0, duration: 520, ease: 'Back.Out', delay: instant ? 0 : 150 + i * 110,
        onStart: () => !instant && Audio.sfx('whoosh', { volume: 0.4, pan: -0.6, minGap: 0 }) });
      return b;
    });
    post.setScale(1, 0);
    this.tweens.add({ targets: post, scaleY: 1, duration: 350, ease: 'Quad.Out' });
  }

  /** iPhone can't go fullscreen from a web page; explain the Home Screen trick. */
  showHomeScreenTip() {
    const c = this.add.container(W / 2, H - 14).setDepth(80);
    const msg = bodyText(this, 0, 0, 'iPhone tip: tap Share, then "Add to Home Screen" to play fullscreen.', 16, P.cream, { ox: 0.5, oy: 0.5 });
    const bw = msg.width + 34;
    const bg = this.add.rectangle(0, 0, bw, 18, hexNum(P.ink), 0.85).setStrokeStyle(1, hexNum(P.btc));
    const x = headText(this, bw / 2 - 9, 0, 'X', 8, P.btc1);
    msg.x = -8;
    c.add([bg, msg, x]);
    c.setSize(bw, 18).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      Save.data.homeTipDismissed = true;
      Save.persist();
      Audio.sfx('ui_back');
      this.tweens.add({ targets: c, alpha: 0, y: H + 10, duration: 250, onComplete: () => c.destroy() });
    });
    c.setAlpha(0).y = H + 10;
    this.tweens.add({ targets: c, alpha: 1, y: H - 14, duration: 400, ease: 'Back.Out' });
  }

  play(cont) {
    if (!cont && Save.hasProgress()) {
      // Starting fresh keeps settings but resets progress.
      Save.resetProgress();
    }
    Audio.sfx('ui_confirm');
    Audio.stopAmbience(1);
    // new players see the intro; returning players go straight to the map
    goTo(this, cont && Save.data.seenIntro ? 'Map' : 'Intro', {}, { duration: 600 });
  }

  openSettings() {
    this.scene.launch('Settings', { from: 'Title' });
    this.scene.bringToTop('Controls');
  }

  // ---------------------------------------------------------------------------
  // Ambient events & easter eggs
  // ---------------------------------------------------------------------------
  flyUfo() {
    const ltr = Math.random() < 0.6;
    const y0 = Phaser.Math.Between(70, 125);
    const x0 = ltr ? -40 : W + 40, x1 = ltr ? W + 40 : -40;
    const hum = Audio.loop('ufo_hum', { volume: 0.0001, pan: ltr ? -0.9 : 0.9, fade: 0.1 });
    const state = { t: 0 };
    this.ufo.setFlipX(!ltr);
    this.tweens.add({
      targets: state, t: 1, duration: 9000, ease: 'Sine.InOut',
      onUpdate: () => {
        const x = Phaser.Math.Linear(x0, x1, state.t);
        const y = y0 + Math.sin(state.t * Math.PI * 5) * 6 - Math.sin(state.t * Math.PI) * 18;
        this.ufo.setPosition(x, y);
        this.ufoGlow.setPosition(x, y + 6);
        const vol = Math.sin(state.t * Math.PI) * 0.35;
        hum.set({ volume: vol, pan: ((x / W) - 0.5) * 1.6 });
        // Ben points, Zeus barks when it passes overhead
        if (!state.reacted && x > 300 && x < 460) {
          state.reacted = true;
          this.ben.play('ben_point');
          this.time.delayedCall(1600, () => this.ben.play('ben_idle'));
          this.time.delayedCall(350, () => this.zeusBark(true));
        }
      },
      onComplete: () => hum.stop(0.3),
    });
    // a quick warble halfway across
    this.time.delayedCall(4200, () => Audio.sfx('ufo_warble', { volume: 0.5, pan: 0, reverb: 0.6 }));
  }

  shootingStar() {
    const x = Phaser.Math.Between(80, W - 40), y = Phaser.Math.Between(10, 70);
    const s = this.add.image(x, y, 'streak').setDepth(1.5).setBlendMode(Phaser.BlendModes.ADD).setAngle(155).setAlpha(0);
    this.tweens.add({ targets: s, x: x - 90, y: y + 40, alpha: { from: 1, to: 0 }, duration: 700, ease: 'Quad.In', onComplete: () => s.destroy() });
    Audio.sfx('shooting_star', { volume: 0.5, pan: (x / W - 0.5) * 1.4, reverb: 0.7 });
  }

  tumbleweed() {
    const ltr = Math.random() < 0.5;
    const y = Phaser.Math.Between(318, 350);
    const w = this.add.image(ltr ? -20 : W + 20, y, 'tumbleweed').setDepth(y > 343 ? 30 : 19).setTint(0xe0b8b0);
    const dur = Phaser.Math.Between(6000, 9000);
    this.tweens.add({ targets: w, x: ltr ? W + 20 : -20, angle: ltr ? 720 : -720, duration: dur, onComplete: () => w.destroy() });
    this.tweens.add({ targets: w, y: y - 9, duration: 280, yoyo: true, repeat: Math.floor(dur / 560), ease: 'Quad.Out' });
  }

  zeusBark(fromUfo = false) {
    if (this.zeus.barking) return;
    this.zeus.barking = true;
    this.zeus.play('zeus_bark');
    Audio.sfx(fromUfo ? 'bark2' : (Math.random() < 0.25 ? 'boof' : 'bark'), { pan: -0.1, volume: 0.9 });
    Audio.sfx('jingle', { volume: 0.6, delay: 0.05 });
    // little heart / note pop
    const h = headText(this, this.zeus.x + 6, this.zeus.y - 24, fromUfo ? '!' : '<3', 8, fromUfo ? P.cyan1 : P.tongue).setDepth(60);
    this.tweens.add({ targets: h, y: h.y - 14, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => h.destroy() });
    this.tweens.add({ targets: this.zeus, scaleY: 1.12, scaleX: 0.92, duration: 90, yoyo: true });
    this.zeus.once('animationcomplete', () => {
      this.time.delayedCall(250, () => {
        this.zeus.play('zeus_sit');
        this.zeus.barking = false;
        if (!fromUfo) Audio.sfx('pant', { volume: 0.5, pan: -0.1 });
      });
    });
  }

  benQuip() {
    if (this.bubble) return;
    const text = Phaser.Utils.Array.GetRandom(BEN_QUIPS);
    this.ben.play('ben_talk');
    const t = bodyText(this, 0, 0, text, 16, P.ink, { align: 'center', ox: 0.5, oy: 1, shadow: false, lineSpacing: -4 });
    const pad = 6;
    const bw = t.width + pad * 2, bh = t.height + pad;
    const bx = Phaser.Math.Clamp(this.ben.x - 10, bw / 2 + 4, W - bw / 2 - 4), by = this.ben.y - 40;
    const g = this.add.graphics().setDepth(61);
    g.fillStyle(hexNum(P.ink), 1).fillRect(bx - bw / 2 - 1, by - bh - 1, bw + 2, bh + 2);
    g.fillStyle(hexNum(P.white), 1).fillRect(bx - bw / 2, by - bh, bw, bh);
    g.fillTriangle(this.ben.x - 4, by - 1, this.ben.x + 4, by - 1, this.ben.x + 2, by + 6);
    t.setPosition(bx, by - pad / 2 + 2).setDepth(62);
    this.bubble = this.add.container(0, 0, [g, t]).setDepth(61);
    this.bubble.setScale(1, 0);
    this.tweens.add({ targets: this.bubble, scaleY: 1, duration: 180, ease: 'Back.Out' });
    // typewriter blips
    for (let i = 0; i < Math.min(14, text.length / 2); i++) Audio.sfx('blip', { pitch: 200, delay: i * 0.05, minGap: 0, volume: 0.6 });
    this.time.delayedCall(2600, () => {
      this.tweens.add({ targets: this.bubble, alpha: 0, duration: 250, onComplete: () => { this.bubble.destroy(); this.bubble = null; } });
      this.ben.play('ben_idle');
    });
  }

  update(time, delta) {
    const dt = delta / 1000;
    // clouds drift and wrap
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x - c.width / 2 > W) c.x = -c.width / 2;
    }
    // parallax: follow the mouse on desktop, slow sway on touch
    const p = this.input.activePointer;
    const target = (!this.sys.game.device.input.touch && p.x > 0) ? (p.x - W / 2) : Math.sin(time / 4000) * 60;
    this.parX = Phaser.Math.Linear(this.parX ?? 0, target, 0.04);
    for (const { obj, factor } of this.parallax) obj.x = obj.baseX - this.parX * factor;
    for (const { t, factor } of this.strips) t.tilePositionX = t.tileBase + this.parX * factor;
    this.fireLight.x = this.fire.x;
    this.fireCore.x = this.fire.x;
  }
}
