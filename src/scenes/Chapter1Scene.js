// ============================================================================
//  CHAPTER 1 — "EXTRATERRESTRIAL HIGHWAY"  (pseudo-3D arcade driving)
//  Ben floors it down SR-375 at golden hour, Zeus's head out the window.
//  Classic segment-projection road (OutRun style): curves, hills, roadside
//  sprites scaled by distance, cars with simple AI, fog toward the horizon.
// ============================================================================
import Phaser from 'phaser';
import { GAME, CH1, ECONOMY } from '../config.js';
import { P, hexNum, rgb } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Dialogue } from '../systems/dialogue.js';
import { applyFilm, shake, vibrate, hitStop } from '../systems/fx.js';
import { headText, bodyText, goTo, fadeIn } from '../systems/ui.js';
import { ROAD, buildEvents, DIALOG, trackLength } from '../data/ch1_track.js';
import ch1Song from '../audio/music/ch1.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const SEG = CH1.SEGMENT_LENGTH;

// --- colors as ints for fast per-frame blending ------------------------------
const C = (hex) => { const [r, g, b] = rgb(hex); return (r << 16) | (g << 8) | b; };
const HAZE = C('#f2b07a');
const COLORS = {
  light: { sand: C('#e0a868'), shoulder: C('#c9925a'), road: C('#5a4a52'), line: C('#f2e6c8') },
  dark:  { sand: C('#d49a5c'), shoulder: C('#b8804a'), road: C('#544650'), line: C('#f2e6c8') },
  yellow: C('#f5c542'),
};
function lerpC(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t);
}
const easeIn = (a, b, t) => a + (b - a) * Math.pow(t, 2);
const easeInOut = (a, b, t) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5);

// sprite sizes in road units (half-road widths)
const SIZE = {
  pole: 0.09, joshua_big: 0.55, joshua_med: 0.4, cactus: 0.14, sagebush: 0.2, boulder: 0.32, milemarker: 0.06,
  sign_et: 0.75, sign_cow: 0.22, billboard0: 0.95, billboard1: 0.95, billboard2: 0.95, sign_rachel: 1.1,
  suv_rear: 0.34, roadblock: 0.5, cow: 0.38, coin: 0.085, golden: 0.13,
};

export default class Chapter1Scene extends Phaser.Scene {
  constructor() { super('Chapter1'); }

  create() {
    fadeIn(this, 700);
    this.cameraDepth = 1 / Math.tan(((CH1.FOV / 2) * Math.PI) / 180);
    this.playerZ = CH1.CAMERA_HEIGHT * this.cameraDepth;
    this.position = 0;
    this.speed = 0;
    this.playerX = 0.5;               // start in the right-hand lane
    this.steer = 0;
    this.dents = 0;
    this.sats = 0;
    this.coins = 0;
    this.golden = [false, false, false];
    this.boost = CH1.BOOST_START;
    this.boostUntil = 0;
    this.lastSniff = -99999;
    this.checkpoint = 0;
    this.hits = 0;
    this.finished = false;
    this.frozen = true;
    this.bgOffset = 0;
    this.startTime = this.time.now;

    this.buildRoad();
    const dbg = this.registry.get('debugCol');
    if (dbg) { this.position = dbg * SEG; this.checkpoint = dbg; this.registry.set('debugCol', null); this.triggers.forEach((t) => { if (t.seg < dbg) t.done = true; }); }
    this.buildBackground();
    this.road = this.add.graphics().setDepth(5);
    this.pool = [];
    this.buildPlayer();
    this.buildHUD();

    Input.configure({
      mode: 'steer', pause: true,
      buttons: [{ id: 'A', label: 'BOOST', style: 'a' }, { id: 'B', label: 'ZEUS', style: 'b', icon: 'glyph_paw' }],
    });
    Audio.playMusic(ch1Song);
    Audio.playAmbience('desert_day');
    this.engine = Audio.loop('engine', { volume: 0.45 });
    this.wind = Audio.loop('wind', { volume: 0.0001 });
    this.film = applyFilm(this, { vignette: 1.05 });
    if (this.film) { this.film.heat = 0.5; this.film.horizon = 0.5; }

    const onPause = () => { if (!this.finished && !this.scene.isActive('Pause')) { this.scene.launch('Pause', { from: this.scene.key }); this.scene.bringToTop('Pause'); this.scene.bringToTop('Controls'); } };
    Input.events.on('pause', onPause);
    this.events.once('shutdown', () => { Input.events.off('pause', onPause); this.engine.stop(0.3); this.wind.stop(0.3); });
    this.events.on('pause', () => this.engine.set({ volume: 0.0001 }));
    this.events.on('resume', () => this.engine.set({ volume: 0.45 }));

    this.countdown();
  }

  // ===========================================================================
  //  ROAD CONSTRUCTION
  // ===========================================================================
  lastY() { return this.segments.length ? this.segments[this.segments.length - 1].p2.world.y : 0; }

  addSegment(curve, y) {
    const n = this.segments.length;
    this.segments.push({
      index: n,
      p1: { world: { y: this.lastY(), z: n * SEG }, camera: {}, screen: {} },
      p2: { world: { y, z: (n + 1) * SEG }, camera: {}, screen: {} },
      curve, sprites: [], cars: [],
      dark: Math.floor(n / CH1.RUMBLE_LENGTH) % 2 === 1,
    });
  }

