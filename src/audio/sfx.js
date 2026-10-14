// ============================================================================
//  SOUND EFFECTS — synthesized and layered for punch.
//  One-shots: SFX[name](engine, out, time, opts) -> duration (seconds)
//  Loops:     LOOPS[name](engine, out, opts) -> { set(params), stop(fade) }
//
//  To replace any of these with a recorded file, drop it in public/assets/audio
//  and register it in src/audio/samples.js — samples always win over synths.
// ============================================================================

const rnd = (a, b) => a + Math.random() * (b - a);

function noise(e, t, dur, { loop = false } = {}) {
  const s = e.ctx.createBufferSource();
  s.buffer = e.noise;
  if (loop) { s.loop = true; s.start(t); return s; }
  s.start(t, rnd(0, e.noise.duration - dur - 0.05), dur + 0.05);
  return s;
}
function filter(ctx, type, freq, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}
function gainEnv(ctx, t, peak, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}
function tone(ctx, type, f, t, stop) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.start(t);
  o.stop(stop);
  return o;
}

// ---------------------------------------------------------------------------
export const SFX = {
  // ---------- UI -----------------------------------------------------------
  ui_hover(e, out, t) {
    const g = gainEnv(e.ctx, t, 0.12, 0.002, 0.04);
    tone(e.ctx, 'sine', 2100, t, t + 0.06).connect(g).connect(out);
    return 0.06;
  },
  ui_click(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sine', 700, t, t + 0.09);
    o.frequency.exponentialRampToValueAtTime(260, t + 0.07);
    o.connect(gainEnv(ctx, t, 0.45, 0.002, 0.08)).connect(out);
    noise(e, t, 0.02).connect(filter(ctx, 'highpass', 4000)).connect(gainEnv(ctx, t, 0.2, 0.001, 0.02)).connect(out);
    return 0.1;
  },
  ui_confirm(e, out, t) {
    const ctx = e.ctx;
    [[784, 0], [1175, 0.07], [1568, 0.14]].forEach(([f, d]) => {
      const g = gainEnv(ctx, t + d, 0.22, 0.004, 0.35);
      tone(ctx, 'triangle', f, t + d, t + d + 0.4).connect(g).connect(out);
      const g2 = gainEnv(ctx, t + d, 0.05, 0.002, 0.2);
      tone(ctx, 'sine', f * 3, t + d, t + d + 0.25).connect(g2).connect(out);
    });
    return 0.6;
  },
  ui_back(e, out, t) {
    const ctx = e.ctx;
    [[880, 0], [587, 0.06]].forEach(([f, d]) => {
      tone(ctx, 'triangle', f, t + d, t + d + 0.2).connect(gainEnv(ctx, t + d, 0.2, 0.003, 0.15)).connect(out);
    });
    return 0.3;
  },
  ui_toggle(e, out, t, o = {}) {
    const f = o.on === false ? 520 : 820;
    tone(e.ctx, 'square', f, t, t + 0.06).connect(filter(e.ctx, 'lowpass', 2500)).connect(gainEnv(e.ctx, t, 0.1, 0.002, 0.05)).connect(out);
    return 0.07;
  },
  // Typewriter blip for dialogue; opts.pitch picks the character's "voice".
  blip(e, out, t, o = {}) {
    const f = (o.pitch ?? 260) * rnd(0.94, 1.06);
    tone(e.ctx, o.wave ?? 'square', f, t, t + 0.05).connect(filter(e.ctx, 'lowpass', 1800)).connect(gainEnv(e.ctx, t, 0.09, 0.002, 0.035)).connect(out);
    return 0.05;
  },

  // ---------- ZEUS ---------------------------------------------------------
  // A bark = harmonically rich voiced source through dog-mouth formants,
  // with a fast pitch rise/fall and a little breathy rasp.
  bark(e, out, t, o = {}) {
    const ctx = e.ctx;
    const p = (o.pitch ?? 1) * rnd(0.9, 1.12);
    const f0 = 360 * p, dur = rnd(0.12, 0.17);
    const src = tone(ctx, 'sawtooth', f0 * 0.75, t, t + dur + 0.05);
    src.frequency.linearRampToValueAtTime(f0 * 1.3, t + 0.025);
    src.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(1, t + 0.008);
    env.gain.setValueAtTime(0.9, t + dur * 0.4);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const mix = ctx.createGain();
    mix.gain.value = 0.55;
    for (const [f, q, a] of [[650, 4, 1], [1200, 6, 0.8], [2500, 8, 0.35]]) {
      const bp = filter(ctx, 'bandpass', f * (0.9 + p * 0.1), q);
      const ga = ctx.createGain();
      ga.gain.value = a;
      src.connect(bp).connect(ga).connect(env);
    }
    const rasp = noise(e, t, dur);
    const rg = ctx.createGain();
    rg.gain.value = 0.25;
    rasp.connect(filter(ctx, 'bandpass', 1500, 1.2)).connect(rg).connect(env);
    // Chest thump under the bark.
    const chest = tone(ctx, 'sine', f0 * 0.5, t, t + 0.1);
    chest.connect(gainEnv(ctx, t, 0.5, 0.004, 0.08)).connect(out);
    env.connect(mix).connect(out);
    return dur + 0.1;
  },
  // Double bark
  bark2(e, out, t, o = {}) {
    SFX.bark(e, out, t, o);
    SFX.bark(e, out, t + rnd(0.17, 0.22), { pitch: (o.pitch ?? 1) * 1.05 });
    return 0.45;
  },
  // The big boy "boof": low, closed-mouth, muffled.
  boof(e, out, t) {
    const ctx = e.ctx;
    const dur = 0.24;
    const src = tone(ctx, 'sawtooth', 170, t, t + dur + 0.05);
    src.frequency.linearRampToValueAtTime(230, t + 0.04);
    src.frequency.exponentialRampToValueAtTime(140, t + dur);
    const lp = filter(ctx, 'lowpass', 750, 3);
    const env = gainEnv(ctx, t, 0.9, 0.015, dur);
    src.connect(lp).connect(env).connect(out);
    noise(e, t, dur).connect(filter(ctx, 'bandpass', 500, 1)).connect(gainEnv(ctx, t, 0.25, 0.01, dur)).connect(out);
    return dur + 0.1;
  },
  // Sad/curious whine with a wobbly glide.
  whine(e, out, t, o = {}) {
    const ctx = e.ctx;
    const dur = o.long ? 1.1 : 0.7;
    const src = tone(ctx, 'triangle', 820, t, t + dur + 0.05);
    src.frequency.linearRampToValueAtTime(1150, t + dur * 0.35);
    src.frequency.linearRampToValueAtTime(760, t + dur);
    const vib = tone(ctx, 'sine', 7, t, t + dur);
    const va = ctx.createGain();
    va.gain.value = 22;
    vib.connect(va).connect(src.frequency);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.28, t + 0.08);
    env.gain.setValueAtTime(0.25, t + dur * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter(ctx, 'bandpass', 1100, 2.5)).connect(env).connect(out);
    return dur;
  },
  // Happy panting: alternating in/out breath bursts.
  pant(e, out, t, o = {}) {
    const ctx = e.ctx;
    const n = o.count ?? 6;
    for (let i = 0; i < n; i++) {
      const ti = t + i * 0.12;
      const f = i % 2 ? 1300 : 1900;
      noise(e, ti, 0.08).connect(filter(ctx, 'bandpass', f, 2)).connect(gainEnv(ctx, ti, i % 2 ? 0.14 : 0.2, 0.02, 0.06)).connect(out);
    }
    return n * 0.12;
  },
  // Collar tags jingling: inharmonic metal partials.
  jingle(e, out, t, o = {}) {
    const ctx = e.ctx;
    const hits = o.hits ?? Math.floor(rnd(2, 4));
    for (let h = 0; h < hits; h++) {
      const th = t + h * rnd(0.04, 0.08);
      const f = rnd(2600, 3600);
      const g = gainEnv(ctx, th, 0.06 * (o.volume ?? 1), 0.001, 0.14);
      for (const r of [1, 2.32, 4.25]) tone(ctx, 'sine', f * r, th, th + 0.18).connect(g);
      g.connect(out);
    }
    return 0.4;
  },
  // Sniff: two short nasal intakes.
  sniff(e, out, t) {
    const ctx = e.ctx;
    for (let i = 0; i < 3; i++) {
      const ti = t + i * 0.09;
      const bp = filter(ctx, 'bandpass', 3000, 3);
      bp.frequency.setValueAtTime(2200, ti);
      bp.frequency.linearRampToValueAtTime(3800, ti + 0.06);
      noise(e, ti, 0.07).connect(bp).connect(gainEnv(ctx, ti, 0.18, 0.02, 0.05)).connect(out);
    }
    return 0.35;
  },

  // ---------- movement -----------------------------------------------------
  step_sand(e, out, t) {
    const ctx = e.ctx;
    noise(e, t, 0.07).connect(filter(ctx, 'bandpass', rnd(1800, 2800), 0.8)).connect(gainEnv(ctx, t, 0.12, 0.005, 0.06)).connect(out);
    noise(e, t, 0.05).connect(filter(ctx, 'lowpass', 300)).connect(gainEnv(ctx, t, 0.18, 0.003, 0.04)).connect(out);
    return 0.08;
  },
  step_metal(e, out, t) {
    const ctx = e.ctx;
    const f = rnd(1900, 2400);
    tone(ctx, 'sine', f, t, t + 0.12).connect(gainEnv(ctx, t, 0.05, 0.001, 0.1)).connect(out);
    tone(ctx, 'triangle', rnd(160, 200), t, t + 0.08).connect(gainEnv(ctx, t, 0.2, 0.002, 0.06)).connect(out);
    noise(e, t, 0.03).connect(filter(ctx, 'highpass', 3000)).connect(gainEnv(ctx, t, 0.08, 0.001, 0.025)).connect(out);
    return 0.12;
  },
  jump(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'triangle', 240, t, t + 0.16);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.12);
    o.connect(gainEnv(ctx, t, 0.16, 0.005, 0.12)).connect(out);
    noise(e, t, 0.12).connect(filter(ctx, 'bandpass', 1400, 1)).connect(gainEnv(ctx, t, 0.08, 0.01, 0.1)).connect(out);
    return 0.16;
  },
  land(e, out, t) {
    const ctx = e.ctx;
    noise(e, t, 0.12).connect(filter(ctx, 'lowpass', 380)).connect(gainEnv(ctx, t, 0.5, 0.002, 0.1)).connect(out);
    noise(e, t, 0.1).connect(filter(ctx, 'bandpass', 2200, 0.7)).connect(gainEnv(ctx, t, 0.12, 0.004, 0.09)).connect(out);
    return 0.14;
  },
  whoosh(e, out, t, o = {}) {
    const ctx = e.ctx;
    const d = o.dur ?? 0.35;
    const bp = filter(ctx, 'bandpass', 300, 1.4);
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + d * 0.5);
    bp.frequency.exponentialRampToValueAtTime(600, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + d * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    noise(e, t, d).connect(bp).connect(g).connect(out);
    return d;
  },

  // ---------- pickups ----------------------------------------------------------
  // Satisfying rising chime; opts.combo (0..n) pitches it up a scale.
  coin(e, out, t, o = {}) {
    const ctx = e.ctx;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    const semi = scale[Math.min(scale.length - 1, o.combo ?? 0)];
    const base = 987.77 * Math.pow(2, semi / 12); // B5
    [[base, 0], [base * 1.335, 0.055]].forEach(([f, d]) => {
      tone(ctx, 'square', f, t + d, t + d + 0.3).connect(filter(ctx, 'lowpass', 5000)).connect(gainEnv(ctx, t + d, 0.07, 0.002, 0.25)).connect(out);
      tone(ctx, 'sine', f, t + d, t + d + 0.45).connect(gainEnv(ctx, t + d, 0.18, 0.002, 0.4)).connect(out);
    });
    tone(ctx, 'sine', base * 4, t + 0.06, t + 0.3).connect(gainEnv(ctx, t + 0.06, 0.03, 0.001, 0.2)).connect(out);
    return 0.5;
  },
  // Golden bitcoin: a big shimmering fanfare.
  golden(e, out, t) {
    const ctx = e.ctx;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const ti = t + i * 0.06;
      tone(ctx, 'triangle', f, ti, ti + 1.2).connect(gainEnv(ctx, ti, 0.16, 0.004, 1.0)).connect(out);
      tone(ctx, 'sine', f * 2, ti, ti + 0.9).connect(gainEnv(ctx, ti, 0.05, 0.002, 0.7)).connect(out);
    });
    SFX.sparkle(e, out, t + 0.25, { count: 10 });
    return 1.5;
  },
  sparkle(e, out, t, o = {}) {
    const ctx = e.ctx;
    const n = o.count ?? 6;
    for (let i = 0; i < n; i++) {
      const ti = t + rnd(0, 0.45);
      const f = rnd(2500, 6000);
      tone(ctx, 'sine', f, ti, ti + 0.2).connect(gainEnv(ctx, ti, 0.04, 0.001, 0.15)).connect(out);
    }
    return 0.7;
  },

  // ---------- sky stuff ----------------------------------------------------------
  shooting_star(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sine', 3400, t, t + 0.8);
    o.frequency.exponentialRampToValueAtTime(1200, t + 0.7);
    o.connect(gainEnv(ctx, t, 0.035, 0.05, 0.6)).connect(out);
    SFX.sparkle(e, out, t + 0.1, { count: 4 });
    return 0.9;
  },
  ufo_warble(e, out, t) {
    const ctx = e.ctx;
    const o = tone(ctx, 'sine', 420, t, t + 1.4);
    const lfo = tone(ctx, 'sine', 9, t, t + 1.4);
    const la = ctx.createGain();
    la.gain.value = 90;
    lfo.connect(la).connect(o.frequency);
    o.frequency.linearRampToValueAtTime(820, t + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.35);
    o.connect(g).connect(out);
    return 1.4;
  },
  // Coyote howl (ambience event): gliding voice with formant + vibrato.
  coyote(e, out, t) {
    const ctx = e.ctx;
    const d = rnd(1.4, 2.0);
    const o = tone(ctx, 'sawtooth', 520, t, t + d + 0.1);
    o.frequency.linearRampToValueAtTime(rnd(780, 900), t + d * 0.3);
    o.frequency.linearRampToValueAtTime(rnd(600, 700), t + d * 0.85);
    o.frequency.linearRampToValueAtTime(380, t + d);
    const vib = tone(ctx, 'sine', 5.5, t, t + d);
    const va = ctx.createGain();
    va.gain.value = 14;
    vib.connect(va).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.25);
    g.gain.setValueAtTime(0.06, t + d * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(filter(ctx, 'bandpass', 900, 3)).connect(g).connect(out);
    return d;
  },
  fire_pop(e, out, t) {
    const ctx = e.ctx;
    noise(e, t, 0.03).connect(filter(ctx, 'bandpass', rnd(1500, 4000), 2)).connect(gainEnv(ctx, t, rnd(0.08, 0.2), 0.001, 0.03)).connect(out);
    return 0.05;
  },
};

