// ============================================================================
//  CONTROLS OVERLAY — always running on top of gameplay scenes.
//  Reads the keyboard, draws the touch joystick/buttons, feeds `Input`.
//  Lives in its own scene so camera shake/zoom in chapters never moves it.
// ============================================================================
import Phaser from 'phaser';
import { GAME, CONTROLS } from '../config.js';
import { Input } from '../systems/input.js';
import { Save } from '../systems/save.js';
import { vibrate } from '../systems/fx.js';
import { headText, iconButton } from '../systems/ui.js';
import { P } from '../art/palette.js';

const W = GAME.WIDTH, H = GAME.HEIGHT;

export default class ControlsScene extends Phaser.Scene {
  constructor() { super({ key: 'Controls', active: false }); }

  create() {
    this.input.addPointer(3);
    this.isTouch = this.sys.game.device.input.touch;
    this.root = this.add.container(0, 0).setDepth(1000);
    this.joyPointer = null;
    this.btnPointers = new Map();     // pointerId -> button id
    this.buttons = {};

    this.setupKeyboard();
    this.input.on('pointerdown', (p) => this.onDown(p));
    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', (p) => this.onUp(p));
    this.input.on('pointerupoutside', (p) => this.onUp(p));

    Input.events.on('layout', () => this.build(), this);
    Input.events.on('relabel', (id, label) => { this.buttons[id]?.label?.setText(label); }, this);
    Save.onSettingChange((k) => { if (k === 'controlSize' || k === 'controlOpacity') this.build(); });
    this.build();
  }

