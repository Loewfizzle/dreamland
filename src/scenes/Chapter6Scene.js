// ============================================================================
//  CHAPTER 6 — "DREAMLAND"  (side-view boss shooter)
//  Ben pilots a stolen hover-sled over the desert at night, Zeus riding up
//  front, to protect Satoshi's ship while it charges for launch. The UFO
//  Enforcer attacks in three phases: bullet patterns, tractor beam, ENRAGED.
//  Zeus's POWER BARK clears the sky.
// ============================================================================
import Phaser from 'phaser';
import { GAME, CH6, ECONOMY } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Lighting } from '../systems/lighting.js';
import { Dialogue } from '../systems/dialogue.js';
import { applyFilm, shake, vibrate, hitStop } from '../systems/fx.js';
import { headText, bodyText, goTo, fadeIn } from '../systems/ui.js';
import { stat } from '../systems/progress.js';
import ch6Song from '../audio/music/ch6.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const HUD = 1000;
const SHIP = { x: 92, y: 250 };
const PHASE_AT = [1, 0.66, 0.33];              // boss HP fractions where phases 1/2/3 begin

/** Minimal sprite pool for bullets/coins: no physics bodies, just positions. */
class Pool {
  constructor(scene, key, depth, blend = true) {
    this.scene = scene; this.key = key; this.depth = depth; this.blend = blend;
    this.items = [];
  }
  spawn(x, y, vx, vy, r = 4, extra = {}) {
    let it = this.items.find((i) => !i.alive);
    if (!it) {
      const spr = this.scene.add.image(0, 0, this.key).setDepth(this.depth);
      if (this.blend) spr.setBlendMode(Phaser.BlendModes.ADD);
      it = { spr };
      this.items.push(it);
    }
    Object.assign(it, { x, y, vx, vy, r, alive: true, age: 0, golden: null, ...extra });
    if (it.spr.texture.key !== (extra.tex ?? this.key)) it.spr.setTexture(extra.tex ?? this.key);
    it.spr.setVisible(true).setPosition(x, y).setScale(extra.scale ?? 1).setRotation(Math.atan2(vy, vx));
    return it;
  }
  kill(it) { it.alive = false; it.spr.setVisible(false); }
  each(fn) { for (const it of this.items) if (it.alive) fn(it); }
  clear() { this.items.forEach((i) => this.kill(i)); }
}

export default class Chapter6Scene extends Phaser.Scene {
  constructor() { super('Chapter6'); }

  create() {
    fadeIn(this, 900);
    this.sats = 0;
    this.coins = 0;
    this.coinsTotal = 0;
    this.golden = [false, false, false];
    this.hitsTaken = 0;
    this.busy = true;
    this.ended = false;
    this.phase = 0;
    this.bark = 0;
    this.lastShot = 0;
    this.invulnUntil = 0;
    this.startTime = this.time.now;
    this.maxHp = stat('maxHp', CH6.MAX_HEALTH);
    this.hp = this.maxHp;
    this.shield = CH6.SHIP_SHIELD;
    this.bossHp = CH6.BOSS_HP;
    this.fireMs = stat('blasterCooldown', CH6.FIRE_MS);
    this.boltDmg = stat('blasterDamage', CH6.BOLT_DAMAGE);

    this.lighting = new Lighting(this, { ambient: 0x7a72a8, depth: 900 });
    this.buildBackground();
    this.buildActors();
    this.bolts = new Pool(this, 'pbolt', 50);
    this.bullets = new Pool(this, 'bbullet', 60, false);   // normal blend: readable, not glowy like stars
    this.bigs = new Pool(this, 'bbig', 60, false);
    this.coinPool = new Pool(this, 'coin', 55, false);
    this.drones = [];
    this.gfx = this.add.graphics().setDepth(45).setBlendMode(Phaser.BlendModes.ADD);
    this.buildHUD();

    Input.configure({
      mode: 'joystick', pause: true,
      buttons: [{ id: 'B', label: 'BARK', style: 'b', icon: 'glyph_paw' }],
    });
    Audio.playMusic(ch6Song, { section: 'p1' });
    Audio.playAmbience('desert_night');
    this.wind = Audio.loop('wind', { volume: 0.3 });
    this.hum = Audio.loop('ufo_hum', { volume: 0.25 });
    applyFilm(this, { vignette: 1.1 });

    const onPause = () => { if (!this.ended && !this.scene.isActive('Pause')) { this.scene.launch('Pause', { from: this.scene.key }); this.scene.bringToTop('Pause'); this.scene.bringToTop('Controls'); } };
    Input.events.on('pause', onPause);
    this.events.once('shutdown', () => { Input.events.off('pause', onPause); this.wind?.stop(0.3); this.hum?.stop(0.3); this.lighting.destroy(); });

    const dbg = this.registry.get('debugCol');
    if (dbg != null) { this.registry.set('debugCol', null); this.setPhase(Math.min(2, dbg)); this.bossHp = CH6.BOSS_HP * PHASE_AT[this.phase]; this.boss.x = 500; this.busy = false; }
    else this.intro();
  }

