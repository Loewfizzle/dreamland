// ============================================================================
//  ZEUS — Chapter 5 companion. Real physics: trots after Ben, hops up ledges,
//  "zoomies-teleports" back if he ever gets stuck. Abilities on the paw button:
//    TACKLE — if an enemy is near, launches into it and knocks it down
//    SNIFF  — otherwise, radar pulse that reveals hidden golden bitcoins
//  Never dies: enemy hits make him dizzy for a moment.
// ============================================================================
import Phaser from 'phaser';
import { CH5, ZEUS } from '../../config.js';
import { Audio } from '../../systems/audio.js';
import { shake, hitStop } from '../../systems/fx.js';
import { P, hexNum } from '../../art/palette.js';

export default class Zeus extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, ben) {
    super(scene, x, y, 'zeus', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(18, 12).setOffset(5, 8);
    this.body.setGravityY(CH5.GRAVITY);
    this.body.setMaxVelocityY(600);
    this.ben = ben;
    this.state = 'follow';
    this.idleTime = 0;
    this.stuckTime = 0;
    this.jingleTimer = 0;
    this.lastTackle = -99999;
    this.riding = null;
    this.play('zeus_sit');
  }

  get grounded() { return this.body.blocked.down || this.body.touching.down || !!this.riding; }
  get tackleReady() { return this.scene.time.now - this.lastTackle > CH5.TACKLE_COOLDOWN_MS && this.state === 'follow'; }

  update(time, delta) {
    if (this.state === 'tackle') {
      if (this.target && this.target.active && !this.target.dead &&
          Phaser.Geom.Intersects.RectangleToRectangle(this.getBounds(), this.target.getBounds())) this.landTackle();
      return;
    }
    if (this.state !== 'follow') { this.body.setVelocityX(this.body.velocity.x * 0.85); return; }
    const ben = this.ben;
    const targetX = ben.x - ben.facing * ZEUS.FOLLOW_DISTANCE;
    const dx = targetX - this.x;
    const dy = ben.y - this.y;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, ben.x, ben.y);

    // got separated (Ben rode an elevator, jumped far…)? Do a zoomies-teleport.
    if (dist > 280 || (this.stuckTime > 1600 && dist > 60)) { this.teleportToBen(); return; }

