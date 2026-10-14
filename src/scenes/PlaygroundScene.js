// ============================================================================
//  TEST RANGE (Milestone 1 sandbox) — try the controls on your phone:
//  run/jump with Ben, Zeus follows, BARK and SNIFF, collect sats (combo
//  pitch-up chime + fly-to-HUD), sniff out a hidden golden bitcoin.
//  Replaced by the real chapter flow in Milestone 2.
// ============================================================================
import Phaser from 'phaser';
import { GAME, ECONOMY } from '../config.js';
import { P, hexNum } from '../art/palette.js';
import { Audio } from '../systems/audio.js';
import { Input } from '../systems/input.js';
import { applyFilm, shake, vibrate } from '../systems/fx.js';
import { headText, bodyText, goTo, fadeIn } from '../systems/ui.js';
import BenSide from '../entities/BenSide.js';
import ZeusSide from '../entities/ZeusSide.js';
import titleSong from '../audio/music/title.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;
const WORLD_W = 1800;
const GROUND_Y = 322;

export default class PlaygroundScene extends Phaser.Scene {
  constructor() { super('Playground'); }

  create() {
    fadeIn(this, 600);
    this.physics.world.setBounds(0, 0, WORLD_W, H);
    this.cameras.main.setBounds(0, 0, WORLD_W, H);
    Input.configure({
      mode: 'joystick', pause: true,
      buttons: [
        { id: 'A', label: 'JUMP', style: 'a' },
        { id: 'B', label: 'BARK', style: 'b', icon: 'glyph_paw' },
        { id: 'C', label: 'SNIFF', style: 'c' },
      ],
    });
    Audio.playMusic(titleSong);
    Audio.playAmbience('desert_day');

    this.buildBackdrop();
    this.buildLevel();

    this.ben = new BenSide(this, 120, GROUND_Y).setDepth(20);
    this.zeus = new ZeusSide(this, 90, GROUND_Y + 1, this.ben).setDepth(19);
    this.physics.add.collider(this.ben, this.solids);
    this.cameras.main.startFollow(this.ben, true, 0.09, 0.09, 0, 40);
    this.cameras.main.setDeadzone(40, 60);

    this.buildCoins();
    this.buildHUD();
    applyFilm(this, { vignette: 1.0 });

    const onPause = () => goTo(this, 'Title');
    Input.events.on('pause', onPause);
    this.events.once('shutdown', () => Input.events.off('pause', onPause));
  }

  buildBackdrop() {
    const tile = (key, y, factor, depth, tint) => {
      const t = this.add.tileSprite(0, y, W, this.textures.get(key).getSourceImage().height, key).setOrigin(0).setScrollFactor(0).setDepth(depth);
      if (tint) t.setTint(tint);
      t.factor = factor;
      return t;
    };
    this.add.image(0, -20, 'sky_sunset').setOrigin(0).setScrollFactor(0).setDepth(0);
    this.add.image(470, 210, 'glow').setScrollFactor(0).setDepth(1).setScale(4).setTint(hexNum(P.sun3)).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(470, 214, 'sun').setScrollFactor(0.02, 0).setDepth(1);
    this.layers = [
      tile('cloud_c', 70, 0.03, 2), tile('range_far', 178, 0.06, 3),
      tile('mesa_mid', 150, 0.12, 4), tile('mesa_near', 186, 0.22, 5), tile('ridge', 236, 0.4, 6),
    ];
    this.layers[0].setAlpha(0.8);
    this.add.image(W / 2, 228, 'glow_soft').setScrollFactor(0).setDepth(5.5).setScale(9, 0.8).setTint(hexNum(P.sky7)).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    // the ground scrolls 1:1 with the world
    this.ground = this.add.tileSprite(0, GROUND_Y - 8, WORLD_W, 90, 'floor').setOrigin(0).setDepth(10);
    // heat shimmer & dust drifting through
    this.add.particles(0, 0, 'mote', {
      x: { min: 0, max: W }, y: { min: 120, max: H }, lifespan: 6000, speedX: { min: 8, max: 20 }, speedY: { min: -3, max: 3 },
      scale: { min: 0.3, max: 0.7 }, alpha: { onEmit: () => 0, onUpdate: (p, k, t) => Math.sin(t * Math.PI) * 0.5 },
      tint: [hexNum(P.sky8), hexNum(P.sun1)], frequency: 180, blendMode: 'ADD',
    }).setScrollFactor(0).setDepth(30);
  }

