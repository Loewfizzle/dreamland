// ============================================================================
//  ENEMIES — Chapter 5.
//   Soldier  "camo dude": patrols, spots Ben, aims, fires slow red rounds.
//   Agent    CIA in a black suit: faster, keeps his distance, radios backup.
//   Drone    security quadcopter: hovers above Ben, fires downward, explodes.
//   Grey     escaped alien: lobs green energy orbs, blinks around (teleports).
//  All share hit-flash, knockback, stun (Zeus tackle), and a satisfying death.
// ============================================================================
import Phaser from 'phaser';
import { CH5 } from '../../config.js';
import { Audio } from '../../systems/audio.js';
import { shake, hitStop } from '../../systems/fx.js';
import { P, hexNum } from '../../art/palette.js';

const T = CH5.TILE;

class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, def, key, hp, sight, fireMs) {
    super(scene, def.x * T + T / 2, def.y * T, key, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.def = def;
    this.kind = key;
    this.hp = hp;
    this.maxHp = hp;
    this.sight = sight;
    this.fireMs = fireMs;
    this.facing = -1;
    this.state = 'patrol';
    this.alertedAt = 0;
    this.nextFire = 0;
    this.stunUntil = 0;
    this.minX = def.patrol[0] * T + 6;
    this.maxX = def.patrol[1] * T + T - 6;
    this.setDepth(14);
  }

  get ben() { return this.scene.ben; }

  canSee() {
    const ben = this.ben;
    if (ben.dead || ben.frozen) return false;
    const dx = ben.x - this.x, dy = (ben.y - 13) - (this.y - 16);
    if (Math.abs(dx) > this.sight || Math.abs(dy) > 90) return false;
    if (this.state === 'patrol' && Math.sign(dx) !== this.facing && Math.abs(dx) > 40) return false;
    return this.scene.lineOfSight(this.x, this.y - 16, ben.x, ben.y - 14);
  }

  alert() {
    if (this.state === 'alert') return;
    this.state = 'alert';
    this.alertedAt = this.scene.time.now;
    this.nextFire = this.scene.time.now + 500 + Math.random() * 400;
    // comic "!" pop
    const bang = this.scene.add.text(this.x, this.y - 40, '!', { fontFamily: '"Press Start 2P"', fontSize: '8px', color: P.red, stroke: P.ink, strokeThickness: 2 }).setOrigin(0.5).setDepth(915);
    this.scene.tweens.add({ targets: bang, y: bang.y - 8, alpha: 0, duration: 700, ease: 'Quad.Out', onComplete: () => bang.destroy() });
    this.onAlert?.();
  }

  stun(ms) {
    if (this.dead) return;
    this.stunUntil = this.scene.time.now + ms;
    this.play(`${this.kind}_hurt`, true);
    if (this.body.allowGravity !== false) this.body.setVelocityX(0);
  }

