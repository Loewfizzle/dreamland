// ============================================================================
//  COMBAT & LAB SOUNDS — blaster, enemy fire, impacts, explosions with a
//  low-end thump, alien zaps, machinery and the underground ambience beds.
//  (Registered into the shared SFX / LOOPS tables.)
// ============================================================================
import { SFX, LOOPS, noise, filter, gainEnv, tone, loopHandle, renderLoop, playBuffer } from './sfx.js';

const rnd = (a, b) => a + Math.random() * (b - a);

Object.assign(SFX, {
  // Alien blaster: zappy downward sweep + plasma hiss + sub punch.
  blaster(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sawtooth', rnd(1500, 1700), t, t + 0.16);
    o.frequency.exponentialRampToValueAtTime(240, t + 0.13);
    o.connect(filter(ctx, 'lowpass', 3800, 2)).connect(gainEnv(ctx, t, 0.22, 0.002, 0.13)).connect(out);
    const s = tone(ctx, 'square', 880, t, t + 0.08);
    s.frequency.exponentialRampToValueAtTime(1760, t + 0.06);
    s.connect(gainEnv(ctx, t, 0.06, 0.001, 0.06)).connect(out);
    noise(e, t, 0.08).connect(filter(ctx, 'bandpass', 4500, 1.5)).connect(gainEnv(ctx, t, 0.18, 0.001, 0.07)).connect(out);
    const sub = tone(ctx, 'sine', 140, t, t + 0.1);
    sub.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    sub.connect(gainEnv(ctx, t, 0.45, 0.002, 0.08)).connect(out);
    return 0.2;
  },
  // Enemy rifle/pistol: harder, noisier crack.
  enemy_shot(e, out, t, o = {}) {
    const ctx = e.ctx;
    noise(e, t, 0.12).connect(filter(ctx, 'bandpass', o.pistol ? 2400 : 1600, 0.9)).connect(gainEnv(ctx, t, 0.4, 0.001, 0.1)).connect(out);
    const k = tone(ctx, 'triangle', 300, t, t + 0.08);
    k.frequency.exponentialRampToValueAtTime(90, t + 0.07);
    k.connect(gainEnv(ctx, t, 0.35, 0.001, 0.07)).connect(out);
    return 0.15;
  },
  // Bullet/bolt hitting metal or flesh-ish: crunchy tick.
  hit(e, out, t) {
    const ctx = e.ctx;
    noise(e, t, 0.06).connect(filter(ctx, 'highpass', 1800)).connect(gainEnv(ctx, t, 0.3, 0.001, 0.05)).connect(out);
    const o = tone(ctx, 'square', rnd(180, 240), t, t + 0.07);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.06);
    o.connect(filter(ctx, 'lowpass', 1200)).connect(gainEnv(ctx, t, 0.3, 0.001, 0.06)).connect(out);
    return 0.1;
  },
  ricochet(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sine', rnd(2600, 3400), t, t + 0.25);
    o.frequency.exponentialRampToValueAtTime(rnd(900, 1300), t + 0.22);
    o.connect(gainEnv(ctx, t, 0.07, 0.002, 0.2)).connect(out);
    return 0.25;
  },
  // Explosion: noise burst + sub drop thump + crackle tail.
  explosion(e, out, t, o = {}) {
    const ctx = e.ctx;
    const big = o.big ? 1.6 : 1;
    const sub = tone(ctx, 'sine', 120, t, t + 0.8 * big);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.6 * big);
    sub.connect(gainEnv(ctx, t, 0.9, 0.004, 0.6 * big)).connect(out);
    const n = noise(e, t, 1.2 * big);
    const lp = filter(ctx, 'lowpass', 5000, 0.7);
    lp.frequency.setValueAtTime(6000, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + 0.9 * big);
    n.connect(lp).connect(gainEnv(ctx, t, 0.7, 0.003, 1.0 * big)).connect(out);
    for (let i = 0; i < 10; i++) {
      const ti = t + 0.08 + Math.random() * 0.6 * big;
      noise(e, ti, 0.02).connect(filter(ctx, 'bandpass', rnd(800, 3000), 2)).connect(gainEnv(ctx, ti, rnd(0.05, 0.18), 0.001, 0.02)).connect(out);
    }
    return 1.4 * big;
  },
  // Enemy grunt when hit (formant-y synth "hup").
  grunt(e, out, t, o = {}) {
    const ctx = e.ctx;
    const f = (o.pitch ?? 1) * rnd(110, 140);
    const s = tone(ctx, 'sawtooth', f * 1.2, t, t + 0.2);
    s.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.16);
    const env = gainEnv(ctx, t, 0.3, 0.01, 0.15);
    for (const [ff, q] of [[600, 5], [1100, 6]]) s.connect(filter(ctx, 'bandpass', ff, q)).connect(env);
    env.connect(out);
    return 0.2;
  },
  // Body hitting the floor.
  thud(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sine', 90, t, t + 0.25);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    o.connect(gainEnv(ctx, t, 0.6, 0.003, 0.2)).connect(out);
    noise(e, t, 0.1).connect(filter(ctx, 'lowpass', 600)).connect(gainEnv(ctx, t, 0.4, 0.002, 0.09)).connect(out);
    return 0.3;
  },
  // Ben gets hit: comic "oof".
  oof(e, out, t) {
    const ctx = e.ctx;
    const s = tone(ctx, 'sawtooth', 190, t, t + 0.25);
    s.frequency.linearRampToValueAtTime(240, t + 0.04);
    s.frequency.exponentialRampToValueAtTime(120, t + 0.22);
    const env = gainEnv(ctx, t, 0.35, 0.01, 0.2);
    for (const [ff, q] of [[500, 4], [900, 5], [2400, 8]]) s.connect(filter(ctx, 'bandpass', ff, q)).connect(env);
    env.connect(out);
    SFX.hit(e, out, t);
    return 0.3;
  },
  // Grey alien energy orb: warbly descending zap.
  alien_zap(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sine', 900, t, t + 0.5);
    const l = tone(ctx, 'sine', 24, t, t + 0.5);
    const la = ctx.createGain();
    la.gain.value = 220;
    l.connect(la).connect(o.frequency);
    o.frequency.exponentialRampToValueAtTime(300, t + 0.45);
    o.connect(gainEnv(ctx, t, 0.2, 0.01, 0.45)).connect(out);
    return 0.5;
  },
  // Teleport: rising shimmer swoosh.
  teleport(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'triangle', 300, t, t + 0.45);
    o.frequency.exponentialRampToValueAtTime(2400, t + 0.4);
    o.connect(gainEnv(ctx, t, 0.15, 0.05, 0.38)).connect(out);
    SFX.sparkle(e, out, t + 0.1, { count: 5 });
    return 0.5;
  },
  laser_zap(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sawtooth', 120, t, t + 0.3);
    const l = tone(ctx, 'square', 60, t, t + 0.3);
    const la = ctx.createGain();
    la.gain.value = 80;
    l.connect(la).connect(o.frequency);
    o.connect(filter(ctx, 'lowpass', 2000)).connect(gainEnv(ctx, t, 0.3, 0.002, 0.28)).connect(out);
    return 0.3;
  },
  // Pneumatic blast door hiss + clunk.
  door(e, out, t) {
    const ctx = e.ctx;
    SFX.thud(e, out, t);
    const bp = filter(ctx, 'bandpass', 3000, 0.7);
    bp.frequency.exponentialRampToValueAtTime(800, t + 0.9);
    noise(e, t + 0.05, 1).connect(bp).connect(gainEnv(ctx, t + 0.05, 0.3, 0.02, 0.9)).connect(out);
    return 1.1;
  },
  alarm(e, out, t) {
    const ctx = e.ctx;
    for (let i = 0; i < 2; i++) {
      const ti = t + i * 0.5;
      const o = tone(ctx, 'square', 660, ti, ti + 0.45);
      o.frequency.linearRampToValueAtTime(880, ti + 0.4);
      o.connect(filter(ctx, 'lowpass', 2200)).connect(gainEnv(ctx, ti, 0.12, 0.02, 0.4)).connect(out);
    }
    return 1;
  },
  // CIA agent radioing for backup: crunchy static chatter.
  radio(e, out, t) {
    const ctx = e.ctx;
    const bp = filter(ctx, 'bandpass', 1800, 3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 9; i++) {
      const ti = t + i * 0.07;
      g.gain.setValueAtTime(rnd(0.08, 0.25), ti);
      g.gain.setValueAtTime(0.02, ti + 0.05);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    noise(e, t, 0.7).connect(bp).connect(g).connect(out);
    const beep = tone(ctx, 'sine', 1400, t + 0.72, t + 0.8);
    beep.connect(gainEnv(ctx, t + 0.72, 0.1, 0.002, 0.07)).connect(out);
    return 0.9;
  },
  // Hot dog: CHOMP + happy jingle.
  chomp(e, out, t) {
    const ctx = e.ctx;
    for (let i = 0; i < 2; i++) {
      const ti = t + i * 0.12;
      noise(e, ti, 0.06).connect(filter(ctx, 'lowpass', 900)).connect(gainEnv(ctx, ti, 0.5, 0.002, 0.05)).connect(out);
    }
    [523, 659, 784].forEach((f, i) => tone(ctx, 'triangle', f, t + 0.25 + i * 0.06, t + 0.6).connect(gainEnv(ctx, t + 0.25 + i * 0.06, 0.12, 0.003, 0.2)).connect(out));
    return 0.7;
  },
  checkpoint(e, out, t) {
    const ctx = e.ctx;
    [392, 523, 659, 784, 1047].forEach((f, i) => {
      const ti = t + i * 0.07;
      tone(ctx, 'square', f, ti, ti + 0.3).connect(filter(ctx, 'lowpass', 2500)).connect(gainEnv(ctx, ti, 0.08, 0.003, 0.25)).connect(out);
    });
    return 0.8;
  },
  // Zeus TACKLE: whoosh into a big "thump" (layered with a bark by the caller).
  tackle(e, out, t) {
    SFX.whoosh(e, out, t, { dur: 0.25 });
    SFX.thud(e, out, t + 0.22);
    return 0.5;
  },
  // Water drip echoing in a big space.
  drip(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sine', rnd(1300, 1900), t, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(rnd(500, 700), t + 0.08);
    o.connect(gainEnv(ctx, t, 0.08, 0.001, 0.08)).connect(out);
    return 0.15;
  },
  // Fluorescent tube buzz/flicker.
  buzz(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sawtooth', 120, t, t + 0.4);
    o.connect(filter(ctx, 'bandpass', 2400, 4)).connect(gainEnv(ctx, t, 0.06, 0.01, 0.35)).connect(out);
    return 0.4;
  },
  // Distant machinery clank.
  clank(e, out, t) {
    const ctx = e.ctx;
    for (const [f, a] of [[rnd(180, 260), 0.3], [rnd(700, 900), 0.12], [rnd(1900, 2300), 0.05]]) {
      tone(ctx, 'triangle', f, t, t + 0.6).connect(gainEnv(ctx, t, a, 0.002, 0.5)).connect(out);
    }
    noise(e, t, 0.05).connect(filter(ctx, 'lowpass', 1500)).connect(gainEnv(ctx, t, 0.2, 0.001, 0.04)).connect(out);
    return 0.6;
  },
  steam(e, out, t) {
    const ctx = e.ctx;
    noise(e, t, 1.2).connect(filter(ctx, 'highpass', 2500)).connect(gainEnv(ctx, t, 0.15, 0.1, 1.0)).connect(out);
    return 1.3;
  },
  // Story stinger when Ben finds his rig.
  reveal(e, out, t) {
    const ctx = e.ctx;
    [146.8, 220, 293.7, 349.2, 440, 587.3].forEach((f, i) => {
      const ti = t + i * 0.09;
      tone(ctx, 'sawtooth', f, ti, ti + 2.5).connect(filter(ctx, 'lowpass', 1600)).connect(gainEnv(ctx, ti, 0.08, 0.05, 2.2)).connect(out);
    });
    SFX.sparkle(e, out, t + 0.4, { count: 12 });
    return 3;
  },
});