    if (Math.abs(dx) > 10) {
      const speed = CH5.ZEUS_RUN * (Math.abs(dx) > 90 ? 1.35 : 1);
      this.body.setVelocityX(Math.sign(dx) * speed);
      this.setFlipX(dx < 0);
      this.idleTime = 0;
      const blocked = (dx > 0 && this.body.blocked.right) || (dx < 0 && this.body.blocked.left);
      const benAbove = dy < -20 && Math.abs(ben.x - this.x) < 70 && ben.grounded;
      if (this.grounded && (blocked || benAbove)) this.hop();
      if (blocked) this.stuckTime += delta; else this.stuckTime = 0;
      if (this.grounded) {
        if (this.anims.currentAnim?.key !== 'zeus_trot') this.play('zeus_trot');
        this.jingleTimer -= delta;
        if (this.jingleTimer <= 0) {
          this.jingleTimer = 380 + Math.random() * 300;
          Audio.sfx('jingle', { volume: 0.3, pan: Audio.panFor(this.x, this.scene.cameras.main), minGap: 0 });
        }
      }
    } else {
      this.body.setVelocityX(0);
      this.stuckTime = dy < -40 ? this.stuckTime + delta : 0;
      if (dy < -20 && ben.grounded && this.grounded) this.hop();
      this.idleTime += delta;
      this.setFlipX(ben.x < this.x);
      if (this.grounded) {
        const want = this.idleTime > ZEUS.IDLE_SIT_MS ? 'zeus_sit' : 'zeus_stand';
        if (this.anims.currentAnim?.key !== want) this.play(want);
      }
    }
    if (!this.grounded && this.anims.currentAnim?.key !== 'zeus_leap') this.play('zeus_leap');
  }

  hop() {
    this.body.setVelocityY(-CH5.ZEUS_JUMP);
    this.riding = null;
  }

  teleportToBen() {
    const ben = this.ben;
    this.poof(this.x, this.y - 8);
    this.body.reset(ben.x - ben.facing * 18, ben.y - 2);
    this.body.setVelocity(0, 0);
    this.stuckTime = 0;
    this.poof(this.x, this.y - 8);
    Audio.sfx('whoosh', { volume: 0.4, dur: 0.25 });
  }

  poof(x, y) {
    const p = this.scene.add.particles(x, y, 'mote', {
      lifespan: 400, speed: { min: 20, max: 60 }, scale: { start: 1.2, end: 0 }, alpha: { start: 0.8, end: 0 },
      tint: hexNum(P.gold0), emitting: false,
    }).setDepth(911);
    p.explode(10);
    this.scene.time.delayedCall(500, () => p.destroy());
  }

  /** TACKLE the given enemy. */
  tackle(target) {
    if (!this.tackleReady || !target) return false;
    this.state = 'tackle';
    this.target = target;
    this.lastTackle = this.scene.time.now;
    const dir = Math.sign(target.x - this.x) || 1;
    this.setFlipX(dir < 0);
    this.play('zeus_leap');
    this.body.setVelocity(dir * CH5.TACKLE_SPEED, -170);
    Audio.sfx('bark', { pan: Audio.panFor(this.x, this.scene.cameras.main), pitch: 0.9 });
    Audio.sfx('whoosh', { volume: 0.5, dur: 0.3 });
    // speed lines
    this.trail = this.scene.add.particles(0, 0, 'px2', {
      follow: this, lifespan: 220, speed: 0, scale: { start: 1.5, end: 0 }, alpha: { start: 0.7, end: 0 },
      tint: hexNum(P.gold1), frequency: 18,
    }).setDepth(14);
    this.scene.time.delayedCall(650, () => { if (this.state === 'tackle') this.endTackle(); });
    return true;
  }

  landTackle() {
    const t = this.target;
    t.stun?.(CH5.TACKLE_STUN_MS);
    t.hit?.(CH5.TACKLE_DAMAGE, this.x, 'tackle');
    Audio.sfx('tackle', { pan: Audio.panFor(this.x, this.scene.cameras.main) });
    shake(this.scene, 160, 0.01);
    hitStop(this.scene, 70);
    this.body.setVelocity(-Math.sign(this.body.velocity.x || 1) * 60, -140);
    this.scene.events.emit('impact', t.x, t.y - 14);
    this.endTackle();
  }

  endTackle() {
    this.trail?.stop();
    const tr = this.trail;
    this.scene.time.delayedCall(300, () => tr?.destroy());
    this.target = null;
    this.state = 'recover';
    this.scene.time.delayedCall(350, () => { if (this.state === 'recover') this.state = 'follow'; });
  }

  /** SNIFF: pulse that reveals secrets. */
  sniff(onReveal) {
    if (this.state !== 'follow' || !this.grounded) return false;
    this.state = 'sniff';
    this.body.setVelocityX(0);
    this.play('zeus_sniff');
    Audio.sfx('sniff', { pan: Audio.panFor(this.x, this.scene.cameras.main) });
    this.scene.time.delayedCall(420, () => {
      for (let i = 0; i < 3; i++) {
        const c = this.scene.add.circle(this.x, this.y - 6, 4, hexNum(P.cyan2), 0).setStrokeStyle(2, hexNum(P.cyan2), 1).setDepth(912);
        c.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
          targets: c, radius: CH5.SNIFF_RADIUS, alpha: 0, duration: 750, delay: i * 150, ease: 'Cubic.Out',
          onUpdate: () => c.setStrokeStyle(2, hexNum(P.cyan2), c.alpha), onComplete: () => c.destroy(),
        });
      }
      this.scene.lighting?.flash(this.x, this.y - 6, CH5.SNIFF_RADIUS, 0x3cf2ff, 700, 0.5);
      onReveal?.(this.x, this.y - 6, CH5.SNIFF_RADIUS);
    });
    this.scene.time.delayedCall(1000, () => { if (this.state === 'sniff') this.state = 'follow'; });
    return true;
  }

  dizzy() {
    if (this.state === 'dizzy') return;
    this.state = 'dizzy';
    this.play('zeus_dizzy');
    this.body.setVelocityX(0);
    Audio.sfx('whine', { pan: Audio.panFor(this.x, this.scene.cameras.main) });
    const stars = [0, 1, 2].map(() => this.scene.add.image(this.x, this.y - 22, 'star2').setTint(hexNum(P.btc1)).setDepth(912).setScale(1.5));
    const t0 = this.scene.time.now;
    const ev = this.scene.time.addEvent({
      delay: 16, loop: true, callback: () => {
        const t = (this.scene.time.now - t0) / 1000;
        stars.forEach((s, i) => { const a = t * 5 + (i * Math.PI * 2) / 3; s.setPosition(this.x + Math.cos(a) * 9, this.y - 20 + Math.sin(a) * 3); });
      },
    });
    this.scene.time.delayedCall(ZEUS.DIZZY_MS, () => {
      ev.remove();
      stars.forEach((s) => s.destroy());
      if (this.state === 'dizzy') this.state = 'follow';
      Audio.sfx('boof', { volume: 0.7 });
    });
  }
}
