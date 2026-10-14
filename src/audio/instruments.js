// ============================================================================
//  SYNTH INSTRUMENTS
//  Every instrument has the signature  fn(engine, layer, time, freqs, dur, vel)
//  and connects its voices into  layer.input. Per-layer settings come from
//  layer.def.params (see the song files in src/audio/music).
// ============================================================================

// ---------- small helpers ---------------------------------------------------

/** ADSR on a GainNode's gain. Returns the time the voice is fully silent. */
function adsr(param, t, dur, peak, a = 0.005, d = 0.1, s = 0.6, r = 0.2) {
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setTargetAtTime(peak * s, t + a, d / 3);
  const end = t + Math.max(dur, a + 0.01);
  param.setTargetAtTime(0.0001, end, r / 4);
  return end + r * 1.5;
}

function osc(ctx, type, freq, t, detuneCents = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (detuneCents) o.detune.setValueAtTime(detuneCents, t);
  return o;
}

const pulseWaves = new WeakMap();
/** 25% pulse wave (classic NES-ish arpeggio tone, but warmer). */
function pulseWave(ctx) {
  if (pulseWaves.has(ctx)) return pulseWaves.get(ctx);
  const N = 32, duty = 0.25;
  const real = new Float32Array(N), imag = new Float32Array(N);
  for (let n = 1; n < N; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty) * Math.exp(-n * 0.04);
  const w = ctx.createPeriodicWave(real, imag);
  pulseWaves.set(ctx, w);
  return w;
}

// ---------- Karplus–Strong plucked string (the "desert guitar") -------------
const ksCache = new Map();
function ksBuffer(ctx, freq, { damping = 0.996, bright = 0.6, seconds = 3 } = {}) {
  const key = `${ctx.sampleRate}:${freq.toFixed(2)}:${damping}:${bright}`;
  if (ksCache.has(key)) return ksCache.get(key);
  const sr = ctx.sampleRate;
  const N = Math.max(2, Math.floor(sr / freq - 0.5));
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const ring = new Float32Array(N);
  // Excite with filtered noise: darker excitation = rounder, warmer pluck.
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += ((Math.random() * 2 - 1) - lp) * bright;
    ring[i] = lp;
  }
  // Pick position comb: subtract a delayed copy for that twangy bridge pickup tone.
  const pick = Math.floor(N * 0.18);
  for (let i = N - 1; i >= pick; i--) ring[i] -= ring[i - pick] * 0.6;
  let idx = 0, peak = 0;
  // Higher notes naturally decay faster on a real string.
  const damp = Math.pow(damping, Math.max(1, freq / 220) * 0.6);
  for (let i = 0; i < len; i++) {
    const a = ring[idx], b = ring[(idx + 1) % N];
    ring[idx] = damp * 0.5 * (a + b);
    out[i] = a;
    if (Math.abs(a) > peak) peak = Math.abs(a);
    idx = (idx + 1) % N;
  }
  const norm = peak > 0 ? 0.9 / peak : 1;
  for (let i = 0; i < len; i++) out[i] *= norm;
  const res = { buf, rate: freq / (sr / (N + 0.5)) };
  ksCache.set(key, res);
  return res;
}

// ---------- instruments ------------------------------------------------------