  buildLevel() {
    this.solids = this.physics.add.staticGroup();
    const floor = this.add.rectangle(WORLD_W / 2, GROUND_Y + 20, WORLD_W, 40).setVisible(false);
    this.solids.add(floor);
    const ledges = [[360, 280], [520, 246], [690, 214], [980, 270], [1180, 236], [1420, 280]];
    for (const [x, y] of ledges) {
      const l = this.add.image(x, y, 'ledge').setDepth(15);
      this.physics.add.existing(l, true);
      l.body.setSize(60, 8).setOffset(2, 1);
      this.solids.add(l);
    }
    // props
    for (const [x, k] of [[260, 'cactus'], [820, 'joshua_med'], [1300, 'cactus'], [1600, 'joshua_med']]) {
      this.add.image(x, GROUND_Y + 2, k).setOrigin(0.5, 1).setDepth(12);
    }
    this.add.image(1700, GROUND_Y + 2, 'van').setOrigin(0.5, 1).setDepth(12);
    headText(this, 1700, GROUND_Y - 74, 'END OF\nTEST RANGE', 8, P.cream).setDepth(13);
  }

  buildCoins() {
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    const spots = [];
    for (let x = 200; x < 1600; x += 46) spots.push([x, GROUND_Y - 14 - (Math.sin(x / 90) > 0.6 ? 22 : 0)]);
    for (const [x, y] of [[360, 262], [520, 228], [690, 196], [980, 252], [1180, 218], [1420, 262]]) spots.push([x - 12, y], [x + 12, y]);
    for (const [x, y] of spots) {
      const c = this.coins.create(x, y, 'coin').play({ key: 'coin_spin', startFrame: Phaser.Math.Between(0, 7) }).setDepth(16);
      c.body.setCircle(6);
      this.tweens.add({ targets: c, y: y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: Phaser.Math.Between(0, 900) });
    }
    // hidden golden bitcoin: only Zeus's nose can find it
    this.golden = this.physics.add.sprite(1090, GROUND_Y - 30, 'golden').play('golden_spin').setDepth(16).setAlpha(0);
    this.golden.body.setAllowGravity(false);
    this.golden.hidden = true;
    this.goldenGlow = this.add.image(this.golden.x, this.golden.y, 'glow').setTint(hexNum(P.btc1)).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(15);

    this.combo = 0;
    this.comboTimer = 0;
    this.sats = 0;
    this.physics.add.overlap(this.ben, this.coins, (_, coin) => this.collect(coin));
    this.physics.add.overlap(this.ben, this.golden, () => this.collectGolden());

    this.sparks = this.add.particles(0, 0, 'px1', {
      lifespan: 500, speed: { min: 30, max: 90 }, scale: 1, alpha: { start: 1, end: 0 },
      tint: [hexNum(P.btc0), hexNum(P.btc1), hexNum(P.white)], blendMode: 'ADD', emitting: false,
    }).setDepth(25);
  }