  hit(dmg, fromX, source) {
    if (this.dead) return;
    this.hp -= dmg;
    this.alert();
    const dir = Math.sign(this.x - fromX) || 1;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => { if (this.active) this.clearTint(); });
    if (this.body.allowGravity !== false) this.body.setVelocity(dir * (source === 'tackle' ? 140 : 50), source === 'tackle' ? -120 : -30);
    else this.body.setVelocity(dir * 60, -20);
    if (this.hp <= 0) this.die(dir);
    else Audio.sfx(this.kind === 'drone' ? 'hit' : 'grunt', { pitch: this.kind === 'agent' ? 0.85 : 1, pan: Audio.panFor(this.x, this.scene.cameras.main), minGap: 60 });
  }

  die(dir) {
    this.dead = true;
    this.state = 'dead';
    this.scene.onEnemyKilled(this);
    hitStop(this.scene, 55);
    shake(this.scene, 110, 0.006);
    this.body.checkCollision.none = false;
    this.body.setVelocity(dir * 90, -160);
    this.play(`${this.kind}_hurt`, true);
    Audio.sfx('grunt', { pitch: 0.75, pan: Audio.panFor(this.x, this.scene.cameras.main) });
    this.scene.time.delayedCall(350, () => {
      if (!this.active) return;
      this.play(`${this.kind}_down`, true);
      Audio.sfx('thud', { volume: 0.7, pan: Audio.panFor(this.x, this.scene.cameras.main) });
      this.body.setVelocityX(0);
    });
    this.scene.time.delayedCall(1700, () => {
      if (!this.active) return;
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 400, onComplete: () => this.destroy() });
    });
  }

  faceBen() {
    this.facing = this.ben.x < this.x ? -1 : 1;
    this.setFlipX(this.facing < 0);
  }

  /** Default ground patrol between minX..maxX. */
  patrol(speed) {
    if (this.x <= this.minX) this.facing = 1;
    if (this.x >= this.maxX) this.facing = -1;
    if (this.body.blocked.left) this.facing = 1;
    if (this.body.blocked.right) this.facing = -1;
    this.body.setVelocityX(this.facing * speed);
    this.setFlipX(this.facing < 0);
    if (this.anims.currentAnim?.key !== `${this.kind}_walk`) this.play(`${this.kind}_walk`);
  }

  update(time) {
    if (this.dead) return;
    if (time < this.stunUntil) { this.body.setVelocityX(this.body.velocity.x * 0.9); return; }
    if (this.state === 'patrol' && this.canSee()) this.alert();
    // lose interest if Ben gets far away
    if (this.state === 'alert' && Phaser.Math.Distance.Between(this.x, this.y, this.ben.x, this.ben.y) > this.sight * 1.8) this.state = 'patrol';
    this.think(time);
  }
}

// ---------------------------------------------------------------------------
export class Soldier extends Enemy {
  constructor(scene, def) {
    super(scene, def, 'soldier', CH5.SOLDIER_HP, CH5.SOLDIER_SIGHT, CH5.SOLDIER_FIRE_MS);
    this.body.setSize(10, 26).setOffset(9, 6);
    this.body.setGravityY(CH5.GRAVITY);
    this.play('soldier_walk');
  }
  think(time) {
    if (this.state === 'patrol') return this.patrol(CH5.SOLDIER_SPEED);
    this.faceBen();
    const dx = Math.abs(this.ben.x - this.x);
    // advance a little if far, otherwise hold position and fire
    if (dx > 160 && this.x > this.minX && this.x < this.maxX) {
      this.body.setVelocityX(this.facing * CH5.SOLDIER_SPEED);
      if (this.anims.currentAnim?.key !== 'soldier_walk') this.play('soldier_walk');
    } else {
      this.body.setVelocityX(0);
      if (!this.anims.isPlaying || this.anims.currentAnim?.key === 'soldier_walk') this.play('soldier_idle', true);
    }
    if (time > this.nextFire && this.canSee()) {
      this.nextFire = time + this.fireMs * (0.8 + Math.random() * 0.4);
      this.play('soldier_aim', true);
      this.scene.time.delayedCall(140, () => {
        if (this.dead || time < this.stunUntil) return;
        this.scene.fireEnemyBullet(this.x + this.facing * 15, this.y - 17, this.ben.x, this.ben.y - 14, 'ebullet', { pistol: false });
      });
    }
  }
}

