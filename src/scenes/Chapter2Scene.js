// ============================================================================
//  CHAPTER 2 — "RACHEL, NEVADA"  (top-down exploration & light puzzles)
//  Dusk in a town of 54. Talk to the locals, find "D" at the Little A'Le'Inn,
//  and let Zeus SNIFF out and DIG up what's buried in the desert.
// ============================================================================
import Phaser from 'phaser';
import { GAME, CH2, ECONOMY } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Lighting } from '../systems/lighting.js';
import { Dialogue } from '../systems/dialogue.js';
import { applyFilm, shake, vibrate } from '../systems/fx.js';
import { headText, bodyText, goTo, fadeIn } from '../systems/ui.js';
import { stat } from '../systems/progress.js';
import { TOWN_W, TOWN_H } from '../art/rachel.js';
import {
  IX, DOOR, FUSE, START, SOLIDS, PROPS, NPCS, DIGS, TALK, OBJECTIVES, coinSpots, FUSE_ORDER, FUSE_LAYOUT,
} from '../data/ch2_town.js';
import ch2Song from '../audio/music/ch2.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const HUD = 1000;

export default class Chapter2Scene extends Phaser.Scene {
  constructor() { super('Chapter2'); }

  create() {
    fadeIn(this, 800);
    this.stage = 0;
    this.sats = 0;
    this.coins = 0;
    this.golden = [false, false, false];
    this.met = new Set();
    this.dug = 0;
    this.inventory = { wallet: false, keycard: false };
    this.fuseFixed = false;
    this.inside = false;
    this.busy = false;
    this.lastSniff = -9999;
    this.startTime = this.time.now;
    this.facing = 'down';

    this.physics.world.setBounds(0, 0, IX + 640, TOWN_H);
    this.cameras.main.setBounds(0, 0, TOWN_W, TOWN_H);
    this.cameras.main.setBackgroundColor('#1a1220');
    this.lighting = new Lighting(this, { ambient: CH2.AMBIENT_OUT, depth: 900 });

    this.add.image(0, 0, 'town_ground').setOrigin(0).setDepth(-10);
    this.add.image(IX, 0, 'diner_in').setOrigin(0).setDepth(-10);
    this.add.image(IX, 0, 'diner_in_glow').setOrigin(0).setDepth(905).setBlendMode(Phaser.BlendModes.ADD);

    this.solids = this.physics.add.staticGroup();
    for (const [x, y, w, h] of SOLIDS) {
      const z = this.add.zone(x + w / 2, y + h / 2, w, h);
      this.physics.add.existing(z, true);
      this.solids.add(z);
    }
    this.buildProps();
    this.buildChars();
    this.buildNPCs();
    this.buildDigs();
    this.buildCoins();
    this.buildLights();
    this.buildHUD();

    this.physics.add.collider(this.ben, this.solids);
    this.physics.add.collider(this.zeus, this.solids);
    this.cameras.main.startFollow(this.ben, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(0, 40);   // look a little ahead/up so rooftops & signs show

    Input.configure({
      mode: 'joystick', pause: true,
      buttons: [{ id: 'A', label: 'TALK', style: 'a' }, { id: 'B', label: 'ZEUS', style: 'b', icon: 'glyph_paw' }],
    });
    Audio.playMusic(ch2Song);
    Audio.playAmbience('desert_night');
    this.film = applyFilm(this, { vignette: 1.15 });

    const onPause = () => { if (!this.ended && !this.scene.isActive('Pause')) { this.scene.launch('Pause', { from: this.scene.key }); this.scene.bringToTop('Pause'); this.scene.bringToTop('Controls'); } };
    Input.events.on('pause', onPause);
    this.events.once('shutdown', () => { Input.events.off('pause', onPause); this.lighting.destroy(); });

    this.intro();
  }

  // ===========================================================================
  //  BUILD
  // ===========================================================================
  buildProps() {
    for (const p of PROPS) {
      const img = this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1).setDepth(p.y);
      if (p.scale) img.setScale(p.scale);
      const glowKey = `${p.key}_glow`;
      if (this.textures.exists(glowKey)) {
        const g = this.add.image(p.x, p.y, glowKey).setOrigin(0.5, 1).setDepth(905).setBlendMode(Phaser.BlendModes.ADD);
        if (p.key === 'diner') this.dinerGlow = g;
      }
      // soft contact shadow
      this.add.ellipse(p.x, p.y - 2, img.width * 0.8, 8, 0x1a0e1a, 0.35).setDepth(-5);
      if (p.key === 'diner') this.diner = img;
    }
  }

  buildChars() {
    this.ben = this.physics.add.sprite(START.x, START.y, 'ben_td', 0).setOrigin(0.5, 1);
    this.ben.body.setSize(12, 8).setOffset(6, 28);
    this.ben.setCollideWorldBounds(true);
    this.zeus = this.physics.add.sprite(START.x - 24, START.y, 'zeus_td', 8).setOrigin(0.5, 1).play('zeus_td_sit');
    this.zeus.body.setSize(14, 8).setOffset(4, 16);
    this.zeus.state = 'follow';
    this.zeus.stuck = 0;
    this.benShadow = this.add.ellipse(0, 0, 16, 5, 0x1a0e1a, 0.4);
    this.zeusShadow = this.add.ellipse(0, 0, 16, 5, 0x1a0e1a, 0.4);
  }