Object.assign(LOOPS, {
  // Electrical mains hum + air handling rumble.
  hum(e, out) {
    const ctx = e.ctx, t = ctx.currentTime;
    const nodes = [];
    for (const [f, a] of [[60, 0.25], [120, 0.12], [180, 0.05], [240, 0.03]]) {
      const o = tone(ctx, 'sine', f, t, t + 7200);
      const g = ctx.createGain();
      g.gain.value = a;
      o.connect(g).connect(out);
      nodes.push(o);
    }
    const buf = renderLoop(e, 'rumble', 6, (L, R) => {
      let l = 0, r = 0;
      for (let i = 0; i < L.length; i++) {
        l = (l + 0.01 * (Math.random() * 2 - 1)) * 0.998; r = (r + 0.01 * (Math.random() * 2 - 1)) * 0.998;
        L[i] = l * 4; R[i] = r * 4;
      }
    });
    const g = ctx.createGain();
    g.gain.value = 0.6;
    const src = playBuffer(e, buf, g);
    g.connect(filter(ctx, 'lowpass', 250)).connect(out);
    nodes.push(src);
    return loopHandle(e, out, nodes);
  },
  // Drone rotors: buzzy and pannable.
  drone_buzz(e, out) {
    const ctx = e.ctx, t = ctx.currentTime;
    const a = tone(ctx, 'sawtooth', 190, t, t + 7200);
    const b = tone(ctx, 'sawtooth', 197, t, t + 7200);
    const lp = filter(ctx, 'bandpass', 900, 1.5);
    const g = ctx.createGain();
    g.gain.value = 0.18;
    a.connect(lp); b.connect(lp); lp.connect(g).connect(out);
    return loopHandle(e, out, [a, b]);
  },
  // Laser barrier hum.
  laser_hum(e, out) {
    const ctx = e.ctx, t = ctx.currentTime;
    const a = tone(ctx, 'sawtooth', 220, t, t + 7200);
    const l = tone(ctx, 'sine', 7, t, t + 7200);
    const la = ctx.createGain();
    la.gain.value = 6;
    l.connect(la).connect(a.frequency);
    const g = ctx.createGain();
    g.gain.value = 0.08;
    a.connect(filter(ctx, 'bandpass', 1800, 3)).connect(g).connect(out);
    return loopHandle(e, out, [a, l]);
  },
  elevator(e, out) {
    const ctx = e.ctx, t = ctx.currentTime;
    const a = tone(ctx, 'sawtooth', 55, t, t + 7200);
    const g = ctx.createGain();
    g.gain.value = 0.25;
    a.connect(filter(ctx, 'lowpass', 300, 4)).connect(g).connect(out);
    return loopHandle(e, out, [a]);
  },
});