  buildHUD() {
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
    const plate = this.add.rectangle(10, 9, 74, 18, hexNum(P.ink), 0.7).setOrigin(0).setStrokeStyle(1, hexNum(P.btc2));
    this.hudIcon = this.add.image(22, 18, 'glyph_btc').setScale(1.4);
    this.hudText = headText(this, 36, 18, '0', 8, P.cream, { ox: 0 });
    hud.add([plate, this.hudIcon, this.hudText]);
    const touch = this.sys.game.device.input.touch;
    const hint = touch ? 'JOYSTICK: MOVE    JUMP / BARK / SNIFF: RIGHT THUMB' : 'ARROWS/WASD: MOVE   SPACE: JUMP   E: BARK   SHIFT: SNIFF   ESC: TITLE';
    const t = bodyText(this, W / 2, 40, 'TEST RANGE  -  ' + hint, 16, P.cream, { ox: 0.5 }).setScrollFactor(0).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, delay: 6000, duration: 1000 });
    const tip = bodyText(this, W / 2, 56, 'Psst... Zeus can SNIFF out hidden golden bitcoins.', 16, P.cyan1, { ox: 0.5 }).setScrollFactor(0).setDepth(100);
    this.tweens.add({ targets: tip, alpha: 0, delay: 8000, duration: 1000 });
  }

  collect(coin) {
    if (!coin.active) return;
    coin.disableBody(true, false);
    this.combo = Math.min(10, this.combo + 1);
    this.comboTimer = 1300;
    Audio.sfx('coin', { combo: this.combo - 1, pan: Audio.panFor(coin.x, this.cameras.main), minGap: 0 });
    this.sparks.explode(8, coin.x, coin.y);
    this.flyToHud(coin, ECONOMY.COIN_VALUE);
  }

  /** Coin pops up, then arcs into the HUD counter (screen space). */
  flyToHud(obj, value) {
    const cam = this.cameras.main;
    const sx = obj.x - cam.scrollX, sy = obj.y - cam.scrollY;
    if (obj === this.golden) obj.setVisible(false); else obj.destroy();
    const f = this.add.sprite(sx, sy, obj.texture.key).play(`${obj.texture.key}_spin`).setScrollFactor(0).setDepth(101);
    this.tweens.add({ targets: f, y: sy - 16, scale: 1.4, duration: 160, ease: 'Quad.Out', onComplete: () => {
      this.tweens.add({ targets: f, x: this.hudIcon.x, y: this.hudIcon.y, scale: 0.7, duration: 420, ease: 'Cubic.In', onComplete: () => {
        f.destroy();
        this.sats += value;
        this.hudText.setText(String(this.sats));
        this.tweens.killTweensOf(this.hudIcon);
        this.hudIcon.setScale(2);
        this.tweens.add({ targets: this.hudIcon, scale: 1.4, duration: 200, ease: 'Back.Out' });
      } });
    } });
  }

  collectGolden() {
    if (this.golden.hidden || !this.golden.active) return;
    this.golden.disableBody(true, false);
    Audio.sfx('golden');
    shake(this, 160, 0.004);
    vibrate(40);
    this.sparks.explode(30, this.golden.x, this.golden.y);
    this.goldenGlow.destroy();
    const msg = headText(this, W / 2, 110, 'GOLDEN BITCOIN!', 16, P.btc1).setScrollFactor(0).setDepth(110).setScale(0);
    this.tweens.add({ targets: msg, scale: 1, duration: 400, ease: 'Back.Out', hold: 900, yoyo: true, onComplete: () => msg.destroy() });
    this.flyToHud(this.golden, ECONOMY.GOLDEN_VALUE);
  }

  update(time, delta) {
    this.ben.update(time, delta);
    this.zeus.update(time, delta);
    if (Input.consume('B')) this.zeus.bark(() => shake(this, 80, 0.002));
    if (Input.consume('C')) {
      this.zeus.sniff(140, (x, y, r) => {
        if (this.golden.hidden && Phaser.Math.Distance.Between(x, y, this.golden.x, this.golden.y) < r + 60) {
          this.golden.hidden = false;
          this.tweens.add({ targets: [this.golden], alpha: 1, duration: 600 });
          this.tweens.add({ targets: this.goldenGlow, alpha: 0.7, duration: 600 });
          this.tweens.add({ targets: this.goldenGlow, scale: 1.3, duration: 700, yoyo: true, repeat: -1 });
          Audio.sfx('sparkle', { count: 10 });
          this.time.delayedCall(700, () => this.zeus.bark());
        }
      });
    }
    if (this.comboTimer > 0) { this.comboTimer -= delta; if (this.comboTimer <= 0) this.combo = 0; }
    // parallax
    const sx = this.cameras.main.scrollX;
    for (const l of this.layers) l.tilePositionX = sx * l.factor;
    // a hint of golden glow even before it's found
    if (this.golden.hidden) this.goldenGlow.setAlpha(0.06 + Math.sin(time / 300) * 0.04);
  }
}
