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

// EVERY synthesized sound effect is rendered ONCE (offline) into a small buffer
// — a few random variants each — and then played back as a cheap recording.
// Building sounds from dozens of oscillators/filters on every play is what
// overloads phone audio threads in busy scenes (sound crackles, then dies).
// name -> number of variants (default 2). Keys also depend on opts (bakeKey).
const VARIANTS = {
  step_sand: 4, step_metal: 4, jingle: 4, bark: 4, blip: 1, ui_hover: 1, ui_click: 1, ui_toggle: 1,
  coin: 1, golden: 1, hit: 3, blaster: 3, enemy_shot: 3, explosion: 3, grunt: 3, drip: 3, fire_pop: 3,
};
// Never bake (none currently) — kept as an escape hatch.
const LIVE_ONLY = new Set([]);
// Low-priority sounds get dropped first when the mix gets busy.
const LOW_PRIORITY = new Set(['step_sand', 'step_metal', 'jingle', 'blip', 'drip', 'fire_pop', 'buzz', 'ui_hover', 'ricochet', 'sparkle', 'clank', 'steam']);
// Sounds that must always play.
const PRIORITY = new Set(['oof', 'golden', 'spotted', 'caught', 'checkpoint', 'ui_click', 'ui_confirm', 'ui_back', 'reveal', 'denied', 'cash']);
// Max copies of one sound playing at the same time.
const PER_NAME_MAX = { explosion: 3, hit: 3, blaster: 2, enemy_shot: 3, alien_zap: 2, coin: 4, grunt: 2, thud: 2, sparkle: 2, whoosh: 2, teleport: 2 };
const SOFT_VOICES = 14;    // above this, low-priority sounds are dropped
const HARD_VOICES = 22;    // above this, everything but PRIORITY is dropped
const OPT_IGNORE = new Set(['volume', 'pan', 'delay', 'minGap', 'reverb']);

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
    this.voices = 0;
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
        setTimeout(() => this.prewarm(), 500);
      };
      if (this.ctx.state === 'running') done();
      else this.ctx.resume().then(done).catch(() => { /* try again next gesture */ });
    };
    events.forEach((ev) => window.addEventListener(ev, unlock, true));

    // Watchdog: phones can suspend/interrupt the AudioContext at any time
    // (screen dim, notifications, Bluetooth, iOS "interrupted"). Any tap or key
    // press brings it back.
    const revive = () => {
      if (this.ctx && this.unlocked && this.ctx.state !== 'running' && !document.hidden) this.ctx.resume().catch(() => {});
    };
    ['pointerdown', 'touchend', 'keydown'].forEach((ev) => window.addEventListener(ev, revive, true));
    setInterval(revive, 2000);
    setInterval(() => this.watchdog(), 1000);

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
    this.buildMasterChain();
    this.activeByName = {};

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
    // shared send levels: each sound connects to the closest one (no per-sound send node)
    this.roomSends = [0.15, 0.4, 0.7].map((lv) => { const g = ctx.createGain(); g.gain.value = lv; g.connect(this.roomIn); return { lv, g }; });

    this.applyVolumes();
    Save.onSettingChange((k) => { if (k === 'music' || k === 'sfx') this.applyVolumes(); });

    // Sequencer clock. Lookahead scheduling keeps timing tight despite jank.
    this.timer = setInterval(() => this.current?.schedule(), 25);

    // Load any recorded sample overrides.
    for (const [key, url] of Object.entries(SAMPLES)) this.loadSample(key, url);
  }

  /**
   * (Re)build compressor -> limiter -> speakers. Called at start, and by the
   * watchdog if the output ever gets poisoned (a single NaN sample makes a
   * DynamicsCompressor output silence forever).
   */
  buildMasterChain() {
    const ctx = this.ctx;
    if (this.chain) { try { this.master.disconnect(); this.chain.forEach((n) => n.disconnect()); } catch (_) { /* noop */ } }
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
    const probe = ctx.createAnalyser();
    probe.fftSize = 256;
    this.master.connect(glue).connect(limiter).connect(ctx.destination);
    limiter.connect(probe);
    this.chain = [glue, limiter, probe];
    this.probe = probe;
    this.probeBuf = new Float32Array(probe.fftSize);
  }

  /** Runs every second: resume a paused context, heal a poisoned output. */
  watchdog() {
    if (!this.ctx || !this.unlocked || document.hidden) return;
    if (this.ctx.state !== 'running') { this.ctx.resume().catch(() => {}); return; }
    this.probe.getFloatTimeDomainData(this.probeBuf);
    for (let i = 0; i < this.probeBuf.length; i += 8) {
      if (!Number.isFinite(this.probeBuf[i])) { console.warn('[audio] output poisoned - rebuilding master chain'); this.buildMasterChain(); return; }
    }
    // voice bookkeeping can never drift upward forever
    if (this.voices > HARD_VOICES * 2) this.voices = 0;
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
    // phone-friendly voice limits
    if (!PRIORITY.has(name)) {
      if (this.voices >= HARD_VOICES) return;
      if (this.voices >= SOFT_VOICES && LOW_PRIORITY.has(name)) return;
      if ((this.activeByName[name] ?? 0) >= (PER_NAME_MAX[name] ?? 6)) return;
    }
    this.lastPlayed[name] = nowMs;
    this.voices = (this.voices ?? 0) + 1;
    this.activeByName[name] = (this.activeByName[name] ?? 0) + 1;
    const vol = Number.isFinite(opts.volume) ? Math.max(0, Math.min(2, opts.volume)) : 1;
    const panV = Number.isFinite(opts.pan) ? clamp(opts.pan, -1, 1) : 0;

    const t = ctx.currentTime + (opts.delay ?? 0);
    const out = ctx.createGain();
    out.gain.value = vol;
    let tail = out;
    if (panV) {
      const p = ctx.createStereoPanner();
      p.pan.value = panV;
      out.connect(p);
      tail = p;
    }
    tail.connect(this.sfxBus);
    const rv = opts.reverb ?? 0.15;
    if (rv > 0.05) {
      const send = this.roomSends.reduce((a, b) => (Math.abs(b.lv - rv) < Math.abs(a.lv - rv) ? b : a));
      tail.connect(send.g);
    }

    let dur = 1;
    const baked = !this.samples[name] && SFX[name] && !LIVE_ONLY.has(name) ? this.getBaked(name, opts) : null;
    if (baked) {
      const src = ctx.createBufferSource();
      src.buffer = baked;
      src.playbackRate.value = name === 'blip' ? 0.95 + Math.random() * 0.1 : 1;
      src.connect(out);
      src.start(t);
      dur = baked.duration;
    } else if (this.samples[name]) {
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
    setTimeout(() => {
      this.voices = Math.max(0, this.voices - 1);
      this.activeByName[name] = Math.max(0, (this.activeByName[name] ?? 1) - 1);
      try { out.disconnect(); tail.disconnect(); } catch (_) { /* noop */ }
    }, (dur + 0.3 + (opts.delay ?? 0)) * 1000);
  }

  // ---------------------------------------------------------------------------
  // Baked SFX cache
  // ---------------------------------------------------------------------------
  /** Cache key: the sound name plus any options that change how it sounds. */
  bakeKey(name, opts) {
    let k = name;
    for (const o of Object.keys(opts).sort()) {
      if (OPT_IGNORE.has(o)) continue;
      const v = opts[o];
      k += `|${o}=${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`;
    }
    return k;
  }

  /** Returns a ready buffer (random variant) or null while it's still rendering. */
  getBaked(name, opts) {
    this.baked = this.baked ?? new Map();
    const key = this.bakeKey(name, opts);
    const entry = this.baked.get(key);
    if (entry) return entry.ready ? entry.bufs[Math.floor(Math.random() * entry.bufs.length)] : null;
    const e = { ready: false, bufs: [] };
    this.baked.set(key, e);
    this.renderVariants(name, opts, VARIANTS[name] ?? 2).then((bufs) => { e.bufs = bufs; e.ready = bufs.length > 0; })
      .catch((err) => { console.warn('[audio] bake failed', name, err); LIVE_ONLY.add(name); });
    return null;   // first call plays live; later calls use the baked buffer
  }

  async renderVariants(name, opts, n) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return [];
    const sr = this.ctx.sampleRate;
    const bufs = [];
    for (let i = 0; i < n; i++) {
      const off = new OAC(1, Math.ceil(sr * 3), sr);
      const fake = { ctx: off, noise: this.noise };
      const g = off.createGain();
      g.connect(off.destination);
      // volume/pan are applied at playback time, so bake at unity
      const dur = Math.min(2.9, (SFX[name](fake, g, 0, { ...opts, delay: 0, volume: undefined, pan: undefined }) ?? 1) + 0.05);
      const rendered = await off.startRendering();
      // trim to the sound's real length to keep memory small
      const len = Math.ceil(sr * dur);
      const buf = this.ctx.createBuffer(1, len, sr);
      buf.copyToChannel(rendered.getChannelData(0).subarray(0, len), 0);
      bufs.push(buf);
    }
    return bufs;
  }

  /** Pre-render the most common sounds during idle time so even the first play is cheap. */
  prewarm() {
    const list = ['ui_hover', 'ui_click', 'ui_confirm', 'ui_back', 'ui_toggle', 'coin', 'jump', 'land', 'step_sand', 'step_metal', 'jingle',
      'bark', 'bark2', 'boof', 'sniff', 'pant', 'whine', 'blaster', 'hit', 'enemy_shot', 'explosion', 'grunt', 'thud', 'oof',
      'alien_zap', 'teleport', 'whoosh', 'sparkle', 'golden', 'ricochet', 'laser_zap', 'sensor_ping', 'suspicious', 'spotted', 'snip', 'rustle'];
    let i = 0;
    const next = () => {
      if (i >= list.length) return;
      const n = list[i++];
      if (SFX[n]) this.getBaked(n, {});
      setTimeout(next, 60);
    };
    next();
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
