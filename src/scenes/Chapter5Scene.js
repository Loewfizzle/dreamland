// ============================================================================
//  CHAPTER 5 — "UNDERGROUND"  (side-scrolling run & gun)
//  Ben and Zeus fight through the S-4 labs beneath Area 51 to find Ben's
//  seized mining rig — and the truth about Satoshi.
// ============================================================================
import Phaser from 'phaser';
import { GAME, CH5, ECONOMY } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { TILE } from '../art/lab.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Lighting } from '../systems/lighting.js';
import { Dialogue } from '../systems/dialogue.js';
import { applyFilm, shake, vibrate, hitStop } from '../systems/fx.js';
import { headText, bodyText, signButton, goTo, fadeIn } from '../systems/ui.js';
import { buildLevel, COLS, ROWS, FLOOR } from '../data/ch5_level.js';
import { stat } from '../systems/progress.js';
import Ben from '../entities/ch5/Ben.js';
import Zeus from '../entities/ch5/Zeus.js';
import { ENEMY_TYPES } from '../entities/ch5/Enemies.js';
import ch5Song from '../audio/music/ch5.js';

const W = GAME.WIDTH, H = GAME.HEIGHT, T = CH5.TILE;
const WORLD_W = COLS * T, WORLD_H = ROWS * T;
const DEPTH = { FAR: 0, MID: 1, DECOR: 5, MACHINE: 8, TILES: 10, ENEMY: 14, ZEUS: 15, BEN: 16, FG: 30, LIGHT: 900, EMISSIVE: 911, FX: 914, HUD: 1000 };

export default class Chapter5Scene extends Phaser.Scene {
  constructor() { super('Chapter5'); }

  create() {
    fadeIn(this, 800);
    this.level = buildLevel();
    this.startedAt = this.time.now;
    this.sats = 0;
    this.kills = 0;
    this.golden = [false, false, false];
    this.combatUntil = 0;
    this.tipsShown = new Set();
    this.coinsCollected = 0;
    this.hitsTaken = 0;
    this.ended = false;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.physics.world.TILE_BIAS = 20;
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.setBackgroundColor('#0b0a1a');

    this.lighting = new Lighting(this, { ambient: CH5.AMBIENT_LIGHT, depth: DEPTH.LIGHT });
    this.buildBackdrop();
    this.buildTiles();
    this.buildDecor();
    this.buildMachines();
    this.buildPickups();

    const s = this.level.start;
    this.respawn = { x: s.x * T + 8, y: s.y * T };
    const dbg = this.registry.get('debugCol');
    if (dbg) { this.respawn = { x: dbg * T + 8, y: FLOOR * T }; this.registry.set('debugCol', null); this.skipIntro = true; }
    this.ben = new Ben(this, this.respawn.x, 64).setDepth(DEPTH.BEN);
    this.zeus = new Zeus(this, this.respawn.x - 20, 64, this.ben).setDepth(DEPTH.ZEUS);
    this.lighting.add({ follow: this.ben, oy: -14, radius: 100, color: 0xffd8b0, intensity: 0.8 });
    this.lighting.add({ follow: this.zeus, oy: -8, radius: 44, color: 0xffe0a0, intensity: 0.45 });

    this.buildEnemies();
    this.buildProjectiles();
    this.buildColliders();
    this.buildHUD();
    this.buildAtmosphere();

    // camera
    const cam = this.cameras.main;
    cam.startFollow(this.ben, true, 0.1, 0.12);
    cam.setDeadzone(30, 50);
    this.lookahead = 0;

    applyFilm(this, { vignette: 1.15 });
    Input.configure({
      mode: 'joystick', pause: true,
      buttons: [
        { id: 'A', label: 'JUMP', style: 'a' },
        { id: 'B', label: 'ZEUS', style: 'b', icon: 'glyph_paw' },
        { id: 'C', label: 'FIRE', style: 'c' },
      ],
    });
    Audio.playMusic(ch5Song);
    Audio.playAmbience('lab');
    this.laserHum = Audio.loop('laser_hum', { volume: 0.0001 });
    this.elevHum = Audio.loop('elevator', { volume: 0.0001 });

    const onPause = () => {
      if (this.ended || this.scene.isActive('Pause')) return;
      this.scene.launch('Pause', { from: this.scene.key });
      this.scene.bringToTop('Pause');
      this.scene.bringToTop('Controls');
    };
    Input.events.on('pause', onPause);
    this.events.on('ben-hp', (hp) => { if (hp < (this.lastHp ?? 99)) this.hitsTaken++; this.lastHp = hp; this.updateHearts(hp); });
    this.events.on('ben-dead', () => this.onBenDead());
    this.events.on('impact', (x, y) => this.sparkBurst(x, y, P.gold0, 12));
    this.events.once('shutdown', () => {
      Input.events.off('pause', onPause);
      this.laserHum?.stop(0.2);
      this.elevHum?.stop(0.2);
      this.lighting.destroy();
    });

    if (this.skipIntro) { this.ben.body.reset(this.respawn.x, this.respawn.y - 2); this.zeus.body.reset(this.respawn.x - 20, this.respawn.y - 2); }
    else this.intro();
  }