// ---------------------------------------------------------------------------
//  LOOPS
// ---------------------------------------------------------------------------
function loopHandle(e, out, nodes, setters = {}) {
  return {
    set(params) {
      for (const [k, v] of Object.entries(params)) setters[k]?.(v, e.ctx.currentTime);
    },
    stop(fade = 0.5) {
      const now = e.ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0.0001, now + fade);
      setTimeout(() => {
        nodes.forEach((n) => { try { n.stop?.(); } catch (_) { /* noop */ } });
        try { out.disconnect(); } catch (_) { /* noop */ }
      }, (fade + 0.2) * 1000);
    },
  };
}

/** Pre-render a looping buffer with a generator fn(dataL, dataR, sampleRate). */
const bufCache = new Map();
function renderLoop(e, key, seconds, gen) {
  if (bufCache.has(key)) return bufCache.get(key);
  const sr = e.ctx.sampleRate;
  const buf = e.ctx.createBuffer(2, Math.floor(sr * seconds), sr);
  gen(buf.getChannelData(0), buf.getChannelData(1), sr);
  bufCache.set(key, buf);
  return buf;
}
function playBuffer(e, buf, dest) {
  const s = e.ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.connect(dest);
  s.start(e.ctx.currentTime, Math.random() * buf.duration);
  return s;
}

