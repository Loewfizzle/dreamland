// ============================================================================
//  CHAPTER 4 — "THE HANGAR"  (puzzles under a timer + light action)
//  Inside Hangar 18: a flying saucer glows under a tarp. Hack three blast
//  doors (wires, pattern, proof-of-work) before the agents arrive. Zeus
//  FETCHes a keycard from a high rack and BARKs wandering agents dizzy.
// ============================================================================
import Phaser from 'phaser';
import { GAME, CH4, ECONOMY } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Lighting } from '../systems/lighting.js';
import { Dialogue } from '../systems/dialogue.js';
import { applyFilm, shake, vibrate } from '../systems/fx.js';
import { headText, bodyText, goTo, fadeIn } from '../systems/ui.js';
import { stat } from '../systems/progress.js';
import { wires, simon, mine } from '../systems/hacks.js';
import ch4Song from '../audio/music/ch4.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const WORLD = 2040;
const FLOOR = 300;
const HUD = 1000;
const DOORS = [{ x: 700, hack: 'wires' }, { x: 1320, hack: 'simon', needsCard: true }, { x: 1880, hack: 'mine' }];
const RACK = { x: 1206, top: FLOOR - 210 };
const SAUCER_X = 935;
const GOLDENS = [{ x: 380, id: 0 }, { x: 1010, id: 1 }, { x: 1560, id: 2 }];
const SECTION_START = [140, 760, 1380];

export default class Chapter4Scene extends Phaser.Scene {
  constructor() { super('Chapter4'); }

  create() {
    fadeIn(this, 800);
    this.sats = 0;
    this.coins = 0;
    this.golden = [false, false, false];
    this.section = 0;
    this.hasCard = false;
    this.busy = true;
    this.ended = false;
    this.inHack = false;
    this.grabs = 0;
    this.mistakes = 0;
    this.lastBark = -99999;
    this.lastSniff = -99999;
    this.nextAgentAt = 0;
    this.dangerOn = false;
    this.startTime = this.time.now;

    this.physics.world.setBounds(0, 0, WORLD, H);
    this.cameras.main.setBounds(0, 0, WORLD, H);
    this.cameras.main.setBackgroundColor('#10121e');
    this.lighting = new Lighting(this, { ambient: 0x5a5e84, depth: 900 });

    this.buildHangar();
    this.buildDoors();
    this.buildActors();
    this.buildPickups();
    this.buildHUD();

    this.cameras.main.startFollow(this.ben, true, 0.1, 0.1, 0, 60);
    Input.configure({
      mode: 'joystick', pause: true,
      buttons: [{ id: 'A', label: 'USE', style: 'a' }, { id: 'B', label: 'SNIFF', style: 'b', icon: 'glyph_paw' }],
    });
    Audio.playMusic(ch4Song);
    Audio.stopAmbience(1);
    this.hum = Audio.loop('hum', { volume: 0.4, bus: 'amb' });
    applyFilm(this, { vignette: 1.2 });

    const onPause = () => { if (!this.ended && !this.inHack && !this.scene.isActive('Pause')) { this.scene.launch('Pause', { from: this.scene.key }); this.scene.bringToTop('Pause'); this.scene.bringToTop('Controls'); } };
    Input.events.on('pause', onPause);
    this.events.once('shutdown', () => { Input.events.off('pause', onPause); this.hum?.stop(0.3); this.lighting.destroy(); });

    const dbg = this.registry.get('debugCol');
    if (dbg != null) { this.registry.set('debugCol', null); this.jumpToSection(Math.min(2, dbg)); this.busy = false; }
    else this.intro();
  }