  addRoad(enter, hold, leave, curve, hill) {
    const startY = this.lastY(), endY = startY + hill * SEG, total = enter + hold + leave;
    for (let i = 0; i < enter; i++) this.addSegment(easeIn(0, curve, i / enter), easeInOut(startY, endY, i / total));
    for (let i = 0; i < hold; i++) this.addSegment(curve, easeInOut(startY, endY, (enter + i) / total));
    for (let i = 0; i < leave; i++) this.addSegment(easeInOut(curve, 0, i / leave), easeInOut(startY, endY, (enter + hold + i) / total));
  }

  buildRoad() {
    this.segments = [];
    for (const [kind, len, curve, hill] of ROAD) {
      const q = Math.round(len / 4);
      if (kind === 'rolling') {
        const n = Math.round(len / 12);
        this.addRoad(n, n, n, 0, hill / 2); this.addRoad(n, n, n, 0, -hill); this.addRoad(n, n, n, 0, hill); this.addRoad(n, n, n, 0, -hill / 2);
      } else if (kind === 'scurves') {
        const n = Math.round(len / 15);
        for (const c of [-curve, curve, -curve / 2, curve / 2, -curve]) this.addRoad(n, n, n, c, hill / 5);
      } else this.addRoad(q, len - 2 * q, q, curve, hill);
    }
    // run-off so the horizon never ends
    this.addRoad(100, 200, 100, 0, 0);
    this.trackLength = this.segments.length * SEG;

    // --- procedural roadside: poles on the left, Joshua trees, sage, rocks
    const rnd = new Phaser.Math.RandomDataGenerator(['sr375']);
    for (let i = 20; i < this.segments.length; i++) {
      const s = this.segments[i];
      if (i % 14 === 0) s.sprites.push({ key: 'pole', x: -1.45 });
      if (rnd.frac() < 0.05) s.sprites.push({ key: rnd.frac() < 0.5 ? 'joshua_big' : 'joshua_med', x: rnd.pick([-1, 1]) * rnd.realInRange(1.5, 3.2) });
      if (rnd.frac() < 0.12) s.sprites.push({ key: 'sagebush', x: rnd.pick([-1, 1]) * rnd.realInRange(1.25, 3.5) });
      if (rnd.frac() < 0.015) s.sprites.push({ key: 'boulder', x: rnd.pick([-1, 1]) * rnd.realInRange(1.6, 3) });
      if (rnd.frac() < 0.01) s.sprites.push({ key: 'cactus', x: rnd.pick([-1, 1]) * rnd.realInRange(1.3, 2.4) });
    }

    // --- events
    this.cars = [];
    this.cows = [];
    this.goldenSprites = [];
    this.triggers = [];
    for (const e of buildEvents()) {
      const s = this.segments[Math.min(e.seg, this.segments.length - 1)];
      if (e.type === 'coin') s.sprites.push({ key: 'coin', x: e.x, coin: true, anim: true });
      else if (e.type === 'golden') { const g = { key: 'golden', x: e.x, golden: e.id, hidden: true, anim: true }; s.sprites.push(g); this.goldenSprites.push({ sprite: g, seg: e.seg }); }
      else if (e.type === 'prop') s.sprites.push({ key: e.key, x: e.x });
      else if (e.type === 'roadblock') s.sprites.push({ key: 'roadblock', x: e.x, solid: true, block: true, anim: true });
      else if (e.type === 'suv') this.cars.push({ key: 'suv_rear', z: e.seg * SEG, x: e.lane, lane: e.lane, speedF: e.speed, ai: e.ai, t: 0, anim: true });
      else if (e.type === 'cow') this.cows.push({ key: 'cow', seg: e.seg, x: e.x, dir: e.dir, state: 'graze', anim: true, solid: true });
      else if (e.type === 'checkpoint') { s.sprites.push({ key: 'milemarker', x: 1.2 }); this.triggers.push({ seg: e.seg, type: 'checkpoint', mile: e.mile }); }
      else this.triggers.push({ seg: e.seg, type: e.type, id: e.id });
    }
    this.finishSeg = this.triggers.find((t) => t.type === 'finish').seg;
    this.coinsTotal = buildEvents().filter((e) => e.type === 'coin').length;
    void trackLength;
  }

  // ===========================================================================
  //  VISUALS
  // ===========================================================================
  buildBackground() {
    this.add.image(0, -40, 'sky_golden').setOrigin(0).setDepth(0).setDisplaySize(W, 260);
    this.sunGlow = this.add.image(W / 2, 170, 'glow').setScale(5).setTint(hexNum(P.sun2)).setAlpha(0.65).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    this.sun = this.add.image(W / 2, 172, 'sun').setDepth(1.1);
    this.clouds = this.add.tileSprite(0, 40, W, 20, 'cloud_c').setOrigin(0).setDepth(1.2).setAlpha(0.85);
    this.clouds2 = this.add.tileSprite(0, 86, W, 14, 'cloud_b').setOrigin(0).setDepth(1.2).setAlpha(0.7);
    this.far = this.add.tileSprite(0, 124, W, 70, 'range_far').setOrigin(0).setDepth(2).setTint(0xf0c0c8);
    this.mid = this.add.tileSprite(0, 88, W, 132, 'mesa_mid').setOrigin(0).setDepth(3).setTint(0xf8d0c8);
    this.near = this.add.tileSprite(0, 118, W, 120, 'mesa_near').setOrigin(0).setDepth(4).setTint(0xffd8c8);
    this.add.image(W / 2, 186, 'glow_soft').setScale(10, 0.8).setTint(hexNum(P.sky8)).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(4.5);
    // lens flare ghosts (drawn above the road)
    this.flares = [0.35, 0.6, 0.85].map((f, i) => this.add.image(0, 0, 'glow_soft').setScale(0.25 + i * 0.15).setTint([0xffb347, 0xff6a8a, 0x7ff8ff][i]).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(150));
    this.flares.f = [0.35, 0.6, 0.85];
  }