  // ===========================================================================
  //  BUILD
  // ===========================================================================
  buildBackdrop() {
    this.far = this.add.tileSprite(0, 0, W, H, 'lab_far').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.FAR);
    this.farGlow = this.add.tileSprite(0, 62, W, 88, 'lab_far_glow').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.EMISSIVE - 3)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
    this.mid = this.add.tileSprite(0, 0, W, H, 'lab_mid').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.MID);
    this.midGlow = this.add.tileSprite(0, 0, W, H, 'lab_mid_glow').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.EMISSIVE - 2)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
  }

  buildTiles() {
    const grid = this.level.grid;
    const at = (c, r) => (c < 0 || r < 0 || c >= COLS || r >= ROWS ? '#' : grid[r][c]);
    const rnd = new Phaser.Math.RandomDataGenerator(['s4']);
    const data = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const ch = at(c, r);
        if (ch === '#') {
          const mask = (at(c, r - 1) !== '#' ? 1 : 0) | (at(c + 1, r) !== '#' ? 2 : 0) | (at(c, r + 1) !== '#' ? 4 : 0) | (at(c - 1, r) !== '#' ? 8 : 0);
          let idx = mask;
          if (mask === 0) { const k = rnd.frac(); idx = k < 0.08 ? TILE.VENT : k < 0.16 ? TILE.PIPES : 0; }
          row.push(idx);
        } else if (ch === '=') {
          row.push(at(c - 1, r) !== '=' || at(c + 1, r) !== '=' ? TILE.CATWALK_END : TILE.CATWALK);
        } else row.push(-1);
      }
      data.push(row);
    }
    // Background glow layers sit above the lightmap (so they shine), which means they
    // must be masked to the open (empty) cells or they'd draw over solid steel.
    const mg = this.make.graphics({ x: 0, y: 0, add: false });
    mg.fillStyle(0xffffff);
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        if (at(c, r) !== '.') { c++; continue; }
        const c0 = c;
        while (c < COLS && at(c, r) === '.') c++;
        mg.fillRect(c0 * T, r * T, (c - c0) * T, T);
      }
    }
    this.openMask = mg.createGeometryMask();
    this.farGlow.setMask(this.openMask);
    this.midGlow.setMask(this.openMask);
    const map = this.make.tilemap({ data, tileWidth: T, tileHeight: T });
    const ts = map.addTilesetImage('labtiles', 'labtiles', T, T, 0, 0);
    this.layer = map.createLayer(0, ts, 0, 0).setDepth(DEPTH.TILES);
    const solids = [...Array(16).keys(), TILE.VENT, TILE.PIPES, TILE.HAZARD];
    this.layer.setCollision(solids);
    this.layer.forEachTile((t) => {
      if (t.index === TILE.CATWALK || t.index === TILE.CATWALK_END) t.setCollision(false, false, true, false);
    });
    this.map = map;
  }

  isSolidAt(x, y) {
    const c = Math.floor(x / T), r = Math.floor(y / T);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
    if (this.level.grid[r][c] === '#') return true;
    // closed blast doors block line of sight too
    for (const d of this.doors ?? []) if (!d.open && c === d.def.x && r >= d.def.y - 3 && r < d.def.y) return true;
    return false;
  }

  /** Is there a clear line between two points? (tile raycast) */
  lineOfSight(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / 6);
    for (let i = 1; i < n; i++) {
      if (this.isSolidAt(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false;
    }
    return true;
  }

  /** Y of the ceiling surface above a point. */
  ceilingAbove(x, y) {
    for (let yy = y - T; yy > 0; yy -= T) if (this.isSolidAt(x, yy)) return Math.floor(yy / T) * T + T;
    return 0;
  }

  buildDecor() {
    for (const d of this.level.decor) {
      const x = d.x * T + T / 2, y = d.y * T;
      if (d.type === 'tank') {
        const tank = this.add.image(x, y, 'tank').setOrigin(0.5, 1).setDepth(DEPTH.DECOR);
        if (d.broken) {
          tank.setTint(0x8a9a90);
          // shattered: darker liquid, glass shards on the floor, sparks
          this.add.particles(x, y - 4, 'px1', { lifespan: 600, speedY: { min: -60, max: -20 }, speedX: { min: -20, max: 20 }, gravityY: 200, tint: hexNum(P.green1), frequency: 900, quantity: 3 }).setDepth(DEPTH.EMISSIVE);
          this.lighting.add({ x, y: y - 30, radius: 46, color: 0x5dff9a, intensity: 0.35, flicker: 0.4 });
        } else {
          this.lighting.add({ x, y: y - 32, radius: 64, color: 0x5dff9a, intensity: 0.85, pulse: { speed: 1.5, amount: 0.25 }, phase: d.x });
          // emissive liquid + rising bubbles
          this.add.image(x, y - 32, 'glow_soft').setScale(0.6, 0.85).setTint(hexNum(P.green2)).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.EMISSIVE - 1);
          this.add.particles(x, y - 12, 'px1', {
            x: { min: -8, max: 8 }, lifespan: 1600, speedY: { min: -26, max: -14 }, alpha: { start: 0.8, end: 0 },
            tint: hexNum(P.green0), frequency: 420, blendMode: 'ADD',
          }).setDepth(DEPTH.EMISSIVE);
        }
      } else if (d.type === 'rack') {
        this.add.sprite(x, y, 'rack').setOrigin(0.5, 1).setDepth(DEPTH.DECOR).play({ key: 'rack_blink', startFrame: d.x % 2 });
        this.lighting.add({ x, y: y - 26, radius: 26, color: 0x3cf2ff, intensity: 0.35, flicker: 0.15 });
        this.add.image(x, y - 24, 'glow_soft').setScale(0.25, 0.4).setTint(hexNum(P.cyan2)).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.EMISSIVE - 1);
      } else if (d.type === 'crate' || d.type === 'barrel') {
        this.add.image(x, y, d.type).setOrigin(0.5, 1).setDepth(DEPTH.DECOR);
      } else if (d.type === 'shaft') {
        // arrival elevator shaft: cables + a hazard-striped platform
        const top = 32;
        for (const cx of [x - 22, x + 22]) this.add.rectangle(cx, top, 2, y - top - 4, 0x3b4263).setOrigin(0.5, 0).setDepth(DEPTH.DECOR);
        this.add.image(x, y - 2, 'elevator').setOrigin(0.5, 0).setDepth(DEPTH.MACHINE - 1);
      }
    }
    // ceiling lamps with volumetric light cones
    for (const l of this.level.lamps) {
      const x = l.x * T + T / 2;
      const y = l.y != null ? l.y * T : this.ceilingAbove(x, FLOOR * T);
      this.add.image(x, y, 'lamp').setOrigin(0.5, 0).setDepth(DEPTH.MACHINE);
      const flicker = (l.x * 7) % 5 === 0 ? 0.6 : 0.05;
      const len = FLOOR * T - y + 8;
      this.lighting.add({ x, y: y + 6, beam: true, w: 120, h: len, color: 0xffc98a, intensity: 1, flicker });
      this.lighting.add({ x, y: y + 6, radius: 40, color: 0xfff0d0, intensity: 1, flicker });
      this.lighting.add({ x, y: FLOOR * T - 4, radius: 70, color: 0xffb070, intensity: 0.55, flicker });   // pool on the floor
      this.add.image(x, y + 6, 'glow').setScale(0.5, 0.3).setTint(0xffe2b0).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.EMISSIVE);
      // visible cone of dusty light (emissive, subtle)
      const cone = this.add.image(x, y + 6, 'beam').setOrigin(0.5, 0).setScale(96 / 64, len / 256)
        .setTint(0xffc98a).setAlpha(0.14).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.EMISSIVE - 1);
      if (flicker > 0.3) this.time.addEvent({ delay: 90, loop: true, callback: () => cone.setAlpha(Math.random() < 0.15 ? 0.03 : 0.14) });
      // dust motes drifting through the beam
      this.add.particles(x, y + 20, 'px1', {
        x: { min: -24, max: 24 }, y: { min: 0, max: len - 30 }, lifespan: 3000, speedX: { min: -4, max: 4 }, speedY: { min: -3, max: 5 },
        alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.5 }, tint: 0xffe8c0, frequency: 520, blendMode: 'ADD',
      }).setDepth(DEPTH.EMISSIVE);
    }
  }

  buildMachines() {
    // --- elevators
    this.elevators = this.level.elevators.map((e) => {
      const img = this.physics.add.image(e.x * T, e.bottom * T, 'elevator').setOrigin(0, 0).setDepth(DEPTH.MACHINE);
      img.body.setAllowGravity(false).setImmovable(true).setSize(48, 8).setOffset(0, 0);
      img.def = e;
      img.dir = -1;
      img.waitUntil = 0;
      // guide rails
      this.add.rectangle(e.x * T + 2, e.top * T - 10, 2, (e.bottom - e.top) * T + 14, 0x3b4263).setOrigin(0.5, 0).setDepth(DEPTH.DECOR);
      this.add.rectangle(e.x * T + 46, e.top * T - 10, 2, (e.bottom - e.top) * T + 14, 0x3b4263).setOrigin(0.5, 0).setDepth(DEPTH.DECOR);
      this.lighting.add({ follow: img, ox: 24, oy: 4, radius: 40, color: 0xf5c542, intensity: 0.5 });
      return img;
    });
    // --- laser gates
    this.lasers = this.level.lasers.map((l) => {
      const x = l.x * T + T / 2, y0 = l.y0 * T, y1 = (l.y1 + 1) * T;
      this.add.image(x, y0, 'emitter').setOrigin(0.5, 0).setDepth(DEPTH.MACHINE);
      this.add.image(x, y1, 'emitter').setOrigin(0.5, 0).setFlipY(true).setDepth(DEPTH.MACHINE);
      const core = this.add.rectangle(x, y0 + 8, 2, y1 - y0 - 16, 0xffd0d8).setOrigin(0.5, 0).setDepth(DEPTH.EMISSIVE);
      const beam = this.add.rectangle(x, y0 + 8, 6, y1 - y0 - 16, 0xff3b4f, 0.7).setOrigin(0.5, 0).setDepth(DEPTH.EMISSIVE - 1).setBlendMode(Phaser.BlendModes.ADD);
      const halo = this.add.image(x, (y0 + y1) / 2, 'glow_soft').setScale(0.35, (y1 - y0) / 110).setTint(0xff3b4f).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.EMISSIVE - 2);
      const lights = [0.25, 0.5, 0.75].map((f) => this.lighting.add({ x, y: y0 + (y1 - y0) * f, radius: 44, color: 0xff3b4f, intensity: 0.7 }));
      return { ...l, x, y0, y1, core, beam, halo, lights, on: false, period: (CH5.LASER_ON_MS + CH5.LASER_OFF_MS) / 1000 };
    });
    // --- checkpoints
    this.checkpoints = this.level.checkpoints.map((c) => {
      const s = this.add.sprite(c.x * T + 8, c.y * T, 'terminal', 0).setOrigin(0.5, 1).setDepth(DEPTH.MACHINE);
      s.light = this.lighting.add({ x: s.x, y: s.y - 20, radius: 36, color: 0xff3b4f, intensity: 0.6 });
      s.def = c;
      return s;
    });
    // --- doors
    this.doors = this.level.doors.map((d) => {
      const s = this.add.sprite(d.x * T + 8, d.y * T, 'door', 0).setOrigin(0.5, 1).setDepth(DEPTH.MACHINE);
      this.physics.add.existing(s, true);
      s.body.setSize(16, 48).setOffset(4, 0);
      s.def = d;
      s.light = this.lighting.add({ x: s.x + 6, y: s.y - 24, radius: 30, color: 0xff3b4f, intensity: 0.8, pulse: { speed: 4, amount: 0.5 } });
      return s;
    });
    // --- Ben's rig
    const r = this.level.rig;
    this.rig = this.add.sprite(r.x * T + 8, r.y * T, 'rig').setOrigin(0.5, 1).setDepth(DEPTH.MACHINE).play('rig_spin');
    this.add.image(this.rig.x, this.rig.y - 16, 'glow').setScale(1.2).setTint(hexNum(P.btc)).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.EMISSIVE - 1);
    this.lighting.add({ x: this.rig.x, y: this.rig.y - 16, radius: 90, color: 0xf7931a, intensity: 0.9, pulse: { speed: 2, amount: 0.3 } });
  }

  buildPickups() {
    const bob = (o) => this.tweens.add({ targets: o, y: o.y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: Math.random() * 900 });
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const c of this.level.coins) {
      const s = this.coins.create(c.x * T + 8, c.y * T + 8, 'coin').play({ key: 'coin_spin', startFrame: (c.x + c.y) % 8 }).setDepth(DEPTH.EMISSIVE);
      s.body.setCircle(6);
      bob(s);
    }
    this.goldens = this.level.goldens.map((gd) => {
      const s = this.physics.add.sprite(gd.x * T + 8, gd.y * T + 8, 'golden').play('golden_spin').setDepth(DEPTH.EMISSIVE).setAlpha(0.05);
      s.body.setAllowGravity(false);
      s.hidden = true;
      s.id = gd.id;
      s.glow = this.add.image(s.x, s.y, 'glow').setTint(hexNum(P.btc1)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(DEPTH.EMISSIVE - 1);
      bob(s);
      return s;
    });
    this.hotdogs = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const h of this.level.hotdogs) {
      const s = this.hotdogs.create(h.x * T + 8, h.y * T + 8, 'hotdog').setDepth(DEPTH.EMISSIVE);
      bob(s);
    }
  }

  buildEnemies() {
    this.enemies = this.add.group({ runChildUpdate: false });
    for (const def of this.level.enemies) this.spawnEnemy(def);
  }

  spawnEnemy(def) {
    const Cls = ENEMY_TYPES[def.type];
    const e = new Cls(this, def);
    e.zone = def.x >= 196 && def.x <= 222 ? 'containment' : null;
    this.enemies.add(e);
    return e;
  }

  buildProjectiles() {
    const pool = (key, max) => this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: key, maxSize: max, allowGravity: false });
    this.bolts = pool('bolt', 24);
    this.ebullets = pool('ebullet', 40);
    this.orbs = pool('orb', 12);
  }

  buildColliders() {
    const ben = this.ben, zeus = this.zeus;
    this.physics.add.collider(ben, this.layer);
    this.physics.add.collider(zeus, this.layer);
    this.physics.add.collider(this.enemies, this.layer);
    this.doorColliders = this.doors.map((d) => [
      this.physics.add.collider(ben, d), this.physics.add.collider(zeus, d), this.physics.add.collider(this.enemies, d),
      this.physics.add.collider(this.ebullets, d, (a, b) => { const bl = a === d ? b : a; this.sparkBurst(bl.x, bl.y, P.red, 4); this.killProjectile(bl); }),
      this.physics.add.collider(this.bolts, d, (a, b) => this.killBolt(a === d ? b : a, true)),
      this.physics.add.collider(this.orbs, d, (a, b) => this.killProjectile(a === d ? b : a)),
    ]);
    for (const el of this.elevators) {
      this.physics.add.collider(ben, el);
      this.physics.add.collider(zeus, el);
    }
    // player projectiles
    this.physics.add.collider(this.bolts, this.layer, (b) => this.killBolt(b, true));
    // (Phaser may hand group-vs-group pairs over in either order, so sort them out)
    const isBolt = (o) => o.texture?.key === 'bolt';
    this.physics.add.overlap(this.bolts, this.enemies, (a1, a2) => {
      const [b, e] = isBolt(a1) ? [a1, a2] : [a2, a1];
      if (!b.active || e.dead || !e.hit) return;
      e.hit(stat('blasterDamage', CH5.BLASTER_DAMAGE), b.x - b.body.velocity.x);
      this.sparkBurst(b.x, b.y, P.cyan1, 8);
      Audio.sfx('hit', { volume: 0.7, pan: Audio.panFor(b.x, this.cameras.main), minGap: 90 });
      this.killBolt(b, false);
    });
    this.physics.add.overlap(this.bolts, this.orbs, (a1, a2) => {
      const [b, o] = isBolt(a1) ? [a1, a2] : [a2, a1];
      if (!b.active || !o.active) return;
      this.sparkBurst(o.x, o.y, P.green1, 10);
      Audio.sfx('hit', { volume: 0.5 });
      this.killBolt(b, false);
      this.killProjectile(o);
    });
    // enemy projectiles
    this.physics.add.collider(this.ebullets, this.layer, (b) => { this.sparkBurst(b.x, b.y, P.red, 4); this.killProjectile(b); });
    this.physics.add.collider(this.orbs, this.layer, (o) => { this.sparkBurst(o.x, o.y, P.green1, 8); this.killProjectile(o); });
    for (const grp of [this.ebullets, this.orbs]) {
      this.physics.add.overlap(ben, grp, (_, b) => { if (b.active && ben.hurt(1, b.x)) this.killProjectile(b); });
      this.physics.add.overlap(zeus, grp, (_, b) => { if (b.active && zeus.state === 'follow') { zeus.dizzy(); this.killProjectile(b); } });
    }
    // touching enemies hurts
    this.physics.add.overlap(ben, this.enemies, (_, e) => {
      if (!e.dead && this.time.now > e.stunUntil) ben.hurt(1, e.x);
    });
    // pickups
    this.physics.add.overlap(ben, this.coins, (_, c) => this.collectCoin(c));
    this.physics.add.overlap(ben, this.hotdogs, (_, h) => this.collectHotdog(h));
    for (const gd of this.goldens) gd.collider = this.physics.add.overlap(ben, gd, () => this.collectGolden(gd));
  }

  buildHUD() {
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD);
    const plate = this.add.graphics();
    plate.fillStyle(hexNum(P.ink), 0.65).fillRoundedRect(6, 6, 96, 44, 3);
    plate.lineStyle(1, hexNum(P.ink4), 1).strokeRoundedRect(6, 6, 96, 44, 3);
    hud.add(plate);
    this.hearts = [];
    for (let i = 0; i < this.ben.maxHp; i++) {
      const h = this.add.image(16 + i * 12, 16, 'heart', 0);
      hud.add(h);
      this.hearts.push(h);
    }
    this.satsIcon = this.add.image(16, 32, 'glyph_btc');
    this.satsText = headText(this, 26, 32, '0', 8, P.cream, { ox: 0 });
    this.pawIcon = this.add.image(16, 44, 'glyph_paw').setScale(0.8).setTint(hexNum(P.gold1));
    this.pawBar = this.add.rectangle(26, 44, 60, 3, hexNum(P.gold1)).setOrigin(0, 0.5);
    this.pawBarBg = this.add.rectangle(26, 44, 60, 3, hexNum(P.ink3)).setOrigin(0, 0.5);
    hud.add([this.satsIcon, this.satsText, this.pawIcon, this.pawBarBg, this.pawBar]);
    // golden bitcoin slots, top center
    this.goldSlots = [0, 1, 2].map((i) => {
      const s = this.add.image(W / 2 - 18 + i * 18, 14, 'golden', 0).setAlpha(0.22).setTint(0x888888);
      hud.add(s);
      return s;
    });
    // chapter title card
    const card = headText(this, W / 2, 60, 'CHAPTER 5', 8, P.cyan1).setScrollFactor(0).setDepth(DEPTH.HUD);
    const card2 = headText(this, W / 2, 78, 'UNDERGROUND', 16, P.btc).setScrollFactor(0).setDepth(DEPTH.HUD);
    [card, card2].forEach((c, i) => {
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 600, delay: 400 + i * 200, hold: 1800, yoyo: true, onComplete: () => c.destroy() });
    });
    this.hud = hud;
  }

  buildAtmosphere() {
    // ceiling drips
    this.time.addEvent({
      delay: 700, loop: true, callback: () => {
        const cam = this.cameras.main;
        const x = cam.scrollX + Math.random() * W;
        const y = this.ceilingAbove(x, FLOOR * T);
        const d = this.add.image(x, y, 'px1').setTint(0x9ad8ff).setDepth(DEPTH.EMISSIVE).setAlpha(0.8);
        this.tweens.add({
          targets: d, y: FLOOR * T, duration: 900, ease: 'Quad.In', onComplete: () => {
            this.sparkBurst(d.x, FLOOR * T - 1, '#9ad8ff', 3, 30);
            d.destroy();
          },
        });
      },
    });
    // steam vents from floor grates
    for (const x of [16, 70, 126, 178, 214]) {
      this.add.particles(x * T, FLOOR * T, 'mote', {
        lifespan: 1800, speedY: { min: -40, max: -20 }, speedX: { min: -6, max: 6 }, scale: { start: 0.6, end: 2.2 },
        alpha: { start: 0.18, end: 0 }, tint: 0xb0c0e0, frequency: 120,
      }).setDepth(DEPTH.EMISSIVE - 1);
    }
  }

  // ===========================================================================
  //  STORY
  // ===========================================================================
  async intro() {
    this.ben.frozen = true;
    this.zeus.state = 'cutscene';
    // the arrival lift drops them in
    await this.wait(1100);
    Audio.sfx('land');
    shake(this, 120, 0.005);
    await this.wait(500);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'talk', text: 'Sub-level four, buddy. The labs. My rig is down here somewhere. I can FEEL it.' },
      { who: 'zeus', mood: 'happy', text: '*happy panting*' },
      { who: 'ben', mood: 'smug', text: 'And thanks to a VERY unlocked locker, we now have an alien blaster. Finders keepers.' },
      { who: 'ben', mood: 'angry', text: 'Nobody seizes Ben\'s hash rate. Let\'s go.' },
    ]);
    this.ben.frozen = false;
    this.zeus.state = 'follow';
    const touch = this.sys.game.device.input.touch;
    this.tip(touch ? 'HOLD  FIRE  TO BLAST' : 'HOLD  C / SHIFT  TO BLAST', 2600);
  }

  tip(text, hold = 2400) {
    const t = headText(this, W / 2, 112, text, 8, P.cream).setScrollFactor(0).setDepth(DEPTH.HUD).setAlpha(0);
    const bg = this.add.rectangle(W / 2, 112, t.width + 20, 18, hexNum(P.ink), 0.7).setScrollFactor(0).setDepth(DEPTH.HUD - 1).setAlpha(0).setStrokeStyle(1, hexNum(P.btc2));
    this.tweens.add({ targets: [t, bg], alpha: 1, y: 106, duration: 300, hold, yoyo: true, onComplete: () => { t.destroy(); bg.destroy(); } });
  }

  checkTips() {
    const col = this.ben.x / T;
    const touch = this.sys.game.device.input.touch;
    const zeusKey = touch ? 'ZEUS' : 'E';
    const tips = [
      [34, 'zeus', `ZEUS SMELLS SOMETHING SHINY UP HIGH...  ${zeusKey}: SNIFF`],
      [83, 'laser', 'TIME YOUR RUN PAST THE LASERS'],
      [118, 'lift', 'RIDE THE LIFT... OR TAKE THE LOW ROAD'],
      [157, 'tackle', `ENEMY CLOSE?  ${zeusKey}: ZEUS TACKLES THEM!`],
      [198, 'door', 'CLEAR CONTAINMENT TO UNLOCK THE DOOR'],
    ];
    for (const [c, id, text] of tips) {
      if (col > c && !this.tipsShown.has(id)) { this.tipsShown.add(id); this.tip(text, 2800); }
    }
  }

  async rigScene() {
    this.ended = true;
    const ben = this.ben;
    ben.frozen = true;
    this.zeus.state = 'cutscene';
    this.zeus.body.setVelocityX(0);
    Input.configure({ mode: 'tap' });
    Audio.queueSection('reveal');
    for (const l of ['drums2', 'lead', 'arpHot']) Audio.setLayer(l, 0, 1);
    Audio.setLayer('alien', 1, 2);
    this.cameras.main.stopFollow();
    this.cameras.main.pan(this.rig.x - 40, this.rig.y - 60, 1200, 'Sine.easeInOut');
    await this.wait(900);
    Audio.sfx('reveal');
    this.sparkBurst(this.rig.x, this.rig.y - 18, P.btc1, 30);
    await this.wait(600);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'shocked', text: 'My RIG! Zeus, LOOK! They didn\'t even dust it!' },
      { who: 'zeus', mood: 'excited', text: '*BOOF!*' },
      { who: 'ben', mood: 'talk', text: 'Wait... it\'s still running. That signal from the blockchain... it\'s decoding.' },
      { who: 'ben', mood: 'shocked', text: '"IF YOU ARE READING THIS: I AM SATOSHI. CONTAINMENT CELL 7. THE SHIP IN HANGAR 18 IS MINE. I JUST WANT TO GO HOME."' },
      { who: 'ben', mood: 'smug', text: 'Satoshi Nakamoto... is an ALIEN?! I KNEW it! I didn\'t KNOW it, but I KNEW it!' },
      { who: 'zeus', mood: 'alert', text: '*ears perk up* ...grrrr.' },
    ]);
    // Cell 7 is right here: Zeus sniffs out the release, the door hisses open
    Audio.sfx('door');
    shake(this, 200, 0.005);
    const sat = this.add.sprite(this.rig.x + 52, this.rig.y, 'satoshi').setOrigin(0.5, 1).setDepth(DEPTH.BEN).setFlipX(true).setAlpha(0).play('satoshi_idle');
    this.lighting.add({ follow: sat, oy: -16, radius: 60, color: 0x5dff9a, intensity: 0.8 });
    this.tweens.add({ targets: sat, alpha: 1, x: sat.x - 14, duration: 1200 });
    await this.wait(1400);
    await Dialogue.play(this, [
      { who: 'satoshi', mood: 'sad', text: 'You... heard my block? Someone finally heard it.' },
      { who: 'ben', mood: 'shocked', text: 'Satoshi?! I have SO many questions. Was it really you? Why proof of WORK? Do you like pie?!' },
      { who: 'satoshi', mood: 'happy', text: 'Yes. Because work is honest. And... apple, please.' },
      { who: 'satoshi', mood: 'talk', text: 'My ship is in the hangar above us. If we reach it, I can finally go home. But HE will come for us.' },
      { who: 'ben', mood: 'angry', text: 'Then let\'s go. Zeus, grab the rig. We\'re breaking Satoshi OUT.' },
      { who: 'zeus', mood: 'excited', text: '*BOOF!*' },
    ]);
    this.finishChapter();
  }

  finishChapter() {
    const time = (this.time.now - this.startedAt) / 1000;
    goTo(this, 'Results', {
      chapter: 'ch5', sats: this.sats, coins: this.coinsCollected, coinsTotal: this.level.coins.length,
      golden: this.golden, time, clean: this.hitsTaken === 0, cleanLabel: 'NO DAMAGE TAKEN',
      stats: [['ENEMIES BONKED', this.kills, 'num'], ['COINS', `${this.coinsCollected} / ${this.level.coins.length}`, 'text']],
    }, { duration: 700 });
  }

  // ===========================================================================
  //  GAMEPLAY HOOKS (used by entities)
  // ===========================================================================
  fireBolt(x, y, dir) {
    const b = this.bolts.get(x, y, 'bolt');
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(DEPTH.FX).setFlipX(dir < 0).setBlendMode(Phaser.BlendModes.ADD);
    b.enableBody(true, x, y, true, true);   // re-enable physics when recycling from the pool
    b.body.setAllowGravity(false);
    b.body.setSize(10, 4);
    b.setVelocity(dir * CH5.BLASTER_SPEED, (Math.random() - 0.5) * 12);
    b.born = this.time.now;
    b.light = this.lighting.add({ follow: b, radius: 34, color: 0x3cf2ff, intensity: 0.8 });
    // muzzle flash
    this.lighting.flash(x, y, 70, 0x7ff8ff, 90, 1);
    const flash = this.add.image(x, y, 'star3').setTint(hexNum(P.cyan0)).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FX).setScale(1.6);
    this.tweens.add({ targets: flash, scale: 0.2, alpha: 0, duration: 80, onComplete: () => flash.destroy() });
    Audio.sfx('blaster', { volume: 0.75, pan: Audio.panFor(x, this.cameras.main), minGap: 0 });
  }

  killBolt(b, wall) {
    if (!b.active) return;
    if (wall) {
      this.sparkBurst(b.x, b.y, P.cyan1, 6);
      if (Math.random() < 0.3) Audio.sfx('ricochet', { volume: 0.5, pan: Audio.panFor(b.x, this.cameras.main) });
    }
    this.killProjectile(b);
  }

  killProjectile(p) {
    if (p.light) { this.lighting.remove(p.light); p.light = null; }
    p.disableBody(true, true);
  }

  fireEnemyBullet(x, y, tx, ty, key, opts = {}) {
    const b = this.ebullets.get(x, y, key);
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(DEPTH.FX).setBlendMode(Phaser.BlendModes.ADD);
    b.enableBody(true, x, y, true, true);   // re-enable physics when recycling from the pool
    b.body.setAllowGravity(false);
    b.body.setCircle(3);
    const a = Math.atan2(ty - y, tx - x);
    b.setVelocity(Math.cos(a) * CH5.ENEMY_BULLET_SPEED, Math.sin(a) * CH5.ENEMY_BULLET_SPEED);
    b.born = this.time.now;
    b.light = this.lighting.add({ follow: b, radius: 22, color: 0xff3b4f, intensity: 0.8 });
    this.lighting.flash(x, y, 46, 0xffa040, 80, 0.9);
    Audio.sfx('enemy_shot', { ...opts, volume: 0.6, pan: Audio.panFor(x, this.cameras.main), minGap: 0 });
  }

  fireOrb(x, y, target) {
    const o = this.orbs.get(x, y, 'orb');
    if (!o) return;
    o.setActive(true).setVisible(true).setDepth(DEPTH.FX).setBlendMode(Phaser.BlendModes.ADD);
    o.enableBody(true, x, y, true, true);   // re-enable physics when recycling from the pool
    o.body.setAllowGravity(false);
    o.body.setCircle(4);
    o.target = target;
    o.born = this.time.now;
    const a = Math.atan2(target.y - 14 - y, target.x - x);
    o.setVelocity(Math.cos(a) * 80, Math.sin(a) * 80);
    o.light = this.lighting.add({ follow: o, radius: 36, color: 0x5dff9a, intensity: 0.9 });
  }

  explode(x, y, big) {
    const b = this.add.sprite(x, y, 'boom').play('boom').setDepth(DEPTH.FX).setScale(big ? 1.6 : 1);
    b.once('animationcomplete', () => b.destroy());
    this.lighting.flash(x, y, big ? 220 : 140, 0xffa040, 450, 1);
    this.sparkBurst(x, y, P.fire1, 18, 120);
    Audio.sfx('explosion', { big, pan: Audio.panFor(x, this.cameras.main) });
    shake(this, 220, big ? 0.016 : 0.01);
    vibrate(60);
    // smoking debris
    for (let i = 0; i < 5; i++) {
      const d = this.physics.add.image(x, y, 'px2').setTint(0x3b4263).setDepth(DEPTH.FX);
      d.body.setVelocity(Phaser.Math.Between(-120, 120), Phaser.Math.Between(-200, -80));
      d.body.setGravityY(700);
      this.time.delayedCall(900, () => d.destroy());
    }
  }

  sparkBurst(x, y, color, n = 8, speed = 90) {
    if (!this.sparkFx) {
      this.sparkFx = this.add.particles(0, 0, 'px1', {
        lifespan: { min: 200, max: 500 }, speed: { min: 20, max: 90 }, gravityY: 220,
        alpha: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false,
      }).setDepth(DEPTH.FX);
    }
    this.sparkFx.setParticleTint(typeof color === 'string' ? hexNum(color) : color);
    this.sparkFx.setParticleSpeed(speed * 0.3, speed);
    this.sparkFx.explode(n, x, y);
  }

  say(entity, text) {
    const t = bodyText(this, entity.x, entity.y - 40, text, 16, P.ink, { ox: 0.5, oy: 1, shadow: false });
    t.setDepth(DEPTH.FX + 1);
    const bg = this.add.rectangle(t.x, t.y - t.height / 2, t.width + 8, t.height + 2, 0xfff6e0).setDepth(DEPTH.FX).setStrokeStyle(1, 0x0b0a1a);
    this.tweens.add({ targets: [t, bg], alpha: 0, delay: 1800, duration: 300, onComplete: () => { t.destroy(); bg.destroy(); } });
  }

  spawnBackup(agent) {
    const side = agent.x < this.ben.x ? -1 : 1;
    let x = Phaser.Math.Clamp(this.ben.x + side * 220, 3 * T, WORLD_W - 3 * T);
    const col = Math.floor(x / T);
    if (this.level.grid[FLOOR - 1][col] === '#') x = agent.x;
    const e = this.spawnEnemy({ type: 'soldier', x: x / T - 0.5, y: FLOOR, patrol: [Math.max(2, col - 8), Math.min(COLS - 3, col + 8)] });
    e.zone = agent.zone;
    e.setAlpha(0);
    this.tweens.add({ targets: e, alpha: 1, duration: 300 });
    this.sparkBurst(e.x, e.y - 16, P.chrome1, 10);
    e.alert();
  }

  onEnemyKilled(e) {
    this.kills++;
    this.sats += CH5.SATS_PER_KILL;
    this.refreshSats();
    const t = headText(this, e.x, e.y - 34, `+${CH5.SATS_PER_KILL}`, 8, P.btc1).setDepth(DEPTH.FX + 1);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 800, ease: 'Quad.Out', onComplete: () => t.destroy() });
    this.time.delayedCall(50, () => this.checkDoors());
  }

  checkDoors() {
    this.doors.forEach((d, i) => {
      if (d.open) return;
      const remaining = this.enemies.getChildren().filter((e) => !e.dead && e.zone === d.def.requires);
      if (remaining.length) return;
      d.open = true;
      d.setFrame(1);
      d.body.enable = false;
      this.doorColliders[i].forEach((c) => c.destroy());
      d.light.color = 0x5dff9a;
      d.light.pulse = null;
      Audio.sfx('door', { pan: Audio.panFor(d.x, this.cameras.main) });
      this.tip('DOOR UNLOCKED', 1600);
    });
  }

  // ===========================================================================
  //  PICKUPS
  // ===========================================================================
  collectCoin(c) {
    if (!c.active) return;
    c.disableBody(true, false);
    this.coinsCollected++;
    const now = this.time.now;
    this.combo = now - (this.lastCoin ?? 0) < 900 ? Math.min(10, (this.combo ?? 0) + 1) : 0;
    this.lastCoin = now;
    Audio.sfx('coin', { combo: this.combo, pan: Audio.panFor(c.x, this.cameras.main), minGap: 0 });
    this.sparkBurst(c.x, c.y, P.btc1, 6, 60);
    this.flyToHud(c, ECONOMY.COIN_VALUE);
  }

  flyToHud(obj, value) {
    const cam = this.cameras.main;
    const sx = obj.x - cam.scrollX, sy = obj.y - cam.scrollY;
    const key = obj.texture.key;
    if (obj.glow) obj.glow.destroy();
    obj.destroy();
    const f = this.add.sprite(sx, sy, key).play(`${key}_spin`).setScrollFactor(0).setDepth(DEPTH.HUD + 1);
    this.tweens.add({
      targets: f, y: sy - 14, scale: 1.4, duration: 150, ease: 'Quad.Out', onComplete: () => {
        this.tweens.add({
          targets: f, x: this.satsIcon.x, y: this.satsIcon.y, scale: 0.6, duration: 380, ease: 'Cubic.In', onComplete: () => {
            f.destroy();
            this.sats += value;
            this.refreshSats();
          },
        });
      },
    });
  }

  refreshSats() {
    this.satsText.setText(String(this.sats));
    this.tweens.killTweensOf(this.satsIcon);
    this.satsIcon.setScale(1.6);
    this.tweens.add({ targets: this.satsIcon, scale: 1, duration: 200, ease: 'Back.Out' });
  }

  collectHotdog(h) {
    if (!h.active || this.ben.hp >= this.ben.maxHp) return;
    h.disableBody(true, true);
    this.ben.heal(CH5.HOTDOG_HEAL);
    Audio.sfx('chomp');
    this.say(this.ben, Phaser.Utils.Array.GetRandom(['Hot dog! Lunch of champions.', 'Mmm. Government hot dogs.', 'Fuel for the resistance.']));
    this.sparkBurst(h.x, h.y, P.red, 10);
  }

  revealGoldens(x, y, r) {
    let found = false;
    for (const g of this.goldens) {
      if (!g.hidden || !g.active) continue;
      if (Phaser.Math.Distance.Between(x, y, g.x, g.y) > r + 40) continue;
      found = true;
      g.hidden = false;
      this.tweens.add({ targets: g, alpha: 1, duration: 500 });
      this.tweens.add({ targets: g.glow, alpha: 0.75, duration: 500 });
      this.tweens.add({ targets: g.glow, scale: 1.3, duration: 700, yoyo: true, repeat: -1 });
      g.light = this.lighting.add({ x: g.x, y: g.y, radius: 50, color: 0xffc35c, intensity: 0.9 });
      this.sparkBurst(g.x, g.y, P.btc1, 16);
    }
    if (found) {
      Audio.sfx('sparkle', { count: 12 });
      this.time.delayedCall(600, () => Audio.sfx('bark2', { volume: 0.8 }));
    } else if (Math.random() < 0.5) {
      this.say(this.zeus, '*sniff* ...nothing.');
    }
  }

  collectGolden(g) {
    if (g.hidden || !g.active) return;
    g.disableBody(true, false);
    g.collider?.destroy();
    this.golden[g.id] = true;
    if (g.light) this.lighting.remove(g.light);
    Audio.sfx('golden');
    shake(this, 160, 0.004);
    vibrate(40);
    hitStop(this, 80);
    this.sparkBurst(g.x, g.y, P.btc1, 30, 140);
    const slot = this.goldSlots[g.id];
    slot.clearTint().setAlpha(1).setScale(2);
    this.tweens.add({ targets: slot, scale: 1, duration: 400, ease: 'Back.Out' });
    const msg = headText(this, W / 2, 130, 'GOLDEN BITCOIN!', 16, P.btc1).setScrollFactor(0).setDepth(DEPTH.HUD).setScale(0);
    this.tweens.add({ targets: msg, scale: 1, duration: 350, ease: 'Back.Out', hold: 900, yoyo: true, onComplete: () => msg.destroy() });
    this.flyToHud(g, ECONOMY.GOLDEN_VALUE);
  }

  // ===========================================================================
  //  DEATH & CHECKPOINTS
  // ===========================================================================
  async onBenDead() {
    const ben = this.ben;
    ben.frozen = true;
    ben.play('ben_hurt');
    Audio.sfx('whine', { long: true });
    this.cameras.main.flash(200, 255, 60, 80);
    await this.wait(900);
    this.cameras.main.fadeOut(400, 11, 10, 26);
    await this.wait(450);
    ben.body.reset(this.respawn.x, this.respawn.y - 2);
    ben.dead = false;
    ben.hp = ben.maxHp;
    ben.invulnUntil = this.time.now + 1500;
    this.updateHearts(ben.hp);
    this.zeus.teleportToBen();
    this.ebullets.getChildren().forEach((b) => b.active && this.killProjectile(b));
    this.orbs.getChildren().forEach((b) => b.active && this.killProjectile(b));
    this.cameras.main.fadeIn(400, 11, 10, 26);
    ben.frozen = false;
    this.say(ben, Phaser.Utils.Array.GetRandom(['Okay. New strategy: don\'t get shot.', 'That was a practice run.', 'I\'m fine! Totally fine.']));
  }

  checkCheckpoints() {
    for (const c of this.checkpoints) {
      if (c.active2) continue;
      if (Math.abs(this.ben.x - c.x) < 14 && Math.abs(this.ben.y - c.y) < 20) {
        c.active2 = true;
        c.setFrame(1);
        c.light.color = 0x5dff9a;
        this.respawn = { x: c.x, y: c.y };
        Audio.sfx('checkpoint');
        this.sparkBurst(c.x, c.y - 20, P.green1, 14);
        this.tip('CHECKPOINT', 1200);
        // a checkpoint also tops Ben up a bit
        if (this.ben.hp < 3) this.ben.heal(3 - this.ben.hp);
      }
    }
  }

  updateHearts(hp) {
    this.hearts.forEach((h, i) => {
      const full = i < hp;
      if (h.frame.name !== (full ? 0 : 1) && !full) {
        this.tweens.add({ targets: h, scale: { from: 1.6, to: 1 }, duration: 250 });
      }
      h.setFrame(full ? 0 : 1);
    });
  }

  // ===========================================================================
  //  UPDATE
  // ===========================================================================
  update(time, delta) {
    const dt = delta / 1000;
    const ben = this.ben, zeus = this.zeus;
    if (!this.ended && !ben.frozen && this.time.now - this.startedAt > 100) this.checkTips();

    this.updateElevators(time, dt);
    ben.update(time, delta);
    zeus.update(time, delta);
    for (const e of this.enemies.getChildren()) if (e.active) e.update(time, delta);
    this.updateLasers(time);
    this.updateProjectiles(time, dt);
    if (!ben.frozen) this.checkCheckpoints();

    // Zeus ability: TACKLE a nearby enemy, otherwise SNIFF
    if (Input.consume('B') && !ben.frozen) {
      this.zeus.sniffRadius = stat('sniffRadius', CH5.SNIFF_RADIUS);
      const target = this.nearestEnemy(zeus.x, zeus.y, CH5.TACKLE_RANGE);
      if (target && zeus.tackleReady) zeus.tackle(target);
      else if (!target) zeus.sniff((x, y, r) => this.revealGoldens(x, y, r));
    }
    const cd = Phaser.Math.Clamp((time - zeus.lastTackle) / stat('tackleCooldown', CH5.TACKLE_COOLDOWN_MS), 0, 1);
    this.pawBar.width = 60 * cd;
    this.pawIcon.setAlpha(cd >= 1 ? 1 : 0.4);

    // rig trigger
    if (!this.ended && ben.x > this.level.triggers[0].x * T && ben.grounded) this.rigScene();

    // adaptive music: combat layers follow engaged enemies; theremin swells near Greys
    let engaged = false, alien = false;
    for (const e of this.enemies.getChildren()) {
      if (e.dead || !e.active) continue;
      const d = Phaser.Math.Distance.Between(e.x, e.y, ben.x, ben.y);
      if (e.state === 'alert' && d < 420) engaged = true;
      if (e.kind === 'grey' && d < 300) alien = true;
    }
    if (engaged) this.combatUntil = time + 2500;
    const combat = time < this.combatUntil && !this.ended;
    if (combat !== this.combatOn) {
      this.combatOn = combat;
      for (const l of ['drums2', 'lead', 'arpHot']) Audio.setLayer(l, combat ? 1 : 0, combat ? 0.6 : 2.5);
    }
    if (alien !== this.alienOn && !this.ended) {
      this.alienOn = alien;
      Audio.setLayer('alien', alien ? 1 : 0.15, 1.5);
    }

    // camera look-ahead in the direction Ben faces
    this.lookahead = Phaser.Math.Linear(this.lookahead, ben.facing * 50, 0.04);
    this.cameras.main.setFollowOffset(-this.lookahead, 10);

    // parallax
    const cam = this.cameras.main;
    this.far.tilePositionX = cam.scrollX * 0.15;
    this.far.tilePositionY = cam.scrollY * 0.1;
    this.mid.tilePositionX = cam.scrollX * 0.45;
    this.mid.tilePositionY = cam.scrollY * 0.3;
    this.midGlow.tilePositionX = this.mid.tilePositionX;
    this.midGlow.tilePositionY = this.mid.tilePositionY;
    this.midGlow.setAlpha(0.8 + Math.sin(time / 700) * 0.08);
    // keep the clipped glow strip aligned with both the far layer and the mid wall's gap
    const gapY = 62 - this.mid.tilePositionY;
    this.farGlow.y = gapY;
    this.farGlow.tilePositionX = this.far.tilePositionX;
    this.farGlow.tilePositionY = this.far.tilePositionY + gapY;

    // hidden goldens shimmer faintly so attentive players can spot them
    for (const g of this.goldens) if (g.hidden && g.active) g.setAlpha(0.04 + (Math.sin(time / 250 + g.id) > 0.95 ? 0.25 : 0));

    this.lighting.update(time);
  }

  nearestEnemy(x, y, range) {
    let best = null, bd = range;
    for (const e of this.enemies.getChildren()) {
      if (e.dead || !e.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (d < bd && Math.abs(e.y - y) < 70) { bd = d; best = e; }
    }
    return best;
  }

  updateElevators(time, dt) {
    let nearest = 9999;
    for (const el of this.elevators) {
      const e = el.def;
      const topY = e.top * T, botY = e.bottom * T;
      // never crush anyone standing underneath a descending lift
      if (el.dir > 0) for (const r of [this.ben, this.zeus]) {
        const b = r.body;
        if (b.right > el.body.left && b.left < el.body.right && b.top > el.body.top && b.top - el.body.bottom < 6) el.waitUntil = Math.max(el.waitUntil, time + 250);
      }
      if (time < el.waitUntil) el.body.setVelocityY(0);
      else {
        el.body.setVelocityY(el.dir * CH5.ELEVATOR_SPEED);
        if (el.dir < 0 && el.y <= topY) { el.y = topY; el.body.y = topY; el.dir = 1; el.waitUntil = time + 1300; Audio.sfx('clank', { volume: 0.4 }); }
        if (el.dir > 0 && el.y >= botY) { el.y = botY; el.body.y = botY; el.dir = -1; el.waitUntil = time + 1300; Audio.sfx('clank', { volume: 0.4 }); }
      }
      // carry riders (arcade physics doesn't carry bodies on moving platforms by itself)
      for (const r of [this.ben, this.zeus]) {
        const b = r.body;
        const onX = b.right > el.body.left + 2 && b.left < el.body.right - 2;
        const gap = b.bottom - el.body.top;
        if (onX && gap > -3 && gap < 6 && b.velocity.y >= -5) {
          r.riding = el;
          b.y = el.body.top - b.height;
          b.velocity.y = el.body.velocity.y;
        } else if (r.riding === el) r.riding = null;
      }
      nearest = Math.min(nearest, Math.abs(this.ben.x - (el.x + 24)) + Math.abs(this.ben.y - el.y));
    }
    const moving = this.elevators.some((el) => el.body.velocity.y !== 0);
    this.elevHum.set({ volume: moving ? Math.max(0.0001, 0.6 * (1 - nearest / 300)) : 0.0001 });
  }

  updateLasers(time) {
    const t = time / 1000;
    let nearest = 9999;
    const ben = this.ben;
    for (const l of this.lasers) {
      const ph = ((t / l.period + l.phase) % 1 + 1) % 1;
      const onFrac = CH5.LASER_ON_MS / (CH5.LASER_ON_MS + CH5.LASER_OFF_MS);
      const on = ph < onFrac;
      const warn = !on && ph > 0.92;            // flicker warning just before switching on
      if (on !== l.on) {
        l.on = on;
        if (on) Audio.sfx('laser_zap', { volume: 0.25, pan: Audio.panFor(l.x, this.cameras.main), minGap: 0 });
      }
      const vis = on || (warn && Math.floor(time / 50) % 2 === 0);
      l.core.setVisible(vis).setAlpha(on ? 1 : 0.4);
      l.beam.setVisible(vis).setAlpha(on ? 0.7 : 0.2);
      l.halo.setVisible(on);
      if (on) l.beam.width = 5 + Math.sin(time / 30) * 1.2;
      l.lights.forEach((li) => { li.on = on; });
      if (on) {
        nearest = Math.min(nearest, Math.abs(ben.x - l.x));
        const b = ben.body;
        if (b.right > l.x - 2 && b.left < l.x + 2 && b.bottom > l.y0 + 6 && b.top < l.y1 - 6) {
          if (ben.hurt(1, l.x)) { Audio.sfx('laser_zap'); this.sparkBurst(ben.x, ben.y - 14, P.red, 12); }
        }
      }
    }
    this.laserHum.set({ volume: Math.max(0.0001, 0.7 * (1 - nearest / 220)), pan: 0 });
  }

  updateProjectiles(time, dt) {
    for (const b of this.bolts.getChildren()) if (b.active && (time - b.born > 1400)) this.killProjectile(b);
    for (const b of this.ebullets.getChildren()) if (b.active && (time - b.born > 3500)) this.killProjectile(b);
    for (const o of this.orbs.getChildren()) {
      if (!o.active) continue;
      if (time - o.born > 4000) { this.sparkBurst(o.x, o.y, P.green1, 6); this.killProjectile(o); continue; }
      // gentle homing toward Ben
      const a = Math.atan2(o.target.y - 14 - o.y, o.target.x - o.x);
      o.body.velocity.x += Math.cos(a) * 140 * dt;
      o.body.velocity.y += Math.sin(a) * 140 * dt;
      o.body.velocity.limit?.(95);
      const v = o.body.velocity;
      const sp = Math.hypot(v.x, v.y);
      if (sp > 95) { v.x *= 95 / sp; v.y *= 95 / sp; }
      o.rotation += 0.2;
    }
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }
}