// ---------------------------------------------------------------------------
export class Agent extends Enemy {
  constructor(scene, def) {
    super(scene, def, 'agent', CH5.AGENT_HP, CH5.AGENT_SIGHT, CH5.AGENT_FIRE_MS);
    this.body.setSize(10, 26).setOffset(9, 6);
    this.body.setGravityY(CH5.GRAVITY);
    this.calledBackup = false;
    this.play('agent_walk');
  }
  onAlert() {
    if (this.calledBackup) return;
    this.calledBackup = true;
    this.scene.time.delayedCall(600, () => {
      if (this.dead) return;
      Audio.sfx('radio', { pan: Audio.panFor(this.x, this.scene.cameras.main) });
      this.scene.say(this, 'Need backup in S-4!');
      this.scene.time.delayedCall(2200, () => { if (!this.dead) this.scene.spawnBackup(this); });
    });
  }
  think(time) {
    if (this.state === 'patrol') return this.patrol(CH5.AGENT_SPEED * 0.6);
    this.faceBen();
    const dx = this.ben.x - this.x;
    const ad = Math.abs(dx);
    // keep a professional distance: back off if too close, close in if too far
    let move = 0;
    if (ad < 90) move = -Math.sign(dx);
    else if (ad > 180) move = Math.sign(dx);
    if ((move < 0 && this.x <= this.minX) || (move > 0 && this.x >= this.maxX)) move = 0;
    this.body.setVelocityX(move * CH5.AGENT_SPEED);
    if (move !== 0) { if (this.anims.currentAnim?.key !== 'agent_walk') this.play('agent_walk'); }
    else if (this.anims.currentAnim?.key === 'agent_walk') this.play('agent_idle');
    if (time > this.nextFire && this.canSee()) {
      this.nextFire = time + this.fireMs * (0.8 + Math.random() * 0.4);
      this.play('agent_aim', true);
      this.scene.time.delayedCall(120, () => {
        if (this.dead) return;
        this.scene.fireEnemyBullet(this.x + this.facing * 13, this.y - 17, this.ben.x, this.ben.y - 14, 'ebullet', { pistol: true });
      });
    }
  }
}

// ---------------------------------------------------------------------------
export class Drone extends Enemy {
  constructor(scene, def) {
    super(scene, def, 'drone', CH5.DRONE_HP, CH5.DRONE_SIGHT, CH5.DRONE_FIRE_MS);
    this.setOrigin(0.5, 0.5);
    this.body.setAllowGravity(false);
    this.body.setSize(20, 10).setOffset(3, 4);
    this.homeY = def.y * T;
    this.t = Math.random() * 10;
    this.play('drone_fly');
    this.light = scene.lighting?.add({ follow: this, oy: 4, radius: 34, color: 0xff6040, intensity: 0.7 });
    this.buzz = Audio.loop('drone_buzz', { volume: 0.0001 });
  }
  think(time) {
    this.t += 0.016;
    const ben = this.ben;
    let tx, ty;
    if (this.state === 'patrol') {
      if (this.x <= this.minX) this.facing = 1;
      if (this.x >= this.maxX) this.facing = -1;
      tx = this.x + this.facing * 40;
      ty = this.homeY + Math.sin(this.t * 2) * 6;
      if (this.anims.currentAnim?.key !== 'drone_fly') this.play('drone_fly');
    } else {
      tx = Phaser.Math.Clamp(ben.x - Math.sign(ben.x - this.x) * 30, this.minX, this.maxX);
      ty = Math.max(this.scene.ceilingAbove(ben.x, ben.y) + 24, ben.y - 90) + Math.sin(this.t * 3) * 5;
      if (this.anims.currentAnim?.key !== 'drone_alert') this.play('drone_alert');
      if (time > this.nextFire && this.canSee()) {
        this.nextFire = time + this.fireMs * (0.8 + Math.random() * 0.4);
        this.scene.fireEnemyBullet(this.x, this.y + 6, ben.x, ben.y - 10, 'ebullet', { pistol: true });
      }
    }
    this.body.setVelocity((tx - this.x) * 1.6, (ty - this.y) * 2);
    this.body.velocity.x = Phaser.Math.Clamp(this.body.velocity.x, -CH5.DRONE_SPEED * 1.5, CH5.DRONE_SPEED * 1.5);
    this.setFlipX(this.body.velocity.x < 0);
    this.rotation = Phaser.Math.Clamp(this.body.velocity.x / 400, -0.25, 0.25);
    // rotor buzz louder when near
    const d = Phaser.Math.Distance.Between(this.x, this.y, ben.x, ben.y);
    this.buzz.set({ volume: Math.max(0.0001, 0.6 * (1 - d / 320)), pan: Audio.panFor(this.x, this.scene.cameras.main) });
  }
  canSee() {
    const ben = this.ben;
    if (ben.dead || ben.frozen) return false;
    if (Phaser.Math.Distance.Between(this.x, this.y, ben.x, ben.y - 14) > this.sight) return false;
    return this.scene.lineOfSight(this.x, this.y, ben.x, ben.y - 14);
  }
  stun(ms) { super.stun(ms); this.body.setVelocity(0, 40); }
  die() {
    this.dead = true;
    this.scene.onEnemyKilled(this);
    this.buzz.stop(0.1);
    this.scene.explode(this.x, this.y, false);
    hitStop(this.scene, 60);
    this.destroy();
  }
  destroy(fromScene) {
    if (this.light) this.scene?.lighting?.remove(this.light);
    this.buzz?.stop(0.1);
    super.destroy(fromScene);
  }
}