export const LOOPS = {
  // Desert wind: noise through a slowly wandering bandpass, gusting.
  wind(e, out) {
    const ctx = e.ctx;
    const buf = renderLoop(e, 'wind', 8, (L, R, sr) => {
      // Brown-ish noise, decorrelated L/R for width.
      let l = 0, r = 0;
      for (let i = 0; i < L.length; i++) {
        l = (l + 0.02 * (Math.random() * 2 - 1)) * 0.995;
        r = (r + 0.02 * (Math.random() * 2 - 1)) * 0.995;
        L[i] = l * 3.5; R[i] = r * 3.5;
      }
      // Loop-seamless crossfade of the edges.
      const xf = Math.floor(sr * 0.5);
      for (let i = 0; i < xf; i++) {
        const a = i / xf;
        L[i] = L[i] * a + L[L.length - xf + i] * (1 - a);
        R[i] = R[i] * a + R[R.length - xf + i] * (1 - a);
      }
    });
    const src = playBuffer(e, buf, ctx.createGain());
    const bp = filter(ctx, 'bandpass', 500, 0.6);
    const lfo = tone(ctx, 'sine', 0.07, ctx.currentTime, ctx.currentTime + 3600);
    const la = ctx.createGain();
    la.gain.value = 260;
    lfo.connect(la).connect(bp.frequency);
    const gust = ctx.createGain();
    gust.gain.value = 0.8;
    const lfo2 = tone(ctx, 'sine', 0.11, ctx.currentTime, ctx.currentTime + 3600);
    const la2 = ctx.createGain();
    la2.gain.value = 0.35;
    lfo2.connect(la2).connect(gust.gain);
    src.disconnect();
    src.connect(bp).connect(gust).connect(out);
    return loopHandle(e, out, [src, lfo, lfo2]);
  },

  // Crickets: pre-rendered chorus of chirping crickets at different pitches/positions.
  crickets(e, out) {
    const buf = renderLoop(e, 'crickets', 6, (L, R, sr) => {
      const crickets = [
        { f: 4300, pan: -0.6, period: 0.62 },
        { f: 4700, pan: 0.5, period: 0.83 },
        { f: 3900, pan: 0.1, period: 1.1 },
      ];
      for (const c of crickets) {
        for (let start = Math.random() * 0.4; start < 5.6; start += c.period * rnd(0.85, 1.15)) {
          const pulses = 3 + Math.floor(Math.random() * 2);
          for (let p = 0; p < pulses; p++) {
            const s0 = Math.floor((start + p * 0.035) * sr);
            const n = Math.floor(0.022 * sr);
            for (let i = 0; i < n && s0 + i < L.length; i++) {
              const env = Math.sin((i / n) * Math.PI);
              const v = Math.sin((2 * Math.PI * c.f * i) / sr) * env * 0.18;
              L[s0 + i] += v * (1 - c.pan) * 0.5;
              R[s0 + i] += v * (1 + c.pan) * 0.5;
            }
          }
        }
      }
    });
    return loopHandle(e, out, [playBuffer(e, buf, out)]);
  },

  // Campfire: pre-rendered crackles over a soft roar.
  fire(e, out) {
    const buf = renderLoop(e, 'fire', 5, (L, R, sr) => {
      let b = 0;
      for (let i = 0; i < L.length; i++) {
        b = (b + 0.03 * (Math.random() * 2 - 1)) * 0.99;
        L[i] = R[i] = b * 1.2;
      }
      const pops = 70;
      for (let p = 0; p < pops; p++) {
        const s0 = Math.floor(Math.random() * (L.length - sr * 0.05));
        const amp = Math.pow(Math.random(), 2) * 0.7;
        const len = Math.floor(sr * rnd(0.002, 0.012));
        const pan = Math.random();
        for (let i = 0; i < len; i++) {
          const v = (Math.random() * 2 - 1) * amp * Math.exp(-i / (len / 3));
          L[s0 + i] += v * (1 - pan);
          R[s0 + i] += v * pan;
        }
      }
    });
    const src = playBuffer(e, buf, e.ctx.createGain());
    src.disconnect();
    src.connect(filter(e.ctx, 'highpass', 120)).connect(out);
    return loopHandle(e, out, [src]);
  },

  // UFO hum: detuned low saws + eerie high whine with tremolo.
  ufo_hum(e, out) {
    const ctx = e.ctx;
    const t = ctx.currentTime;
    const nodes = [];
    const lp = filter(ctx, 'lowpass', 320, 2);
    for (const f of [55, 55.8, 110.3]) {
      const o = tone(ctx, 'sawtooth', f, t, t + 3600);
      o.connect(lp);
      nodes.push(o);
    }
    const lowG = ctx.createGain();
    lowG.gain.value = 0.35;
    lp.connect(lowG).connect(out);
    const whine = tone(ctx, 'sine', 1760, t, t + 3600);
    const trem = ctx.createGain();
    trem.gain.value = 0.02;
    const tl = tone(ctx, 'sine', 11, t, t + 3600);
    const ta = ctx.createGain();
    ta.gain.value = 0.015;
    tl.connect(ta).connect(trem.gain);
    whine.connect(trem).connect(out);
    nodes.push(whine, tl);
    return loopHandle(e, out, nodes, {
      pitch(v, now) { whine.frequency.setTargetAtTime(1760 * v, now, 0.2); },
    });
  },

  // Van engine: rpm param 0..1 drives pitch & brightness.
  engine(e, out) {
    const ctx = e.ctx;
    const t = ctx.currentTime;
    const a = tone(ctx, 'sawtooth', 48, t, t + 7200);
    const b = tone(ctx, 'square', 24, t, t + 7200);
    const lp = filter(ctx, 'lowpass', 400, 3);
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.tanh(x * 2.5); }
    shaper.curve = curve;
    const bg = ctx.createGain();
    bg.gain.value = 0.6;
    a.connect(lp);
    b.connect(bg).connect(lp);
    lp.connect(shaper).connect(out);
    return loopHandle(e, out, [a, b], {
      rpm(v, now) {
        const f = 38 + v * 70;
        a.frequency.setTargetAtTime(f, now, 0.15);
        b.frequency.setTargetAtTime(f / 2, now, 0.15);
        lp.frequency.setTargetAtTime(300 + v * 1200, now, 0.15);
      },
    });
  },
};
