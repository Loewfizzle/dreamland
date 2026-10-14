// ============================================================================
//  ZEUS (side view) — the very good boy. Trots after Ben, sits when idle,
//  and performs abilities on command: BARK (shockwave), SNIFF (radar pulse).
//  He can never be killed: hits make him dizzy with cartoon stars instead.
// ============================================================================
import Phaser from 'phaser';
import { ZEUS } from '../config.js';
import { Audio } from '../systems/audio.js';
import { P, hexNum } from '../art/palette.js';

export default class ZeusSide extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, ben) {
    super(scene, x, y, 'zeus', 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.ben = ben;
    this.groundY = y;
    this.state = 'follow';     // follow | ability | dizzy
    this.idleTime = 0;
    this.jingleTimer = 0;
    this.lastBark = 0;
    this.play('zeus_sit');
  }

  update(time, delta) {
    const dt = delta / 1000;
    if (this.state !== 'follow') return;
    const targetX = this.ben.x - this.ben.facing * ZEUS.FOLLOW_DISTANCE;
    const dx = targetX - this.x;
    if (Math.abs(dx) > 8) {
      // speed up when far behind so he never gets lost
      const speed = ZEUS.TROT_SPEED * (Math.abs(dx) > 80 ? 1.6 : 1);
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
      this.setFlipX(dx < 0);
      this.idleTime = 0;
      if (this.anims.currentAnim?.key !== 'zeus_trot') this.play('zeus_trot');
      this.jingleTimer -= delta;
      if (this.jingleTimer <= 0) {
        this.jingleTimer = 420 + Math.random() * 300;
        Audio.sfx('jingle', { volume: 0.35, pan: Audio.panFor(this.x, this.scene.cameras.main), minGap: 0 });
      }
    } else {
      this.idleTime += delta;
      this.setFlipX(this.ben.x < this.x);
      const want = this.idleTime > ZEUS.IDLE_SIT_MS ? 'zeus_sit' : 'zeus_stand';
      if (this.anims.currentAnim?.key !== want) this.play(want);
    }
    // little hop when Ben is airborne nearby (he wants to play)
    this.y = this.groundY;
  }

  /** BARK: shockwave ring. onHit(x, y, radius) lets the scene stun enemies. */
  bark(onHit) {
    if (this.state !== 'follow' || this.scene.time.now - this.lastBark < ZEUS.BARK_COOLDOWN_MS) return false;
    this.lastBark = this.scene.time.now;
    this.state = 'ability';
    this.play('zeus_bark');
    const pan = Audio.panFor(this.x, this.scene.cameras.main);
    Audio.sfx(Math.random() < 0.3 ? 'bark2' : 'bark', { pan, volume: 1 });
    this.scene.time.delayedCall(120, () => {
      const dir = this.flipX ? -1 : 1;
      this.ring(this.x + dir * 12, this.y - 10, 70, P.btc1, 380);
      onHit?.(this.x + dir * 12, this.y - 10, 70);
    });
    this.once('animationcomplete', () => this.scene.time.delayedCall(200, () => { this.state = 'follow'; }));
    return true;
  }

  /** SNIFF: radar pulse that reveals hidden things. onReveal(x, y, radius) */
  sniff(radius, onReveal) {
    if (this.state !== 'follow') return false;
    this.state = 'ability';
    this.play('zeus_sniff');
    Audio.sfx('sniff', { pan: Audio.panFor(this.x, this.scene.cameras.main) });
    this.scene.time.delayedCall(450, () => {
      this.ring(this.x, this.y - 6, radius, P.cyan2, 700, 3);
      Audio.sfx('sparkle', { volume: 0.6, count: 4 });
      onReveal?.(this.x, this.y - 6, radius);
    });
    this.scene.time.delayedCall(1100, () => { this.state = 'follow'; });
    return true;
  }

  /** Hit by something: dizzy for a while (never dies). */
  dizzy() {
    if (this.state === 'dizzy') return;
    this.state = 'dizzy';
    this.play('zeus_dizzy');
    Audio.sfx('whine', { pan: Audio.panFor(this.x, this.scene.cameras.main) });
    const stars = [];
    for (let i = 0; i < 3; i++) {
      const s = this.scene.add.image(this.x, this.y - 22, 'star2').setTint(hexNum(P.btc1)).setDepth(this.depth + 1).setScale(1.5);
      stars.push(s);
    }
    const t0 = this.scene.time.now;
    const ev = this.scene.time.addEvent({
      delay: 16, loop: true, callback: () => {
        const t = (this.scene.time.now - t0) / 1000;
        stars.forEach((s, i) => {
          const a = t * 5 + (i * Math.PI * 2) / 3;
          s.setPosition(this.x + Math.cos(a) * 9, this.y - 22 + Math.sin(a) * 3);
        });
      },
    });
    this.scene.time.delayedCall(ZEUS.DIZZY_MS, () => {
      ev.remove();
      stars.forEach((s) => s.destroy());
      this.state = 'follow';
      Audio.sfx('boof', { volume: 0.7 });
    });
  }

  ring(x, y, radius, color, duration, rings = 1) {
    for (let i = 0; i < rings; i++) {
      const c = this.scene.add.circle(x, y, 4, hexNum(color), 0).setStrokeStyle(2, hexNum(color), 1).setDepth(this.depth + 2);
      c.setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: c, radius, alpha: 0, duration, delay: i * 160, ease: 'Cubic.Out',
        onUpdate: () => c.setStrokeStyle(2, hexNum(color), c.alpha),
        onComplete: () => c.destroy(),
      });
    }
  }
}