/** Warm analog pad: detuned saw pairs spread in stereo through a slow filter. */
function pad(e, layer, t, freqs, dur, vel) {
  const ctx = e.ctx, p = layer.def.params || {};
  const cutoff = p.cutoff ?? 1400;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.Q.value = p.q ?? 0.7;
  filt.frequency.setValueAtTime(cutoff * 0.35, t);
  filt.frequency.linearRampToValueAtTime(cutoff, t + Math.min(dur, p.attack ?? 0.8) + 0.2);
  filt.frequency.setTargetAtTime(cutoff * 0.6, t + dur * 0.6, dur * 0.3);
  const g = ctx.createGain();
  const end = adsr(g.gain, t, dur, 0.16 * vel, p.attack ?? 0.6, 0.8, 0.85, p.release ?? 1.2);
  filt.connect(g).connect(layer.input);
  const det = p.detune ?? 9;
  for (const f of freqs) {
    for (const side of [-1, 1]) {
      const o = osc(ctx, p.wave ?? 'sawtooth', f, t, det * side);
      layer.padPans = layer.padPans ?? {};
      const key = `${side}`;
      if (!layer.padPans[key] || layer.padPans[key].filt !== filt) {
        const pan = ctx.createStereoPanner();
        pan.pan.value = side * (p.width ?? 0.6);
        pan.connect(filt);
        layer.padPans[key] = { pan, filt };
      }
      o.connect(layer.padPans[key].pan);
      o.start(t);
      o.stop(end);
    }
  }
  if (p.sub) {
    const o = osc(ctx, 'triangle', freqs[0] / 2, t);
    o.connect(filt);
    o.start(t);
    o.stop(end);
  }
}

/** Twangy plucked guitar (Karplus–Strong), optional slide-in. */
function pluck(e, layer, t, freqs, dur, vel) {
  const ctx = e.ctx, p = layer.def.params || {};
  for (const f of freqs) {
    const { buf, rate } = ksBuffer(ctx, f, p);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.setValueAtTime(rate * (p.slide ? 0.94 : 1), t);
    if (p.slide) src.playbackRate.linearRampToValueAtTime(rate, t + 0.06);
    if (!layer.twang) {
      layer.twang = ctx.createBiquadFilter();
      layer.twang.type = 'peaking';
      layer.twang.frequency.value = p.twangFreq ?? 1800;
      layer.twang.gain.value = p.twang ?? 6;
      layer.twang.Q.value = 1.2;
      layer.twang.connect(layer.input);
    }
    const g = ctx.createGain();
    const hold = Math.max(dur, 0.15) + (p.ring ?? 0.6);
    g.gain.setValueAtTime(0.9 * vel, t);
    g.gain.setTargetAtTime(0.0001, t + hold, 0.12);
    src.connect(g).connect(layer.twang);
    src.start(t);
    src.stop(t + hold + 0.6);
  }
}

/** Fat synth bass: saw + square sub, plucky filter envelope. */
function bass(e, layer, t, freqs, dur, vel) {
  const ctx = e.ctx, p = layer.def.params || {};
  const f = freqs[0];
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.Q.value = p.q ?? 4;
  const cut = p.cutoff ?? 520;
  filt.frequency.setValueAtTime(cut * 3.5, t);
  filt.frequency.setTargetAtTime(cut, t, p.decay ?? 0.08);
  const g = ctx.createGain();
  const end = adsr(g.gain, t, dur * 0.95, 0.42 * vel, 0.004, 0.18, 0.7, 0.08);
  const a = osc(ctx, 'sawtooth', f, t, 0);
  const b = osc(ctx, 'square', f / 2, t, 0);
  const bg = ctx.createGain();
  bg.gain.value = 0.5;
  a.connect(filt);
  b.connect(bg).connect(filt);
  filt.connect(g).connect(layer.input);
  a.start(t); b.start(t);
  a.stop(end); b.stop(end);
}

/** Retro arpeggio: soft 25% pulse with a short blip envelope. */
function arp(e, layer, t, freqs, dur, vel) {
  const ctx = e.ctx, p = layer.def.params || {};
  for (const f of freqs) {
    const o = ctx.createOscillator();
    if (p.wave) o.type = p.wave; else o.setPeriodicWave(pulseWave(ctx));
    o.frequency.setValueAtTime(f, t);
    // per-note filter envelope = the arp's plucky 'blip' character (restored)
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(p.cutoff ?? 3200, t);
    filt.frequency.setTargetAtTime((p.cutoff ?? 3200) * 0.4, t, 0.05);
    const g = ctx.createGain();
    const end = adsr(g.gain, t, Math.min(dur, p.gate ?? 0.09), 0.22 * vel, 0.003, 0.06, 0.4, 0.08);
    o.connect(filt).connect(g).connect(layer.input);
    o.start(t);
    o.stop(end);
  }
}