// ---- shop & UI extras --------------------------------------------------------
Object.assign(SFX, {
  // Cash register "ka-ching": bell partials + a drawer thunk.
  cash(e, out, t) {
    const ctx = e.ctx;
    SFX.thud(e, out, t);
    [[1568, 0.05], [2093, 0.11]].forEach(([f, d]) => {
      for (const [ratio, a] of [[1, 0.2], [2.4, 0.08], [3.9, 0.04]]) {
        tone(ctx, 'sine', f * ratio, t + d, t + d + 0.7).connect(gainEnv(ctx, t + d, a, 0.002, 0.6)).connect(out);
      }
    });
    SFX.sparkle(e, out, t + 0.12, { count: 6 });
    return 0.9;
  },
  // Not enough sats: sad trombone-ish two notes.
  denied(e, out, t) {
    const ctx = e.ctx;
    [[220, 0], [196, 0.16]].forEach(([f, d]) => {
      const o = tone(ctx, 'sawtooth', f, t + d, t + d + 0.25);
      o.frequency.linearRampToValueAtTime(f * 0.94, t + d + 0.22);
      o.connect(filter(ctx, 'lowpass', 900)).connect(gainEnv(ctx, t + d, 0.15, 0.01, 0.22)).connect(out);
    });
    return 0.45;
  },
  // SUV engines roaring up + tire screech (intro raid)
  screech(e, out, t) {
    const ctx = e.ctx;
    const bp = filter(ctx, 'bandpass', 2600, 6);
    bp.frequency.linearRampToValueAtTime(1900, t + 0.7);
    noise(e, t, 0.8).connect(bp).connect(gainEnv(ctx, t, 0.35, 0.03, 0.7)).connect(out);
    return 0.9;
  },
  knock(e, out, t) {
    for (let i = 0; i < 3; i++) SFX.thud(e, out, t + i * 0.18);
    return 0.7;
  },
  glitch(e, out, t) {
    const ctx = e.ctx;
    for (let i = 0; i < 8; i++) {
      const ti = t + i * 0.045;
      tone(ctx, 'square', rnd(200, 2400), ti, ti + 0.04).connect(filter(ctx, 'lowpass', 4000)).connect(gainEnv(ctx, ti, 0.08, 0.001, 0.035)).connect(out);
    }
    return 0.4;
  },
});

