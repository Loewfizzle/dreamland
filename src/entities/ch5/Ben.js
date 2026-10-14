// ============================================================================
//  BEN — Chapter 5 run & gun. Accelerated movement, coyote time + jump
//  buffering, variable jump height, alien blaster, hearts, knockback and
//  invincibility frames. Squash & stretch everywhere.
// ============================================================================
import Phaser from 'phaser';
import { CH5 } from '../../config.js';
import { Input } from '../../systems/input.js';
import { Audio } from '../../systems/audio.js';
import { shake, vibrate } from '../../systems/fx.js';
import { P, hexNum } from '../../art/palette.js';
import { stat } from '../../systems/progress.js';

export default class Ben extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'ben', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(10, 26).setOffset(7, 6);
    this.body.setGravityY(CH5.GRAVITY);
    this.body.setMaxVelocityY(600);
    this.facing = 1;
    this.maxHp = stat('maxHp', CH5.MAX_HEALTH);
    this.hp = this.maxHp;
    this.runSpeed = stat('runSpeed', CH5.RUN_SPEED);
    this.fireCooldown = stat('blasterCooldown', CH5.BLASTER_COOLDOWN_MS);
    this.lastGrounded = 0;
    this.jumpPressedAt = -9999;
    this.lastShot = 0;
    this.shootPoseUntil = 0;
    this.invulnUntil = 0;
    this.hurtUntil = 0;
    this.stepTimer = 0;
    this.wasGrounded = true;
    this.riding = null;          // elevator currently standing on
    this.frozen = false;         // cutscenes
    this.play('ben_idle');

    this.dust = scene.add.particles(0, 0, 'px2', {
      lifespan: 420, speed: { min: 12, max: 45 }, angle: { min: 200, max: 340 }, gravityY: 40,
      scale: { start: 1, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: [hexNum(P.chrome1), hexNum(P.chrome2)], emitting: false,
    }).setDepth(17);
  }

  get grounded() { return this.body.blocked.down || this.body.touching.down || !!this.riding; }

  update(time, delta) {
    const dt = delta / 1000;
    if (this.frozen || this.dead) {
      this.body.setVelocityX(this.body.velocity.x * 0.8);
      if (this.grounded && !this.dead && this.anims.currentAnim?.key !== 'ben_idle' && !this.talking) this.play('ben_idle');
      return;
    }
    const hurt = time < this.hurtUntil;
    const ax = hurt ? 0 : Input.axisX;
    const grounded = this.grounded;
    if (grounded) this.lastGrounded = time;

    // --- horizontal: accelerate toward target speed
    const target = ax * this.runSpeed;
    const acc = (grounded ? CH5.ACCEL : CH5.AIR_ACCEL) * dt;
    const vx = this.body.velocity.x;
    if (!hurt) this.body.setVelocityX(vx + Phaser.Math.Clamp(target - vx, -acc, acc));
    if (Math.abs(ax) > 0.2) { this.facing = Math.sign(ax); this.setFlipX(this.facing < 0); }

    // --- jumping: buffer the press, allow coyote time
    if (Input.consume('A')) this.jumpPressedAt = time;
    if (time - this.jumpPressedAt < CH5.JUMP_BUFFER_MS && time - this.lastGrounded < CH5.COYOTE_MS) {
      this.jumpPressedAt = -9999;
      this.lastGrounded = -9999;
      this.riding = null;
      this.body.setVelocityY(-CH5.JUMP_VELOCITY);
      Audio.sfx('jump', { volume: 0.6 });
      this.squash(0.72, 1.32);
      this.dust.explode(5, this.x, this.y);
    }
    if (!Input.isDown('A') && this.body.velocity.y < -120) this.body.velocity.y *= 0.86;

    // --- landing
    if (grounded && !this.wasGrounded) {
      Audio.sfx('land', { volume: 0.55 });
      this.squash(1.28, 0.74);
      this.dust.explode(6, this.x, this.y);
    }
    this.wasGrounded = grounded;

    // --- blaster
    if ((Input.isDown('C') || Input.consume('C')) && time - this.lastShot > this.fireCooldown && !hurt) {
      this.lastShot = time;
      this.shootPoseUntil = time + 260;
      this.scene.fireBolt(this.x + this.facing * 13, this.y - 17, this.facing);
    }

    // --- animation
    const shooting = time < this.shootPoseUntil;
    let anim;
    if (hurt) anim = 'ben_hurt';
    else if (!grounded) anim = this.body.velocity.y < 0 ? (shooting ? 'ben_jumpshoot' : 'ben_jump') : (shooting ? 'ben_fallshoot' : 'ben_fall');
    else if (Math.abs(this.body.velocity.x) > 20) anim = shooting ? 'ben_runshoot' : 'ben_run';
    else anim = shooting ? 'ben_shoot' : 'ben_idle';
    const cur = this.anims.currentAnim?.key;
    if (cur !== anim) {
      // keep the stride phase when switching between run and run&gun
      const keepFrame = (cur === 'ben_run' && anim === 'ben_runshoot') || (cur === 'ben_runshoot' && anim === 'ben_run');
      const idx = this.anims.currentFrame?.index ?? 1;
      this.play(anim);
      if (keepFrame) this.anims.setCurrentFrame(this.anims.currentAnim.frames[(idx - 1) % this.anims.currentAnim.frames.length]);
    }

    // --- footsteps on metal
    if (grounded && Math.abs(this.body.velocity.x) > 40) {
      this.stepTimer -= delta;
      if (this.stepTimer <= 0) {
        this.stepTimer = 250;
        Audio.sfx('step_metal', { volume: 0.4, pan: Audio.panFor(this.x, this.scene.cameras.main), minGap: 0 });
      }
    } else this.stepTimer = 0;

    // invulnerability flicker
    if (time < this.invulnUntil) this.setAlpha(Math.floor(time / 60) % 2 ? 0.35 : 1);
    else this.setAlpha(1);
  }

  /** Take damage from x-position `fromX`. Returns true if it landed. */
  hurt(dmg = 1, fromX = this.x) {
    const time = this.scene.time.now;
    if (time < this.invulnUntil || this.dead || this.frozen) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.invulnUntil = time + CH5.INVULN_MS;
    this.hurtUntil = time + 280;
    const dir = Math.sign(this.x - fromX) || -this.facing;
    this.body.setVelocity(dir * CH5.KNOCKBACK, -170);
    this.riding = null;
    Audio.sfx('oof', { pan: Audio.panFor(this.x, this.scene.cameras.main) });
    shake(this.scene, 150, 0.008);
    vibrate(45);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.clearTint());
    this.scene.events.emit('ben-hp', this.hp);
    if (this.hp <= 0) { this.dead = true; this.scene.events.emit('ben-dead'); }
    return true;
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
    this.scene.events.emit('ben-hp', this.hp);
  }

  squash(sx, sy) {
    this.scene.tweens.killTweensOf(this, ['scaleX', 'scaleY']);
    this.setScale(sx, sy);
    this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });
  }
}