/** Synthwave lead: two detuned saws, delayed vibrato, gentle glide. */
function lead(e, layer, t, freqs, dur, vel) {
  const ctx = e.ctx, p = layer.def.params || {};
  const f = freqs[0];
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.Q.value = 2;
  filt.frequency.setValueAtTime(p.cutoff ?? 2600, t);
  const g = ctx.createGain();
  const end = adsr(g.gain, t, dur, 0.2 * vel, 0.02, 0.2, 0.75, p.release ?? 0.25);
  const vib = ctx.createOscillator();
  vib.frequency.value = 5.5;
  const vibAmt = ctx.createGain();
  vibAmt.gain.setValueAtTime(0, t);
  vibAmt.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.5, dur));
  vib.connect(vibAmt);
  for (const d of [-7, 7]) {
    const o = osc(ctx, p.wave ?? 'sawtooth', f, t, d);
    if (layer.lastFreq && p.glide) {
      o.frequency.setValueAtTime(layer.lastFreq, t);
      o.frequency.exponentialRampToValueAtTime(f, t + p.glide);
    }
    vibAmt.connect(o.frequency);
    o.connect(filt);
    o.start(t);
    o.stop(end);
  }
  layer.lastFreq = f;
  vib.start(t);
  vib.stop(end);
  filt.connect(g).connect(layer.input);
}

/**
 * Theremin: one persistent monophonic voice that glides between notes with
 * a wobbly vibrato. Eerie alien vibes.
 */
function theremin(e, layer, t, freqs, dur, vel) {
  const ctx = e.ctx, p = layer.def.params || {};
  const f = freqs[0];
  if (!layer.voice) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    const vib = ctx.createOscillator();
    vib.frequency.value = p.vibRate ?? 5.2;
    const vibAmt = ctx.createGain();
    vibAmt.gain.value = 0;
    vib.connect(vibAmt);
    vibAmt.connect(o.frequency);
    vibAmt.connect(o2.frequency);
    const amp = ctx.createGain();
    amp.gain.value = 0;
    o.connect(amp);
    o2.connect(g2).connect(amp);
    amp.connect(layer.input);
    o.frequency.value = f;
    o2.frequency.value = f;
    o.start(); o2.start(); vib.start();
    layer.voice = { o, o2, vibAmt, amp, stop: (at) => { o.stop(at); o2.stop(at); vib.stop(at); } };
  }
  const v = layer.voice;
  const glide = p.glide ?? 0.12;
  for (const node of [v.o, v.o2]) {
    node.frequency.cancelScheduledValues(t);
    node.frequency.setTargetAtTime(f, t, glide);
  }
  v.vibAmt.gain.cancelScheduledValues(t);
  v.vibAmt.gain.setValueAtTime(f * 0.004, t);
  v.vibAmt.gain.linearRampToValueAtTime(f * (p.vibDepth ?? 0.02), t + 0.6);
  v.amp.gain.cancelScheduledValues(t);
  v.amp.gain.setTargetAtTime(0.22 * vel, t, 0.08);
  v.amp.gain.setTargetAtTime(0.0, t + dur, 0.25);
}

/** Dark sub drone with slow beating — used for tension beds. */
function drone(e, layer, t, freqs, dur, vel) {
  const ctx = e.ctx, p = layer.def.params || {};
  const g = ctx.createGain();
  const end = adsr(g.gain, t, dur, 0.2 * vel, p.attack ?? 1.2, 1, 0.9, p.release ?? 1.5);
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = p.cutoff ?? 400;
  filt.connect(g).connect(layer.input);
  for (const f of freqs) {
    for (const d of [-4, 0, 5]) {
      const o = osc(ctx, d === 0 ? 'triangle' : 'sawtooth', f, t, d);
      o.connect(filt);
      o.start(t);
      o.stop(end);
    }
  }
}