  setupKeyboard() {
    const kb = this.input.keyboard;
    if (!kb) return;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, a: K.A, s: K.S, d: K.D,
      A1: K.SPACE, A2: K.J, A3: K.Z,
      B1: K.E, B2: K.K, B3: K.X,
      C1: K.SHIFT, C2: K.L, C3: K.C,
      P1: K.ESC, P2: K.P,
    }, false);
    kb.on('keydown', (ev) => {
      if (this.lastDevice !== 'keyboard') { this.lastDevice = 'keyboard'; this.setTouchVisible(false); }
      const code = ev.keyCode;
      const map = { [K.SPACE]: 'A', [K.J]: 'A', [K.Z]: 'A', [K.E]: 'B', [K.K]: 'B', [K.X]: 'B', [K.SHIFT]: 'C', [K.L]: 'C', [K.C]: 'C', [K.ESC]: 'PAUSE', [K.P]: 'PAUSE' };
      if (map[code] && !ev.repeat) Input.press(map[code]);
    });
  }

  // ---------------------------------------------------------------------------
  // Build the touch layout for the current scene
  // ---------------------------------------------------------------------------
  build() {
    this.root.removeAll(true);
    this.buttons = {};
    this.joy = null;
    this.steer = null;
    this.pauseBtn?.destroy();
    this.pauseBtn = null;
    const L = Input.layout;
    const size = Save.settings.controlSize;
    const alpha = Save.settings.controlOpacity;

    if (L.pause) {
      this.pauseBtn = iconButton(this, W - 20, 20, 'pause', () => Input.press('PAUSE'), { depth: 1001 });
    }
    if (L.mode === 'none' || L.mode === 'tap') { this.root.setVisible(false); return; }

    if (L.mode === 'joystick') {
      const home = { x: 74, y: H - 74 };
      const base = this.add.image(home.x, home.y, 'pad_base').setScale(size);
      const knob = this.add.image(home.x, home.y, 'pad_knob').setScale(size);
      this.root.add([base, knob]);
      this.joy = { base, knob, home, radius: CONTROLS.JOYSTICK_RADIUS * size };
    } else if (L.mode === 'steer') {
      const mk = (x, dir) => {
        const b = this.add.image(x, H - 56, 'btn_small').setScale(2.4 * size);
        const t = headText(this, x, H - 56, dir < 0 ? '<' : '>', 16, P.white);
        this.root.add([b, t]);
        return { b, t, x, dir };
      };
      this.steer = { left: mk(58, -1), right: mk(140, 1), pointers: new Map() };
    }

    // action buttons, arranged in an arc for the right thumb
    const slots = [
      { x: W - 54, y: H - 58 },
      { x: W - 118, y: H - 36 },
      { x: W - 46, y: H - 124 },
    ];
    L.buttons.forEach((def, i) => {
      const s = slots[i];
      const img = this.add.image(s.x, s.y, `btn_${def.style ?? def.id.toLowerCase()}`).setScale(size);
      const label = headText(this, s.x, s.y + (def.icon ? 9 : 0), def.label ?? def.id, 8, P.white);
      if (def.label && def.label.length > 4) label.setScale(0.75);
      const parts = [img, label];
      let icon = null;
      if (def.icon) { icon = this.add.image(s.x, s.y - 5, def.icon).setScale(size); parts.push(icon); }
      this.root.add(parts);
      this.buttons[def.id] = { img, label, icon, x: s.x, y: s.y, r: CONTROLS.BUTTON_RADIUS * size * 1.25 };
    });

    this.root.setAlpha(alpha);
    this.setTouchVisible(this.isTouch && this.lastDevice !== 'keyboard');
  }

  setTouchVisible(v) {
    const show = v && Input.layout.mode !== 'none' && Input.layout.mode !== 'tap';
    if (show === this.root.visible && this.root.alpha > 0) return;
    this.root.setVisible(show);
  }

  // ---------------------------------------------------------------------------
  // Touch handling
  // ---------------------------------------------------------------------------
  onDown(p) {
    if (!p.wasTouch) return;
    if (this.lastDevice !== 'touch') { this.lastDevice = 'touch'; this.setTouchVisible(true); }
    const L = Input.layout;
    if (L.mode === 'none' || L.mode === 'tap') return;

    // action buttons first
    for (const [id, b] of Object.entries(this.buttons)) {
      if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < b.r) {
        this.btnPointers.set(p.id, id);
        Input.touchBtn[id] = true;
        Input.press(id);
        vibrate(CONTROLS.VIBRATE_MS);
        this.tweens.add({ targets: [b.img, b.icon].filter(Boolean), scale: Save.settings.controlSize * 0.86, duration: 50 });
        b.img.setTint(0xffffff).setAlpha(1);
        return;
      }
    }
    if (this.joy && p.x < W * 0.5 && p.y > 70 && !this.joyPointer) {
      // floating joystick: recenters under the thumb
      this.joyPointer = p.id;
      const r = this.joy.radius;
      const x = Phaser.Math.Clamp(p.x, r + 6, W * 0.5 - r);
      const y = Phaser.Math.Clamp(p.y, 80, H - r - 6);
      this.joy.base.setPosition(x, y);
      this.joy.knob.setPosition(x, y);
      this.updateStick(p);
      return;
    }
    if (this.steer && p.x < W * 0.4) {
      const dir = p.x < 99 ? -1 : 1;
      this.steer.pointers.set(p.id, dir);
      this.updateSteer();
    }
  }

  onMove(p) {
    if (p.id === this.joyPointer) this.updateStick(p);
    if (this.steer?.pointers.has(p.id)) {
      this.steer.pointers.set(p.id, p.x < 99 ? -1 : 1);
      this.updateSteer();
    }
  }

  onUp(p) {
    if (p.id === this.joyPointer) {
      this.joyPointer = null;
      Input.stick.x = Input.stick.y = 0;
      const { base, knob, home } = this.joy;
      this.tweens.add({ targets: [base, knob], x: home.x, y: home.y, duration: 160, ease: 'Sine.Out' });
    }
    const id = this.btnPointers.get(p.id);
    if (id) {
      this.btnPointers.delete(p.id);
      if (![...this.btnPointers.values()].includes(id)) Input.touchBtn[id] = false;
      const b = this.buttons[id];
      if (b) this.tweens.add({ targets: [b.img, b.icon].filter(Boolean), scale: Save.settings.controlSize, duration: 120, ease: 'Back.Out' });
    }
    if (this.steer?.pointers.delete(p.id)) this.updateSteer();
  }

  updateStick(p) {
    const { base, knob, radius } = this.joy;
    let dx = p.x - base.x, dy = p.y - base.y;
    const d = Math.hypot(dx, dy);
    if (d > radius) { dx = (dx / d) * radius; dy = (dy / d) * radius; }
    knob.setPosition(base.x + dx, base.y + dy);
    let nx = dx / radius, ny = dy / radius;
    const mag = Math.hypot(nx, ny);
    if (mag < CONTROLS.JOYSTICK_DEADZONE) { nx = 0; ny = 0; }
    Input.stick.x = nx;
    Input.stick.y = ny;
  }

  updateSteer() {
    let x = 0;
    for (const d of this.steer.pointers.values()) x += d;
    Input.stick.x = Phaser.Math.Clamp(x, -1, 1);
    for (const side of [this.steer.left, this.steer.right]) {
      const active = [...this.steer.pointers.values()].includes(side.dir);
      side.b.setAlpha(active ? 1 : 0.7);
    }
  }

  update() {
    // keyboard axes & buttons
    const k = this.keys;
    if (!k) return;
    Input.key.x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    Input.key.y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    Input.btn.A = k.A1.isDown || k.A2.isDown || k.A3.isDown;
    Input.btn.B = k.B1.isDown || k.B2.isDown || k.B3.isDown;
    Input.btn.C = k.C1.isDown || k.C2.isDown || k.C3.isDown;
  }
}
