// ============================================================================
//  THE VAN — shop between chapters. Spend sats on upgrades for Ben and Zeus
//  and on cosmetics that visibly change their look (and the van's paint).
// ============================================================================
import Phaser from 'phaser';
import { GAME, SHOP } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { Save } from '../systems/save.js';
import { applyFilm, shake, vibrate } from '../systems/fx.js';
import { headText, bodyText, signButton, goTo, fadeIn } from '../systems/ui.js';
import {
  upgradeLevel, buyUpgrade, ownsCosmetic, buyCosmetic, toggleCosmetic, applyCosmetics,
} from '../systems/progress.js';
import mapSong from '../audio/music/map.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const TABS = [
  { id: 'ben', label: 'BEN' },
  { id: 'zeus', label: 'ZEUS' },
  { id: 'gear', label: 'GEAR' },
  { id: 'van', label: 'VAN' },
];
const QUIPS = {
  buy: ['Investing in the mission.', 'Worth every sat.', 'HODL? Nah. This is an emergency.', 'Zeus approves.'],
  broke: ['Need more sats, buddy.', 'Wallet says no.', "We're gonna need a bigger stack."],
};

export default class VanShopScene extends Phaser.Scene {
  constructor() { super('VanShop'); }

  create() {
    fadeIn(this, 500);
    Input.configure({ mode: 'none' });
    Audio.playMusic(mapSong);
    Audio.stopAmbience(1);
    this.tab = 'ben';

    this.add.image(0, 0, 'van_interior').setOrigin(0).setTint(0xd8c0c0);
    this.add.image(0, 0, 'van_interior_glow').setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    // warm lamp + lava lamp glow + string light shimmer
    this.add.image(200, 200, 'glow_soft').setScale(5, 3.5).setTint(0xffb070).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD);
    const lava = this.add.image(408, 175, 'glow').setScale(0.8).setTint(hexNum(P.green2)).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: lava, alpha: 0.2, scale: 0.65, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    for (let x = 28; x < W; x += 56) {
      const b = this.add.image(x, 64 + Math.sin((x / W) * Math.PI * 3) * 6, 'glow').setScale(0.22).setTint([0xffb347, 0xff6a8a, 0x7ff8ff, 0x9dff8a][(x / 28) % 4 | 0]).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: b, alpha: 0.2, duration: 600 + (x % 5) * 200, yoyo: true, repeat: -1 });
    }

    this.buildCharacters();
    this.buildPanel();

    const exit = signButton(this, 110, H - 22, 'HIT THE ROAD', () => goTo(this, 'Map'), { texture: 'sign_orange', arrow: true });
    exit.setDepth(60);
    this.add.rectangle(120, 27, 210, 40, hexNum(P.ink), 0.8).setStrokeStyle(1, hexNum(P.btc2)).setDepth(59);
    headText(this, 120, 18, 'THE VAN', 16, P.btc).setDepth(60);
    bodyText(this, 120, 34, 'Upgrades & style. No refunds.', 16, P.cream2, { ox: 0.5 }).setDepth(60);
    applyFilm(this, { vignette: 1.2 });
  }

  // Ben standing by the counter, Zeus snoozing on his blanket.
  buildCharacters() {
    this.chars?.forEach((c) => c.destroy());
    this.zeus = this.add.sprite(188, 302, 'zeus').setOrigin(0.5, 1).play('zeus_lie').setScale(2).setDepth(20);
    this.ben = this.add.sprite(300, 300, 'ben').setOrigin(0.5, 1).play('ben_idle').setScale(2).setDepth(20).setFlipX(true);
    this.zeus.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      Audio.sfx(Math.random() < 0.5 ? 'boof' : 'pant', { volume: 0.8 });
      this.zeus.play('zeus_sit');
      this.time.delayedCall(1400, () => this.zeus.active && this.zeus.play('zeus_lie'));
    });
    // Zs while he sleeps
    this.zTimer?.remove();
    this.zTimer = this.time.addEvent({
      delay: 1600, loop: true, callback: () => {
        if (this.zeus.anims.currentAnim?.key !== 'zeus_lie') return;
        const z = headText(this, this.zeus.x + 18, this.zeus.y - 30, 'z', 8, P.cream).setDepth(21);
        this.tweens.add({ targets: z, y: z.y - 20, x: z.x + 8, alpha: 0, duration: 1500, onComplete: () => z.destroy() });
      },
    });
    this.chars = [this.zeus, this.ben];
  }

  buildPanel() {
    this.panel?.destroy();
    const px = 470, py = 182;
    const panel = this.add.container(px, py).setDepth(50);
    panel.add(this.add.image(0, 0, 'panel').setScale(1.0, 1.32));
    // wallet
    panel.add(this.add.image(-118, -136, 'glyph_btc'));
    this.walletText = headText(this, -108, -136, `${Save.data.sats}`, 8, P.cream, { ox: 0 });
    panel.add(this.walletText);
    panel.add(headText(this, 112, -136, 'SATS', 8, P.cream2, { ox: 1 }));
    // tabs
    TABS.forEach((t, i) => {
      const x = -108 + i * 72, y = -114;
      const active = t.id === this.tab;
      const tb = this.add.rectangle(x, y, 66, 16, hexNum(active ? P.btc : P.ink3)).setStrokeStyle(1, hexNum(active ? P.btc1 : P.ink4));
      const tt = headText(this, x, y, t.label, 8, active ? P.ink : P.cream2, { shadow: false });
      tb.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (this.tab !== t.id) { Audio.sfx('ui_click'); this.tab = t.id; this.buildPanel(); } });
      panel.add([tb, tt]);
    });
    // rows
    const items = this.itemsForTab();
    items.forEach((it, i) => this.buildRow(panel, it, -86 + i * 36));
    this.panel = panel;
  }

  itemsForTab() {
    if (this.tab === 'ben' || this.tab === 'zeus') return SHOP.upgrades.filter((u) => u.who === this.tab).map((u) => ({ kind: 'up', def: u }));
    if (this.tab === 'gear') return SHOP.cosmetics.filter((c) => c.slot !== 'van').map((c) => ({ kind: 'cos', def: c }));
    return SHOP.cosmetics.filter((c) => c.slot === 'van').map((c) => ({ kind: 'cos', def: c }));
  }

  buildRow(panel, it, y) {
    const d = it.def;
    const row = this.add.container(0, y);
    row.add(this.add.rectangle(0, 0, 268, 32, hexNum(P.ink), 0.45).setStrokeStyle(1, hexNum(P.ink4)));
    if (it.kind === 'up') {
      const lvl = upgradeLevel(d.id), max = d.prices.length;
      row.add(headText(this, -126, -7, d.name, 8, P.cream, { ox: 0 }));
      row.add(bodyText(this, -126, 3, d.desc, 16, P.cream2, { ox: 0 }).setScale(0.8));
      for (let k = 0; k < max; k++) row.add(this.add.rectangle(70 + k * 9, -7, 6, 6, hexNum(k < lvl ? P.green1 : P.ink4)));
      if (lvl >= max) row.add(headText(this, 104, 4, 'MAX', 8, P.green1, { ox: 0.5 }));
      else this.priceButton(row, d.prices[lvl], () => this.purchase(() => buyUpgrade(d.id), d.prices[lvl]));
    } else {
      const owned = ownsCosmetic(d.id);
      const isEq = Save.data.cosmetics.equipped[d.slot] === d.id;
      const sw = d.color ? hexNum(d.color) : { sunset: 0xf07a50, alien: 0x7fe08a, stealth: 0x4a4a60 }[d.paint];
      row.add(this.add.rectangle(-116, 0, 14, 14, sw).setStrokeStyle(1, hexNum(P.white)));
      row.add(headText(this, -102, -6, d.name, 8, P.cream, { ox: 0 }));
      row.add(bodyText(this, -102, 3, d.slot === 'van' ? 'Fresh paint for the van.' : d.slot === 'cap' ? 'Tinfoil lining included.' : 'Zeus looks dashing.', 16, P.cream2, { ox: 0 }).setScale(0.8));
      if (!owned) this.priceButton(row, d.price, () => this.purchase(() => buyCosmetic(d.id), d.price, true));
      else {
        const b = this.add.rectangle(104, 0, 52, 18, hexNum(isEq ? P.green4 : P.ink3)).setStrokeStyle(1, hexNum(isEq ? P.green1 : P.cream2));
        const t = headText(this, 104, 0, isEq ? 'ON' : 'WEAR', 8, isEq ? P.green1 : P.cream, { shadow: false });
        b.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          toggleCosmetic(d.id);
          Audio.sfx('ui_toggle', { on: !isEq });
          this.refreshLooks();
        });
        row.add([b, t]);
      }
    }
    panel.add(row);
  }

  priceButton(row, price, onBuy) {
    const can = Save.data.sats >= price;
    const b = this.add.rectangle(104, 4, 56, 18, hexNum(can ? P.btc2 : P.ink3)).setStrokeStyle(1, hexNum(can ? P.btc1 : P.ink4));
    const t = headText(this, 104, 4, String(price), 8, can ? P.white : P.cream2, { shadow: false });
    b.setInteractive({ useHandCursor: true });
    b.on('pointerdown', () => this.tweens.add({ targets: [b, t], scale: 0.9, duration: 60, yoyo: true }));
    b.on('pointerup', onBuy);
    row.add([b, t]);
  }

  purchase(fn, price, isCosmetic = false) {
    if (!fn()) {
      Audio.sfx('denied');
      shake(this, 120, 0.004);
      this.say(Phaser.Utils.Array.GetRandom(QUIPS.broke));
      return;
    }
    Audio.sfx('cash');
    vibrate(30);
    const burst = this.add.particles(470, 46, 'coin', { speed: { min: 60, max: 160 }, angle: { min: 200, max: 340 }, gravityY: 300, lifespan: 900, scale: { start: 1, end: 0.6 }, emitting: false }).setDepth(70);
    burst.explode(10);
    this.say(Phaser.Utils.Array.GetRandom(QUIPS.buy));
    if (isCosmetic) this.refreshLooks();
    else this.buildPanel();
    // Zeus wakes up excited for a second
    this.zeus.play('zeus_sit');
    Audio.sfx('bark', { volume: 0.6, delay: 0.3 });
    this.time.delayedCall(1300, () => this.zeus.active && this.zeus.play('zeus_lie'));
    void price;
  }

  /** Regenerate sprites with the new cap/bandana/paint and rebuild the view. */
  refreshLooks() {
    this.chars.forEach((c) => c.destroy());
    applyCosmetics(this);
    this.buildCharacters();
    this.buildPanel();
    if (this.tab === 'van') {
      this.vanPreview?.destroy();
      this.vanPreview = this.add.image(150, 240, 'van').setScale(1).setDepth(25).setAlpha(0);
      this.tweens.add({ targets: this.vanPreview, alpha: 1, duration: 200, hold: 1600, yoyo: true });
    }
  }

  say(text) {
    this.bubble?.destroy();
    const t = bodyText(this, this.ben.x, this.ben.y - 76, text, 16, P.ink, { ox: 0.5, oy: 1, shadow: false });
    const bg = this.add.rectangle(t.x, t.y - t.height / 2, t.width + 10, t.height + 4, hexNum(P.white)).setStrokeStyle(1, hexNum(P.ink));
    this.bubble = this.add.container(0, 0, [bg, t]).setDepth(61);
    this.tweens.add({ targets: this.bubble, alpha: 0, delay: 1800, duration: 300, onComplete: () => { this.bubble?.destroy(); this.bubble = null; } });
  }
}