/** Glassy bell / music box: two sine partials with a slow decay. */
function bell(e, layer, t, freqs, dur, vel) {
  const ctx = e.ctx;
  for (const f of freqs) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.18 * vel, t + 0.004);
    g.gain.setTargetAtTime(0.0001, t + 0.01, 0.5);
    for (const [ratio, amp] of [[1, 1], [2.756, 0.3], [5.4, 0.08]]) {
      const o = osc(ctx, 'sine', f * ratio, t);
      const og = ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 2.6);
    }
    g.connect(layer.input);
  }
}

// ---------- drum kit -----------------------------------------------------------

function noiseSrc(e, t, dur) {
  const s = e.ctx.createBufferSource();
  s.buffer = e.noise;
  if (dur + 0.05 >= e.noise.duration) { s.loop = true; s.start(t); s.stop(t + dur + 0.05); return s; }
  const off = Math.random() * Math.max(0, e.noise.duration - dur - 0.05);
  s.start(t, off, dur + 0.05);
  return s;
}

const DRUMS = {
  // Kick: pitch-swept sine with a click transient.
  k(e, out, t, v) {
    const ctx = e.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(1.0 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.5);
    const n = noiseSrc(e, t, 0.02);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.25 * v, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    n.connect(hp).connect(ng).connect(out);
  },
  // Snare: bandpassed noise + body tone.
  s(e, out, t, v) {
    const ctx = e.ctx;
    const n = noiseSrc(e, t, 0.25);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    n.connect(bp).connect(g).connect(out);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(210, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.45 * v, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.15);
  },
  // Clap: three quick bursts then a short tail.
  c(e, out, t, v) {
    const ctx = e.ctx;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1300;
    bp.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < 3; i++) {
      g.gain.setValueAtTime(0.5 * v, t + i * 0.011);
      g.gain.exponentialRampToValueAtTime(0.05, t + i * 0.011 + 0.009);
    }
    g.gain.setValueAtTime(0.35 * v, t + 0.034);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    noiseSrc(e, t, 0.22).connect(bp).connect(g).connect(out);
  },
  // Closed hat
  h(e, out, t, v) {
    const ctx = e.ctx;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.2 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    noiseSrc(e, t, 0.05).connect(hp).connect(g).connect(out);
  },
  // Open hat
  o(e, out, t, v) {
    const ctx = e.ctx;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.16 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    noiseSrc(e, t, 0.33).connect(hp).connect(g).connect(out);
  },
  // Shaker (soft, swishy)
  r(e, out, t, v) {
    const ctx = e.ctx;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 6000;
    bp.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12 * v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    noiseSrc(e, t, 0.1).connect(bp).connect(g).connect(out);
  },
  // Crash cymbal
  x(e, out, t, v) {
    const ctx = e.ctx;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28 * v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    noiseSrc(e, t, 1.85).connect(hp).connect(g).connect(out);
  },
  // Low tom / high tom
  t(e, out, t, v) { tom(e, out, t, v, 110); },
  T(e, out, t, v) { tom(e, out, t, v, 170); },
  // Reverse-swell "whoosh" into the next bar
  w(e, out, t, v) {
    const ctx = e.ctx;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(5000, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3 * v, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.56);
    noiseSrc(e, t, 0.6).connect(bp).connect(g).connect(out);
  },
};

function tom(e, out, t, v, f) {
  const ctx = e.ctx;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.25);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.6 * v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.4);
}

function drums(e, layer, t, hits, dur, vel) {
  for (const ch of hits) DRUMS[ch]?.(e, layer.input, t, vel);
}

export const INSTRUMENTS = { pad, pluck, bass, arp, lead, theremin, drone, bell, drums };
export { DRUMS, ksBuffer };
