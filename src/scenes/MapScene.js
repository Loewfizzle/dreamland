// ============================================================================
//  CHAPTER MAP — the road atlas. Pins light up as chapters unlock; tap one to
//  see its card, then the little van drives the route there and the chapter
//  begins. Also the hub for THE VAN shop.
// ============================================================================
import Phaser from 'phaser';
import { GAME } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Save } from '../systems/save.js';
import { applyFilm } from '../systems/fx.js';
import { headText, bodyText, signButton, iconButton, goTo, fadeIn } from '../systems/ui.js';
import { CHAPTERS, chapterById } from '../data/chapters.js';
import { sampleRoute, HOME } from '../data/route.js';
import { isUnlocked, isDone, chapterRecord, nextChapter } from '../systems/progress.js';
import mapSong from '../audio/music/map.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const fmtTime = (t) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '--:--');

export default class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    fadeIn(this, 600);
    Input.configure({ mode: 'none' });
    Audio.playMusic(mapSong);
    Audio.playAmbience('desert_day');
    this.driving = false;

    this.add.image(0, 0, 'worldmap').setOrigin(0).setTint(0xf0d4d4);
    // dusk light: warm glow from the west, cool shade in the east
    this.add.image(40, 200, 'glow_soft').setScale(6, 5).setTint(hexNum(P.sky7)).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(620, 60, 'glow_soft').setScale(5, 4).setTint(0x4030a0).setAlpha(0.25).setBlendMode(Phaser.BlendModes.MULTIPLY);
    // drifting cloud shadows
    for (let i = 0; i < 4; i++) {
      const c = this.add.image(Phaser.Math.Between(0, W), Phaser.Math.Between(40, 320), 'glow_soft').setScale(2.6, 1.4).setTint(0x000000).setAlpha(0.12);
      this.tweens.add({ targets: c, x: c.x + 700, duration: 60000 + i * 9000, repeat: -1, onRepeat: () => { c.x = -150; } });
    }
    // UFO lights hovering over Groom Lake, naturally
    const ufo = this.add.image(450, 84, 'glow').setScale(0.25).setTint(hexNum(P.green2)).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ufo, x: 470, y: 78, alpha: 0.3, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // title cartouche
    const cart = this.add.image(90, 30, 'panel_wide').setScale(0.42, 0.34);
    void cart;
    headText(this, 90, 24, 'NEVADA', 8, P.btc);
    bodyText(this, 90, 36, 'ROAD ATLAS  -  ROUTE 375', 16, P.cream2, { ox: 0.5, oy: 0.5 });

    // route + van
    this.route = sampleRoute(18);
    this.stopIndex = {};
    this.route.forEach((p, i) => { if (p.stop) this.stopIndex[p.stop] = i; });
    const here = Save.data.mapPos && this.stopIndex[Save.data.mapPos] != null ? Save.data.mapPos : 'home';
    this.vanIdx = this.stopIndex[here];
    this.van = this.add.image(0, 0, 'van_top').setDepth(20);
    this.placeVan(this.vanIdx);
    this.dust = this.add.particles(0, 0, 'px2', {
      lifespan: 500, speed: { min: 4, max: 14 }, scale: { start: 1, end: 0 }, alpha: { start: 0.5, end: 0 },
      tint: hexNum(P.sand0), emitting: false,
    }).setDepth(19);

    // home marker
    this.add.image(HOME.x, HOME.y - 14, 'pin_dot').setScale(0.5).setTint(hexNum(P.cream));
    bodyText(this, HOME.x, HOME.y + 10, "BEN'S PLACE", 16, P.cream, { ox: 0.5 }).setScale(0.8);

    // chapter pins
    this.pins = CHAPTERS.map((ch) => this.makePin(ch));

    // HUD
    iconButton(this, 22, 340, 'back', () => goTo(this, 'Title'));
    this.vanBtn = signButton(this, 100, 340, 'THE VAN', () => goTo(this, 'VanShop'), { texture: 'sign_small', arrow: false });
    const wallet = this.add.container(W - 70, 22);
    const wb = this.add.rectangle(0, 0, 112, 20, hexNum(P.ink), 0.75).setStrokeStyle(1, hexNum(P.btc2));
    wallet.add([wb, this.add.image(-44, 0, 'glyph_btc'), headText(this, 6, 0, `${Save.data.sats}`, 8, P.cream)]);

    this.card = null;
    this.input.on('pointerup', (p, over) => { if (!over.length && this.card && !this.driving) this.closeCard(); });
    const start = nextChapter() ?? CHAPTERS.find((c) => c.scene);
    if (start) this.time.delayedCall(500, () => this.select(start.id));
    applyFilm(this, { vignette: 1.1 });
  }

  placeVan(idx) {
    const i = Phaser.Math.Clamp(idx, 0, this.route.length - 1);
    const i0 = Math.floor(i), f = i - i0;
    const a = this.route[i0], b = this.route[Math.min(this.route.length - 1, i0 + 1)];
    this.van.setPosition(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f - 3);
    const n = this.route[Math.min(this.route.length - 1, i0 + 1)], pr = this.route[Math.max(0, i0 - 1)];
    const ang = Math.atan2(n.y - pr.y, n.x - pr.x);
    this.van.rotation = ang;
  }

  makePin(ch) {
    const unlocked = isUnlocked(ch.id), done = isDone(ch.id), built = !!ch.scene;
    const c = this.add.container(ch.map.x, ch.map.y).setDepth(15);
    const color = done ? P.green1 : unlocked ? P.btc : built ? P.cream2 : '#7a6a8a';
    const glow = this.add.image(0, 0, 'glow').setScale(0.6).setTint(hexNum(color)).setAlpha(unlocked ? 0.7 : 0.2).setBlendMode(Phaser.BlendModes.ADD);
    const ring = this.add.image(0, 0, 'pin_ring').setTint(hexNum(color));
    const dot = this.add.image(0, 0, 'pin_dot').setScale(0.6).setTint(hexNum(unlocked ? P.white : '#5a4a6a'));
    const num = headText(this, 0, 1, String(ch.num), 8, unlocked ? P.ink : P.cream2, { shadow: false }).setScale(0.75);
    c.add([glow, ring, dot, num]);
    if (!unlocked) c.add(this.add.image(8, -8, 'icon_lock').setScale(0.8));
    if (done) {
      const rec = chapterRecord(ch.id);
      for (let i = 0; i < 3; i++) c.add(this.add.image(-8 + i * 8, 13, 'rating_star').setScale(0.35).setTint(i < rec.stars ? hexNum(P.btc1) : 0x3a3458));
    }
    if (unlocked && !done) this.tweens.add({ targets: glow, scale: 0.9, alpha: 0.35, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    c.setSize(36, 36).setInteractive({ useHandCursor: true });   // generous touch target
    c.on('pointerup', () => { if (!this.driving) this.select(ch.id); });
    c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.15, duration: 120 }));
    c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 120 }));
    c.ch = ch;
    return c;
  }

  select(id) {
    const ch = chapterById(id);
    Audio.sfx('ui_click');
    this.selected = id;
    this.card?.destroy();
    const unlocked = isUnlocked(id), built = !!ch.scene, rec = chapterRecord(id);
    // place the card on the side away from the pin
    // fixed spot in the empty bottom-right corner of the map, so it never covers a pin
    const card = this.add.container(432, 290).setDepth(50);
    const bg = this.add.image(0, 0, 'panel').setScale(0.88, 0.56);
    card.add(bg);
    card.add(headText(this, 0, -54, `CHAPTER ${ch.num}`, 8, P.cyan1));
    const t = headText(this, 0, -38, ch.title, 8, P.btc);
    if (t.width > 240) t.setScale(240 / t.width);
    card.add(t);
    card.add(bodyText(this, 0, -24, ch.place, 16, P.cream2, { ox: 0.5 }));
    card.add(bodyText(this, 0, -6, ch.blurb, 16, P.white, { ox: 0.5, wrap: 230, align: 'center', lineSpacing: -3 }));
    if (rec) {
      for (let i = 0; i < 3; i++) card.add(this.add.image(-64 + i * 16, 30, 'rating_star').setScale(0.55).setTint(i < rec.stars ? hexNum(P.btc1) : 0x3a3458));
      for (let i = 0; i < 3; i++) card.add(this.add.image(4 + i * 14, 30, 'golden', 0).setScale(0.6).setAlpha(rec.golden?.[i] ? 1 : 0.25));
      card.add(bodyText(this, 50, 30, fmtTime(rec.bestTime), 16, P.cream2, { oy: 0.5 }));
    }
    let btn;
    if (!built) btn = headText(this, 0, 52, 'UNDER CONSTRUCTION', 8, P.cream2);
    else if (!unlocked) btn = headText(this, 0, 52, 'LOCKED', 8, P.cream2);
    else btn = signButton(this, 0, 52, isDone(id) ? 'REPLAY' : 'PLAY', () => this.driveTo(id), { texture: 'sign_orange', arrow: true });
    card.add(btn);
    card.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 200, ease: 'Back.Out' });
    const close = headText(this, 120, -54, 'X', 8, P.cream).setInteractive({ useHandCursor: true });
    close.on('pointerup', () => this.closeCard());
    card.add(close);
    this.card = card;
    this.pins.forEach((p) => p.list[1].setScale(p.ch.id === id ? 1.25 : 1));
  }

  closeCard() {
    if (!this.card) return;
    Audio.sfx('ui_back');
    this.card.destroy();
    this.card = null;
    this.pins.forEach((p) => p.list[1].setScale(1));
  }

  driveTo(id) {
    if (this.driving) return;
    this.driving = true;
    const target = this.stopIndex[id];
    const from = this.vanIdx;
    const ch = chapterById(id);
    this.card?.destroy();
    Audio.sfx('ui_confirm');
    const engine = Audio.loop('engine', { volume: 0.35 });
    engine.set({ rpm: 0.6 });
    const dist = Math.abs(target - from);
    const o = { i: from };
    this.tweens.add({
      targets: o, i: target, duration: Math.max(600, dist * 28), ease: 'Sine.InOut',
      onUpdate: () => {
        this.placeVan(o.i);
        if (target < from) this.van.rotation += Math.PI;
        if (Math.random() < 0.5) this.dust.explode(1, this.van.x, this.van.y + 2);
      },
      onComplete: () => {
        engine.stop(0.4);
        Audio.sfx('jingle', { volume: 0.5 });
        Save.data.mapPos = id;
        Save.persist();
        this.vanIdx = target;
        this.cameras.main.zoomTo(2.2, 700, 'Sine.easeIn');
        this.cameras.main.pan(ch.map.x, ch.map.y, 700, 'Sine.easeIn');
        this.time.delayedCall(350, () => goTo(this, ch.scene, {}, { duration: 400 }));
      },
    });
  }
}
