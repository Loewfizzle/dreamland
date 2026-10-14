// ============================================================================
//  INPUT — one place to ask "is the player pressing X?" regardless of whether
//  they use a keyboard or the on-screen touch controls.
//
//   Input.axisX / Input.axisY      -1..1 (joystick or WASD/arrows)
//   Input.isDown('A' | 'B' | 'C')  held?
//   Input.consume('A')             true once per press (edge-triggered)
//   Input.configure({...})         choose the touch layout for the current scene
//
//  Default bindings:  A = Space / J / Z      (jump / action)
//                     B = E / K / X          (Zeus ability)
//                     C = Shift / L / C      (secondary)
//                     Pause = Esc / P
// ============================================================================
import Phaser from 'phaser';

export const DEFAULT_LAYOUT = {
  mode: 'none',          // 'none' | 'joystick' | 'steer' | 'tap'
  buttons: [],           // [{ id:'A', label:'JUMP', icon:null, style:'a' }]
  pause: false,          // show the pause button
};

class GameInput {
  constructor() {
    this.events = new Phaser.Events.EventEmitter();
    this.layout = { ...DEFAULT_LAYOUT };
    this.key = { x: 0, y: 0 };
    this.stick = { x: 0, y: 0 };
    this.btn = { A: false, B: false, C: false };
    this.touchBtn = { A: false, B: false, C: false };
    this.presses = { A: 0, B: 0, C: 0, PAUSE: 0 };
    this.lastDevice = 'keyboard';
    this.enabled = true;
  }

  get axisX() {
    if (!this.enabled) return 0;
    return Phaser.Math.Clamp(this.key.x + this.stick.x, -1, 1);
  }
  get axisY() {
    if (!this.enabled) return 0;
    return Phaser.Math.Clamp(this.key.y + this.stick.y, -1, 1);
  }

  isDown(id) {
    return this.enabled && (this.btn[id] || this.touchBtn[id]);
  }

  /** Returns true if `id` was pressed since the last consume (then clears it). */
  consume(id) {
    if (!this.enabled) { this.presses[id] = 0; return false; }
    if (this.presses[id] > 0) { this.presses[id] = 0; return true; }
    return false;
  }

  press(id) {
    this.presses[id] = (this.presses[id] || 0) + 1;
    this.events.emit('press', id);
    if (id === 'PAUSE') this.events.emit('pause');
  }

  /** Clear pending presses (e.g. when a scene starts, so stale taps don't fire). */
  flush() {
    for (const k of Object.keys(this.presses)) this.presses[k] = 0;
  }

  configure(layout) {
    this.layout = { ...DEFAULT_LAYOUT, ...layout };
    this.flush();
    this.stick.x = this.stick.y = 0;
    this.touchBtn.A = this.touchBtn.B = this.touchBtn.C = false;
    this.events.emit('layout', this.layout);
  }

  /** Relabel one button on the fly (e.g. Zeus's ability changes). */
  relabel(id, label) {
    const b = this.layout.buttons.find((x) => x.id === id);
    if (b) { b.label = label; this.events.emit('relabel', id, label); }
  }
}

export const Input = new GameInput();
