// ============================================================================
//  CHAPTER 3 — "THE PERIMETER"  (top-down stealth at night)
//  Sneak past camo-dude patrols with glowing flashlight cones, sweeping
//  searchlights and pulsing motion sensors. Hide in bushes, let Zeus BARK to
//  lure guards away, and cut through the boundary fence.
// ============================================================================
import Phaser from 'phaser';
import { GAME, CH3, ECONOMY } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Lighting } from '../systems/lighting.js';
import { Dialogue } from '../systems/dialogue.js';
import { applyFilm, shake, vibrate } from '../systems/fx.js';
import { headText, bodyText, goTo, fadeIn } from '../systems/ui.js';
import { stat } from '../systems/progress.js';
import { PW, PH } from '../art/perimeter.js';
import {
  START, CUT, FENCE_Y, OBSTACLES, FOOTPRINT, BUSHES, GUARDS, SENSORS, SEARCHLIGHTS, CHECKPOINTS, PROPS, GOLDENS, TIPS, coinSpots,
} from '../data/ch3_level.js';
import ch3Song from '../audio/music/ch3.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const HUD = 1000;
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export default class Chapter3Scene extends Phaser.Scene {
  constructor() { super('Chapter3'); }

  create() {
    fadeIn(this, 900);
    this.sats = 0;
    this.coins = 0;
    this.golden = [false, false, false];
    this.timesSpotted = 0;
    this.busy = true;
    this.ended = false;
    this.facing = 'up';
    this.faceVec = { x: 0, y: -1 };
    this.lastBark = -99999;
    this.lastSniff = -99999;
    this.respawn = { ...START };
    this.tipsShown = new Set();
    this.cpReached = new Set();
    this.alertOn = false;
    this.tensionOn = false;
    this.startTime = this.time.now;

    this.physics.world.setBounds(0, 0, PW, PH);
    this.cameras.main.setBounds(0, 0, PW, PH);
    this.cameras.main.setBackgroundColor('#141428');
    this.lighting = new Lighting(this, { ambient: CH3.AMBIENT, depth: 900 });

    this.add.image(0, 0, 'perimeter_ground').setOrigin(0).setDepth(-10);
    this.buildWorld();
    this.buildActors();
    this.buildGuards();
    this.buildPickups();
    this.buildHUD();
    this.cones = this.add.graphics().setDepth(904).setBlendMode(Phaser.BlendModes.ADD);
    this.fx = this.add.graphics().setDepth(905).setBlendMode(Phaser.BlendModes.ADD);

    this.physics.add.collider(this.ben, this.solids);
    this.physics.add.collider(this.zeus, this.solids);
    this.cameras.main.startFollow(this.ben, true, 0.1, 0.1);
    this.cameras.main.setFollowOffset(0, 50);    // see further ahead (north)

    Input.configure({
      mode: 'joystick', pause: true,
      buttons: [
        { id: 'A', label: 'SNIFF', style: 'a' },
        { id: 'B', label: 'BARK', style: 'b', icon: 'glyph_paw' },
        { id: 'C', label: 'SNEAK', style: 'c' },
      ],
    });
    Audio.playMusic(ch3Song);
    Audio.playAmbience('desert_night');
    applyFilm(this, { vignette: 1.3 });

    const onPause = () => { if (!this.ended && !this.scene.isActive('Pause')) { this.scene.launch('Pause', { from: this.scene.key }); this.scene.bringToTop('Pause'); this.scene.bringToTop('Controls'); } };
    Input.events.on('pause', onPause);
    this.events.once('shutdown', () => { Input.events.off('pause', onPause); this.siren?.stop(0.2); this.lighting.destroy(); });

    // dev shortcut: #Chapter3@<y>
    const dbg = this.registry.get('debugCol');
    if (dbg) { this.registry.set('debugCol', null); this.respawn = { x: 480, y: dbg }; this.ben.body.reset(480, dbg); this.zeus.body.reset(460, dbg + 10); this.busy = false; }
    else this.intro();
  }

  // ===========================================================================
  //  WORLD
  // ===========================================================================
  buildWorld() {
    this.solids = this.physics.add.staticGroup();
    this.losRects = [];
    const solid = (x, y, w, h) => {
      const z = this.add.zone(x + w / 2, y + h / 2, w, h);
      this.physics.add.existing(z, true);
      this.solids.add(z);
      return z;
    };
    for (const o of OBSTACLES) {
      const [fw, fh] = FOOTPRINT[o.key];
      this.add.image(o.x, o.y, o.key).setOrigin(0.5, 1).setDepth(o.y);
      solid(o.x - fw / 2, o.y - fh, fw, fh);
      this.losRects.push({ x: o.x - fw / 2, y: o.y - fh - 14, w: fw, h: fh + 14 });   // rocks block sight above their footprint too
    }
    for (const p of PROPS) {
      this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1).setDepth(p.y);
      if (p.solid) {
        const [fw, fh] = FOOTPRINT[p.key];
        solid(p.x - fw / 2, p.y - fh, fw, fh);
        this.losRects.push({ x: p.x - fw / 2, y: p.y - fh - 10, w: fw, h: fh + 10 });
      }
    }
    // the pickup's headlights wash across the patrol road
    this.lighting.add({ x: 278, y: 362, beam: true, w: 70, h: 160, angle: -90, color: 0xfff0c0, intensity: 0.55 });
    // bushes
    this.bushes = BUSHES.map((b) => this.add.sprite(b.x, b.y, 'hidebush', 0).setOrigin(0.5, 0.85).setDepth(b.y + 4));
    // fence: one solid per tile so the cut tile can be opened later
    this.fenceTiles = [];
    for (let i = 0; i < PW / 64; i++) {
      const x = 32 + i * 64;
      const img = this.add.image(x, FENCE_Y, 'fence_tile').setOrigin(0.5, 1).setDepth(FENCE_Y);
      const body = solid(x - 32, FENCE_Y - 14, 64, 14);
      this.fenceTiles.push({ x, img, body });
    }
    this.add.rectangle(0, 0, PW, FENCE_Y - 40, 0x0e0e20).setOrigin(0).setDepth(-9);        // beyond the fence: base darkness
    // floodlights on every third fence post: a beacon to head for
    for (let x = 96; x < PW; x += 192) {
      this.add.rectangle(x, FENCE_Y - 44, 8, 4, 0xfff2c0).setDepth(FENCE_Y + 1);
      this.lighting.add({ x, y: FENCE_Y - 30, radius: 90, color: 0xfff0d0, intensity: 0.7, flicker: x === 672 ? 0.4 : 0.03 });
    }
    bodyText(this, CUT.x, FENCE_Y - 70, 'AREA 51', 16, '#3a3a6a', { ox: 0.5 }).setDepth(-8);
    // searchlight towers
    this.searchlights = SEARCHLIGHTS.map((s) => {
      this.add.image(s.x, s.y + 40, 'searchtower').setOrigin(0.5, 1).setDepth(s.y + 40);
      const light = this.lighting.add({ x: s.x, y: s.y, radius: s.radius * 1.8, color: 0xd8e8ff, intensity: 1 });
      return { ...s, light, t: Math.random() * 10, spot: { x: s.x, y: s.y } };
    });
    // motion sensors
    this.sensors = SENSORS.map((s) => {
      this.add.sprite(s.x, s.y, 'sensor').setOrigin(0.5, 1).setDepth(s.y).play('sensor_blink');
      const light = this.lighting.add({ x: s.x, y: s.y - 24, radius: 18, color: 0xff3b4f, intensity: 0.7, pulse: { speed: 6, amount: 0.5 } });
      return { ...s, light, lastPing: -1 };
    });
    // checkpoint markers: little reflector posts
    for (const c of CHECKPOINTS) {
      for (const dx of [-60, 60]) {
        this.add.rectangle(c.x + dx, c.y, 3, 12, 0xc86a2a).setOrigin(0.5, 1).setDepth(c.y);
        this.lighting.add({ x: c.x + dx, y: c.y - 10, radius: 14, color: 0xf78a45, intensity: 0.5 });
      }
    }
    // moonlight pools & distant base glow beyond the fence
    this.lighting.add({ x: 480, y: -200, radius: 700, color: 0x5a7aff, intensity: 0.45 });
    this.lighting.add({ x: 900, y: 1400, radius: 260, color: 0x3a4a8a, intensity: 0.35 });
  }

  buildActors() {
    this.ben = this.physics.add.sprite(START.x, START.y, 'ben_td', 4).setOrigin(0.5, 1);
    this.ben.setCollideWorldBounds(true);
    this.fixFeet(this.ben, 12);
    this.zeus = this.physics.add.sprite(START.x - 20, START.y + 8, 'zeus_td', 8).setOrigin(0.5, 1).play('zeus_td_sit');
    this.zeus.setCollideWorldBounds(true);
    this.fixFeet(this.zeus, 14);
    this.zeus.state = 'follow';
    this.zeus.stuck = 0;
    this.benLight = this.lighting.add({ follow: this.ben, oy: -14, radius: 46, color: 0xb0b8ff, intensity: 0.32 });
    this.benShadow = this.add.ellipse(0, 0, 16, 5, 0x0a0a18, 0.5);
    this.zeusShadow = this.add.ellipse(0, 0, 16, 5, 0x0a0a18, 0.5);
  }

  buildGuards() {
    this.guards?.forEach((g) => { g.collider.destroy(); g.bubble.destroy(); g.meter.destroy(); this.lighting.remove(g.flash); this.lighting.remove(g.glow); g.destroy(); });
    this.guards = GUARDS.map((def) => {
      const [x, y] = def.path[0];
      const g = this.physics.add.sprite(x, y, 'guard_td', 8).setOrigin(0.5, 1);
      this.fixFeet(g, 12);
      g.collider = this.physics.add.collider(g, this.solids);
      g.def = def;
      g.state = def.post ? 'post' : 'patrol';
      g.wp = 0;
      g.waitUntil = 0;
      g.facing = def.facing ?? 0;
      g.baseFacing = def.facing ?? 0;
      g.sus = 0;
      g.home = { x, y };
      g.bubble = this.add.image(x, y - 44, 'bub_q').setDepth(950).setVisible(false);
      g.meter = this.add.rectangle(x, y - 54, 14, 2, 0xf5c542).setDepth(951).setVisible(false);
      g.flash = this.lighting.add({ x, y, beam: true, w: 2 * CH3.GUARD_RANGE * Math.tan(CH3.GUARD_FOV / 2), h: CH3.GUARD_RANGE, color: 0xfff2c0, intensity: 0.85 });
      g.glow = this.lighting.add({ follow: g, oy: -14, radius: 26, color: 0xfff2c0, intensity: 0.4 });
      g.cone = [];
      return g;
    });
  }

  buildPickups() {
    this.coinGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const [x, y] of coinSpots()) {
      const c = this.coinGroup.create(x, y, 'coin').play({ key: 'coin_spin', startFrame: Math.floor(y) % 8 }).setDepth(906);
      c.body.setCircle(6);
      this.lighting.add({ follow: c, radius: 14, color: 0xf7931a, intensity: 0.5 });
    }
    this.coinsTotal = this.coinGroup.getLength();
    this.physics.add.overlap(this.ben, this.coinGroup, (_, c) => this.collectCoin(c));
    this.goldens = GOLDENS.map((g) => {
      const s = this.physics.add.sprite(g.x, g.y, 'golden').play('golden_spin').setDepth(906).setAlpha(0.03);
      s.body.setAllowGravity(false);
      s.hidden = true;
      s.gid = g.id;
      this.physics.add.overlap(this.ben, s, () => this.collectGolden(s));
      return s;
    });
  }

  buildHUD() {
    const D = HUD;
    this.add.rectangle(6, 6, 96, 22, hexNum(P.ink), 0.65).setOrigin(0).setStrokeStyle(1, hexNum(P.ink4)).setScrollFactor(0).setDepth(D);
    this.add.image(16, 17, 'glyph_btc').setScrollFactor(0).setDepth(D);
    this.satsText = headText(this, 26, 17, '0', 8, P.cream, { ox: 0 }).setScrollFactor(0).setDepth(D);
    this.goldSlots = [0, 1, 2].map((i) => this.add.image(W / 2 - 18 + i * 18, 14, 'golden', 0).setAlpha(0.22).setTint(0x888888).setScrollFactor(0).setDepth(D));
    this.status = headText(this, W / 2, 36, '', 8, P.cyan1).setScrollFactor(0).setDepth(D);
    this.spottedBanner = headText(this, W / 2, 62, 'SPOTTED!', 16, P.red).setScrollFactor(0).setDepth(D).setVisible(false);
    this.prompt = headText(this, 0, 0, '', 8, P.btc1).setDepth(960).setVisible(false);
  }

  // ===========================================================================
  //  STORY
  // ===========================================================================
  async intro() {
    const card = headText(this, W / 2, 80, 'CHAPTER 3', 8, P.cyan1).setScrollFactor(0).setDepth(HUD);
    const card2 = headText(this, W / 2, 98, 'THE PERIMETER', 16, P.btc).setScrollFactor(0).setDepth(HUD);
    [card, card2].forEach((c) => { c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 600, hold: 1600, yoyo: true, onComplete: () => c.destroy() }); });
    await this.wait(1900);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'talk', text: '(whispering) Okay buddy. Dolores\'s cattle road. The fence is about a mile north.' },
      { who: 'ben', mood: 'shocked', text: 'Those are the camo dudes. They\'re real. They\'re REALLY real.' },
      { who: 'ben', mood: 'smug', text: 'Stay out of their flashlights, hide in the bushes, and if one\'s in the way... you know what to do.' },
      { who: 'zeus', mood: 'alert', text: '*silent, professional tail wag*' },
    ]);
    this.busy = false;
    this.tip(TIPS[0].text);
    this.tipsShown.add(0);
  }

  async finish() {
    this.ended = true;
    this.busy = true;
    this.ben.body.setVelocity(0, 0);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'smug', text: 'We\'re in. Zeus, we are INSIDE Area 51. My grandpa would be so proud. And so worried.' },
      { who: 'zeus', mood: 'excited', text: '*tiny excited boof*' },
      { who: 'ben', mood: 'talk', text: 'Hangar 18 should be dead ahead. Let\'s find Satoshi.' },
    ]);
    // slip through the gap
    this.ben.body.enable = false;
    this.zeus.body.enable = false;
    this.ben.play('ben_td_up');
    this.zeus.play('zeus_td_up');
    this.tweens.add({ targets: this.zeus, x: CUT.x - 6, y: 60, duration: 1600 });
    await new Promise((r) => this.tweens.add({ targets: this.ben, x: CUT.x + 6, y: 70, duration: 1800, onComplete: r }));
    const time = (this.time.now - this.startTime) / 1000;
    goTo(this, 'Results', {
      chapter: 'ch3', sats: this.sats, coins: this.coins, coinsTotal: this.coinsTotal, golden: this.golden, time,
      clean: this.timesSpotted === 0, cleanLabel: 'GHOST - NEVER SPOTTED',
      stats: [['COINS', `${this.coins} / ${this.coinsTotal}`, 'text'], ['TIMES SPOTTED', this.timesSpotted, 'num']],
    }, { duration: 900 });
  }

  // ===========================================================================
  //  UPDATE
  // ===========================================================================
  update(time, delta) {
    const dt = delta / 1000;
    const ben = this.ben;
    this.hidden = false;
    for (const b of this.bushes) if (Phaser.Math.Distance.Between(ben.x, ben.y, b.x, b.y) < 18) { this.hidden = true; this.bushHere = b; }
    if (this.hidden !== this.wasHidden) {
      this.wasHidden = this.hidden;
      if (this.hidden) { Audio.sfx('rustle', { volume: 0.7 }); this.bushHere.play && this.tweens.add({ targets: this.bushHere, scaleX: 1.08, scaleY: 0.94, duration: 90, yoyo: true }); }
      ben.setAlpha(this.hidden ? 0.45 : 1);
    }

    if (!this.busy && !this.ended) {
      const sneaking = Input.isDown('C');
      const speed = sneaking ? CH3.SNEAK_SPEED : CH3.WALK_SPEED;
      let ax = Input.axisX, ay = Input.axisY;
      const mag = Math.hypot(ax, ay);
      if (mag > 1) { ax /= mag; ay /= mag; }
      ben.body.setVelocity(ax * speed, ay * speed);
      if (mag > 0.2) this.faceVec = { x: ax / Math.max(mag, 1e-3), y: ay / Math.max(mag, 1e-3) };
      this.moving = mag > 0.2;
      this.sneaking = sneaking;
      this.animateWalker(ben, ax, ay, sneaking);

      // context action: CUT near the fence, otherwise SNIFF
      const nearCut = !this.fenceCut && Phaser.Math.Distance.Between(ben.x, ben.y, CUT.x, CUT.y) < 30;
      const label = nearCut ? 'CUT' : 'SNIFF';
      if (label !== this.lastLabel) { this.lastLabel = label; Input.relabel('A', label); }
      if (nearCut) {
        this.prompt.setText('HOLD: CUT').setPosition(CUT.x, CUT.y - 50).setVisible(true);
        if (Input.isDown('A')) this.cutting(delta); else this.cutProgress = Math.max(0, (this.cutProgress ?? 0) - delta * 2);
        Input.consume('A');
      } else {
        this.prompt.setVisible(false);
        if (Input.consume('A')) this.sniff();
      }
      if (Input.consume('B')) this.bark();
    } else {
      ben.body.setVelocity(0, 0);
      this.moving = false;
    }
    this.drawCutRing();

    this.updateZeus(delta);
    this.updateGuards(time, dt);
    this.updateSearchlights(time, dt);
    this.updateSensors(time);
    this.checkProgress();

    // y-sort + shadows
    ben.setDepth(ben.y);
    this.zeus.setDepth(this.zeus.y);
    this.benShadow.setPosition(ben.x, ben.y - 1).setDepth(ben.y - 1);
    this.zeusShadow.setPosition(this.zeus.x, this.zeus.y - 1).setDepth(this.zeus.y - 1);
    this.status.setText(this.hidden ? 'HIDDEN' : this.sneaking && this.moving ? 'SNEAKING' : '');
    this.lighting.update(time);
  }

  // ---------------------------------------------------------------------------
  //  Guards
  // ---------------------------------------------------------------------------
  canSee(g) {
    const ben = this.ben;
    if (this.busy || this.ended) return 0;
    const dx = ben.x - g.x, dy = (ben.y - 6) - (g.y - 4);
    const d = Math.hypot(dx, dy);
    if (this.hidden && d > CH3.HIDE_SEEN_DIST) return 0;
    if (d > CH3.GUARD_RANGE) return 0;
    if (Math.abs(angDiff(Math.atan2(dy, dx), g.facing)) > CH3.GUARD_FOV / 2 && d > 22) return 0;
    if (this.rayDist(g.x, g.y - 4, dx / d, dy / d, d) < d - 2) return 0;
    return 1 - d / CH3.GUARD_RANGE;                  // 0 far edge .. 1 point blank
  }

  updateGuards(time, dt) {
    const ben = this.ben;
    let anySus = false, anyAlert = false;
    this.cones.clear();
    for (const g of this.guards) {
      const see = this.canSee(g);
      const seen = see > 0;
      // --- suspicion
      if (g.state !== 'alert') {
        if (seen) {
          const rate = CH3.NOTICE_RATE + (CH3.NOTICE_RATE_CLOSE - CH3.NOTICE_RATE) * see;
          g.sus += rate * (this.sneaking ? 0.6 : 1) * (this.moving ? 1 : 0.7) * dt;
          g.lastSeen = { x: ben.x, y: ben.y };
          if (g.state !== 'suspicious' && g.sus > 0.12) {
            g.prevState = g.state;
            g.state = 'suspicious';
            Audio.sfx('suspicious', { pan: Audio.panFor(g.x, this.cameras.main) });
          }
          if (g.sus >= 1) this.spot(g);
        } else g.sus = Math.max(0, g.sus - CH3.NOTICE_DECAY * dt);
      }
      if (g.state === 'suspicious' && g.sus <= 0) { g.state = 'return'; }
      // --- behaviour
      let tx = null, ty = null, speed = g.def.speed || 40;
      if (g.state === 'patrol') {
        const [wx, wy] = g.def.path[g.wp];
        if (Phaser.Math.Distance.Between(g.x, g.y, wx, wy) < 4) {
          if (!g.waitUntil) g.waitUntil = time + (g.def.wait ?? 800);
          if (time > g.waitUntil) { g.waitUntil = 0; g.wp = (g.wp + 1) % g.def.path.length; }
          else g.facing += Math.sin(time / 500) * 0.012;      // glance around while waiting
        } else { tx = wx; ty = wy; }
      } else if (g.state === 'post') {
        g.facing = g.baseFacing + Math.sin(time / 1300) * (g.def.look ?? 0.4);
      } else if (g.state === 'suspicious') {
        // stop and stare toward where Ben was
        if (g.lastSeen) g.facing = Phaser.Math.Angle.RotateTo(g.facing, Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x), 2.5 * dt);
      } else if (g.state === 'investigate' || g.state === 'search') {
        const t = g.target;
        if (Phaser.Math.Distance.Between(g.x, g.y, t.x, t.y) > 10 && time < g.giveUpAt) { tx = t.x; ty = t.y; speed = 58; }
        else {
          if (!g.lookUntil) g.lookUntil = time + (g.state === 'search' ? CH3.SEARCH_MS : stat('barkStun', CH3.BARK_INVESTIGATE_MS));
          g.facing += 2.2 * dt;                                // looks all around
          if (time > g.lookUntil) { g.lookUntil = 0; g.state = 'return'; }
        }
      } else if (g.state === 'alert') {
        anyAlert = true;
        if (seen) { g.lastSeen = { x: ben.x, y: ben.y }; g.lostAt = time; }
        tx = g.lastSeen.x; ty = g.lastSeen.y; speed = CH3.CHASE_SPEED;
        if (time - g.lostAt > CH3.LOSE_SIGHT_MS) { g.state = 'search'; g.target = g.lastSeen; g.giveUpAt = time + 4000; g.lookUntil = 0; }
        if (Phaser.Math.Distance.Between(g.x, g.y, ben.x, ben.y) < CH3.CATCH_DIST && !this.busy) this.caught();
      } else if (g.state === 'return') {
        const [hx, hy] = g.def.post ? g.def.path[0] : g.def.path[g.wp];
        if (Phaser.Math.Distance.Between(g.x, g.y, hx, hy) > 6) { tx = hx; ty = hy; }
        else { g.state = g.def.post ? 'post' : 'patrol'; if (g.def.post) g.facing = g.baseFacing; }
      }
      if (g.state === 'suspicious' || (g.sus > 0.05 && g.state !== 'alert')) anySus = true;

      // --- movement
      if (tx !== null) {
        const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy);
        g.body.setVelocity((dx / d) * speed, (dy / d) * speed);
        g.facing = Phaser.Math.Angle.RotateTo(g.facing, Math.atan2(dy, dx), 5 * dt);
        // unstick if pushed against a rock while chasing
        if ((g.body.blocked.left || g.body.blocked.right) && Math.abs(dy) > 2) g.body.setVelocityY(Math.sign(dy) * speed);
        if ((g.body.blocked.up || g.body.blocked.down) && Math.abs(dx) > 2) g.body.setVelocityX(Math.sign(dx) * speed);
      } else g.body.setVelocity(0, 0);
      this.animateGuard(g, tx !== null);

      // --- visuals: flashlight cone, bubble, meter
      const alert = g.state === 'alert';
      const cone = this.computeCone(g);
      const col = alert ? 0xff3b4f : g.state === 'suspicious' || g.state === 'investigate' || g.state === 'search' ? 0xffb347 : 0xfff2c0;
      this.cones.fillStyle(col, alert ? 0.22 : 0.13).fillPoints(cone, true);
      this.cones.lineStyle(1, col, alert ? 0.5 : 0.25).strokePoints(cone, true);
      g.flash.x = g.x; g.flash.y = g.y - 4;
      g.flash.angle = Phaser.Math.RadToDeg(g.facing) - 90;
      g.flash.color = col;
      g.setDepth(g.y);
      const showQ = g.state === 'suspicious' || g.state === 'investigate' || g.state === 'search';
      g.bubble.setVisible(showQ || alert).setTexture(alert ? 'bub_x' : 'bub_q').setPosition(g.x, g.y - 44 + Math.sin(time / 120) * (alert ? 2 : 1));
      g.meter.setVisible(g.state === 'suspicious').setPosition(g.x, g.y - 54);
      g.meter.width = 14 * Math.min(1, g.sus);
    }
    // --- adaptive music & alarm lighting
    if (anyAlert !== this.alertOn) {
      this.alertOn = anyAlert;
      for (const l of ['drums', 'stab', 'arp']) Audio.setLayer(l, anyAlert ? 1 : 0, anyAlert ? 0.3 : 2.5);
      this.lighting.ambient = anyAlert ? CH3.ALERT_TINT : CH3.AMBIENT;
      this.spottedBanner.setVisible(anyAlert);
      if (anyAlert) { this.alarmEv = this.time.addEvent({ delay: 1000, loop: true, callback: () => Audio.sfx('alarm', { volume: 0.35 }) }); }
      else { this.alarmEv?.remove(); this.siren?.stop(0.5); this.toast('THEY LOST YOU...', P.cyan1); }
    }
    const tense = anySus && !anyAlert;
    if (tense !== this.tensionOn) { this.tensionOn = tense; for (const l of ['heart', 'trem']) Audio.setLayer(l, tense ? 1 : 0, tense ? 0.4 : 1.5); }
    if (anyAlert) this.spottedBanner.setAlpha(0.6 + Math.sin(time / 90) * 0.4);
  }

  computeCone(g) {
    const pts = [{ x: g.x, y: g.y - 4 }];
    const n = CH3.CONE_RAYS;
    for (let i = 0; i <= n; i++) {
      const a = g.facing - CH3.GUARD_FOV / 2 + (CH3.GUARD_FOV * i) / n;
      const dx = Math.cos(a), dy = Math.sin(a);
      const d = this.rayDist(g.x, g.y - 4, dx, dy, CH3.GUARD_RANGE);
      pts.push({ x: g.x + dx * d, y: g.y - 4 + dy * d });
    }
    return pts;
  }

  /** Distance along a ray until it hits a sight-blocking rectangle (or max). */
  rayDist(x, y, dx, dy, max) {
    let best = max;
    for (const r of this.losRects) {
      let tmin = 0, tmax = best;
      if (Math.abs(dx) < 1e-6) { if (x < r.x || x > r.x + r.w) continue; }
      else {
        let t1 = (r.x - x) / dx, t2 = (r.x + r.w - x) / dx;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (Math.abs(dy) < 1e-6) { if (y < r.y || y > r.y + r.h) continue; }
      else {
        let t1 = (r.y - y) / dy, t2 = (r.y + r.h - y) / dy;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (tmin < best) best = tmin;
    }
    return best;
  }

  /** A guard spots Ben: full alert, nearby guards join in by radio. */
  spot(g) {
    if (g.state === 'alert') return;
    const wasCalm = !this.guards.some((o) => o.state === 'alert');
    g.state = 'alert';
    g.sus = 1;
    g.lastSeen = { x: this.ben.x, y: this.ben.y };
    g.lostAt = this.time.now;
    if (wasCalm) {
      this.timesSpotted++;
      Audio.sfx('spotted');
      shake(this, 160, 0.006);
      vibrate(60);
      this.time.delayedCall(300, () => Audio.sfx('radio', { volume: 0.6 }));
    }
    for (const o of this.guards) {
      if (o !== g && o.state !== 'alert' && Phaser.Math.Distance.Between(o.x, o.y, g.x, g.y) < 300) {
        o.state = 'alert'; o.lastSeen = { ...g.lastSeen }; o.lostAt = this.time.now;
      }
    }
  }

  async caught() {
    if (this.busy) return;
    this.busy = true;
    this.ben.body.setVelocity(0, 0);
    Audio.sfx('caught');
    this.ben.play('ben_td_idle_down');
    const t = headText(this, W / 2, H / 2 - 20, 'CAUGHT!', 16, P.red).setScrollFactor(0).setDepth(HUD + 5);
    const line = bodyText(this, W / 2, H / 2 + 2, Phaser.Utils.Array.GetRandom([
      '"Sir, this is a restricted area." Back to the last checkpoint...',
      '"Is that... a tinfoil hat?" Back to the last checkpoint...',
      '"Nice dog. Still trespassing." Back to the last checkpoint...',
    ]), 16, P.cream, { ox: 0.5 }).setScrollFactor(0).setDepth(HUD + 5);
    await this.wait(1600);
    this.cameras.main.fadeOut(350, 10, 10, 24);
    await this.wait(400);
    t.destroy(); line.destroy();
    // reset guards, alarm, music & lighting
    this.buildGuards();
    this.alarmEv?.remove();
    this.siren?.stop(0.2);
    this.alertOn = false;
    this.tensionOn = false;
    for (const l of ['drums', 'stab', 'arp', 'heart', 'trem']) Audio.setLayer(l, 0, 0.5);
    this.lighting.ambient = CH3.AMBIENT;
    this.spottedBanner.setVisible(false);
    this.ben.body.reset(this.respawn.x, this.respawn.y);
    this.zeus.body.reset(this.respawn.x - 20, this.respawn.y + 8);
    this.zeus.state = 'follow';
    this.cameras.main.fadeIn(400, 10, 10, 24);
    this.busy = false;
  }

  animateGuard(g, moving) {
    const a = g.facing;
    const cx = Math.cos(a), cy = Math.sin(a);
    let key;
    if (Math.abs(cx) > Math.abs(cy)) { key = moving ? 'soldier_walk' : 'soldier_idle'; g.setFlipX(cx < 0); }
    else { key = cy < 0 ? (moving ? 'guard_td_up' : 'guard_td_idle_up') : (moving ? 'guard_td_down' : 'guard_td_idle_down'); g.setFlipX(false); }
    if (g.anims.currentAnim?.key !== key) { g.play(key); this.fixFeet(g, 12); }
  }

  // ---------------------------------------------------------------------------
  //  Searchlights & sensors
  // ---------------------------------------------------------------------------
  updateSearchlights(time, dt) {
    this.fx.clear();
    for (const s of this.searchlights) {
      s.t += dt * s.speed;
      const a = s.from + (s.to - s.from) * (0.5 + 0.5 * Math.sin(s.t));
      const dist = s.range * (0.72 + 0.18 * Math.sin(s.t * 2.3));
      s.spot.x = s.x + Math.cos(a) * dist;
      s.spot.y = s.y + Math.sin(a) * dist;
      s.light.x = s.spot.x; s.light.y = s.spot.y;
      // visible beam: from the lamp to the ground spot
      this.fx.fillStyle(0xd8e8ff, 0.07);
      const nx = -Math.sin(a), ny = Math.cos(a);
      this.fx.fillTriangle(s.x + nx * 4, s.y + ny * 4, s.spot.x + nx * s.radius, s.spot.y + ny * s.radius, s.spot.x - nx * s.radius, s.spot.y - ny * s.radius);
      this.fx.fillTriangle(s.x + nx * 4, s.y + ny * 4, s.x - nx * 4, s.y - ny * 4, s.spot.x - nx * s.radius, s.spot.y - ny * s.radius);
      this.fx.fillStyle(0xe8f0ff, 0.16).fillEllipse(s.spot.x, s.spot.y, s.radius * 2, s.radius * 1.5);
      this.fx.lineStyle(1, 0xffffff, 0.35).strokeEllipse(s.spot.x, s.spot.y, s.radius * 2, s.radius * 1.5);
      // caught in the beam?
      if (!this.busy && !this.hidden && !this.ended) {
        const dx = (this.ben.x - s.spot.x) / s.radius, dy = (this.ben.y - 6 - s.spot.y) / (s.radius * 0.75);
        if (dx * dx + dy * dy < 1) {
          // nearest guard gets a full alert toward Ben
          let best = null, bd = Infinity;
          for (const g of this.guards) { const d = Phaser.Math.Distance.Between(g.x, g.y, this.ben.x, this.ben.y); if (d < bd) { bd = d; best = g; } }
          if (best) this.spot(best);
        }
      }
    }
  }

  updateSensors(time) {
    for (const s of this.sensors) {
      const ph = ((time / s.period) + s.phase) % 1;
      const active = ph < 0.5;
      if (active) {
        const r = (ph / 0.5) * s.r;
        if (s.lastPing !== Math.floor(time / s.period + s.phase)) {
          s.lastPing = Math.floor(time / s.period + s.phase);
          Audio.sfx('sensor_ping', { volume: Math.max(0.05, 0.6 - Phaser.Math.Distance.Between(this.ben.x, this.ben.y, s.x, s.y) / 600), pan: Audio.panFor(s.x, this.cameras.main), minGap: 0 });
        }
        this.fx.lineStyle(2, 0xff3b4f, 0.55 * (1 - ph / 0.5)).strokeEllipse(s.x, s.y - 4, r * 2, r * 1.5);
        // moving (not sneaking) through the ring trips it
        const dx = (this.ben.x - s.x), dy = (this.ben.y - s.y) / 0.75, d = Math.hypot(dx, dy);
        if (!this.busy && this.moving && !this.sneaking && Math.abs(d - r) < 9 && time > (s.trippedUntil ?? 0)) {
          s.trippedUntil = time + 1500;
          Audio.sfx('alarm', { volume: 0.5 });
          this.toast('SENSOR TRIPPED!', P.red);
          for (const g of this.guards) {
            if (g.state !== 'alert' && Phaser.Math.Distance.Between(g.x, g.y, s.x, s.y) < 420) {
              g.state = 'investigate'; g.target = { x: this.ben.x, y: this.ben.y }; g.giveUpAt = time + 6000; g.lookUntil = 0;
            }
          }
        }
      } else this.fx.lineStyle(1, 0xff3b4f, 0.15).strokeEllipse(s.x, s.y - 4, s.r * 2, s.r * 1.5);
    }
  }

  // ---------------------------------------------------------------------------
  //  Zeus: BARK lure & SNIFF
  // ---------------------------------------------------------------------------
  async bark() {
    const now = this.time.now;
    const z = this.zeus;
    if (now - this.lastBark < CH3.BARK_COOLDOWN_MS || z.state !== 'follow') { Audio.sfx('ui_back', { volume: 0.4 }); return; }
    this.lastBark = now;
    // Zeus dashes ~100px in the direction Ben faces (stopping at rocks), then barks there
    const dir = this.faceVec;
    const d = Math.min(110, this.rayDist(this.ben.x, this.ben.y - 6, dir.x, dir.y, 110) - 12);
    const tx = Phaser.Math.Clamp(this.ben.x + dir.x * Math.max(30, d), 20, PW - 20);
    const ty = Phaser.Math.Clamp(this.ben.y + dir.y * Math.max(30, d), FENCE_Y + 20, PH - 20);
    z.state = 'bark';
    z.body.enable = false;
    z.play(Math.abs(dir.x) > Math.abs(dir.y) ? 'zeus_trot' : dir.y < 0 ? 'zeus_td_up' : 'zeus_td_down').setFlipX(dir.x < -0.5);
    await new Promise((r) => this.tweens.add({ targets: z, x: tx, y: ty, duration: 380, onComplete: r }));
    z.play('zeus_td_sit');
    Audio.sfx('bark2', { pan: Audio.panFor(z.x, this.cameras.main) });
    const ring = this.add.circle(z.x, z.y - 8, 6, hexNum(P.btc1), 0).setStrokeStyle(2, hexNum(P.btc1)).setDepth(907).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, radius: CH3.BARK_RADIUS, alpha: 0, duration: 700, onUpdate: () => ring.setStrokeStyle(2, hexNum(P.btc1), ring.alpha), onComplete: () => ring.destroy() });
    let lured = 0;
    for (const g of this.guards) {
      if (g.state === 'alert') continue;
      if (Phaser.Math.Distance.Between(g.x, g.y, z.x, z.y) < CH3.BARK_RADIUS) {
        g.state = 'investigate';
        g.target = { x: z.x, y: z.y };
        g.giveUpAt = this.time.now + 7000;
        g.lookUntil = 0;
        lured++;
      }
    }
    if (lured) this.say(z, lured > 1 ? '*BARK!* (they\'re coming!)' : '*BARK!*');
    await this.wait(450);
    // scamper back to Ben
    await new Promise((r) => this.tweens.add({ targets: z, x: this.ben.x - 16, y: this.ben.y + 6, duration: 420, onComplete: r }));
    z.body.enable = true;
    z.body.reset(z.x, z.y);
    z.state = 'follow';
  }

  sniff() {
    const now = this.time.now;
    const z = this.zeus;
    if (now - this.lastSniff < CH3.SNIFF_COOLDOWN_MS || z.state !== 'follow') return;
    this.lastSniff = now;
    Audio.sfx('sniff');
    const radius = stat('sniffRadius', CH3.SNIFF_RADIUS);
    const ring = this.add.circle(z.x, z.y - 6, 4, hexNum(P.cyan2), 0).setStrokeStyle(2, hexNum(P.cyan2)).setDepth(907).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, radius, alpha: 0, duration: 700, onUpdate: () => ring.setStrokeStyle(2, hexNum(P.cyan2), ring.alpha), onComplete: () => ring.destroy() });
    let found = false;
    for (const g of this.goldens) {
      if (!g.hidden || !g.active) continue;
      if (Phaser.Math.Distance.Between(z.x, z.y, g.x, g.y) < radius) {
        g.hidden = false; found = true;
        this.tweens.add({ targets: g, alpha: 1, duration: 500 });
        g.light = this.lighting.add({ x: g.x, y: g.y, radius: 40, color: 0xffc35c, intensity: 0.9, pulse: { speed: 4, amount: 0.3 } });
      }
    }
    if (found) Audio.sfx('sparkle', { count: 10 });
    else {
      // hint: point toward the nearest hidden golden
      const left = this.goldens.filter((g) => g.hidden && g.active);
      if (left.length) {
        left.sort((a, b) => Phaser.Math.Distance.Between(z.x, z.y, a.x, a.y) - Phaser.Math.Distance.Between(z.x, z.y, b.x, b.y));
        const g = left[0];
        const ang = Math.atan2(g.y - z.y, g.x - z.x);
        const arrow = this.add.image(z.x + Math.cos(ang) * 30, z.y - 6 + Math.sin(ang) * 30, 'pawprint').setTint(hexNum(P.btc1)).setRotation(ang + Math.PI / 2).setDepth(907).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: arrow, x: arrow.x + Math.cos(ang) * 24, y: arrow.y + Math.sin(ang) * 24, alpha: 0, duration: 1200, onComplete: () => arrow.destroy() });
        this.say(z, '*sniff* ...gold, that way!');
      } else this.say(z, '*sniff* ...nothing.');
    }
  }

  // ---------------------------------------------------------------------------
  //  Fence cutting
  // ---------------------------------------------------------------------------
  cutting(delta) {
    this.cutProgress = (this.cutProgress ?? 0) + delta;
    this.snipT = (this.snipT ?? 0) - delta;
    if (this.snipT <= 0) { this.snipT = 280; Audio.sfx('snip', { minGap: 0 }); }
    if (this.cutProgress >= CH3.CUT_MS && !this.fenceCut) {
      this.fenceCut = true;
      const tile = this.fenceTiles.find((t) => t.x === CUT.x);
      tile.img.setTexture('fence_cut');
      tile.body.destroy();
      Audio.sfx('checkpoint');
      shake(this, 100, 0.004);
      this.prompt.setVisible(false);
      this.finish();
    }
  }

  drawCutRing() {
    if (!this.cutRing) this.cutRing = this.add.graphics().setDepth(961);
    this.cutRing.clear();
    const p = (this.cutProgress ?? 0) / CH3.CUT_MS;
    if (p > 0 && !this.fenceCut) this.cutRing.lineStyle(3, hexNum(P.btc1), 1).beginPath().arc(CUT.x, CUT.y - 36, 9, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2).strokePath();
  }

  // ---------------------------------------------------------------------------
  //  Progress: checkpoints & tips
  // ---------------------------------------------------------------------------
  checkProgress() {
    if (this.busy) return;
    const y = this.ben.y;
    CHECKPOINTS.forEach((c, i) => {
      if (y < c.y && !this.cpReached.has(i) && !this.alertOn) {
        this.cpReached.add(i);
        this.respawn = { x: this.ben.x, y: c.y - 14 };
        Audio.sfx('checkpoint', { volume: 0.6 });
        this.toast(`CHECKPOINT - ${c.label}`, P.green1);
      }
    });
    TIPS.forEach((t, i) => { if (y < t.y && !this.tipsShown.has(i)) { this.tipsShown.add(i); this.tip(t.text); } });
  }

  // ---------------------------------------------------------------------------
  //  Shared top-down helpers
  // ---------------------------------------------------------------------------
  fixFeet(s, w) {
    s.body.setSize(w, 8);
    s.body.setOffset((s.frame.width - w) / 2, s.frame.height - 8);
  }

  animateWalker(s, ax, ay, sneaking) {
    const moving = Math.hypot(ax, ay) > 0.15;
    if (moving) {
      if (Math.abs(ax) > Math.abs(ay)) this.facing = ax < 0 ? 'left' : 'right';
      else this.facing = ay < 0 ? 'up' : 'down';
    }
    let anim;
    if (this.facing === 'left' || this.facing === 'right') { anim = moving ? 'ben_run' : 'ben_idle'; s.setFlipX(this.facing === 'left'); }
    else { anim = moving ? `ben_td_${this.facing}` : `ben_td_idle_${this.facing}`; s.setFlipX(false); }
    if (s.anims.currentAnim?.key !== anim) { s.play(anim); this.fixFeet(s, 12); }
    s.anims.timeScale = sneaking ? 0.55 : 1;
    if (moving && !sneaking) {
      this.stepT = (this.stepT ?? 0) - 16;
      if (this.stepT <= 0) { this.stepT = 320; Audio.sfx('step_sand', { volume: 0.25, minGap: 0 }); }
    }
  }

  updateZeus(delta) {
    const z = this.zeus, ben = this.ben;
    if (z.state !== 'follow') return;
    z.setAlpha(this.hidden ? 0.5 : 1);
    const tx = ben.x - this.faceVec.x * 18, ty = ben.y - this.faceVec.y * 14 + 4;
    const dx = tx - z.x, dy = ty - z.y, d = Math.hypot(dx, dy);
    if (d > 220) { z.body.reset(ben.x - 14, ben.y + 6); return; }
    if (d > 12) {
      const sp = (this.sneaking ? CH3.SNEAK_SPEED + 10 : CH3.ZEUS_SPEED) * (d > 70 ? 1.4 : 1);
      z.body.setVelocity((dx / d) * sp, (dy / d) * sp);
      z.stuck = (z.body.blocked.left || z.body.blocked.right || z.body.blocked.up || z.body.blocked.down) ? z.stuck + delta : 0;
      if (z.stuck > 800) { z.body.reset(ben.x - 14, ben.y + 6); z.stuck = 0; }
      let anim;
      if (Math.abs(dx) > Math.abs(dy)) { anim = 'zeus_trot'; z.setFlipX(dx < 0); } else { anim = dy < 0 ? 'zeus_td_up' : 'zeus_td_down'; z.setFlipX(false); }
      if (z.anims.currentAnim?.key !== anim) { z.play(anim); this.fixFeet(z, 14); }
    } else {
      z.body.setVelocity(0, 0);
      if (z.anims.currentAnim?.key !== 'zeus_td_sit') { z.setFlipX(false); z.play('zeus_td_sit'); this.fixFeet(z, 14); }
    }
  }

  // --- pickups & UI ------------------------------------------------------------
  collectCoin(c) {
    if (!c.active) return;
    c.disableBody(true, true);
    this.coins++;
    Audio.sfx('coin', { volume: 0.6, combo: Math.min(10, this.coins % 6) });
    this.sats += ECONOMY.COIN_VALUE;
    this.satsText.setText(String(this.sats));
  }

  collectGolden(g) {
    if (g.hidden || !g.active) return;
    g.disableBody(true, true);
    if (g.light) this.lighting.remove(g.light);
    this.golden[g.gid] = true;
    Audio.sfx('golden');
    vibrate(40);
    const slot = this.goldSlots[g.gid];
    slot.clearTint().setAlpha(1).setScale(2);
    this.tweens.add({ targets: slot, scale: 1, duration: 400, ease: 'Back.Out' });
    this.sats += ECONOMY.GOLDEN_VALUE;
    this.satsText.setText(String(this.sats));
    this.toast('GOLDEN BITCOIN!', P.btc1);
  }

  tip(text) {
    const t = bodyText(this, W / 2, H - 70, text, 16, P.cream, { ox: 0.5, oy: 0.5 }).setScrollFactor(0).setDepth(HUD).setAlpha(0);
    const bg = this.add.rectangle(W / 2, H - 70, t.width + 20, 20, hexNum(P.ink), 0.8).setStrokeStyle(1, hexNum(P.cyan3)).setScrollFactor(0).setDepth(HUD - 1).setAlpha(0);
    this.tweens.add({ targets: [t, bg], alpha: 1, duration: 300, hold: 3800, yoyo: true, onComplete: () => { t.destroy(); bg.destroy(); } });
  }

  toast(text, color = P.cream) {
    const t = headText(this, W / 2, 90, text, 8, color).setScrollFactor(0).setDepth(HUD).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 84, duration: 200, hold: 1300, yoyo: true, onComplete: () => t.destroy() });
  }

  say(entity, text) {
    const t = bodyText(this, entity.x, entity.y - 34, text, 16, P.ink, { ox: 0.5, oy: 1, shadow: false }).setDepth(962);
    const bg = this.add.rectangle(t.x, t.y - t.height / 2, t.width + 8, t.height + 2, 0xfff6e0).setDepth(961).setStrokeStyle(1, 0x0b0a1a);
    this.tweens.add({ targets: [t, bg], alpha: 0, delay: 1300, duration: 300, onComplete: () => { t.destroy(); bg.destroy(); } });
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }
}