// ---- stealth (Chapter 3) -------------------------------------------------------
Object.assign(SFX, {
  // Guard notices something: a quick rising two-note "huh?"
  suspicious(e, out, t) {
    const ctx = e.ctx;
    [[440, 0], [660, 0.09]].forEach(([f, d]) => tone(ctx, 'triangle', f, t + d, t + d + 0.15).connect(gainEnv(ctx, t + d, 0.14, 0.005, 0.12)).connect(out));
    return 0.3;
  },
  // SPOTTED! sharp metallic stinger with a sub hit
  spotted(e, out, t) {
    const ctx = e.ctx;
    for (const [f, a] of [[1760, 0.16], [2637, 0.1], [3520, 0.06]]) {
      tone(ctx, 'square', f, t, t + 0.4).connect(filter(ctx, 'lowpass', 5000)).connect(gainEnv(ctx, t, a, 0.002, 0.35)).connect(out);
    }
    const sub = tone(ctx, 'sine', 110, t, t + 0.4);
    sub.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    sub.connect(gainEnv(ctx, t, 0.6, 0.003, 0.35)).connect(out);
    return 0.5;
  },
  // Motion sensor ping (sonar-like)
  sensor_ping(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sine', 1320, t, t + 0.5);
    o.frequency.exponentialRampToValueAtTime(990, t + 0.4);
    o.connect(gainEnv(ctx, t, 0.06, 0.003, 0.45)).connect(out);
    return 0.5;
  },
  // Wire snip
  snip(e, out, t) {
    const ctx = e.ctx;
    noise(e, t, 0.04).connect(filter(ctx, 'highpass', 3500)).connect(gainEnv(ctx, t, 0.4, 0.001, 0.035)).connect(out);
    tone(ctx, 'triangle', 2400, t, t + 0.12).connect(gainEnv(ctx, t, 0.12, 0.001, 0.1)).connect(out);
    return 0.15;
  },
  // Bush rustle when hiding
  rustle(e, out, t) {
    const ctx = e.ctx;
    for (let i = 0; i < 4; i++) {
      const ti = t + i * 0.05;
      noise(e, ti, 0.06).connect(filter(ctx, 'bandpass', rnd(2500, 4500), 1)).connect(gainEnv(ctx, ti, 0.14, 0.01, 0.05)).connect(out);
    }
    return 0.3;
  },
  // Caught: deflating "wah-wah"
  caught(e, out, t) {
    const ctx = e.ctx;
    [[392, 0], [370, 0.22], [349, 0.44], [330, 0.66]].forEach(([f, d], i) => {
      const o = tone(ctx, 'sawtooth', f, t + d, t + d + (i === 3 ? 0.7 : 0.22));
      if (i === 3) o.frequency.linearRampToValueAtTime(300, t + d + 0.65);
      o.connect(filter(ctx, 'lowpass', 1200)).connect(gainEnv(ctx, t + d, 0.14, 0.01, i === 3 ? 0.6 : 0.2)).connect(out);
    });
    return 1.4;
  },
});