  // ===========================================================================
  //  BUILD
  // ===========================================================================
  buildBackground() {
    this.add.image(0, 0, 'nightsky').setOrigin(0).setDepth(-30);
    this.skyGlow = this.add.image(0, 0, 'nightsky_glow').setOrigin(0).setDepth(-29).setBlendMode(Phaser.BlendModes.ADD);
    // twinkle a handful of bright stars
    const r = new Phaser.Math.RandomDataGenerator(['dreamland']);
    for (let i = 0; i < 40; i++) {
      const s = this.add.image(r.between(0, W), r.between(0, 220), r.frac() < 0.2 ? 'star2' : 'star1').setDepth(-28).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: s, alpha: 0.2, duration: r.between(600, 2400), yoyo: true, repeat: -1, delay: r.between(0, 2000) });
    }
    this.moon = this.add.image(560, 54, 'glow').setScale(0.55).setTint(0xe8e8ff).setDepth(-27).setBlendMode(Phaser.BlendModes.ADD);
    this.add.circle(560, 54, 13, 0xf2ecd8).setDepth(-27);
    this.add.circle(565, 51, 12, 0x0c1230).setDepth(-27);
    // night desert layers (tinted) scrolling past
    this.layers = [
      [this.add.tileSprite(0, 222, W, 70, 'range_far').setOrigin(0).setTint(0x3a3a70), 18],
      [this.add.tileSprite(0, 200, W, 132, 'mesa_mid').setOrigin(0).setTint(0x40386a), 40],
      [this.add.tileSprite(0, 262, W, 90, 'ridge').setOrigin(0).setTint(0x2a2448), 90],
      [this.add.tileSprite(0, 310, W, 90, 'floor').setOrigin(0).setTint(0x3a3058), 170],
    ];
    this.layers.forEach(([t], i) => t.setDepth(-26 + i));
    // Groom Lake runway lights twinkling far below
    for (let i = 0; i < 14; i++) {
      const l = this.add.rectangle(140 + i * 34, 300, 2, 1, i % 2 ? 0xffb347 : 0xff3b4f).setDepth(-23);
      this.tweens.add({ targets: l, alpha: 0.2, duration: 400, yoyo: true, repeat: -1, delay: i * 90 });
    }
    this.lighting.add({ x: 560, y: 54, radius: 140, color: 0xb8c0ff, intensity: 0.5 });
  }

  buildActors() {
    // Satoshi's ship, charging for launch
    this.ship = this.add.image(SHIP.x, SHIP.y, 'sship').setDepth(20);
    this.shipGlow = this.add.image(SHIP.x, SHIP.y, 'sship_glow').setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
    this.shipLight = this.lighting.add({ x: SHIP.x, y: SHIP.y, radius: 110, color: 0xffc35c, intensity: 0.7, pulse: { speed: 2, amount: 0.3 } });
    this.tweens.add({ targets: [this.ship, this.shipGlow], y: SHIP.y - 6, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.shieldBubble = this.add.ellipse(SHIP.x, SHIP.y, 168, 86, 0x3cf2ff, 0.08).setStrokeStyle(1, 0x7ff8ff, 0.5).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
    // the sled
    this.sled = this.add.sprite(220, 180, 'sled').play('sled_fly').setDepth(40);
    this.sledLight = this.lighting.add({ follow: this.sled, radius: 70, color: 0x7ff8ff, intensity: 0.6 });
    this.trail = this.add.particles(0, 0, 'px2', {
      follow: this.sled, followOffset: { x: -32, y: 2 }, lifespan: 350, speedX: { min: -140, max: -80 }, speedY: { min: -10, max: 10 },
      scale: { start: 1.2, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0x7ff8ff, 0x3cf2ff], frequency: 30, blendMode: 'ADD',
    }).setDepth(39);
    // the Enforcer
    this.boss = this.add.sprite(W + 150, 120, 'boss', 0).setDepth(30);
    this.boss.baseY = 110;
    this.bossLight = this.lighting.add({ follow: this.boss, oy: 20, radius: 170, color: 0x5dff9a, intensity: 0.65 });
    this.coreLight = this.lighting.add({ follow: this.boss, oy: 28, radius: 40, color: 0x3cf2ff, intensity: 1, pulse: { speed: 6, amount: 0.4 } });
    this.boss.t = 0;
    this.sparks = this.add.particles(0, 0, 'px1', { lifespan: 400, speed: { min: 40, max: 160 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false }).setDepth(70);
  }

  buildHUD() {
    const D = HUD;
    this.add.rectangle(6, 6, 104, 34, hexNum(P.ink), 0.6).setOrigin(0).setStrokeStyle(1, hexNum(P.ink4)).setDepth(D);
    this.hearts = [];
    for (let i = 0; i < this.maxHp; i++) this.hearts.push(this.add.image(16 + i * 12, 15, 'heart', 0).setDepth(D));
    this.add.image(16, 30, 'glyph_btc').setDepth(D);
    this.satsText = headText(this, 26, 30, '0', 8, P.cream, { ox: 0 }).setDepth(D);
    // boss bar
    this.add.rectangle(W / 2, 14, 244, 10, hexNum(P.ink), 0.8).setStrokeStyle(1, hexNum(P.red2)).setDepth(D);
    this.bossBar = this.add.rectangle(W / 2 - 120, 14, 240, 6, hexNum(P.red)).setOrigin(0, 0.5).setDepth(D);
    headText(this, W / 2, 28, 'THE ENFORCER', 8, P.red).setDepth(D).setScale(0.75);
    for (const f of [0.66, 0.33]) this.add.rectangle(W / 2 - 120 + 240 * f, 14, 1, 8, 0xffffff, 0.6).setDepth(D);
    // ship shield
    this.add.rectangle(SHIP.x, SHIP.y + 46, 80, 5, hexNum(P.ink), 0.8).setDepth(D);
    this.shieldBar = this.add.rectangle(SHIP.x - 40, SHIP.y + 46, 80, 3, hexNum(P.cyan2)).setOrigin(0, 0.5).setDepth(D);
    bodyText(this, SHIP.x, SHIP.y + 52, 'SATOSHI', 16, P.btc1, { ox: 0.5 }).setDepth(D);
    // power bark meter
    this.add.rectangle(W - 70, 46, 110, 16, hexNum(P.ink), 0.6).setStrokeStyle(1, hexNum(P.ink4)).setDepth(D);
    this.add.image(W - 116, 46, 'glyph_paw').setTint(hexNum(P.gold1)).setDepth(D);
    this.barkBar = this.add.rectangle(W - 104, 46, 1, 6, hexNum(P.gold1)).setOrigin(0, 0.5).setDepth(D);
    this.barkReady = headText(this, W - 60, 46, '', 8, P.gold0).setDepth(D).setScale(0.75);
    this.goldSlots = [0, 1, 2].map((i) => this.add.image(W - 98 + i * 18, 68, 'golden', 0).setAlpha(0.22).setTint(0x888888).setDepth(D));
  }

  // ===========================================================================
  //  STORY / PHASES
  // ===========================================================================
  async intro() {
    const card = headText(this, W / 2, 80, 'CHAPTER 6', 8, P.cyan1).setDepth(HUD);
    const card2 = headText(this, W / 2, 98, 'DREAMLAND', 16, P.btc).setDepth(HUD);
    [card, card2].forEach((c) => { c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 600, hold: 1600, yoyo: true, onComplete: () => c.destroy() }); });
    await this.wait(1800);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'happy', text: 'WE\'RE OUT! We stole a UFO and a hover-sled from AREA 51! Zeus, nobody back home is gonna believe this.' },
      { who: 'satoshi', mood: 'talk', text: 'Ben-human. My ship needs time to charge its launch drive. Stay close. HE is coming.' },
    ]);
    Audio.sfx('ufo_warble', { volume: 0.8 });
    this.hum.set({ volume: 0.55 });
    this.tweens.add({ targets: this.boss, x: 500, duration: 2200, ease: 'Cubic.Out' });
    shake(this, 400, 0.006);
    await this.wait(1600);
    await Dialogue.play(this, [
      { who: 'satoshi', mood: 'sad', text: 'The Enforcer. Their warden. He will not let me leave.' },
      { who: 'ben', mood: 'angry', text: 'Not on my watch. Zeus, hold on to your ears. We\'re taking him DOWN.' },
      { who: 'zeus', mood: 'excited', text: '*BATTLE BOOF!*' },
    ]);
    const touch = this.sys.game.device.input.touch;
    this.toast(touch ? 'THE SLED FIRES BY ITSELF. DODGE! BARK WHEN THE PAW METER FILLS' : 'ARROWS: DODGE (AUTO-FIRE)   SPACE / E: POWER BARK WHEN FULL', 3600);
    this.setPhase(0);
    this.busy = false;
  }

  setPhase(p) {
    this.phase = p;
    this.patternT = 0;
    this.droneT = 0;
    this.phaseStartHp = CH6.BOSS_HP * PHASE_AT[p];
    this.boss.setFrame(p === 2 ? 2 : 0);
    this.bossLight.color = p === 2 ? 0xff3b4f : 0x5dff9a;
    this.coreLight.color = p === 2 ? 0xff3b4f : 0x3cf2ff;
    Audio.queueSection(['p1', 'p2', 'p3'][p]);
    if (p > 0) {
      Audio.sfx('spotted');
      shake(this, 500, 0.012);
      this.cameras.main.flash(250, 255, 120, 160);
      this.bullets.clear(); this.bigs.clear();
      const msg = p === 1 ? 'TRACTOR BEAM!' : 'THE ENFORCER IS ENRAGED!';
      const t = headText(this, W / 2, 120, msg, 16, p === 2 ? P.red : P.green1).setDepth(HUD).setScale(0);
      this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.Out', hold: 1100, yoyo: true, onComplete: () => t.destroy() });
      this.spawnGolden(p);
    }
    this.beamX = 160;
    this.beamDir = 1;
  }

  async victory() {
    this.ended = true;
    this.busy = true;
    Input.configure({ mode: 'none' });
    this.bullets.clear(); this.bigs.clear();
    this.drones.forEach((d) => { this.explode(d.spr.x, d.spr.y, false); d.spr.destroy(); });
    this.drones = [];
    Audio.queueSection('win');
    this.hum.stop(1);
    // chain of explosions, then the Enforcer drops out of the sky
    for (let i = 0; i < 9; i++) {
      this.time.delayedCall(i * 220, () => this.explode(this.boss.x + Phaser.Math.Between(-90, 90), this.boss.y + Phaser.Math.Between(-30, 30), i % 3 === 0));
    }
    this.tweens.add({ targets: this.boss, angle: 18, duration: 2000 });
    await this.wait(2000);
    this.explode(this.boss.x, this.boss.y, true);
    hitStop(this, 120);
    this.cameras.main.flash(500, 255, 255, 255);
    this.tweens.add({ targets: this.boss, y: H + 140, angle: 40, duration: 1500, ease: 'Quad.In' });
    this.lighting.remove(this.bossLight); this.lighting.remove(this.coreLight);
    await this.wait(1600);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'happy', text: 'WE DID IT! Zeus, we beat a UFO! A REAL ONE!' },
      { who: 'zeus', mood: 'excited', text: '*the happiest bark in recorded history*' },
      { who: 'satoshi', mood: 'happy', text: 'The drive is charged. Land with me, friends. The sun is coming up.' },
    ]);
    const time = (this.time.now - this.startTime) / 1000;
    goTo(this, 'Results', {
      chapter: 'ch6', sats: this.sats, coins: this.coins, coinsTotal: this.coinsTotal, golden: this.golden, time,
      clean: this.hitsTaken === 0, cleanLabel: 'UNTOUCHABLE', next: 'Ending',
      stats: [['HITS TAKEN', this.hitsTaken, 'num'], ['SHIP SHIELD LEFT', `${Math.round(this.shield)}%`, 'text']],
    }, { duration: 1000 });
  }

  /** Lost all hearts or the ship's shield broke: retry the current phase. */
  async knockedOut(reason) {
    if (this.busy) return;
    this.busy = true;
    Audio.sfx('caught');
    const t = headText(this, W / 2, H / 2 - 20, reason, 16, P.red).setDepth(HUD + 5);
    const l = bodyText(this, W / 2, H / 2 + 2, 'Satoshi reboots the shields... try this phase again!', 16, P.cream, { ox: 0.5 }).setDepth(HUD + 5);
    await this.wait(1800);
    this.cameras.main.fadeOut(300, 0, 0, 10);
    await this.wait(350);
    t.destroy(); l.destroy();
    this.bullets.clear(); this.bigs.clear(); this.bolts.clear();
    this.drones.forEach((d) => d.spr.destroy());
    this.drones = [];
    this.hp = this.maxHp;
    this.shield = CH6.SHIP_SHIELD;
    this.bossHp = this.phaseStartHp;
    this.sled.setPosition(220, 180);
    this.updateHearts();
    this.cameras.main.fadeIn(350, 0, 0, 10);
    this.patternT = -1500;
    this.busy = false;
  }

  // ===========================================================================
  //  UPDATE
  // ===========================================================================
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    const s = this.sled;
    // background scroll
    for (const [t, sp] of this.layers) t.tilePositionX += sp * dt;
    // boss hovers & bobs
    this.boss.t += dt;
    if (!this.ended && this.boss.x < W) {
      const ty = this.phase === 1 ? 70 : this.boss.baseY;
      this.boss.y = Phaser.Math.Linear(this.boss.y, ty + Math.sin(this.boss.t * 1.3) * 18, 0.05);
      this.boss.x = Phaser.Math.Linear(this.boss.x, 500 + Math.sin(this.boss.t * 0.7) * 30, 0.03);
    }

    if (!this.busy && !this.ended) {
      // movement
      let ax = Input.axisX, ay = Input.axisY;
      const m = Math.hypot(ax, ay); if (m > 1) { ax /= m; ay /= m; }
      s.x = Phaser.Math.Clamp(s.x + ax * CH6.SLED_SPEED * dt, 40, 400);
      s.y = Phaser.Math.Clamp(s.y + ay * CH6.SLED_SPEED * dt, 50, 320);
      s.rotation = Phaser.Math.Linear(s.rotation, ay * 0.12, 0.2);
      // the sled's cannon fires automatically: you focus on dodging
      if (time - this.lastShot > this.fireMs) this.fire(time);
      if (Input.consume('B') || Input.consume('A')) this.powerBark();
      if (!this.gold0 && time - this.startTime > 14000) { this.gold0 = true; this.spawnGolden(0); }
      this.runPattern(time, dt);
      this.shield = Math.min(CH6.SHIP_SHIELD, this.shield + CH6.SHIELD_REGEN * dt);
      this.updateDrones(dt);
    }
    if (time < this.invulnUntil) s.setAlpha(Math.floor(time / 70) % 2 ? 0.35 : 1); else s.setAlpha(1);

    this.updateProjectiles(dt);
    this.drawBeam(dt);
    this.updateHUD();
    this.lighting.update(time);
  }

  fire(time) {
    this.lastShot = time;
    const s = this.sled;
    this.bolts.spawn(s.x + 30, s.y + 2, CH6.BOLT_SPEED, 0, 6);
    this.bolts.spawn(s.x + 28, s.y - 2, CH6.BOLT_SPEED, -40, 6);
    this.bolts.spawn(s.x + 28, s.y + 6, CH6.BOLT_SPEED, 40, 6);
    Audio.sfx('blaster', { volume: 0.35, minGap: 60 });
  }

  // ---------------------------------------------------------------------------
  //  Boss patterns
  // ---------------------------------------------------------------------------
  runPattern(time, dt) {
    this.patternT += dt * 1000;
    this.droneT += dt * 1000;
    const b = this.boss;
    const cannons = [[b.x - 60, b.y + 30], [b.x + 60, b.y + 30]];
    const aimAt = (x, y, speed, spread = 0) => {
      const a = Math.atan2(this.sled.y - y, this.sled.x - x) + spread;
      this.bullets.spawn(x, y, Math.cos(a) * speed, Math.sin(a) * speed, 4);
    };
    const ring = (n, speed, offset = 0, pool = this.bullets, r = 4) => {
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + offset; pool.spawn(b.x, b.y + 28, Math.cos(a) * speed, Math.sin(a) * speed, r); }
      Audio.sfx('alien_zap', { volume: 0.4, minGap: 80 });
    };
    const sp = CH6.BULLET_SPEED;
    if (this.phase === 0) {
      // aimed triple bursts + periodic rings
      if (this.patternT > 1300) {
        this.patternT = 0;
        this.burst = (this.burst ?? 0) + 1;
        // alternate cannons; only the middle shot is aimed straight at you
        const [x, y] = cannons[this.burst % 2];
        for (const sprd of [-0.32, 0, 0.32]) aimAt(x, y, sp, sprd);
        Audio.sfx('enemy_shot', { volume: 0.4, pistol: true });
        if (this.burst % 3 === 0) this.time.delayedCall(500, () => !this.busy && ring(14, sp * 0.8, this.boss.t));
      }
      if (this.droneT > 6500) { this.droneT = 0; this.spawnDrone(); }
    } else if (this.phase === 1) {
      // slow spirals while the tractor beam sweeps the sky
      if (this.patternT > 260) {
        this.patternT = 0;
        const a = this.boss.t * 2.4;
        for (const k of [0, Math.PI]) this.bullets.spawn(b.x, b.y + 28, Math.cos(a + k) * sp * 0.75, Math.sin(a + k) * sp * 0.75, 4);
      }
      if (this.droneT > 5200) { this.droneT = 0; this.spawnDrone(); this.time.delayedCall(700, () => !this.busy && this.spawnDrone()); }
    } else {
      // ENRAGED: double spiral + big aimed orbs + rings
      if (this.patternT > 220) {
        this.patternT = 0;
        this.tick3 = (this.tick3 ?? 0) + 1;
        const a = this.boss.t * 3.1;
        for (const k of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) this.bullets.spawn(b.x, b.y + 28, Math.cos(a + k) * sp * 0.85, Math.sin(a + k) * sp * 0.85, 4);
        if (this.tick3 % 9 === 0) for (const [x, y] of cannons) { const ang = Math.atan2(this.sled.y - y, this.sled.x - x); this.bigs.spawn(x, y, Math.cos(ang) * sp * 0.7, Math.sin(ang) * sp * 0.7, 6); }
        if (this.tick3 % 22 === 0) ring(18, sp * 0.7, a, this.bullets);
      }
      if (this.droneT > 4800) { this.droneT = 0; this.spawnDrone(); }
    }
  }

  drawBeam(dt) {
    this.gfx.clear();
    if (this.phase !== 1 || this.ended || this.busy) return;
    this.beamX += this.beamDir * 60 * dt;
    if (this.beamX > 420) this.beamDir = -1;
    if (this.beamX < 120) this.beamDir = 1;
    const b = this.boss, bx = b.x, by = b.y + 30;
    const gx = this.beamX, gy = 340;
    const hw = 40;
    this.gfx.fillStyle(0x5dff9a, 0.14);
    this.gfx.fillTriangle(bx, by, gx - hw, gy, gx + hw, gy);
    this.gfx.fillStyle(0x9dff8a, 0.1);
    this.gfx.fillTriangle(bx, by, gx - hw * 0.4, gy, gx + hw * 0.4, gy);
    // is the sled caught? (point-in-triangle by interpolating the beam width)
    const s = this.sled;
    if (s.y > by) {
      const t = (s.y - by) / (gy - by);
      const cx = bx + (gx - bx) * t, w = hw * t;
      if (Math.abs(s.x - cx) < w + 10) {
        // pulled toward the boss
        const dx = bx - s.x, dy = by - s.y, d = Math.hypot(dx, dy);
        s.x += (dx / d) * CH6.BEAM_PULL * dt;
        s.y += (dy / d) * CH6.BEAM_PULL * dt;
        if (!this.beamWarn) { this.beamWarn = true; Audio.sfx('ufo_warble', { volume: 0.5 }); this.time.delayedCall(1200, () => { this.beamWarn = false; }); }
        if (d < 50) this.hurt();
      }
    }
  }

  // ---------------------------------------------------------------------------
  //  Drones (fly toward Satoshi's ship)
  // ---------------------------------------------------------------------------
  spawnDrone() {
    const spr = this.add.sprite(this.boss.x - 40, this.boss.y + 30, 'drone').play('drone_alert').setDepth(35).setFlipX(true);
    this.drones.push({ spr, hp: CH6.DRONE_HP, t: 0, wob: Math.random() * 10 });
    Audio.sfx('teleport', { volume: 0.4 });
  }

  updateDrones(dt) {
    for (const d of [...this.drones]) {
      d.t += dt;
      const s = d.spr;
      const dx = SHIP.x + 50 - s.x, dy = SHIP.y - s.y + Math.sin(d.t * 3 + d.wob) * 40;
      const len = Math.hypot(dx, dy);
      s.x += (dx / len) * 52 * dt;
      s.y += (dy / len) * 52 * dt;
      if (len < 40) {
        this.shield -= CH6.DRONE_SHIP_DAMAGE;
        this.explode(s.x, s.y, false);
        Audio.sfx('hit');
        this.tweens.add({ targets: this.shieldBubble, fillAlpha: 0.4, duration: 80, yoyo: true });
        this.removeDrone(d);
        if (this.shield <= 0) this.knockedOut('SHIP SHIELDS DOWN!');
        continue;
      }
      if (Phaser.Math.Distance.Between(s.x, s.y, this.sled.x, this.sled.y) < 20) { this.hurt(); this.killDrone(d); }
    }
  }

  removeDrone(d) { d.spr.destroy(); this.drones = this.drones.filter((x) => x !== d); }

  killDrone(d) {
    this.explode(d.spr.x, d.spr.y, false);
    this.coinPool.spawn(d.spr.x, d.spr.y, -40, -30, 10, { coin: true, scale: 1 });
    this.coinsTotal++;
    this.sats += 15;
    this.removeDrone(d);
  }

  // ---------------------------------------------------------------------------
  //  Projectiles & collisions
  // ---------------------------------------------------------------------------
  updateProjectiles(dt) {
    const s = this.sled, b = this.boss;
    const core = { x: b.x, y: b.y + 28 };
    this.bolts.each((it) => {
      // gentle homing toward the Enforcer so casual players still land hits
      if (!this.ended && b.x < W) it.vy += Phaser.Math.Clamp((b.y + 10 - it.y) * 2.2, -260, 260) * dt;
      it.x += it.vx * dt; it.y += it.vy * dt;
      it.spr.setRotation(Math.atan2(it.vy, it.vx));
      it.spr.setPosition(it.x, it.y);
      if (it.x > W + 20) return this.bolts.kill(it);
      for (const d of this.drones) {
        if (Phaser.Math.Distance.Between(it.x, it.y, d.spr.x, d.spr.y) < 14) {
          d.hp -= this.boltDmg;
          this.sparks.setParticleTint(0x7ff8ff); this.sparks.explode(4, it.x, it.y);
          this.bolts.kill(it);
          if (d.hp <= 0) this.killDrone(d);
          return;
        }
      }
      if (!this.ended && b.x < W && Math.abs(it.x - b.x) < 100 && Math.abs(it.y - (b.y + 8)) < 24 + (Math.abs(it.x - b.x) < 34 ? 18 : 0)) {
        const coreHit = Phaser.Math.Distance.Between(it.x, it.y, core.x, core.y) < 14;
        this.damageBoss(this.boltDmg * (coreHit ? CH6.BOSS_CORE_MULT : 1), it.x, it.y, coreHit);
        this.bolts.kill(it);
      }
    });
    const hitTest = (pool) => pool.each((it) => {
      it.x += it.vx * dt; it.y += it.vy * dt;
      it.spr.setPosition(it.x, it.y);
      it.age += dt;
      it.spr.setScale(1 + Math.sin(it.age * 20) * 0.08);
      if (it.x < -20 || it.x > W + 20 || it.y < -20 || it.y > H + 20) return pool.kill(it);
      if (!this.busy && Phaser.Math.Distance.Between(it.x, it.y, s.x + 4, s.y + 2) < it.r + 6) { pool.kill(it); this.hurt(); }
      else if (Phaser.Math.Distance.Between(it.x, it.y, SHIP.x, SHIP.y) < 60 && it.x < SHIP.x + 70) {
        pool.kill(it); this.sparks.setParticleTint(0x7ff8ff); this.sparks.explode(3, it.x, it.y);   // the shield bubble deflects stray shots
      }
    });
    hitTest(this.bullets);
    hitTest(this.bigs);
    this.coinPool.each((it) => {
      if (!it.float) it.vy += 40 * dt;
      else it.y += Math.sin(this.time.now / 300) * 0.4;
      it.x += it.vx * dt; it.y += it.vy * dt;
      it.spr.setPosition(it.x, it.y);
      it.spr.setFrame(Math.floor(this.time.now / 80) % 8);
      if (it.y > H + 20 || it.x < -20) return this.coinPool.kill(it);
      if (Phaser.Math.Distance.Between(it.x, it.y, s.x, s.y) < 24) {
        this.coinPool.kill(it);
        if (it.golden != null) {
          vibrate(40);
          this.golden[it.golden] = true;
          this.sats += ECONOMY.GOLDEN_VALUE;
          Audio.sfx('golden');
          const slot = this.goldSlots[it.golden];
          slot.clearTint().setAlpha(1).setScale(2);
          this.tweens.add({ targets: slot, scale: 1, duration: 400, ease: 'Back.Out' });
          this.toast('GOLDEN BITCOIN!', 1200, P.btc1);
        } else { this.coins++; this.sats += ECONOMY.COIN_VALUE; Audio.sfx('coin', { combo: this.coins % 8, minGap: 0 }); }
      }
    });
  }

  damageBoss(dmg, x, y, core) {
    this.bossHp -= dmg;
    this.bark = Math.min(1, this.bark + CH6.POWER_BARK_CHARGE * (core ? 1.5 : 1) * 0.3);
    this.sparks.setParticleTint(core ? 0xffffff : 0xffc35c);
    this.sparks.explode(core ? 6 : 3, x, y);
    Audio.sfx('hit', { volume: core ? 0.6 : 0.35, minGap: 50 });
    if (!this.flashing) {
      this.flashing = true;
      this.boss.setFrame(1);
      this.time.delayedCall(60, () => { this.flashing = false; if (!this.ended) this.boss.setFrame(this.phase === 2 ? 2 : 0); });
    }
    const frac = this.bossHp / CH6.BOSS_HP;
    if (this.bossHp <= 0) this.victory();
    else if (this.phase < 2 && frac < PHASE_AT[this.phase + 1]) this.setPhase(this.phase + 1);
  }

  powerBark() {
    if (this.bark < 1) { Audio.sfx('ui_back', { volume: 0.4 }); return; }
    this.bark = 0;
    Audio.sfx('bark2', { volume: 1, pitch: 0.85 });
    Audio.sfx('explosion', { volume: 0.5 });
    shake(this, 400, 0.015);
    vibrate(80);
    this.cameras.main.flash(200, 255, 220, 120);
    const ring = this.add.circle(this.sled.x, this.sled.y, 10, 0xffc35c, 0).setStrokeStyle(6, 0xffc35c).setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, radius: 700, alpha: 0, duration: 800, ease: 'Cubic.Out', onUpdate: () => ring.setStrokeStyle(6, 0xffc35c, ring.alpha), onComplete: () => ring.destroy() });
    this.bullets.each((it) => { this.sparks.setParticleTint(0xffc35c); this.sparks.explode(1, it.x, it.y); this.bullets.kill(it); });
    this.bigs.each((it) => this.bigs.kill(it));
    for (const d of [...this.drones]) this.killDrone(d);
    this.damageBoss(CH6.POWER_BARK_DAMAGE, this.boss.x, this.boss.y + 20, true);
    this.say('*POWER BARK!!*');
  }

  hurt() {
    const time = this.time.now;
    if (time < this.invulnUntil || this.busy) return;
    this.invulnUntil = time + CH6.INVULN_MS;
    this.hp--;
    this.hitsTaken++;
    Audio.sfx('oof');
    Audio.sfx('whine', { volume: 0.5, delay: 0.1 });
    shake(this, 200, 0.01);
    vibrate(50);
    this.sled.setTintFill(0xffffff);
    this.time.delayedCall(80, () => this.sled.clearTint());
    this.updateHearts();
    if (this.hp <= 0) this.knockedOut('KNOCKED OUT OF THE SKY!');
  }

  /** A golden bitcoin drifts in from the right (one per phase). */
  spawnGolden(id) {
    if (this.golden[id]) return;
    this.coinPool.spawn(W + 10, Phaser.Math.Between(90, 250), -60, 0, 12, { golden: id, tex: 'golden', float: true });
    Audio.sfx('sparkle', { count: 6 });
  }

  explode(x, y, big) {
    const e = this.add.sprite(x, y, 'boom').play('boom').setDepth(75).setScale(big ? 2.2 : 1);
    e.once('animationcomplete', () => e.destroy());
    this.lighting.flash(x, y, big ? 240 : 110, 0xffa040, 450, 1);
    Audio.sfx('explosion', { big, volume: big ? 1 : 0.6, minGap: 40 });
    shake(this, big ? 400 : 120, big ? 0.02 : 0.006);
  }

  // ---------------------------------------------------------------------------
  //  HUD
  // ---------------------------------------------------------------------------
  updateHUD() {
    this.bossBar.width = Math.max(0, 240 * (this.bossHp / CH6.BOSS_HP));
    this.shieldBar.width = Math.max(0, 80 * (this.shield / CH6.SHIP_SHIELD));
    this.shieldBar.setFillStyle(this.shield < 30 ? hexNum(P.red) : hexNum(P.cyan2));
    this.barkBar.width = Math.max(1, 90 * this.bark);
    const full = this.bark >= 1;
    this.barkReady.setText(full ? 'READY!' : '');
    this.barkBar.setFillStyle(full ? (Math.floor(this.time.now / 150) % 2 ? 0xffe0a0 : 0xffc35c) : hexNum(P.gold2));
    this.satsText.setText(String(this.sats));
    if (full !== this.lastFull) { this.lastFull = full; if (full) Audio.sfx('ui_confirm', { volume: 0.6 }); Input.relabel('B', full ? 'BARK!' : 'BARK'); }
  }

  updateHearts() { this.hearts.forEach((h, i) => h.setFrame(i < this.hp ? 0 : 1)); }

  toast(text, hold = 1800, color = P.cream) {
    const t = headText(this, W / 2, 300, text, 8, color).setDepth(HUD).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 250, hold, yoyo: true, onComplete: () => t.destroy() });
  }

  say(text) {
    const t = bodyText(this, this.sled.x, this.sled.y - 22, text, 16, P.gold0, { ox: 0.5, oy: 1 }).setDepth(HUD - 1);
    this.tweens.add({ targets: t, y: t.y - 20, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }
}