  buildNPCs() {
    this.npcs = NPCS.map((n) => {
      const s = this.add.sprite(n.x, n.y, `npc_${n.id}`, 0).setOrigin(0.5, 1).play({ key: `npc_${n.id}_idle`, startFrame: Phaser.Math.Between(0, 2) });
      s.def = n;
      s.setDepth(n.y);
      const z = this.add.zone(n.x, n.y - 4, 14, 8);
      this.physics.add.existing(z, true);
      this.solids.add(z);
      if (!n.inside) this.add.ellipse(n.x, n.y - 1, 16, 5, 0x1a0e1a, 0.4).setDepth(-5);
      // floating name tag
      // behind the counter: only show the part above the countertop
      if (n.behindCounter) { s.setCrop(0, 0, 24, 36 - (n.y - n.behindCounter)); s.setDepth(-9); }
      s.tag = bodyText(this, n.x, n.y - 46, n.name, 16, P.cream, { ox: 0.5 }).setDepth(n.y + 1).setAlpha(0.7);
      return s;
    });
  }

  buildDigs() {
    this.digs = DIGS.map((d) => {
      const m = this.add.image(d.x, d.y, 'digspot').setDepth(d.y - 1).setAlpha(0);
      const sp = this.add.particles(d.x, d.y - 4, 'px1', { lifespan: 700, speedY: { min: -30, max: -10 }, speedX: { min: -10, max: 10 }, alpha: { start: 1, end: 0 }, tint: hexNum(d.kind === 'golden' ? P.btc1 : P.cyan1), frequency: 160, blendMode: 'ADD', emitting: false }).setDepth(906);
      return { ...d, marker: m, sparkles: sp, revealed: false, done: false };
    });
  }