// ---------------------------------------------------------------------------
export class Grey extends Enemy {
  constructor(scene, def) {
    super(scene, def, 'grey', CH5.GREY_HP, CH5.GREY_SIGHT, CH5.GREY_FIRE_MS);
    this.body.setSize(8, 28).setOffset(8, 4);
    this.body.setGravityY(CH5.GRAVITY);
    this.nextTeleport = 0;
    this.play('grey_idle');
    this.light = scene.lighting?.add({ follow: this, oy: -18, radius: 46, color: 0x5dff9a, intensity: 0.5, pulse: { speed: 3, amount: 0.4 } });
  }
  onAlert() {
    this.nextTeleport = this.scene.time.now + CH5.GREY_TELEPORT_MS;
    this.scene.alienNear = true;
    Audio.sfx('ufo_warble', { volume: 0.5, pan: Audio.panFor(this.x, this.scene.cameras.main) });
  }
  think(time) {
    if (this.state === 'patrol') {
      // eerie slow wander
      this.patrol(18);
      return;
    }
    this.body.setVelocityX(0);
    this.faceBen();
    if (time > this.nextTeleport) {
      this.nextTeleport = time + CH5.GREY_TELEPORT_MS * (0.8 + Math.random() * 0.5);
      this.blink();
      return;
    }
    if (time > this.nextFire && this.canSee()) {
      this.nextFire = time + this.fireMs * (0.8 + Math.random() * 0.4);
      this.play('grey_cast', true);
      this.scene.time.delayedCall(320, () => {
        if (this.dead) return;
        Audio.sfx('alien_zap', { pan: Audio.panFor(this.x, this.scene.cameras.main) });
        this.scene.fireOrb(this.x + this.facing * 10, this.y - 20, this.ben);
      });
      this.once('animationcomplete', () => { if (!this.dead) this.play('grey_idle'); });
    }
  }
  blink() {
    Audio.sfx('teleport', { pan: Audio.panFor(this.x, this.scene.cameras.main) });
    this.scene.sparkBurst(this.x, this.y - 16, P.green1, 14);
    this.setAlpha(0);
    const nx = Phaser.Math.Between(this.minX, this.maxX);
    this.scene.time.delayedCall(260, () => {
      if (this.dead || !this.active) return;
      this.body.reset(nx, this.y);
      this.scene.sparkBurst(this.x, this.y - 16, P.green1, 14);
      this.scene.tweens.add({ targets: this, alpha: 1, duration: 200 });
    });
  }
  destroy(fromScene) {
    if (this.light) this.scene?.lighting?.remove(this.light);
    super.destroy(fromScene);
  }
}

export const ENEMY_TYPES = { soldier: Soldier, agent: Agent, drone: Drone, grey: Grey };