  // ===========================================================================
  //  BUILD
  // ===========================================================================
  buildHangar() {
    this.far = this.add.tileSprite(0, 0, W, H, 'hangar_far').setOrigin(0).setScrollFactor(0).setDepth(-20);
    this.farGlow = this.add.tileSprite(0, 0, W, H, 'hangar_far_glow').setOrigin(0).setScrollFactor(0).setDepth(905).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(300, 170, 'hangar18').setDepth(-15).setAlpha(0.9);
    this.add.image(1600, 170, 'hangar18').setDepth(-15).setAlpha(0.9);
    // the saucer under the tarp
    this.add.image(SAUCER_X, FLOOR, 'tarp_saucer').setOrigin(0.5, 1).setDepth(-5);
    this.saucerGlow = this.add.image(SAUCER_X, FLOOR, 'tarp_saucer_glow').setOrigin(0.5, 1).setDepth(906).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: this.saucerGlow, alpha: 0.55, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.saucerLight = this.lighting.add({ x: SAUCER_X, y: FLOOR - 20, radius: 230, color: 0x3cf2ff, intensity: 0.8, pulse: { speed: 1.8, amount: 0.35 } });
    // drifting dust in the saucer light
    this.add.particles(SAUCER_X, FLOOR - 40, 'px1', {
      x: { min: -160, max: 160 }, y: { min: -60, max: 20 }, lifespan: 3000, speedY: { min: -8, max: -2 }, speedX: { min: -4, max: 4 },
      alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.6 }, tint: 0x7ff8ff, frequency: 120, blendMode: 'ADD',
    }).setDepth(906);
    // props
    this.add.image(RACK.x, FLOOR, 'palletrack').setOrigin(0.5, 1).setDepth(-4);
    this.add.image(470, FLOOR, 'forklift').setOrigin(0.5, 1).setDepth(-4);
    for (const [x, k] of [[250, 'crate'], [274, 'crate'], [262, 'crate'], [560, 'barrel'], [1500, 'crate'], [1690, 'barrel'], [1708, 'barrel']]) {
      this.add.image(x, k === 'crate' && x === 262 ? FLOOR - 20 : FLOOR, k).setOrigin(0.5, 1).setDepth(-4);
    }
    // server cabinets in the last section (the blockchain node farm)
    for (const x of [1440, 1466, 1492, 1740, 1766]) {
      this.add.sprite(x, FLOOR, 'rack').setOrigin(0.5, 1).setDepth(-4).play({ key: 'rack_blink', startFrame: x % 2 });
      this.lighting.add({ x, y: FLOOR - 26, radius: 24, color: 0x3cf2ff, intensity: 0.35, flicker: 0.15 });
    }
    // floor
    this.add.tileSprite(0, FLOOR, WORLD, 60, 'hangar_floor').setOrigin(0).setDepth(-3);
    // hanging sodium lamps with volumetric cones
    for (let x = 120; x < WORLD; x += 220) {
      this.add.image(x, 140, 'hlamp').setOrigin(0.5, 0).setDepth(-2);
      this.lighting.add({ x, y: 178, beam: true, w: 190, h: FLOOR - 170, color: 0xffc070, intensity: 1, flicker: x === 560 ? 0.5 : 0.03 });
      this.lighting.add({ x, y: FLOOR, radius: 70, color: 0xffb060, intensity: 0.5 });
      const cone = this.add.image(x, 178, 'beam').setOrigin(0.5, 0).setScale(170 / 64, (FLOOR - 170) / 256).setTint(0xffc070).setAlpha(0.1).setBlendMode(Phaser.BlendModes.ADD).setDepth(905);
      if (x === 560) this.time.addEvent({ delay: 90, loop: true, callback: () => cone.setAlpha(Math.random() < 0.2 ? 0.02 : 0.1) });
    }
    // the lift beyond the last door
    this.add.image(1965, FLOOR + 10, 'liftframe').setOrigin(0.5, 1).setDepth(-4);
    this.lighting.add({ x: 1965, y: FLOOR - 40, radius: 90, color: 0xf5c542, intensity: 0.6 });
  }

  buildDoors() {
    this.doors = DOORS.map((d, i) => {
      const frame = this.add.image(d.x, FLOOR, 'doorframe').setOrigin(0.5, 1).setDepth(2);
      const panel = this.add.image(d.x, FLOOR, 'blastdoor').setOrigin(0.5, 1).setDepth(1);
      const lamp = this.add.circle(d.x, FLOOR - 220, 3, 0xff3b4f).setDepth(3);
      const light = this.lighting.add({ x: d.x, y: FLOOR - 216, radius: 60, color: 0xff3b4f, intensity: 0.9, pulse: { speed: 4, amount: 0.4 } });
      const term = this.add.sprite(d.x - 64, FLOOR, 'hackterm', 0).setOrigin(0.5, 1).setDepth(4);
      const tlight = this.lighting.add({ x: d.x - 64, y: FLOOR - 44, radius: 40, color: 0xff3b4f, intensity: 0.7 });
      void frame;
      return { ...d, i, panel, lamp, light, term, tlight, open: false };
    });
  }

  buildActors() {
    this.ben = this.physics.add.sprite(SECTION_START[0], FLOOR, 'ben', 0).setOrigin(0.5, 1).setDepth(10).play('ben_idle');
    this.ben.body.setAllowGravity(false);
    this.zeus = this.add.sprite(SECTION_START[0] - 24, FLOOR, 'zeus', 0).setOrigin(0.5, 1).setDepth(9).play('zeus_sit');
    this.zeus.state = 'follow';
    this.lighting.add({ follow: this.ben, oy: -14, radius: 70, color: 0xffe0c0, intensity: 0.45 });
    this.agents = [];
    this.card = this.add.image(RACK.x + 12, RACK.top - 4, 'item_keycard').setOrigin(0.5, 1).setDepth(5);
    this.cardLight = this.lighting.add({ x: RACK.x + 12, y: RACK.top - 10, radius: 26, color: 0xffffff, intensity: 0.7, pulse: { speed: 5, amount: 0.5 } });
    this.tweens.add({ targets: this.card, y: RACK.top - 7, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  buildPickups() {
    this.coinSprites = [];
    const row = (x0, x1, n, y = FLOOR - 12) => { for (let i = 0; i < n; i++) this.coinSprites.push(this.add.sprite(x0 + ((x1 - x0) * i) / (n - 1), y, 'coin').play({ key: 'coin_spin', startFrame: i % 8 }).setDepth(906)); };
    row(200, 330, 5); row(420, 620, 6); row(780, 900, 4); row(1060, 1240, 5); row(1400, 1540, 5); row(1620, 1800, 6);
    this.coinsTotal = this.coinSprites.length;
    this.coinSprites.forEach((c) => this.tweens.add({ targets: c, y: c.y - 3, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: c.x % 800 }));
    this.goldens = GOLDENS.map((g) => {
      const s = this.add.sprite(g.x, FLOOR - 14, 'golden').play('golden_spin').setDepth(906).setAlpha(0.03);
      s.hidden = true; s.gid = g.id; s.taken = false;
      return s;
    });
  }

  buildHUD() {
    const D = HUD;
    this.add.rectangle(6, 6, 96, 22, hexNum(P.ink), 0.65).setOrigin(0).setStrokeStyle(1, hexNum(P.ink4)).setScrollFactor(0).setDepth(D);
    this.add.image(16, 17, 'glyph_btc').setScrollFactor(0).setDepth(D);
    this.satsText = headText(this, 26, 17, '0', 8, P.cream, { ox: 0 }).setScrollFactor(0).setDepth(D);
    this.goldSlots = [0, 1, 2].map((i) => this.add.image(W / 2 - 18 + i * 18, 14, 'golden', 0).setAlpha(0.22).setTint(0x888888).setScrollFactor(0).setDepth(D));
    this.timerBox = this.add.rectangle(W / 2, 40, 210, 20, hexNum(P.ink), 0.7).setStrokeStyle(1, hexNum(P.red2)).setScrollFactor(0).setDepth(D);
    this.timerText = headText(this, W / 2, 40, '', 8, P.cream).setScrollFactor(0).setDepth(D);
    this.doorText = bodyText(this, W / 2, 56, '', 16, P.cream2, { ox: 0.5 }).setScrollFactor(0).setDepth(D);
    this.prompt = headText(this, 0, 0, '', 8, P.btc1).setDepth(960).setVisible(false);
    this.cardIcon = this.add.image(110, 17, 'item_keycard').setScrollFactor(0).setDepth(D).setAlpha(0);
  }

  // ===========================================================================
  //  STORY
  // ===========================================================================
  async intro() {
    const card = headText(this, W / 2, 80, 'CHAPTER 4', 8, P.cyan1).setScrollFactor(0).setDepth(HUD);
    const card2 = headText(this, W / 2, 98, 'THE HANGAR', 16, P.btc).setScrollFactor(0).setDepth(HUD);
    [card, card2].forEach((c) => { c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 600, hold: 1600, yoyo: true, onComplete: () => c.destroy() }); });
    await this.wait(1900);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'shocked', text: 'Hangar 18. Zeus... is that what I think it is under that tarp?' },
      { who: 'zeus', mood: 'alert', text: '*ears straight up*' },
      { who: 'radio', mood: 'stern', text: '"Motion in Hangar 18. All units respond. ETA ninety seconds."' },
      { who: 'ben', mood: 'angry', text: 'Ninety seconds?! No sign of Satoshi up here... but there\'s a lift down to the labs. Three blast doors in the way. Let\'s hack.' },
    ]);
    this.startSection(0);
    this.busy = false;
  }

  startSection(i) {
    this.section = i;
    this.timeLeft = CH4.SECTION_TIME[i];
    this.nextAgentAt = this.time.now + CH4.AGENT_EVERY_MS * 0.6;
    this.doorText.setText(`DOOR ${i + 1} / 3`);
  }

  jumpToSection(i) {
    for (let k = 0; k < i; k++) this.openDoor(this.doors[k], true);
    if (i >= 2) { this.hasCard = true; this.card.setVisible(false); this.lighting.remove(this.cardLight); this.cardIcon.setAlpha(1); }
    this.ben.x = SECTION_START[i];
    this.zeus.x = SECTION_START[i] - 24;
    this.startSection(i);
  }

  async finish() {
    this.ended = true;
    this.busy = true;
    this.agents.forEach((a) => a.destroy());
    this.agents = [];
    Audio.setLayer('drums', 0, 1); Audio.setLayer('stab', 0, 1);
    this.ben.play('ben_run').setFlipX(false);
    this.zeus.play('zeus_trot').setFlipX(false);
    this.tweens.add({ targets: this.zeus, x: 1950, duration: 900 });
    await new Promise((r) => this.tweens.add({ targets: this.ben, x: 1975, duration: 1000, onComplete: r }));
    this.ben.play('ben_idle').setFlipX(true);
    this.zeus.play('zeus_sit');
    this.cameras.main.pan(SAUCER_X + 300, H / 2, 1400, 'Sine.easeInOut');
    Audio.setLayer('alien', 1, 1.5);
    await this.wait(1500);
    await Dialogue.play(this, [
      { who: 'ben', mood: 'shocked', text: 'Look at it glow. That\'s not a weather balloon, Zeus. That\'s a SHIP.' },
      { who: 'ben', mood: 'talk', text: 'If Satoshi\'s real... that might be his ride home.' },
      { who: 'radio', mood: 'stern', text: '"Units entering Hangar 18 NOW."' },
      { who: 'ben', mood: 'smug', text: 'And that\'s our cue. Going DOWN.' },
    ]);
    // agents burst in; the lift drops
    for (let i = 0; i < 3; i++) {
      const a = this.add.sprite(1700 + i * 30, FLOOR, 'agent').setOrigin(0.5, 1).setDepth(8).play('agent_walk');
      this.tweens.add({ targets: a, x: 1840 + i * 10, duration: 900 });
    }
    Audio.sfx('alarm', { volume: 0.5 });
    Audio.sfx('clank');
    const lift = Audio.loop('elevator', { volume: 0.5 });
    this.tweens.add({ targets: [this.ben, this.zeus], y: FLOOR + 140, duration: 1600, ease: 'Quad.In' });
    await this.wait(1500);
    lift.stop(0.6);
    const time = (this.time.now - this.startTime) / 1000;
    goTo(this, 'Results', {
      chapter: 'ch4', sats: this.sats, coins: this.coins, coinsTotal: this.coinsTotal, golden: this.golden, time,
      clean: this.grabs === 0 && this.mistakes === 0, cleanLabel: 'FLAWLESS HACKER',
      stats: [['COINS', `${this.coins} / ${this.coinsTotal}`, 'text'], ['HACK MISTAKES', this.mistakes, 'num'], ['TIMES GRABBED', this.grabs, 'num']],
    }, { duration: 900 });
  }

  // ===========================================================================
  //  UPDATE
  // ===========================================================================
  update(time, delta) {
    const dt = delta / 1000;
    const ben = this.ben;
    const door = this.doors[this.section];

    if (!this.busy && !this.ended && !this.inHack) {
      // walk (blocked by the next closed door)
      const ax = Input.axisX;
      const maxX = door && !door.open ? door.x - 22 : WORLD - 40;
      ben.x = Phaser.Math.Clamp(ben.x + ax * CH4.WALK_SPEED * dt, 40, maxX);
      if (Math.abs(ax) > 0.2) ben.setFlipX(ax < 0);
      const anim = Math.abs(ax) > 0.2 && ben.x < maxX ? 'ben_run' : 'ben_idle';
      if (ben.anims.currentAnim?.key !== anim) ben.play(anim);
      if (anim === 'ben_run') { this.stepT = (this.stepT ?? 0) - delta; if (this.stepT <= 0) { this.stepT = 260; Audio.sfx('step_metal', { volume: 0.35, minGap: 0 }); } }

      // the timer
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeUp(); return; }

      // contextual buttons
      const nearTerm = door && !door.open && ben.x > door.x - 110;   // anywhere in front of the door
      const nearRack = !this.hasCard && Math.abs(ben.x - RACK.x) < 60;
      const agentNear = this.agents.some((a) => !a.stunned && Math.abs(a.x - ben.x) < CH4.BARK_RANGE);
      const bLabel = nearRack ? 'FETCH' : agentNear ? 'BARK' : 'SNIFF';
      if (bLabel !== this.lastB) { this.lastB = bLabel; Input.relabel('B', bLabel); }
      if (nearTerm) this.prompt.setText(door.needsCard && !this.hasCard ? 'NEEDS KEYCARD' : 'TAP USE TO HACK').setPosition(door.x - 64, FLOOR - 76).setVisible(true);
      else if (nearRack) this.prompt.setText('ZEUS: FETCH!').setPosition(RACK.x, FLOOR - 120).setVisible(true);
      else this.prompt.setVisible(false);
      if (Input.consume('A') && nearTerm) this.useTerminal(door);
      if (Input.consume('B')) {
        if (bLabel === 'FETCH') this.fetchCard();
        else if (bLabel === 'BARK') this.bark();
        else this.sniff();
      }
      this.updateAgents(time, dt);
    } else if (this.inHack && !this.ended) {
      this.timeLeft -= dt;                  // the clock keeps ticking while hacking!
      if (this.timeLeft <= 0) { this.timeUp(); return; }
    }

    this.updateZeus(dt);
    this.collect();
    this.updateHUD(time);
    // parallax + adaptive alien layer near the saucer
    const cam = this.cameras.main;
    this.far.tilePositionX = cam.scrollX * 0.45;
    this.farGlow.tilePositionX = this.far.tilePositionX;
    const nearSaucer = Math.abs(ben.x - SAUCER_X) < 260;
    if (nearSaucer !== this.alienOn && !this.ended) { this.alienOn = nearSaucer; Audio.setLayer('alien', nearSaucer ? 0.9 : 0.1, 1.5); }
    this.lighting.update(time);
  }

  updateHUD(time) {
    const t = Math.max(0, this.timeLeft ?? 0);
    const urgent = t < 20;
    this.timerText.setText(`AGENTS ARRIVE  ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
    this.timerText.setColor(urgent ? (Math.floor(time / 250) % 2 ? P.red : P.white) : P.cream);
    if (urgent !== this.dangerOn && !this.ended) {
      this.dangerOn = urgent;
      Audio.setLayer('drums', urgent ? 1 : 0, 0.5);
      Audio.setLayer('stab', urgent ? 1 : 0, 0.5);
      this.lighting.ambient = urgent ? 0x7a4a62 : 0x5a5e84;
    }
  }

  // ---------------------------------------------------------------------------
  //  Terminals & doors
  // ---------------------------------------------------------------------------
  async useTerminal(door) {
    if (door.needsCard && !this.hasCard) {
      Audio.sfx('denied');
      this.say(this.ben, 'Keycard reader. The card\'s on that high rack...');
      return;
    }
    this.inHack = true;
    this.ben.play('ben_idle');
    door.term.setFrame(1);
    const onMistake = () => { this.mistakes++; this.timeLeft -= CH4.HACK_MISTAKE_PENALTY; this.flashPenalty(CH4.HACK_MISTAKE_PENALTY); };
    const game = { wires, simon, mine }[door.hack];
    const ok = await game(this, { onMistake, registerAbort: (fn) => { this.abortHack = fn; } });
    this.abortHack = null;
    this.inHack = false;
    if (this.ended) return;
    if (!ok) { door.term.setFrame(0); return; }
    this.openDoor(door);
    this.sats += 50;
    this.satsText.setText(String(this.sats));
    if (door.i < DOORS.length - 1) {
      this.startSection(door.i + 1);
      this.toast(`DOOR ${door.i + 1} OPEN!  CLOCK RESET`, P.green1);
    } else this.finish();
  }

  openDoor(door, instant = false) {
    door.open = true;
    door.term.setFrame(1);
    door.lamp.setFillStyle(0x5dff9a);
    door.light.color = 0x5dff9a;
    door.light.pulse = null;
    door.tlight.color = 0x5dff9a;
    if (instant) { door.panel.y = FLOOR - 196; return; }
    Audio.sfx('door');
    shake(this, 300, 0.004);
    this.tweens.add({ targets: door.panel, y: FLOOR - 196, duration: 1400, ease: 'Quad.InOut' });
    const steam = this.add.particles(door.x, FLOOR - 4, 'mote', { lifespan: 1200, speedX: { min: -40, max: 40 }, speedY: { min: -30, max: -5 }, scale: { start: 0.8, end: 2.5 }, alpha: { start: 0.4, end: 0 }, tint: 0xc0c8d8, emitting: false }).setDepth(906);
    steam.explode(24);
    this.time.delayedCall(1500, () => steam.destroy());
  }

  async timeUp() {
    if (this.busy) return;
    this.busy = true;
    this.inHack = false;
    this.abortHack?.();                    // close any open hacking overlay cleanly
    this.abortHack = null;
    Input.configure({ mode: 'none' });
    Audio.sfx('alarm');
    const swarm = [];
    for (let i = 0; i < 4; i++) {
      const a = this.add.sprite(this.cameras.main.scrollX - 30 - i * 26, FLOOR, 'agent').setOrigin(0.5, 1).setDepth(8).play('agent_walk');
      swarm.push(a);
      this.tweens.add({ targets: a, x: this.ben.x - 20 - i * 18, duration: 1100 });
    }
    await this.wait(1200);
    Audio.sfx('caught');
    const t = headText(this, W / 2, H / 2 - 20, 'SURROUNDED!', 16, P.red).setScrollFactor(0).setDepth(HUD + 5);
    const l = bodyText(this, W / 2, H / 2 + 2, '"Hands where we can see them." ...try that door again.', 16, P.cream, { ox: 0.5 }).setScrollFactor(0).setDepth(HUD + 5);
    await this.wait(1600);
    this.cameras.main.fadeOut(350, 10, 10, 20);
    await this.wait(400);
    t.destroy(); l.destroy(); swarm.forEach((a) => a.destroy());
    this.agents.forEach((a) => a.destroy());
    this.agents = [];
    this.ben.x = SECTION_START[this.section];
    this.zeus.x = this.ben.x - 24;
    this.startSection(this.section);
    Input.configure({ mode: 'joystick', pause: true, buttons: [{ id: 'A', label: 'USE', style: 'a' }, { id: 'B', label: 'SNIFF', style: 'b', icon: 'glyph_paw' }] });
    this.lastB = null;
    this.cameras.main.fadeIn(400, 10, 10, 20);
    this.busy = false;
  }

  // ---------------------------------------------------------------------------
  //  Wandering agents
  // ---------------------------------------------------------------------------
  updateAgents(time, dt) {
    if (time > this.nextAgentAt) {
      this.nextAgentAt = time + CH4.AGENT_EVERY_MS * (0.8 + Math.random() * 0.4);
      const x = this.cameras.main.scrollX - 24;
      const a = this.add.sprite(x, FLOOR, 'agent').setOrigin(0.5, 1).setDepth(8).play('agent_walk');
      a.light = this.lighting.add({ follow: a, oy: -16, radius: 40, color: 0xbac8ff, intensity: 0.4 });
      this.agents.push(a);
      Audio.sfx('radio', { volume: 0.5, pan: -0.8 });
      this.say(a, Phaser.Utils.Array.GetRandom(['Freeze!', 'Hey! You!', 'Stop right there!']));
    }
    for (const a of [...this.agents]) {
      if (a.stunned) continue;
      if (a.leaving) {
        a.x -= 120 * dt;
        if (a.x < this.cameras.main.scrollX - 60) this.removeAgent(a);
        continue;
      }
      const dir = Math.sign(this.ben.x - a.x);
      a.x += dir * CH4.AGENT_SPEED * dt;
      a.setFlipX(dir < 0);
      if (Math.abs(a.x - this.ben.x) < 14) {
        // grabbed! lose time, then the agent is shrugged off
        this.grabs++;
        this.timeLeft -= CH4.AGENT_GRAB_PENALTY;
        this.flashPenalty(CH4.AGENT_GRAB_PENALTY);
        Audio.sfx('oof');
        shake(this, 200, 0.008);
        vibrate(50);
        this.say(this.ben, 'Hey! Hands off the hoodie!');
        a.leaving = true;
        a.play('agent_walk').setFlipX(true);
      }
    }
  }

  removeAgent(a) {
    this.lighting.remove(a.light);
    a.destroy();
    this.agents = this.agents.filter((x) => x !== a);
  }

  bark() {
    if (this.time.now - this.lastBark < CH4.BARK_COOLDOWN_MS) return;
    this.lastBark = this.time.now;
    const z = this.zeus;
    z.play('zeus_bark');
    z.once('animationcomplete', () => z.play('zeus_sit'));
    Audio.sfx('bark2');
    const ring = this.add.circle(z.x, z.y - 10, 6, hexNum(P.btc1), 0).setStrokeStyle(2, hexNum(P.btc1)).setDepth(907).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, radius: CH4.BARK_RANGE, alpha: 0, duration: 500, onUpdate: () => ring.setStrokeStyle(2, hexNum(P.btc1), ring.alpha), onComplete: () => ring.destroy() });
    for (const a of this.agents) {
      if (Math.abs(a.x - z.x) > CH4.BARK_RANGE || a.stunned) continue;
      a.stunned = true;
      a.play('agent_hurt');
      Audio.sfx('grunt', { pitch: 0.85, delay: 0.15 });
      const stars = [0, 1, 2].map(() => this.add.image(a.x, a.y - 36, 'star2').setTint(hexNum(P.btc1)).setDepth(908).setScale(1.5));
      const t0 = this.time.now;
      const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => {
        const t = (this.time.now - t0) / 1000;
        stars.forEach((s, i) => { const ang = t * 5 + (i * Math.PI * 2) / 3; s.setPosition(a.x + Math.cos(ang) * 9, a.y - 36 + Math.sin(ang) * 3); });
      } });
      this.time.delayedCall(stat('barkStun', CH4.BARK_STUN_MS), () => {
        ev.remove(); stars.forEach((s) => s.destroy());
        if (!a.active) return;
        a.stunned = false; a.leaving = true; a.play('agent_walk').setFlipX(true);
        this.say(a, 'That dog is... a lot.');
      });
      this.sats += 15; this.satsText.setText(String(this.sats));
    }
  }

  // ---------------------------------------------------------------------------
  //  Zeus
  // ---------------------------------------------------------------------------
  async fetchCard() {
    const z = this.zeus;
    if (z.state !== 'follow') return;
    z.state = 'fetch';
    this.busy = true;
    Audio.sfx('bark', { volume: 0.7 });
    // hop: floor -> crate shelf -> top of the rack, grab, and back down
    const hop = (x, y, dur) => new Promise((r) => {
      z.play('zeus_leap').setFlipX(x < z.x);
      const x0 = z.x, y0 = z.y, peak = Math.min(y0, y) - 30;
      const o = { t: 0 };
      this.tweens.add({
        targets: o, t: 1, duration: dur, onUpdate: () => {
          z.x = x0 + (x - x0) * o.t;
          z.y = (1 - o.t) * (1 - o.t) * y0 + 2 * (1 - o.t) * o.t * peak + o.t * o.t * y;
        }, onComplete: () => { Audio.sfx('land', { volume: 0.5 }); r(); },
      });
    });
    await hop(RACK.x - 20, FLOOR - 104, 420);
    await hop(RACK.x - 10, FLOOR - 164, 380);
    await hop(RACK.x + 8, RACK.top, 380);
    z.play('zeus_sniff');
    await this.wait(300);
    this.card.setVisible(false);
    this.lighting.remove(this.cardLight);
    Audio.sfx('jingle');
    await hop(RACK.x - 30, FLOOR - 104, 380);
    await hop(this.ben.x - 18, FLOOR, 460);
    z.play('zeus_sit');
    this.hasCard = true;
    this.cardIcon.setAlpha(1).setScale(2);
    this.tweens.add({ targets: this.cardIcon, scale: 1, duration: 300, ease: 'Back.Out' });
    Audio.sfx('ui_confirm');
    await Dialogue.play(this, [{ who: 'ben', mood: 'happy', text: 'Level 5 keycard! Who\'s the best boy? WHO\'S THE BEST BOY?!' }, { who: 'zeus', mood: 'excited', text: '*proud panting*' }]);
    Input.configure({ mode: 'joystick', pause: true, buttons: [{ id: 'A', label: 'USE', style: 'a' }, { id: 'B', label: 'SNIFF', style: 'b', icon: 'glyph_paw' }] });
    this.lastB = null;
    z.state = 'follow';
    this.busy = false;
  }

  sniff() {
    if (this.time.now - this.lastSniff < 1400) return;
    this.lastSniff = this.time.now;
    const z = this.zeus;
    z.play('zeus_sniff');
    this.time.delayedCall(700, () => z.state === 'follow' && z.play('zeus_sit'));
    Audio.sfx('sniff');
    const radius = stat('sniffRadius', CH4.SNIFF_RADIUS);
    const ring = this.add.circle(z.x, z.y - 6, 4, hexNum(P.cyan2), 0).setStrokeStyle(2, hexNum(P.cyan2)).setDepth(907).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, radius, alpha: 0, duration: 700, onUpdate: () => ring.setStrokeStyle(2, hexNum(P.cyan2), ring.alpha), onComplete: () => ring.destroy() });
    let found = false;
    for (const g of this.goldens) {
      if (g.hidden && Math.abs(g.x - z.x) < radius) {
        g.hidden = false; found = true;
        this.tweens.add({ targets: g, alpha: 1, duration: 500 });
        g.light = this.lighting.add({ x: g.x, y: g.y, radius: 40, color: 0xffc35c, intensity: 0.9, pulse: { speed: 4, amount: 0.3 } });
      }
    }
    if (found) Audio.sfx('sparkle', { count: 10 });
    else this.say(z, '*sniff* ...nothing here.');
  }

  updateZeus(dt) {
    const z = this.zeus;
    if (z.state !== 'follow') return;
    const tx = this.ben.x + (this.ben.flipX ? 22 : -22);
    const dx = tx - z.x;
    if (Math.abs(dx) > 8) {
      z.x += Math.sign(dx) * Math.min(Math.abs(dx), 140 * dt * (Math.abs(dx) > 60 ? 1.5 : 1));
      z.setFlipX(dx < 0);
      if (z.anims.currentAnim?.key !== 'zeus_trot') z.play('zeus_trot');
    } else if (!['zeus_sit', 'zeus_bark', 'zeus_sniff'].includes(z.anims.currentAnim?.key)) z.play('zeus_sit');
  }

  collect() {
    const bx = this.ben.x;
    for (const c of this.coinSprites) {
      if (!c.active || Math.abs(c.x - bx) > 10) continue;
      c.destroy();
      this.coins++;
      this.sats += ECONOMY.COIN_VALUE;
      this.satsText.setText(String(this.sats));
      Audio.sfx('coin', { combo: Math.min(10, this.coins % 7), minGap: 0 });
    }
    for (const g of this.goldens) {
      if (g.hidden || g.taken || Math.abs(g.x - bx) > 12) continue;
      g.taken = true;
      g.destroy();
      if (g.light) this.lighting.remove(g.light);
      this.golden[g.gid] = true;
      this.sats += ECONOMY.GOLDEN_VALUE;
      this.satsText.setText(String(this.sats));
      Audio.sfx('golden');
      vibrate(40);
      const slot = this.goldSlots[g.gid];
      slot.clearTint().setAlpha(1).setScale(2);
      this.tweens.add({ targets: slot, scale: 1, duration: 400, ease: 'Back.Out' });
      this.toast('GOLDEN BITCOIN!', P.btc1);
    }
  }

  // ---------------------------------------------------------------------------
  //  UI helpers
  // ---------------------------------------------------------------------------
  flashPenalty(s) {
    const t = headText(this, W / 2 + 120, 40, `-${s}s`, 8, P.red).setScrollFactor(0).setDepth(HUD + 1);
    this.tweens.add({ targets: t, y: 60, alpha: 0, duration: 900, onComplete: () => t.destroy() });
    this.timerBox.setStrokeStyle(2, hexNum(P.red));
    this.time.delayedCall(300, () => this.timerBox.setStrokeStyle(1, hexNum(P.red2)));
  }

  toast(text, color = P.cream) {
    const t = headText(this, W / 2, 90, text, 8, color).setScrollFactor(0).setDepth(HUD).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 84, duration: 200, hold: 1400, yoyo: true, onComplete: () => t.destroy() });
  }

  say(entity, text) {
    const t = bodyText(this, entity.x, entity.y - 40, text, 16, P.ink, { ox: 0.5, oy: 1, shadow: false }).setDepth(962);
    const bg = this.add.rectangle(t.x, t.y - t.height / 2, t.width + 8, t.height + 2, 0xfff6e0).setDepth(961).setStrokeStyle(1, 0x0b0a1a);
    this.tweens.add({ targets: [t, bg], alpha: 0, delay: 1400, duration: 300, onComplete: () => { t.destroy(); bg.destroy(); } });
  }

  wait(ms) { return new Promise((r) => this.time.delayedCall(ms, r)); }
}
