// ============================================================================
//  BEN (side view) — run, jump with coyote time, squash & stretch, dust puffs,
//  footsteps. Arcade physics sprite.
// ============================================================================
import Phaser from 'phaser';
import { PLAYER } from '../config.js';
import { Input } from '../systems/input.js';
import { Audio } from '../systems/audio.js';
import { P, hexNum } from '../art/palette.js';

export default class BenSide extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'ben', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(10, 26).setOffset(7, 6);
    this.body.setGravityY(PLAYER.GRAVITY);
    this.setCollideWorldBounds(true);
    this.facing = 1;
    this.lastGrounded = 0;
    this.wasGrounded = true;
    this.stepTimer = 0;
    this.play('ben_idle');

    this.dust = scene.add.particles(0, 0, 'px2', {
      lifespan: 450, speed: { min: 10, max: 40 }, angle: { min: 200, max: 340 }, gravityY: 40,
      scale: { start: 1, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [hexNum(P.sand1), hexNum(P.sand2)],
      emitting: false,
    });
    this.dust.setDepth(this.depth - 1);
  }

  get grounded() { return this.body.blocked.down || this.body.touching.down; }

  update(time, delta) {
    const ax = Input.axisX;
    const speed = PLAYER.WALK_SPEED;
    this.setVelocityX(ax * speed);
    if (ax !== 0) { this.facing = Math.sign(ax); this.setFlipX(this.facing < 0); }

    const grounded = this.grounded;
    if (grounded) this.lastGrounded = time;

    // jump (with coyote time)
    if (Input.consume('A') && time - this.lastGrounded < PLAYER.COYOTE_MS) {
      this.setVelocityY(-PLAYER.JUMP_VELOCITY);
      this.lastGrounded = 0;
      Audio.sfx('jump', { volume: 0.7 });
      this.squash(0.75, 1.3);
      this.dust.explode(5, this.x, this.y);
    }
    // variable jump height: release early for a short hop
    if (!Input.isDown('A') && this.body.velocity.y < -100) this.body.velocity.y *= 0.88;

    // landing
    if (grounded && !this.wasGrounded) {
      Audio.sfx('land', { volume: 0.6 });
      this.squash(1.3, 0.72);
      this.dust.explode(7, this.x, this.y);
    }
    this.wasGrounded = grounded;

    // animation state
    let anim;
    if (!grounded) anim = this.body.velocity.y < 0 ? 'ben_jump' : 'ben_fall';
    else if (Math.abs(ax) > 0.1) anim = 'ben_run';
    else anim = 'ben_idle';
    if (this.anims.currentAnim?.key !== anim) this.play(anim);

    // footsteps synced to the run cycle
    if (grounded && Math.abs(ax) > 0.1) {
      this.stepTimer -= delta;
      if (this.stepTimer <= 0) {
        this.stepTimer = 280;
        Audio.sfx('step_sand', { volume: 0.45, pan: Audio.panFor(this.x, this.scene.cameras.main), minGap: 0 });
        if (Math.random() < 0.35) this.dust.explode(1, this.x - this.facing * 4, this.y);
      }
    } else this.stepTimer = 0;
  }

  squash(sx, sy) {
    this.scene.tweens.killTweensOf(this, ['scaleX', 'scaleY']);
    this.setScale(sx, sy);
    this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 220, ease: 'Back.Out' });
  }
}
