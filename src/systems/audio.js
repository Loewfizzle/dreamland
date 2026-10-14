// ============================================================================
//  AUDIO ENGINE — Web Audio graph shared by the whole game.
//
//   music layers ─┬─────────────────────────────► musicBus ─► musicVol ─┐
//                 ├─► hall reverb (convolver) ──► musicBus              │
//                 └─► ping-pong delay ──────────► musicBus              ├─► master ─► glue comp ─► limiter ─► out
//   sfx voices ───┬─► (stereo panner) ──────────► sfxBus  ─► sfxVol ────┤
//                 └─► room reverb ──────────────► sfxBus                │
//   ambience ─────────────────────────────────► ambBus  ─► sfxVol ──────┘
//
//  The AudioContext is only created/resumed after the first user gesture
//  (required by mobile browsers). Anything requested before that is queued.
// ============================================================================
import { AUDIO } from '../config.js';
import { Save } from './save.js';
import { SongPlayer } from '../audio/sequencer.js';
import { SFX, LOOPS } from '../audio/sfx.js';
import '../audio/sfx_combat.js';
import { AMBIENCES } from '../audio/ambience.js';
import { SAMPLES } from '../audio/samples.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.current = null;
    this.pendingSong = null;
    this.pendingAmbience = null;
    this.ambience = null;
    this.samples = {};
    this.lastPlayed = {};
    this.unlockCallbacks = [];
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------
  /** Attach first-gesture listeners. Call once at startup. */
  installUnlock() {
    const events = ['pointerdown', 'touchend', 'mousedown', 'keydown'];
    const unlock = () => {
      this.init();
      if (!this.ctx) return;
      const done = () => {
        if (this.ctx.state !== 'running' || this.unlocked) return;
        this.unlocked = true;
        events.forEach((ev) => window.removeEventListener(ev, unlock, true));
        // Old iOS needs a buffer to actually be played inside the gesture.
        const s = this.ctx.createBufferSource();
        s.buffer = this.ctx.createBuffer(1, 1, 22050);
        s.connect(this.ctx.destination);
        s.start(0);
        if (this.pendingSong) { const p = this.pendingSong; this.pendingSong = null; this.playMusic(p.song, p.opts); }
        if (this.pendingAmbience) { const a = this.pendingAmbience; this.pendingAmbience = null; this.playAmbience(a); }
        this.unlockCallbacks.splice(0).forEach((fn) => fn());
      };
      if (this.ctx.state === 'running') done();
      else this.ctx.resume().then(done).catch(() => { /* try again next gesture */ });
    };
    events.forEach((ev) => window.addEventListener(ev, unlock, true));

    // Pause audio when the tab/app goes to the background.
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx || !this.unlocked) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    });
  }

  /** Run fn once audio is unlocked (immediately if it already is). */
  onUnlock(fn) {
    if (this.unlocked) fn();
    else this.unlockCallbacks.push(fn);
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let ctx;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      console.warn('[audio] no Web Audio', e);
      return;
    }
    this.ctx = ctx;

    // --- master chain: glue compressor -> brickwall-ish limiter
    this.master = ctx.createGain();
    this.master.gain.value = AUDIO.MASTER;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18;
    glue.knee.value = 12;
    glue.ratio.value = 3;
    glue.attack.value = 0.012;
    glue.release.value = 0.25;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2.5;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.08;
    this.master.connect(glue).connect(limiter).connect(ctx.destination);

    // --- volume groups
    this.musicVol = ctx.createGain();
    this.sfxVol = ctx.createGain();
    this.musicVol.connect(this.master);
    this.sfxVol.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = AUDIO.MUSIC_BUS;
    this.musicBus.connect(this.musicVol);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = AUDIO.SFX_BUS;
    this.sfxBus.connect(this.sfxVol);
    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = AUDIO.AMBIENCE_BUS;
    this.ambBus.connect(this.sfxVol);

    // --- shared noise source buffer
    const nlen = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;

    // --- music hall reverb
    this.musicVerbIn = ctx.createGain();
    const hall = ctx.createConvolver();
    hall.buffer = this.makeImpulse(AUDIO.REVERB_SECONDS, 2.6, 0.02);
    const hallRet = ctx.createGain();
    hallRet.gain.value = AUDIO.REVERB_RETURN;
    this.musicVerbIn.connect(hall).connect(hallRet).connect(this.musicBus);

    // --- tempo-synced ping-pong delay with darkening feedback
    this.delayIn = ctx.createGain();
    this.delayL = ctx.createDelay(2);
    this.delayR = ctx.createDelay(2);
    const fb = ctx.createGain();
    fb.gain.value = AUDIO.DELAY_FEEDBACK;
    const dark = ctx.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 2600;
    const panL = ctx.createStereoPanner();
    panL.pan.value = -0.75;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 0.75;
    const dRet = ctx.createGain();
    dRet.gain.value = AUDIO.DELAY_RETURN;
    this.delayIn.connect(this.delayL);
    this.delayL.connect(this.delayR);
    this.delayR.connect(dark).connect(fb).connect(this.delayL);
    this.delayL.connect(panL).connect(dRet);
    this.delayR.connect(panR).connect(dRet);
    dRet.connect(this.musicBus);
    this.setDelayTime(0.5);

    // --- small room reverb for SFX
    this.roomIn = ctx.createGain();
    const room = ctx.createConvolver();
    room.buffer = this.makeImpulse(1.0, 4, 0.005);
    const roomRet = ctx.createGain();
    roomRet.gain.value = 0.5;
    this.roomIn.connect(room).connect(roomRet).connect(this.sfxBus);

    this.applyVolumes();
    Save.onSettingChange((k) => { if (k === 'music' || k === 'sfx') this.applyVolumes(); });

    // Sequencer clock. Lookahead scheduling keeps timing tight despite jank.
    this.timer = setInterval(() => this.current?.schedule(), 25);

    // Load any recorded sample overrides.
    for (const [key, url] of Object.entries(SAMPLES)) this.loadSample(key, url);
  }

  /** Generated stereo impulse response: darkening exponential noise tail. */
  makeImpulse(seconds, decay, pre) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    const preN = Math.floor(rate * pre);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = preN; i < len; i++) {
        const t = (i - preN) / (len - preN);
        lp += ((Math.random() * 2 - 1) - lp) * (0.08 + 0.75 * (1 - t) * (1 - t));
        d[i] = lp * Math.pow(1 - t, decay);
      }
      // A few early reflections for a sense of space.
      for (let r = 0; r < 6; r++) {
        const at = preN + Math.floor(rate * (0.008 + Math.random() * 0.05));
        if (at < len) d[at] += (Math.random() > 0.5 ? 1 : -1) * (0.5 - r * 0.06);
      }
    }
    return buf;
  }

  async loadSample(key, url) {
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      this.samples[key] = await this.ctx.decodeAudioData(arr);
    } catch (e) {
      console.warn(`[audio] sample ${key} failed, using synth`, e);
    }
  }

  setDelayTime(sec) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.delayL.delayTime.setTargetAtTime(clamp(sec, 0.05, 1.9), t, 0.05);
    this.delayR.delayTime.setTargetAtTime(clamp(sec, 0.05, 1.9), t, 0.05);
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = Save.settings;
    const t = this.ctx.currentTime;
    // Squared for a perceptually even slider.
    this.musicVol.gain.setTargetAtTime(s.music * s.music, t, 0.05);
    this.sfxVol.gain.setTargetAtTime(s.sfx * s.sfx, t, 0.05);
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  // ---------------------------------------------------------------------------
  // Music
  // ---------------------------------------------------------------------------
  /** Crossfade to a song definition. Same song = no-op (keeps playing). */
  playMusic(song, opts = {}) {
    if (!song) return;
    if (!this.unlocked) { this.pendingSong = { song, opts }; return; }
    if (this.current && this.current.song === song && this.current.running) return;
    const fade = opts.fade ?? AUDIO.CROSSFADE;
    this.current?.stop(fade);
    const p = new SongPlayer(this, song);
    if (opts.section) {
      const idx = p.order.indexOf(opts.section);
      if (idx >= 0) p.sectionIdx = idx;
    }
    p.start(this.ctx.currentTime + 0.06, fade);
    this.current = p;
    return p;
  }

  stopMusic(fade = AUDIO.CROSSFADE) {
    this.pendingSong = null;
    this.current?.stop(fade);
    this.current = null;
  }

  /** Duck the music (pause menus, dialogue). */
  duck(on, time = 0.3) {
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(AUDIO.MUSIC_BUS * (on ? 0.35 : 1), this.ctx.currentTime, time / 3);
  }

  /** Adaptive music helpers (no-ops if nothing is playing). */
  setLayer(name, level, time = 1) { this.current?.setLayer(name, level, time); }
  queueSection(name) { this.current?.queueSection(name); }

  // ---------------------------------------------------------------------------
  // Sound effects
  // ---------------------------------------------------------------------------
  /**
   * Play a one-shot. opts: { volume, pan (-1..1), reverb (0..1), pitch, combo, ... }
   * Identical sounds triggered within `opts.minGap` ms are skipped (prevents stacking).
   */
  sfx(name, opts = {}) {
    if (!this.unlocked) return;
    const ctx = this.ctx;
    const nowMs = performance.now();
    const gap = opts.minGap ?? 30;
    if (this.lastPlayed[name] && nowMs - this.lastPlayed[name] < gap) return;
    this.lastPlayed[name] = nowMs;

    const t = ctx.currentTime + (opts.delay ?? 0);
    const out = ctx.createGain();
    out.gain.value = opts.volume ?? 1;
    let tail = out;
    if (opts.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(opts.pan, -1, 1);
      out.connect(p);
      tail = p;
    }
    tail.connect(this.sfxBus);
    const rv = opts.reverb ?? 0.15;
    if (rv > 0) {
      const s = ctx.createGain();
      s.gain.value = rv;
      tail.connect(s).connect(this.roomIn);
    }

    let dur = 1;
    if (this.samples[name]) {
      const src = ctx.createBufferSource();
      src.buffer = this.samples[name];
      src.playbackRate.value = opts.pitch ?? 1;
      src.connect(out);
      src.start(t);
      dur = src.buffer.duration / src.playbackRate.value;
    } else if (SFX[name]) {
      dur = SFX[name](this, out, t, opts) ?? 1;
    } else {
      console.warn(`[audio] unknown sfx "${name}"`);
    }
    setTimeout(() => { try { out.disconnect(); tail.disconnect(); } catch (_) { /* noop */ } }, (dur + 1.5 + (opts.delay ?? 0)) * 1000);
  }

  /** Start a looping sound. Returns a handle { set({volume,pan,...}), stop(fade) } or a dummy. */
  loop(name, opts = {}) {
    const dummy = { set() {}, stop() {} };
    if (!this.unlocked || !LOOPS[name]) return dummy;
    const ctx = this.ctx;
    const out = ctx.createGain();
    const vol = opts.volume ?? 1;
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(vol, ctx.currentTime + (opts.fade ?? 0.5));
    const pan = ctx.createStereoPanner();
    pan.pan.value = opts.pan ?? 0;
    out.connect(pan).connect(opts.bus === 'amb' ? this.ambBus : this.sfxBus);
    const h = LOOPS[name](this, out, opts);
    const baseSet = h.set.bind(h);
    h.set = (params) => {
      const now = ctx.currentTime;
      if (params.volume != null) out.gain.setTargetAtTime(Math.max(0.0001, params.volume), now, 0.08);
      if (params.pan != null) pan.pan.setTargetAtTime(clamp(params.pan, -1, 1), now, 0.08);
      baseSet(params);
    };
    return h;
  }

  // ---------------------------------------------------------------------------
  // Ambience
  // ---------------------------------------------------------------------------
  playAmbience(name, fade = 2) {
    if (!this.unlocked) { this.pendingAmbience = name; return; }
    if (this.ambience?.name === name) return;
    this.stopAmbience(fade);
    const def = AMBIENCES[name];
    if (!def) return;
    const amb = { name, loops: [], timers: [] };
    for (const l of def.loops) amb.loops.push(this.loop(l.name, { volume: l.vol, fade, bus: 'amb' }));
    for (const ev of def.events) {
      const fire = () => {
        const [a, b] = ev.pan ?? [0, 0];
        this.sfx(ev.sfx, { volume: ev.vol, pan: a + Math.random() * (b - a), reverb: 0.6, minGap: 0 });
        schedule();
      };
      const schedule = () => {
        const [lo, hi] = ev.every;
        const id = setTimeout(fire, (lo + Math.random() * (hi - lo)) * 1000);
        amb.timers.push(id);
        if (amb.timers.length > 20) amb.timers.shift();
      };
      schedule();
    }
    this.ambience = amb;
  }

  stopAmbience(fade = 1.5) {
    this.pendingAmbience = null;
    if (!this.ambience) return;
    this.ambience.loops.forEach((l) => l.stop(fade));
    this.ambience.timers.forEach((id) => clearTimeout(id));
    this.ambience = null;
  }

  /** Stereo pan for a world x position as seen by a Phaser camera. */
  panFor(x, camera) {
    const sx = (x - camera.scrollX) / camera.width;
    return clamp((sx - 0.5) * 1.6, -0.9, 0.9);
  }
}

export const Audio = new AudioEngine();