  buildPlayer() {
    this.van = this.add.sprite(W / 2, H - 6, 'van_rear', 0).setOrigin(0.5, 1).setScale(2).setDepth(100);
    this.zeusHead = this.add.sprite(0, 0, 'zeus_window').play('zeus_window_flap').setScale(2).setDepth(99);
    this.brake = [0, 1].map(() => this.add.image(0, 0, 'glow').setScale(0.25).setTint(0xff3b4f).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(101));
    this.dust = this.add.particles(0, 0, 'mote', {
      lifespan: 700, speedY: { min: -30, max: -10 }, speedX: { min: -40, max: 40 }, scale: { start: 1, end: 3 },
      alpha: { start: 0.5, end: 0 }, tint: hexNum(P.sand0), emitting: false,
    }).setDepth(98);
    this.sparks = this.add.particles(0, 0, 'px2', {
      lifespan: 500, speed: { min: 60, max: 200 }, gravityY: 400, alpha: { start: 1, end: 0 },
      tint: [hexNum(P.fire0), hexNum(P.fire1)], blendMode: 'ADD', emitting: false,
    }).setDepth(140);
    this.speedLines = this.add.particles(W / 2, 170, 'streak_v', {
      lifespan: 500, speed: { min: 400, max: 700 }, angle: { min: 0, max: 360 }, scale: { start: 0.5, end: 2 },
      alpha: { start: 0.0, end: 0.7 }, rotate: { onEmit: (p) => Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) + 90 },
      blendMode: 'ADD', emitting: false, frequency: 20,
    }).setDepth(95);
  }

  buildHUD() {
    const D = 200;
    this.add.rectangle(6, 6, 104, 42, hexNum(P.ink), 0.6).setOrigin(0).setStrokeStyle(1, hexNum(P.ink4)).setDepth(D);
    headText(this, 12, 15, 'VAN', 8, P.cream2, { ox: 0 }).setDepth(D);
    this.dentIcons = [];
    for (let i = 0; i < CH1.MAX_DENTS; i++) this.dentIcons.push(this.add.image(50 + i * 12, 15, 'heart', 0).setDepth(D));
    this.add.image(16, 34, 'glyph_btc').setDepth(D);
    this.satsText = headText(this, 26, 34, '0', 8, P.cream, { ox: 0 }).setDepth(D);
    this.goldSlots = [0, 1, 2].map((i) => this.add.image(W / 2 - 18 + i * 18, 14, 'golden', 0).setAlpha(0.22).setTint(0x888888).setDepth(D));
    // progress strip toward Rachel
    this.add.rectangle(W / 2, 30, 160, 3, hexNum(P.ink3)).setDepth(D);
    this.progVan = this.add.rectangle(W / 2 - 80, 30, 5, 5, hexNum(P.van0)).setDepth(D + 1);
    headText(this, W / 2 + 86, 30, 'RACHEL', 8, P.cream2, { ox: 0 }).setDepth(D).setScale(0.75);
    // speedometer + boost meter (top right, under the pause button)
    this.add.rectangle(W - 6, 40, 96, 40, hexNum(P.ink), 0.6).setOrigin(1, 0).setStrokeStyle(1, hexNum(P.ink4)).setDepth(D);
    this.mphText = headText(this, W - 30, 54, '0', 16, P.white, { ox: 1 }).setDepth(D);
    headText(this, W - 12, 56, 'MPH', 8, P.cream2, { ox: 1 }).setDepth(D).setScale(0.75);
    bodyText(this, W - 96, 71, 'BOOST', 16, P.cyan1, { oy: 0.5 }).setDepth(D);
    this.add.rectangle(W - 54, 71, 40, 4, hexNum(P.ink3)).setOrigin(0, 0.5).setDepth(D).setStrokeStyle(1, hexNum(P.ink));
    this.boostBar = this.add.rectangle(W - 54, 71, 40, 4, hexNum(P.cyan2)).setOrigin(0, 0.5).setDepth(D + 1);
  }

  // ===========================================================================
  //  STORY / FLOW
  // ===========================================================================
  async countdown() {
    const t = headText(this, W / 2, 120, '', 16, P.btc).setDepth(300);
    for (const s of ['3', '2', '1']) {
      t.setText(s).setScale(2).setAlpha(1);
      this.tweens.add({ targets: t, scale: 1, alpha: 0.6, duration: 500 });
      Audio.sfx('ui_toggle', { on: true });
      this.engine.set({ rpm: 0.5 });
      await this.wait(650);
      this.engine.set({ rpm: 0.1 });
    }
    t.setText('FLOOR IT!').setScale(1.5).setAlpha(1);
    Audio.sfx('ui_confirm');
    Audio.sfx('bark2', { delay: 0.2 });
    this.tweens.add({ targets: t, scale: 1, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    this.frozen = false;
    this.startTime = this.time.now;
  }

  async finish() {
    this.finished = true;
    Input.configure({ mode: 'none' });
    this.wind.set({ volume: 0.0001 });
    await this.wait(2200);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'happy', text: 'Rachel, Nevada. Population 54.' },
      { who: 'ben', mood: 'smug', text: '...55 with Zeus.' },
      { who: 'zeus', mood: 'excited', text: '*BOOF!*' },
      { who: 'ben', mood: 'talk', text: 'There\'s a diner up ahead. If anyone around here knows about that note, it\'s gonna be the locals.' },
    ]);
    const time = (this.time.now - this.startTime) / 1000;
    goTo(this, 'Results', {
      chapter: 'ch1', sats: this.sats, coins: this.coins, coinsTotal: this.coinsTotal, golden: this.golden, time,
      clean: this.hits === 0, cleanLabel: 'NOT A SCRATCH',
      stats: [['COINS', `${this.coins} / ${this.coinsTotal}`, 'text'], ['DENTS TAKEN', this.hits, 'num']],
    }, { duration: 800 });
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }

  // ===========================================================================
  //  UPDATE
  // ===========================================================================
  findSegment(z) { return this.segments[Math.floor(z / SEG) % this.segments.length]; }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    const maxSpeed = CH1.MAX_SPEED * (time < this.boostUntil ? CH1.BOOST_MULT : 1);
    const playerSeg = this.findSegment(this.position + this.playerZ);
    const speedPct = this.speed / CH1.MAX_SPEED;

    if (!this.frozen && !this.finished) {
      // steering (smoothed so touch pads feel analog)
      this.steer = Phaser.Math.Linear(this.steer, Input.axisX, Math.min(1, dt * 10));
      const dx = dt * CH1.STEER * Math.min(1, speedPct * 1.2);
      this.playerX += dx * this.steer;
      this.playerX -= dx * speedPct * playerSeg.curve * CH1.CENTRIFUGAL;
      this.speed = Math.min(maxSpeed, this.speed + CH1.ACCEL * dt);
      if (this.speed > maxSpeed) this.speed -= CH1.ACCEL * 2 * dt;
      // boost
      if (Input.consume('A')) this.tryBoost(time);
      // Zeus: bark (scare cows) + sniff (reveal golden bitcoins)
      if (Input.consume('B')) this.zeusAction(time, playerSeg);
    } else {
      this.speed = Math.max(0, this.speed - CH1.ACCEL * 1.2 * dt);
      this.steer *= 0.9;
    }
    // off-road
    const offroad = Math.abs(this.playerX) > 1.08;
    if (offroad && this.speed > CH1.MAX_SPEED * CH1.OFFROAD_LIMIT) this.speed -= CH1.OFFROAD_DECEL * dt;
    this.playerX = Phaser.Math.Clamp(this.playerX, -2.4, 2.4);
    this.position = Math.min(this.position + this.speed * dt, this.trackLength - this.playerZ - SEG * (CH1.DRAW_DISTANCE + 2));

    this.updateCars(dt, playerSeg);
    this.updateCows(dt, playerSeg);
    this.checkCollisions(playerSeg, time);
    this.checkTriggers(playerSeg.index);

    // background parallax follows curves
    this.bgOffset += playerSeg.curve * speedPct * dt * 60;
    this.far.tilePositionX = this.bgOffset * 0.6;
    this.mid.tilePositionX = this.bgOffset * 1.2;
    this.near.tilePositionX = this.bgOffset * 2.2;
    this.clouds.tilePositionX = this.bgOffset * 0.3 + time * 0.004;
    this.clouds2.tilePositionX = this.bgOffset * 0.4 + time * 0.007;
    const hill = (playerSeg.p2.world.y - playerSeg.p1.world.y) / SEG;
    this.mid.y = 88 + Phaser.Math.Clamp(-hill * 40, -16, 16);
    this.near.y = 118 + Phaser.Math.Clamp(-hill * 60, -22, 22);

    this.render(time);
    this.updatePlayerVisuals(time, dt, offroad, speedPct);
    this.updateHUD(time, playerSeg);
  }

  tryBoost(time) {
    if (this.boost < CH1.BOOST_COST || time < this.boostUntil) { Audio.sfx('ui_back', { volume: 0.4 }); return; }
    this.boost -= CH1.BOOST_COST;
    this.boostUntil = time + CH1.BOOST_SECONDS * 1000;
    Audio.sfx('whoosh', { dur: 0.6, volume: 0.9 });
    Audio.sfx('bark', { delay: 0.25, volume: 0.7 });
    shake(this, 200, 0.004);
    this.cameras.main.zoomTo(0.94, 300);
    this.time.delayedCall(CH1.BOOST_SECONDS * 1000, () => this.cameras.main.zoomTo(1, 500));
  }

  zeusAction(time, playerSeg) {
    if (time - this.lastSniff < CH1.SNIFF_COOLDOWN_MS) { Audio.sfx('ui_back', { volume: 0.4 }); return; }
    this.lastSniff = time;
    Audio.sfx('bark2', { pan: 0.4 });
    this.tweens.add({ targets: this.zeusHead, scaleX: 2.4, scaleY: 2.4, duration: 90, yoyo: true });
    // scare cows ahead off the road
    for (const cow of this.cows) {
      const d = cow.seg - playerSeg.index;
      if (d > 0 && d < CH1.BARK_RANGE && cow.state !== 'gone') { cow.state = 'scared'; cow.dir = cow.x < 0 ? -1 : 1; }
    }
    // sniff: reveal golden bitcoins up ahead
    let found = false;
    for (const g of this.goldenSprites) {
      const d = g.seg - playerSeg.index;
      if (g.sprite.hidden && d > -5 && d < CH1.SNIFF_RANGE) { g.sprite.hidden = false; found = true; }
    }
    const ring = this.add.circle(this.zeusHead.x, this.zeusHead.y, 6, hexNum(P.cyan2), 0).setStrokeStyle(2, hexNum(P.cyan2)).setDepth(160).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, radius: 120, alpha: 0, duration: 600, onUpdate: () => ring.setStrokeStyle(2, hexNum(P.cyan2), ring.alpha), onComplete: () => ring.destroy() });
    if (found) {
      Audio.sfx('sparkle', { count: 10, delay: 0.3 });
      this.toast('ZEUS SMELLS GOLD UP AHEAD!', P.btc1);
    }
  }

  toast(text, color = P.cream) {
    const t = headText(this, W / 2, 104, text, 8, color).setDepth(260).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 98, duration: 200, hold: 1400, yoyo: true, onComplete: () => t.destroy() });
  }

  // --- traffic ---------------------------------------------------------------
  updateCars(dt, playerSeg) {
    for (const car of this.cars) {
      const oldSeg = this.findSegment(car.z);
      car.t += dt;
      const pz = this.position + this.playerZ;
      const gap = car.z - pz;                         // >0: car is ahead of the player
      // only drive once the player is near, so waves are timed by the track
      if (gap > SEG * 260) continue;
      let target = car.lane;
      if (car.ai === 'weave') target = Math.sin(car.t * 0.9 + car.lane * 3) * 0.6;
      if (car.ai === 'block' && gap > 0 && gap < SEG * 70) target = Phaser.Math.Clamp(this.playerX, -0.6, 0.6);
      car.x = Phaser.Math.Linear(car.x, target, Math.min(1, dt * (car.ai === 'block' ? 1.4 : 1)));
      car.speed = CH1.MAX_SPEED * car.speedF;
      car.z += car.speed * dt;
      const newSeg = this.findSegment(car.z);
      if (oldSeg !== newSeg) {
        const i = oldSeg.cars.indexOf(car);
        if (i >= 0) oldSeg.cars.splice(i, 1);
        newSeg.cars.push(car);
      } else if (!newSeg.cars.includes(car)) newSeg.cars.push(car);
      car.percent = (car.z % SEG) / SEG;
    }
  }

  updateCows(dt, playerSeg) {
    for (const cow of this.cows) {
      const d = cow.seg - playerSeg.index;
      if (cow.state === 'graze' && d < 75 && d > 0) cow.state = 'cross';
      if (cow.state === 'cross') cow.x += cow.dir * 0.32 * dt;
      if (cow.state === 'scared') { cow.x += cow.dir * 2.4 * dt; if (Math.abs(cow.x) > 3) cow.state = 'gone'; }
      if (cow.state === 'cross' && Math.abs(cow.x) > 2.6 && Math.sign(cow.x) === cow.dir) cow.state = 'gone';
      if (cow.state === 'scared' && !cow.mooed) { cow.mooed = true; Audio.sfx('boof', { volume: 0.5, pan: Phaser.Math.Clamp(cow.x, -1, 1) }); }
    }
  }

  checkCollisions(playerSeg, time) {
    if (this.finished || this.frozen) return;
    const pw = 0.27;                                  // van half-width in road units
    const px = this.playerX;
    for (const seg of [playerSeg, this.segments[playerSeg.index + 1]]) {
      if (!seg) continue;
      for (const s of seg.sprites) {
        if (s.taken || s.hidden && s.golden != null) continue;
        const w = (SIZE[s.key] ?? 0.2) / 2;
        if (Math.abs(s.x - px) > pw + w) continue;
        if (s.coin) this.collectCoin(s);
        else if (s.golden != null) this.collectGolden(s);
        else if (s.solid && !s.taken) this.crash(s, 'block');
      }
      for (const car of seg.cars) {
        if (Math.abs(car.x - px) < pw + SIZE.suv_rear / 2 && this.speed > car.speed) {
          this.speed = car.speed * 0.55;
          this.position = car.z - this.playerZ - SEG * 1.2;
          this.crash(car, 'car');
        }
      }
    }
    for (const cow of this.cows) {
      if (cow.state === 'gone' || cow.hit) continue;
      if (Math.abs(cow.seg - playerSeg.index) <= 1 && Math.abs(cow.x - px) < pw + SIZE.cow / 2) { cow.hit = true; cow.state = 'scared'; cow.dir = px < cow.x ? 1 : -1; this.crash(cow, 'cow'); }
    }
    void time;
  }

  crash(thing, kind) {
    if (this.time.now < (this.invulnUntil ?? 0)) return;
    this.invulnUntil = this.time.now + 900;
    if (kind === 'block') { thing.taken = true; this.speed *= 0.35; }
    if (kind === 'cow') this.speed *= 0.4;
    this.dents++;
    this.hits++;
    Audio.sfx(kind === 'cow' ? 'thud' : 'explosion', { volume: kind === 'cow' ? 0.9 : 0.55 });
    Audio.sfx('screech', { volume: 0.7 });
    if (kind === 'cow') Audio.sfx('boof', { pitch: 0.7, delay: 0.1 });
    shake(this, 280, 0.014);
    vibrate(80);
    hitStop(this, 60);
    this.sparks.explode(26, this.van.x, this.van.y - 40);
    this.cameras.main.flash(120, 255, 200, 160);
    this.van.setTintFill(0xffffff);
    this.time.delayedCall(80, () => this.van.clearTint());
    if (this.dents >= CH1.MAX_DENTS) this.wreck();
    else this.toast(['OOF! THE PAINT!', 'DENTED!', 'WATCH THE ROAD!'][this.dents % 3], P.red);
    this.updateDents();
  }

  async wreck() {
    this.frozen = true;
    Audio.sfx('explosion', { big: true });
    Audio.sfx('whine', { long: true, delay: 0.5 });
    this.toast('THE VAN NEEDS A MINUTE...', P.red);
    await this.wait(1200);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    await this.wait(450);
    this.position = this.checkpoint * SEG;
    this.speed = 0;
    this.playerX = 0.5;
    this.dents = 0;
    this.updateDents();
    // clear traffic just ahead so the restart is fair
    for (const car of this.cars) if (car.z > this.position && car.z < this.position + SEG * 120) car.z += SEG * 140;
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.toast('BACK ON THE ROAD!', P.green1);
    await this.wait(500);
    this.frozen = false;
  }

  collectCoin(s) {
    s.taken = true;
    this.coins++;
    this.boost = Math.min(1, this.boost + CH1.BOOST_PER_COIN);
    const now = this.time.now;
    this.combo = now - (this.lastCoin ?? 0) < 700 ? Math.min(10, (this.combo ?? 0) + 1) : 0;
    this.lastCoin = now;
    Audio.sfx('coin', { combo: this.combo, minGap: 0, pan: Phaser.Math.Clamp(s.x - this.playerX, -1, 1) * 0.5 });
    this.flyCoin('coin', ECONOMY.COIN_VALUE);
  }

  collectGolden(s) {
    s.taken = true;
    this.golden[s.golden] = true;
    Audio.sfx('golden');
    vibrate(40);
    const slot = this.goldSlots[s.golden];
    slot.clearTint().setAlpha(1).setScale(2.2);
    this.tweens.add({ targets: slot, scale: 1, duration: 400, ease: 'Back.Out' });
    this.toast('GOLDEN BITCOIN!', P.btc1);
    this.flyCoin('golden', ECONOMY.GOLDEN_VALUE);
  }

  flyCoin(key, value) {
    const f = this.add.sprite(this.van.x + Phaser.Math.Between(-20, 20), this.van.y - 70, key).play(`${key}_spin`).setDepth(210).setScale(1.6);
    this.tweens.add({
      targets: f, x: 16, y: 34, scale: 0.7, duration: 500, ease: 'Cubic.In', onComplete: () => {
        f.destroy();
        this.sats += value;
        this.satsText.setText(String(this.sats));
      },
    });
  }

  checkTriggers(segIndex) {
    for (const t of this.triggers) {
      if (t.done || segIndex < t.seg) continue;
      t.done = true;
      if (t.type === 'dialog') Dialogue.ambient(this, DIALOG[t.id]);
      else if (t.type === 'checkpoint') {
        this.checkpoint = t.seg;
        Audio.sfx('checkpoint');
        this.toast(`MILE ${t.mile}  -  CHECKPOINT`, P.green1);
        if (this.dents > 0) { this.dents--; this.updateDents(); }
      } else if (t.type === 'finish') this.finish();
    }
  }

  // ===========================================================================
  //  RENDERING (segment projection)
  // ===========================================================================
  project(p, camX, camY, camZ) {
    p.camera.x = (p.world.x || 0) - camX;
    p.camera.y = (p.world.y || 0) - camY;
    p.camera.z = (p.world.z || 0) - camZ;
    p.screen.scale = this.cameraDepth / p.camera.z;
    p.screen.x = Math.round(W / 2 + (p.screen.scale * p.camera.x * W) / 2);
    p.screen.y = Math.round(H / 2 - (p.screen.scale * p.camera.y * H) / 2);
    p.screen.w = Math.round((p.screen.scale * CH1.ROAD_WIDTH * W) / 2);
  }

  render(time) {
    const g = this.road;
    g.clear();
    const base = this.findSegment(this.position);
    const basePct = (this.position % SEG) / SEG;
    const playerSeg = this.findSegment(this.position + this.playerZ);
    const playerPct = ((this.position + this.playerZ) % SEG) / SEG;
    const playerY = playerSeg.p1.world.y + (playerSeg.p2.world.y - playerSeg.p1.world.y) * playerPct;
    let maxy = H;
    let x = 0, dx = -(base.curve * basePct);
    const n = CH1.DRAW_DISTANCE;
    this.visible = [];
    for (let i = 0; i < n; i++) {
      const seg = this.segments[base.index + i];
      if (!seg) break;
      seg.fog = 1 - Math.exp(-Math.pow(i / n, 2) * 3.2);
      seg.clip = maxy;
      this.project(seg.p1, this.playerX * CH1.ROAD_WIDTH - x, playerY + CH1.CAMERA_HEIGHT, this.position);
      this.project(seg.p2, this.playerX * CH1.ROAD_WIDTH - x - dx, playerY + CH1.CAMERA_HEIGHT, this.position);
      x += dx;
      dx += seg.curve;
      this.visible.push(seg);
      if (seg.p1.camera.z <= this.cameraDepth || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
      this.drawSegment(g, seg);
      maxy = seg.p1.screen.y;
    }
    this.horizonY = maxy;
    this.renderSprites(time);
  }

  quad(g, color, x1, y1, w1, x2, y2, w2) {
    g.fillStyle(color, 1);
    g.fillTriangle(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2);
    g.fillTriangle(x1 - w1, y1, x2 + w2, y2, x2 - w2, y2);
  }

  drawSegment(g, seg) {
    const p1 = seg.p1.screen, p2 = seg.p2.screen;
    const col = seg.dark ? COLORS.dark : COLORS.light;
    const f = seg.fog;
    // ground
    g.fillStyle(lerpC(col.sand, HAZE, f), 1);
    g.fillRect(0, p2.y, W, p1.y - p2.y);
    // dirt shoulders
    const r1 = p1.w / 5, r2 = p2.w / 5;
    this.quad(g, lerpC(col.shoulder, HAZE, f), p1.x - p1.w - r1 / 2, p1.y, r1 / 2 + 1, p2.x - p2.w - r2 / 2, p2.y, r2 / 2 + 1);
    this.quad(g, lerpC(col.shoulder, HAZE, f), p1.x + p1.w + r1 / 2, p1.y, r1 / 2 + 1, p2.x + p2.w + r2 / 2, p2.y, r2 / 2 + 1);
    // asphalt
    this.quad(g, lerpC(col.road, HAZE, f), p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);
    // white edge lines
    const l1 = Math.max(1, p1.w / 40), l2 = Math.max(1, p2.w / 40);
    const lc = lerpC(col.line, HAZE, f * 0.7);
    this.quad(g, lc, p1.x - p1.w + l1 * 2, p1.y, l1, p2.x - p2.w + l2 * 2, p2.y, l2);
    this.quad(g, lc, p1.x + p1.w - l1 * 2, p1.y, l1, p2.x + p2.w - l2 * 2, p2.y, l2);
    // double yellow centre line
    const yc = lerpC(COLORS.yellow, HAZE, f * 0.7);
    const yw1 = Math.max(0.5, p1.w / 70), yw2 = Math.max(0.5, p2.w / 70);
    this.quad(g, yc, p1.x - yw1 * 1.8, p1.y, yw1, p2.x - yw2 * 1.8, p2.y, yw2);
    this.quad(g, yc, p1.x + yw1 * 1.8, p1.y, yw1, p2.x + yw2 * 1.8, p2.y, yw2);
  }

  /** Grab a pooled image for this frame. */
  img(i, key) {
    let im = this.pool[i];
    if (!im) { im = this.add.sprite(0, 0, key).setOrigin(0.5, 1); this.pool[i] = im; }
    if (im.texture.key !== key) im.setTexture(key);
    im.setVisible(true);
    return im;
  }

  renderSprites(time) {
    let k = 0;
    const frame8 = Math.floor(time / 80) % 8;
    const draw = (key, scale, sx, sy, w, clip, depth, fog, opts = {}) => {
      const tex = this.textures.get(key);
      const src = tex.getSourceImage();
      const frameW = opts.frameW ?? src.width;
      const frameH = opts.frameH ?? src.height;
      const destW = w * scale * CH1.ROAD_WIDTH * (W / 2);
      if (destW < 1.5 || destW > 2000) return;
      const s = destW / frameW;
      const destH = frameH * s;
      if (sy - destH >= clip) return;
      const im = this.img(k++, key);
      if (opts.frame != null) im.setFrame(opts.frame);
      im.setScale(s).setPosition(sx + (opts.offsetX ?? 0) * destW, sy).setDepth(depth).setAlpha(opts.alpha ?? 1);
      im.setTint(lerpC(0xffffff, HAZE, fog * 0.85));
      const visibleH = Math.min(frameH, (clip - (sy - destH)) / s);
      if (visibleH < frameH) im.setCrop(0, 0, frameW, Math.max(0, visibleH)); else im.setCrop();
    };
    for (let i = this.visible.length - 1; i > 0; i--) {
      const seg = this.visible[i];
      const sc = seg.p1.screen.scale;
      const depth = 10 + (this.visible.length - i);
      for (const sp of seg.sprites) {
        if (sp.taken) continue;
        if (sp.golden != null && sp.hidden) continue;
        const sx = seg.p1.screen.x + (sc * sp.x * CH1.ROAD_WIDTH * W) / 2;
        let frame, frameW, frameH, alpha = 1;
        if (sp.key === 'coin') { frame = frame8; frameW = 12; frameH = 12; }
        if (sp.key === 'golden') { frame = frame8; frameW = 18; frameH = 18; }
        if (sp.key === 'roadblock') { frame = Math.floor(time / 250) % 2; frameW = 80; frameH = 34; }
        const lift = sp.coin || sp.golden != null ? 0.06 * sc * CH1.ROAD_WIDTH * (W / 2) : 0;
        draw(sp.key, sc, sx, seg.p1.screen.y - lift, SIZE[sp.key] ?? 0.3, seg.clip, depth, seg.fog, { frame, frameW, frameH, alpha });
      }
      for (const car of seg.cars) {
        const scale = sc + (seg.p2.screen.scale - sc) * (car.percent ?? 0);
        const cx = seg.p1.screen.x + (seg.p2.screen.x - seg.p1.screen.x) * (car.percent ?? 0) + (scale * car.x * CH1.ROAD_WIDTH * W) / 2;
        const cy = seg.p1.screen.y + (seg.p2.screen.y - seg.p1.screen.y) * (car.percent ?? 0);
        draw('suv_rear', scale, cx, cy, SIZE.suv_rear, seg.clip, depth + 0.5, seg.fog, { frame: Math.floor(time / 200) % 2, frameW: 64, frameH: 48 });
      }
    }
    // cows (stored by segment index)
    for (const cow of this.cows) {
      if (cow.state === 'gone') continue;
      const vi = cow.seg - (this.visible[0]?.index ?? 0);
      const seg = this.visible[vi];
      if (!seg || vi <= 0) continue;
      const sc = seg.p1.screen.scale;
      const sx = seg.p1.screen.x + (sc * cow.x * CH1.ROAD_WIDTH * W) / 2;
      const im0 = k;
      draw('cow', sc, sx, seg.p1.screen.y, SIZE.cow, seg.clip, 10 + (this.visible.length - vi) + 0.3, seg.fog, { frame: Math.floor(time / (cow.state === 'scared' ? 90 : 250)) % 2, frameW: 44, frameH: 30 });
      if (this.pool[im0] && k > im0) this.pool[im0].setFlipX(cow.dir < 0);
    }
    for (let i = k; i < this.pool.length; i++) this.pool[i].setVisible(false);
  }

  updatePlayerVisuals(time, dt, offroad, speedPct) {
    const bump = offroad ? Math.sin(time / 30) * 2 : Math.sin(time / 60) * speedPct;
    this.van.y = H - 6 + bump;
    this.van.setFrame(this.steer < -0.3 ? 1 : this.steer > 0.3 ? 2 : 0);
    this.van.x = W / 2 + this.steer * 6;
    this.zeusHead.setPosition(this.van.x + 66 + this.steer * 4, this.van.y - 66);
    const braking = this.frozen || this.finished;
    this.brake.forEach((b, i) => { b.setPosition(this.van.x + (i ? 52 : -52), this.van.y - 54); b.setAlpha(braking ? 0.9 : 0.25); });
    if (offroad && speedPct > 0.1) this.dust.explode(2, this.van.x + Phaser.Math.Between(-60, 60), this.van.y - 6);
    else if (speedPct > 0.6 && Math.random() < 0.3) this.dust.explode(1, this.van.x + Phaser.Math.Between(-56, 56), this.van.y - 2);
    const boosting = time < this.boostUntil;
    this.speedLines.emitting = boosting;
    this.speedLines.setPosition(W / 2, this.horizonY ?? 180);
    // engine & wind follow speed
    this.engine.set({ rpm: Math.min(1, speedPct * (boosting ? 1.15 : 1)) });
    this.wind.set({ volume: Math.max(0.0001, speedPct * 0.6) });
    // sun, glow and lens flare stay locked to the horizon
    const hy = (this.horizonY ?? 180) - 6;
    this.sun.y = hy + 2; this.sunGlow.y = hy;
    const fx = W / 2 - this.bgOffset * 0, cxs = W / 2, cys = H - 60;
    this.flares.forEach((fl, i) => fl.setPosition(fx + (cxs - fx) * this.flares.f[i] + this.steer * 20 * (i + 1), hy + (cys - hy) * this.flares.f[i]));
    if (this.film) this.film.horizon = 1 - hy / H;
  }

  updateHUD(time, playerSeg) {
    this.mphText.setText(String(Math.round(this.speed * CH1.MPH_PER_UNIT)));
    this.boostBar.width = 40 * this.boost;
    this.boostBar.setFillStyle(hexNum(time < this.boostUntil ? P.btc1 : this.boost >= CH1.BOOST_COST ? P.cyan2 : P.ink4));
    const prog = Phaser.Math.Clamp(playerSeg.index / this.finishSeg, 0, 1);
    this.progVan.x = W / 2 - 80 + 160 * prog;
  }

  updateDents() {
    this.dentIcons.forEach((h, i) => h.setFrame(i < CH1.MAX_DENTS - this.dents ? 0 : 1));
  }
}