  buildCoins() {
    this.coinGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const [x, y] of coinSpots()) {
      const c = this.coinGroup.create(x, y, 'coin').play({ key: 'coin_spin', startFrame: Math.floor(x) % 8 }).setDepth(906);
      c.body.setCircle(6);
      this.tweens.add({ targets: c, y: y - 3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: (x * 7) % 800 });
    }
    this.coinsTotal = this.coinGroup.getLength();
    this.physics.add.overlap(this.ben, this.coinGroup, (_, c) => this.collectCoin(c));
  }

  buildLights() {
    const L = this.lighting;
    // a last smear of sunset glowing from the west
    L.add({ x: -200, y: 400, radius: 700, color: 0xff8a5a, intensity: 0.35 });
    L.add({ follow: this.ben, oy: -14, radius: 90, color: 0xffe0c0, intensity: 0.55 });
    // diner windows + porch + neon sign
    for (const x of [669, 713, 807, 851]) L.add({ x, y: 440, radius: 60, color: 0xffb347, intensity: 0.8 });
    L.add({ x: 760, y: 470, radius: 80, color: 0xffcf8a, intensity: 0.8 });
    this.neonLights = [
      L.add({ x: 700, y: 318, radius: 120, color: 0xff5aa8, intensity: 0.9 }),
      L.add({ x: 820, y: 318, radius: 120, color: 0xff5aa8, intensity: 0.9 }),
      L.add({ x: 644, y: 316, radius: 60, color: 0x5dff9a, intensity: 0.8 }),
    ];
    // UFO on the tow truck, trailers, street lamps
    L.add({ x: 914, y: 466, radius: 70, color: 0x3cf2ff, intensity: 0.7, pulse: { speed: 2, amount: 0.3 } });
    L.add({ x: 266, y: 340, radius: 50, color: 0xffb347, intensity: 0.6 });
    L.add({ x: 1224, y: 326, radius: 50, color: 0xffb347, intensity: 0.6 });
    L.add({ x: 408, y: 736, radius: 50, color: 0xffb347, intensity: 0.6 });
    for (const x of [600, 1120]) {
      L.add({ x, y: 600, radius: 110, color: 0xfff0c8, intensity: 0.85, flicker: 0.05 });
      this.add.particles(x, 540, 'px1', { x: { min: -14, max: 14 }, y: { min: -10, max: 10 }, lifespan: 1200, speed: { min: 10, max: 30 }, alpha: { start: 0.8, end: 0 }, tint: 0xfff0c8, frequency: 140, blendMode: 'ADD' }).setDepth(906);   // moths
    }
    // inside the diner
    L.add({ x: IX + 320, y: 140, radius: 260, color: 0xffd0a0, intensity: 0.9 });
    L.add({ x: IX + 38, y: 170, radius: 90, color: 0xff7a3a, intensity: 0.8, pulse: { speed: 3, amount: 0.3 } });
    L.add({ x: IX + 605, y: 160, radius: 70, color: 0xff5a8a, intensity: 0.8 });
    // the sign is broken: neon flickers until the fuses are fixed
    this.time.addEvent({
      delay: 120, loop: true, callback: () => {
        if (this.fuseFixed) return;
        const on = Math.random() < 0.25;
        this.neonLights.forEach((l) => { l.intensity = on ? 0.6 : 0.05; });
        this.dinerGlow?.setAlpha(on ? 0.5 : 0.08);
        if (on && Math.random() < 0.3 && !this.inside) Audio.sfx('buzz', { volume: 0.25, pan: Audio.panFor(760, this.cameras.main) });
      },
    });
  }

  buildHUD() {
    this.objBox = this.add.rectangle(6, 6, 270, 30, hexNum(P.ink), 0.7).setOrigin(0).setStrokeStyle(1, hexNum(P.btc2)).setScrollFactor(0).setDepth(HUD);
    headText(this, 12, 12, 'OBJECTIVE', 8, P.btc, { ox: 0 }).setScrollFactor(0).setDepth(HUD).setScale(0.75);
    this.objText = bodyText(this, 12, 18, '', 16, P.cream, { wrap: 258, lineSpacing: -5 }).setScrollFactor(0).setDepth(HUD);
    this.add.image(16, 48, 'glyph_btc').setScrollFactor(0).setDepth(HUD);
    this.satsText = headText(this, 26, 48, '0', 8, P.cream, { ox: 0 }).setScrollFactor(0).setDepth(HUD);
    this.invIcons = {
      wallet: this.add.image(80, 48, 'item_wallet').setScrollFactor(0).setDepth(HUD).setAlpha(0),
      keycard: this.add.image(102, 48, 'item_keycard').setScrollFactor(0).setDepth(HUD).setAlpha(0),
    };
    this.goldSlots = [0, 1, 2].map((i) => this.add.image(W / 2 - 18 + i * 18 + 60, 14, 'golden', 0).setAlpha(0.22).setTint(0x888888).setScrollFactor(0).setDepth(HUD));
    // context prompt above whatever Ben can interact with
    this.prompt = this.add.container(0, 0).setDepth(950);
    this.promptBg = this.add.rectangle(0, 0, 50, 14, hexNum(P.ink), 0.85).setStrokeStyle(1, hexNum(P.btc1));
    this.promptText = headText(this, 0, 0, '', 8, P.btc1, { shadow: false }).setScale(0.75);
    this.prompt.add([this.promptBg, this.promptText]);
    this.prompt.setVisible(false);
    this.setObjective();
  }

  setObjective() {
    this.objText.setText(OBJECTIVES[this.stage]);
    this.objBox.height = 22 + this.objText.height;
    this.tweens.add({ targets: this.objBox, alpha: { from: 0.3, to: 0.7 }, duration: 300, yoyo: true, repeat: 1 });
  }

  // ===========================================================================
  //  STORY
  // ===========================================================================
  async intro() {
    this.busy = true;
    const card = headText(this, W / 2, 80, 'CHAPTER 2', 8, P.cyan1).setScrollFactor(0).setDepth(HUD);
    const card2 = headText(this, W / 2, 98, 'RACHEL, NEVADA', 16, P.btc).setScrollFactor(0).setDepth(HUD);
    [card, card2].forEach((c) => { c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 600, hold: 1600, yoyo: true, onComplete: () => c.destroy() }); });
    await this.wait(1800);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'talk', text: 'Rachel. One diner, a few trailers, and about a thousand stars coming out.' },
      { who: 'ben', mood: 'smug', text: 'Somebody here signed that note "D". Let\'s ask around, buddy.' },
      { who: 'zeus', mood: 'happy', text: '*sniff sniff*' },
    ]);
    this.busy = false;
    const touch = this.sys.game.device.input.touch;
    this.toast(touch ? 'TALK: ORANGE BUTTON   ZEUS: SNIFF / DIG' : 'SPACE: TALK   E: ZEUS SNIFF / DIG', 3200);
  }

  async talkTo(npc) {
    this.busy = true;
    const id = npc.def.id;
    this.met.add(id);
    const lines = TALK[id];
    const key = Object.keys(lines).map(Number).filter((s) => s <= this.stage).pop() ?? 0;
    npc.play(`npc_${id}_talk`);
    npc.setFlipX(this.ben.x < npc.x);
    await Dialogue.play(this, lines[key]);
    npc.play(`npc_${id}_idle`);
    // story advances
    if (id === 'dolores') {
      if (this.stage === 0) { this.stage = 1; this.setObjective(); }
      else if (this.stage === 2) { this.stage = 3; this.setObjective(); this.invIcons.wallet.setAlpha(0.3); }
      else if (this.stage === 4) { await this.finish(); return; }
    }
    this.busy = false;
  }

  checkFavours() {
    if (this.stage === 3 && this.inventory.keycard && this.fuseFixed) {
      this.stage = 4;
      this.setObjective();
      this.toast('BOTH FAVOURS DONE! BACK TO DOLORES.', 2400, P.green1);
    }
  }

  async finish() {
    this.ended = true;
    this.busy = true;
    Audio.sfx('golden');
    const m = this.add.image(this.ben.x, this.ben.y - 40, 'item_map').setScale(3).setDepth(950);
    this.tweens.add({ targets: m, y: m.y - 16, scale: 4, duration: 600, yoyo: true, hold: 600, onComplete: () => m.destroy() });
    await this.wait(1800);
    const time = (this.time.now - this.startTime) / 1000;
    goTo(this, 'Results', {
      chapter: 'ch2', sats: this.sats, coins: this.coins, coinsTotal: this.coinsTotal, golden: this.golden, time,
      clean: this.met.size === NPCS.length, cleanLabel: 'MET EVERY LOCAL',
      stats: [['COINS', `${this.coins} / ${this.coinsTotal}`, 'text'], ['THINGS DUG UP', this.dug, 'num'], ['LOCALS MET', `${this.met.size} / ${NPCS.length}`, 'text']],
    }, { duration: 800 });
  }

  // ===========================================================================
  //  INTERACTION
  // ===========================================================================
  /** What can Ben interact with right now? */
  nearestInteractable() {
    const bx = this.ben.x, by = this.ben.y;
    const R = CH2.TALK_RANGE;
    for (const n of this.npcs) {
      const reach = n.def.inside ? 70 : R;
      if (Phaser.Math.Distance.Between(bx, by, n.x, n.y) < reach) return { kind: 'npc', npc: n, x: n.x, y: n.y - 46, label: 'TALK' };
    }
    if (!this.inside && Phaser.Math.Distance.Between(bx, by, DOOR.x, DOOR.y) < 26) return { kind: 'door', x: DOOR.x, y: DOOR.y - 50, label: 'ENTER' };
    if (this.inside && by > 336 && Math.abs(bx - (IX + 320)) < 30) return { kind: 'exit', x: bx, y: by - 40, label: 'EXIT' };
    if (!this.inside && Phaser.Math.Distance.Between(bx, by, FUSE.x, FUSE.y + 6) < R && !this.fuseFixed) return { kind: 'fuse', x: FUSE.x, y: FUSE.y - 36, label: 'USE' };
    return null;
  }

  nearestDig() {
    for (const d of this.digs) {
      if (d.revealed && !d.done && Phaser.Math.Distance.Between(this.ben.x, this.ben.y, d.x, d.y) < CH2.DIG_RANGE) return d;
    }
    return null;
  }

  async useDoor(enter) {
    this.busy = true;
    Audio.sfx('door', { volume: 0.4 });
    this.cameras.main.fadeOut(250, 10, 6, 16);
    await this.wait(280);
    this.inside = enter;
    if (enter) {
      this.ben.body.reset(IX + 320, 330);
      this.zeus.body.reset(IX + 296, 334);
      this.cameras.main.setBounds(IX, 0, 640, 360);
      this.lighting.ambient = CH2.AMBIENT_IN;
      Audio.setLayer('organ', 1, 0.8); Audio.setLayer('walk', 1, 0.8); Audio.setLayer('bell', 1, 0.8); Audio.setLayer('jdrum', 1, 0.8);
      Audio.setLayer('gtr', 0.15, 0.8); Audio.setLayer('lead', 0, 0.8); Audio.setLayer('drums', 0, 0.8); Audio.setLayer('ther', 0, 0.8);
      Audio.sfx('jingle', { volume: 0.5 });           // door bell
    } else {
      this.ben.body.reset(DOOR.x, DOOR.y + 22);
      this.zeus.body.reset(DOOR.x - 22, DOOR.y + 24);
      this.cameras.main.setBounds(0, 0, TOWN_W, TOWN_H);
      this.lighting.ambient = CH2.AMBIENT_OUT;
      Audio.setLayer('organ', 0, 0.8); Audio.setLayer('walk', 0, 0.8); Audio.setLayer('bell', 0, 0.8); Audio.setLayer('jdrum', 0, 0.8);
      Audio.setLayer('gtr', 1, 0.8); Audio.setLayer('lead', 1, 0.8); Audio.setLayer('drums', 1, 0.8); Audio.setLayer('ther', 0.6, 0.8);
    }
    this.cameras.main.fadeIn(250, 10, 6, 16);
    this.busy = false;
  }

  // --- Zeus abilities ----------------------------------------------------------
  sniff() {
    const now = this.time.now;
    if (now - this.lastSniff < CH2.SNIFF_COOLDOWN_MS || this.zeus.state !== 'follow') return;
    this.lastSniff = now;
    const z = this.zeus;
    z.state = 'sniff';
    z.body.setVelocity(0, 0);
    z.play('zeus_sniff');
    this.fixFeet(z, 14);
    Audio.sfx('sniff', { pan: Audio.panFor(z.x, this.cameras.main) });
    const radius = stat('sniffRadius', CH2.SNIFF_RADIUS);
    this.time.delayedCall(420, () => {
      for (let i = 0; i < 3; i++) {
        const c = this.add.circle(z.x, z.y - 6, 4, hexNum(P.cyan2), 0).setStrokeStyle(2, hexNum(P.cyan2), 1).setDepth(907).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: c, radius, alpha: 0, duration: 700, delay: i * 140, ease: 'Cubic.Out', onUpdate: () => c.setStrokeStyle(2, hexNum(P.cyan2), c.alpha), onComplete: () => c.destroy() });
      }
      this.lighting.flash(z.x, z.y, radius, 0x3cf2ff, 700, 0.5);
      let revealed = 0;
      for (const d of this.digs) {
        if (d.done || d.revealed || d.needStage > this.stage) continue;
        if (Phaser.Math.Distance.Between(z.x, z.y, d.x, d.y) < radius) { this.revealDig(d); revealed++; }
      }
      if (revealed) { Audio.sfx('sparkle', { count: 8 }); this.time.delayedCall(400, () => Audio.sfx('bark2', { volume: 0.7 })); }
      else this.scentTrail();
    });
    this.time.delayedCall(1000, () => { z.state = 'follow'; });
  }

  revealDig(d) {
    d.revealed = true;
    this.tweens.add({ targets: d.marker, alpha: 1, duration: 400 });
    d.sparkles.emitting = true;
    d.light = this.lighting.add({ x: d.x, y: d.y, radius: 34, color: d.kind === 'golden' ? 0xffc35c : 0x7ff8ff, intensity: 0.8, pulse: { speed: 4, amount: 0.4 } });
  }

  /** Nothing close: leave glowing paw prints toward the most relevant buried thing. */
  scentTrail() {
    const z = this.zeus;
    const cands = this.digs.filter((d) => !d.done && !d.revealed && d.needStage <= this.stage && Phaser.Math.Distance.Between(z.x, z.y, d.x, d.y) < CH2.SNIFF_TRAIL_RANGE);
    if (!cands.length) { this.say(this.zeus, '*sniff* ...nothing.'); return; }
    // story items first, then whatever is closest
    cands.sort((a, b) => (a.kind === 'golden' || a.kind === 'junk' ? 1 : 0) - (b.kind === 'golden' || b.kind === 'junk' ? 1 : 0) || Phaser.Math.Distance.Between(z.x, z.y, a.x, a.y) - Phaser.Math.Distance.Between(z.x, z.y, b.x, b.y));
    const t = cands[0];
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const f = i / (steps + 1);
      const x = z.x + (t.x - z.x) * f * 0.6, y = z.y + (t.y - z.y) * f * 0.6;
      const p = this.add.image(x + (i % 2 ? 4 : -4), y, 'pawprint').setTint(hexNum(P.cyan1)).setAlpha(0).setDepth(907).setBlendMode(Phaser.BlendModes.ADD);
      p.setRotation(Math.atan2(t.y - z.y, t.x - z.x) + Math.PI / 2);
      this.tweens.add({ targets: p, alpha: 0.9, duration: 200, delay: i * 90, hold: 2200, yoyo: true, onComplete: () => p.destroy() });
    }
    Audio.sfx('whine', { volume: 0.4 });
    this.say(this.zeus, '*sniff* ...that way!');
  }

  async dig(d) {
    if (this.zeus.state !== 'follow') return;
    this.busy = true;
    const z = this.zeus;
    z.state = 'dig';
    z.body.setVelocity(0, 0);
    // Zeus runs to the spot
    const side = this.ben.x < d.x ? 12 : -12;   // dig beside Ben, not hidden behind him
    await new Promise((res) => this.tweens.add({ targets: z, x: d.x + side, y: d.y + 6, duration: 250, onComplete: res }));
    z.body.reset(z.x, z.y);
    z.play('zeus_td_dig');
    this.fixFeet(z, 14);
    const digTime = stat('digTime', CH2.DIG_MS);
    const dirt = this.add.particles(d.x, d.y, 'px2', { lifespan: 500, speed: { min: 40, max: 110 }, angle: { min: 200, max: 340 }, gravityY: 300, tint: [hexNum(P.sand2), hexNum(P.sand3)], frequency: 30 }).setDepth(d.y + 10);
    const ring = this.add.graphics().setDepth(950);
    const t0 = this.time.now;
    const ev = this.time.addEvent({
      delay: 16, loop: true, callback: () => {
        const f = Math.min(1, (this.time.now - t0) / digTime);
        ring.clear().lineStyle(3, hexNum(P.btc1), 1).beginPath().arc(d.x, d.y - 30, 9, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2).strokePath();
      },
    });
    for (let i = 0; i < digTime / 260; i++) this.time.delayedCall(i * 260, () => Audio.sfx('step_sand', { volume: 0.7, minGap: 0 }));
    await this.wait(digTime);
    ev.remove(); ring.destroy(); dirt.stop();
    this.time.delayedCall(600, () => dirt.destroy());
    d.done = true;
    this.dug++;
    d.sparkles.stop();
    d.marker.setTexture('dughole').setDepth(d.y - 2);
    if (d.light) this.lighting.remove(d.light);
    z.play('zeus_td_sit');
    this.fixFeet(z, 14);
    await this.popItem(d);
    z.state = 'follow';
    this.busy = false;
  }

  async popItem(d) {
    const key = d.kind === 'golden' ? 'golden' : d.item;
    const it = this.add.sprite(d.x, d.y - 6, key).setDepth(951).setScale(1.5);
    if (d.kind === 'golden') it.play('golden_spin');
    await new Promise((res) => this.tweens.add({ targets: it, y: d.y - 46, duration: 350, ease: 'Quad.Out', onComplete: res }));
    if (d.kind === 'golden') {
      this.golden[d.golden] = true;
      Audio.sfx('golden');
      vibrate(40);
      const slot = this.goldSlots[d.golden];
      slot.clearTint().setAlpha(1).setScale(2);
      this.tweens.add({ targets: slot, scale: 1, duration: 400, ease: 'Back.Out' });
      this.toast('GOLDEN BITCOIN!', 1400, P.btc1);
      this.flyToHud(it, ECONOMY.GOLDEN_VALUE);
      return;
    }
    if (d.kind === 'junk') {
      Audio.sfx('ui_back');
      const msg = { item_bone: 'Zeus found a bone. He is VERY proud.', item_boot: 'An old cowboy boot. Classic.', item_can: 'A rusty can of beans. Vintage!' }[d.item];
      await Dialogue.play(this, [{ who: 'ben', mood: d.item === 'item_bone' ? 'happy' : 'talk', text: msg }]);
      this.tweens.add({ targets: it, alpha: 0, duration: 300, onComplete: () => it.destroy() });
      if (d.item === 'item_bone') Audio.sfx('pant');
      this.sats += 25; this.satsText.setText(String(this.sats));
      return;
    }
    Audio.sfx('ui_confirm');
    shake(this, 100, 0.004);
    this.tweens.add({ targets: it, scale: 3, duration: 300, yoyo: true });
    await this.wait(500);
    if (d.kind === 'wallet') {
      this.inventory.wallet = true;
      this.invIcons.wallet.setAlpha(1);
      await Dialogue.play(this, [
        { who: 'ben', mood: 'shocked', text: 'A hardware wallet! An OLD one. And there\'s "S.N." scratched on the back...' },
        { who: 'ben', mood: 'smug', text: 'S.N. ...Nah. Couldn\'t be. Let\'s show Dolores.' },
      ]);
      this.stage = 2;
      this.setObjective();
    } else if (d.kind === 'keycard') {
      this.inventory.keycard = true;
      this.invIcons.keycard.setAlpha(1);
      await Dialogue.play(this, [{ who: 'ben', mood: 'happy', text: 'A base keycard! "Level 4 Security". Coyotes have great taste.' }]);
      this.checkFavours();
    }
    this.tweens.add({ targets: it, alpha: 0, duration: 300, onComplete: () => it.destroy() });
  }

  // --- fuse box puzzle ---------------------------------------------------------
  openFusePuzzle() {
    this.busy = true;
    const prevLayout = Input.layout;
    Input.configure({ mode: 'tap' });
    const root = this.add.container(W / 2, H / 2).setScrollFactor(0).setDepth(2100);
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setInteractive();
    const panel = this.add.image(0, 0, 'panel').setScale(0.9, 0.85);
    root.add([dim, panel]);
    root.add(headText(this, 0, -82, 'FUSE BOX', 16, P.btc));
    root.add(bodyText(this, 0, -62, 'Flip the breakers in the right order.', 16, P.cream2, { ox: 0.5 }));
    const pies = { A: ['APPLE', '#e8b070'], L: ['LEMON', '#f5e070'], E: ['ELDERBERRY', '#a04a8a'] };
    let seq = [];
    const levers = FUSE_LAYOUT.map((letter, i) => {
      const x = -80 + i * 80;
      const c = this.add.container(x, 10);
      const base = this.add.rectangle(0, 0, 40, 70, hexNum(P.ink3)).setStrokeStyle(2, hexNum(P.ink4));
      const handle = this.add.rectangle(0, 18, 26, 18, hexNum('#c8423a')).setStrokeStyle(2, hexNum(P.ink));
      const label = headText(this, 0, -46, letter, 16, pies[letter][1]);
      const sub = bodyText(this, 0, 48, pies[letter][0], 16, P.cream2, { ox: 0.5 });
      const lamp = this.add.circle(0, -22, 4, 0x3a2030);
      c.add([base, handle, label, sub, lamp]);
      c.setSize(44, 80).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => flip(letter, c));
      c.letter = letter; c.handle = handle; c.lamp = lamp; c.on2 = false;
      root.add(c);
      return c;
    });
    const close = headText(this, 120, -82, 'X', 16, P.cream).setInteractive({ useHandCursor: true });
    root.add(close);
    const finish = (ok) => {
      this.time.delayedCall(ok ? 900 : 0, () => {
        root.destroy();
        Input.configure(prevLayout);
        this.busy = false;
        Input.events.off('press', keyPress);
      });
    };
    close.on('pointerup', () => { Audio.sfx('ui_back'); finish(false); });
    const flip = (letter, c) => {
      if (c.on2) return;
      c.on2 = true;
      Audio.sfx('ui_toggle', { on: true });
      vibrate(10);
      this.tweens.add({ targets: c.handle, y: -14, duration: 120, ease: 'Back.Out' });
      c.lamp.setFillStyle(0x5dff9a);
      seq.push(letter);
      const i = seq.length - 1;
      if (seq[i] !== FUSE_ORDER[i]) {
        // wrong: sparks and reset
        Audio.sfx('laser_zap');
        shake(this, 200, 0.006);
        this.cameras.main.flash(120, 255, 220, 120);
        const sp = this.add.particles(W / 2 + c.x, H / 2 + c.y, 'px2', { speed: { min: 60, max: 180 }, lifespan: 500, gravityY: 300, tint: [hexNum(P.fire0), hexNum(P.fire1)], blendMode: 'ADD', emitting: false }).setScrollFactor(0).setDepth(2200);
        sp.explode(18);
        this.time.delayedCall(450, () => {
          seq = [];
          levers.forEach((l) => { l.on2 = false; l.lamp.setFillStyle(0x3a2030); this.tweens.add({ targets: l.handle, y: 18, duration: 150 }); });
        });
        return;
      }
      if (seq.length === FUSE_ORDER.length) {
        this.fuseFixed = true;
        Audio.sfx('checkpoint');
        Audio.sfx('door', { volume: 0.4, delay: 0.3 });
        this.neonLights.forEach((l) => { l.intensity = 1; });
        this.dinerGlow?.setAlpha(1);
        root.add(headText(this, 0, 80, 'THE SIGN LIGHTS UP!', 8, P.green1));
        finish(true);
        this.time.delayedCall(1000, () => { this.toast('THE LITTLE A\'LE\'INN IS LIT!', 2000, P.green1); this.checkFavours(); });
      }
    };
    const keyPress = (id) => { if (id === 'B') { Audio.sfx('ui_back'); finish(false); } };
    Input.events.on('press', keyPress);
  }

  // ===========================================================================
  //  UPDATE
  // ===========================================================================
  update(time, delta) {
    const ben = this.ben;
    if (!this.busy && !this.ended) {
      // movement (8-way, normalised)
      let ax = Input.axisX, ay = Input.axisY;
      const mag = Math.hypot(ax, ay);
      if (mag > 1) { ax /= mag; ay /= mag; }
      ben.body.setVelocity(ax * CH2.WALK_SPEED, ay * CH2.WALK_SPEED);
      this.animateWalker(ben, ax, ay, 'ben');
      // interactions
      const it = this.nearestInteractable();
      const dig = this.nearestDig();
      if (it) this.showPrompt(it.x, it.y, `${it.label}`);
      else if (dig) this.showPrompt(dig.x, dig.y - 34, 'DIG');
      else this.prompt.setVisible(false);
      const label = it ? it.label : 'TALK';
      if (label !== this.lastLabel) { this.lastLabel = label; Input.relabel('A', label); }
      if (Input.consume('A') && it) {
        if (it.kind === 'npc') this.talkTo(it.npc);
        else if (it.kind === 'door') this.useDoor(true);
        else if (it.kind === 'exit') this.useDoor(false);
        else if (it.kind === 'fuse') this.openFusePuzzle();
      }
      if (Input.consume('B')) { if (dig) this.dig(dig); else this.sniff(); }
    } else {
      ben.body.setVelocity(0, 0);
      this.prompt.setVisible(false);
      if (!this.ended) this.animateWalker(ben, 0, 0, 'ben');
    }
    this.updateZeus(delta);
    // y-sorting
    ben.setDepth(ben.y);
    this.zeus.setDepth(this.zeus.y);
    this.benShadow.setPosition(ben.x, ben.y - 1).setDepth(ben.y - 1);
    this.zeusShadow.setPosition(this.zeus.x, this.zeus.y - 1).setDepth(this.zeus.y - 1);
    this.lighting.update(time);
  }

  animateWalker(s, ax, ay, who) {
    const moving = Math.hypot(ax, ay) > 0.15;
    if (moving) {
      if (Math.abs(ax) > Math.abs(ay)) this.facing = ax < 0 ? 'left' : 'right';
      else this.facing = ay < 0 ? 'up' : 'down';
    }
    let anim;
    if (this.facing === 'left' || this.facing === 'right') { anim = moving ? `${who}_run` : `${who}_idle`; s.setFlipX(this.facing === 'left'); }
    else { anim = moving ? `${who}_td_${this.facing}` : `${who}_td_idle_${this.facing}`; s.setFlipX(false); }
    if (s.anims.currentAnim?.key !== anim) { s.play(anim); this.fixFeet(s, 12); }
    // footsteps
    if (moving) {
      this.stepT = (this.stepT ?? 0) - 16;
      if (this.stepT <= 0) { this.stepT = 300; Audio.sfx(this.inside ? 'step_metal' : 'step_sand', { volume: 0.3, minGap: 0 }); }
    }
  }

  updateZeus(delta) {
    const z = this.zeus, ben = this.ben;
    if (z.state !== 'follow') { if (z.state !== 'dig') z.body.setVelocity(0, 0); return; }
    const tx = ben.x - (this.facing === 'right' ? 22 : this.facing === 'left' ? -22 : 0);
    const ty = ben.y + (this.facing === 'up' ? 18 : this.facing === 'down' ? -14 : 4);
    const dx = tx - z.x, dy = ty - z.y;
    const d = Math.hypot(dx, dy);
    if (d > 260) { z.body.reset(ben.x - 16, ben.y + 4); return; }
    if (d > 14) {
      const sp = CH2.ZEUS_SPEED * (d > 80 ? 1.4 : 1);
      z.body.setVelocity((dx / d) * sp, (dy / d) * sp);
      const blocked = z.body.blocked.left || z.body.blocked.right || z.body.blocked.up || z.body.blocked.down;
      z.stuck = blocked ? z.stuck + delta : 0;
      if (z.stuck > 900) { z.body.reset(ben.x - 16, ben.y + 4); z.stuck = 0; }
      let anim;
      if (Math.abs(dx) > Math.abs(dy)) { anim = 'zeus_trot'; z.setFlipX(dx < 0); }
      else { anim = dy < 0 ? 'zeus_td_up' : 'zeus_td_down'; z.setFlipX(false); }
      if (z.anims.currentAnim?.key !== anim) { z.play(anim); this.fixFeet(z, 14); }
      z.jingle = (z.jingle ?? 0) - delta;
      if (z.jingle <= 0) { z.jingle = 500; Audio.sfx('jingle', { volume: 0.25, minGap: 0 }); }
    } else {
      z.body.setVelocity(0, 0);
      if (z.anims.currentAnim?.key !== 'zeus_td_sit') { z.setFlipX(false); z.play('zeus_td_sit'); this.fixFeet(z, 14); }
    }
  }

  /** Feet-only hitbox, re-anchored to the bottom of whatever frame is showing. */
  fixFeet(s, w) {
    s.body.setSize(w, 8);
    s.body.setOffset((s.frame.width - w) / 2, s.frame.height - 8);
  }

  showPrompt(x, y, label) {
    this.promptText.setText(label);
    this.promptBg.width = this.promptText.displayWidth + 12;
    this.prompt.setPosition(x, y + Math.sin(this.time.now / 200) * 2).setVisible(true);
  }

  // --- pickups & helpers ---------------------------------------------------------
  collectCoin(c) {
    if (!c.active) return;
    c.disableBody(true, false);
    this.coins++;
    const now = this.time.now;
    this.combo = now - (this.lastCoin ?? 0) < 900 ? Math.min(10, (this.combo ?? 0) + 1) : 0;
    this.lastCoin = now;
    Audio.sfx('coin', { combo: this.combo, minGap: 0 });
    this.flyToHud(c, ECONOMY.COIN_VALUE);
  }

  flyToHud(obj, value) {
    const cam = this.cameras.main;
    const sx = obj.x - cam.scrollX, sy = obj.y - cam.scrollY;
    const key = obj.texture.key;
    obj.destroy();
    const f = this.add.sprite(sx, sy, key).play(`${key}_spin`).setScrollFactor(0).setDepth(HUD + 1);
    this.tweens.add({
      targets: f, x: 16, y: 48, scale: 0.6, duration: 450, ease: 'Cubic.In',
      onComplete: () => { f.destroy(); this.sats += value; this.satsText.setText(String(this.sats)); },
    });
  }

  say(entity, text) {
    const t = bodyText(this, entity.x, entity.y - 38, text, 16, P.ink, { ox: 0.5, oy: 1, shadow: false }).setDepth(960);
    const bg = this.add.rectangle(t.x, t.y - t.height / 2, t.width + 8, t.height + 2, 0xfff6e0).setDepth(959).setStrokeStyle(1, 0x0b0a1a);
    this.tweens.add({ targets: [t, bg], alpha: 0, delay: 1500, duration: 300, onComplete: () => { t.destroy(); bg.destroy(); } });
  }

  toast(text, hold = 1800, color = P.cream) {
    const t = headText(this, W / 2, 300, text, 8, color).setScrollFactor(0).setDepth(HUD).setAlpha(0);
    const bg = this.add.rectangle(W / 2, 300, t.width + 20, 18, hexNum(P.ink), 0.75).setScrollFactor(0).setDepth(HUD - 1).setAlpha(0);
    this.tweens.add({ targets: [t, bg], alpha: 1, y: 294, duration: 250, hold, yoyo: true, onComplete: () => { t.destroy(); bg.destroy(); } });
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }
}
