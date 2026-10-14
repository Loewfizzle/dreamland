// ============================================================================
//  SONG PLAYER — a lookahead step sequencer for the synthesized soundtrack.
//
//  Song format (see src/audio/music/*.js):
//   bpm, swing (0..0.3), delay (seconds or omitted for dotted-8th)
//   layers:   { name: { inst, gain, level, reverb, delay, pan, octave, voiceLow, tremolo, params } }
//   patterns: { name: [ 'bar1 tokens', 'bar2 tokens', ... ] }   (cycled)
//   sections: { name: { bars, chords: ['Am','F|G',...], play: { layer: patternName | 'chords' } } }
//   order:    [ section names ], loopTo: index to loop back to
//
//  Tokens: note names (A3, C#4), chord degrees (0 1 2 3 ... with ^ / _ for
//  octave up/down), '.' rest, '-' hold, '+' joins simultaneous notes,
//  trailing '!' accent / '?' ghost. Drum tokens are letter combos: k s c h o r x t T w.
// ============================================================================
import { AUDIO } from '../config.js';
import { INSTRUMENTS } from './instruments.js';
import { parseChord, voiceChord, degreeToMidi, noteToMidi, midiToFreq, expandBar } from './theory.js';

export class SongPlayer {
  constructor(engine, song) {
    this.e = engine;
    this.song = song;
    const ctx = engine.ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(engine.musicBus);
    this.lfos = [];
    this.layers = {};
    this.compiled = {};

    for (const [name, def] of Object.entries(song.layers)) {
      const input = ctx.createGain();
      let tail = input;
      if (def.tremolo) {
        // Surf-guitar style tremolo: an LFO wobbling the layer's gain.
        const trem = ctx.createGain();
        trem.gain.value = 1 - def.tremolo.depth / 2;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = def.tremolo.rate;
        const amt = ctx.createGain();
        amt.gain.value = def.tremolo.depth / 2;
        lfo.connect(amt).connect(trem.gain);
        lfo.start();
        this.lfos.push(lfo);
        tail.connect(trem);
        tail = trem;
      }
      if (def.pan) {
        const p = ctx.createStereoPanner();
        p.pan.value = def.pan;
        tail.connect(p);
        tail = p;
      }
      const gain = ctx.createGain();
      const base = def.gain ?? 0.5;
      const level = def.level ?? 1;
      gain.gain.value = base * level;
      tail.connect(gain);
      gain.connect(this.out);
      if (def.reverb) {
        const s = ctx.createGain();
        s.gain.value = def.reverb;
        gain.connect(s).connect(engine.musicVerbIn);
      }
      if (def.delay) {
        const s = ctx.createGain();
        s.gain.value = def.delay;
        gain.connect(s).connect(engine.delayIn);
      }
      this.layers[name] = { name, def, input, gain, base, level, voice: null, lastFreq: 0 };
    }

    // Pre-tokenize every pattern into 16-step bars (drums simply ignore '-').
    for (const [name, bars] of Object.entries(song.patterns || {})) {
      this.compiled[name] = bars.map((b) => expandBar(b, false));
    }

    this.stepDur = 60 / song.bpm / 4;
    this.order = song.order;
    this.sectionIdx = 0;
    this.bar = 0;
    this.step = 0;
    this.queued = null;
    this.running = false;
    this.listeners = [];
  }

  get section() {
    return this.song.sections[this.order[this.sectionIdx]];
  }
  get sectionName() {
    return this.order[this.sectionIdx];
  }

  start(t, fade) {
    this.nextTime = t;
    this.out.gain.setValueAtTime(0.0001, t);
    this.out.gain.linearRampToValueAtTime(1, t + Math.max(0.05, fade));
    this.e.setDelayTime(this.song.delay ?? this.stepDur * 3);
    this.running = true;
  }

  stop(fade = AUDIO.CROSSFADE) {
    if (!this.running && this.stopped) return;
    this.running = false;
    this.stopped = true;
    const ctx = this.e.ctx;
    const now = ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.05, fade));
    const end = now + fade + 0.1;
    for (const l of Object.values(this.layers)) l.voice?.stop(end);
    setTimeout(() => {
      this.lfos.forEach((l) => { try { l.stop(); } catch (_) { /* already stopped */ } });
      try { this.out.disconnect(); } catch (_) { /* noop */ }
    }, (fade + 4) * 1000);
  }

  /** Adaptive music: fade a layer to `level` (0..1) over `time` seconds. */
  setLayer(name, level, time = 1) {
    const l = this.layers[name];
    if (!l) return;
    l.level = level;
    const now = this.e.ctx.currentTime;
    l.gain.gain.cancelScheduledValues(now);
    l.gain.gain.setTargetAtTime(Math.max(0.0001, l.base * level), now, Math.max(0.01, time / 3));
  }

  /** Jump to a named section at the start of the next bar (e.g. boss phase 2). */
  queueSection(name) {
    if (this.song.sections[name]) this.queued = name;
  }

  /** Called by the engine timer: schedule all steps inside the lookahead window. */
  schedule() {
    if (!this.running) return;
    const horizon = this.e.ctx.currentTime + AUDIO.LOOKAHEAD;
    // If the tab hiccuped and we fell far behind, resync instead of machine-gunning notes.
    if (this.nextTime < this.e.ctx.currentTime - 0.25) this.nextTime = this.e.ctx.currentTime + 0.02;
    while (this.nextTime < horizon) {
      this.playStep(this.nextTime);
      this.advance();
    }
  }

  advance() {
    this.nextTime += this.stepDur;
    this.step++;
    if (this.step < 16) return;
    this.step = 0;
    this.bar++;
    if (this.queued) {
      const idx = this.order.indexOf(this.queued);
      if (idx >= 0) this.sectionIdx = idx;
      else { this.order = [...this.order, this.queued]; this.sectionIdx = this.order.length - 1; }
      this.queued = null;
      this.bar = 0;
    } else if (this.bar >= this.section.bars) {
      this.bar = 0;
      this.sectionIdx++;
      if (this.sectionIdx >= this.order.length) this.sectionIdx = this.song.loopTo ?? 0;
    }
  }

  chordAt(sec, bar, step) {
    if (!sec.chords) return null;
    const entry = sec.chords[bar % sec.chords.length];
    const parts = entry.split('|');
    const i = Math.min(parts.length - 1, Math.floor(step / (16 / parts.length)));
    return { chord: parseChord(parts[i]), changes: step % (16 / parts.length) === 0, span: 16 / parts.length };
  }

  playStep(t) {
    const sec = this.section;
    const ch = this.chordAt(sec, this.bar, this.step);
    const swingT = this.step % 2 === 1 ? t + this.stepDur * (this.song.swing || 0) : t;
    for (const [lname, patName] of Object.entries(sec.play)) {
      const layer = this.layers[lname];
      if (!layer) continue;
      const inst = INSTRUMENTS[layer.def.inst];
      if (patName === 'chords') {
        if (ch && ch.changes) {
          const notes = voiceChord(ch.chord, layer.def.voiceLow ?? 52).map(midiToFreq);
          inst(this.e, layer, t, notes, ch.span * this.stepDur, 0.8);
        }
        continue;
      }
      const pat = this.compiled[patName];
      if (!pat) continue;
      const bar = pat[this.bar % pat.length];
      const tok = bar[this.step];
      if (tok === '.' || tok === '-') continue;
      let len = 1;
      while (this.step + len < 16 && bar[this.step + len] === '-') len++;
      let vel = 0.8;
      let body = tok;
      if (body.endsWith('!')) { vel = 1; body = body.slice(0, -1); }
      else if (body.endsWith('?')) { vel = 0.45; body = body.slice(0, -1); }
      if (layer.def.inst === 'drums') {
        inst(this.e, layer, swingT, body, len * this.stepDur, vel);
        continue;
      }
      const freqs = [];
      for (const part of body.split('+')) {
        const m = this.resolve(part, ch?.chord, layer.def.octave ?? 3);
        if (m != null) freqs.push(midiToFreq(m));
      }
      if (freqs.length) inst(this.e, layer, swingT, freqs, len * this.stepDur, vel);
    }
    for (const fn of this.listeners) fn(this.sectionName, this.bar, this.step, t);
  }

  resolve(tok, chord, octave) {
    const n = noteToMidi(tok);
    if (n != null) return n;
    const m = /^(\d+)([\^_]*)$/.exec(tok);
    if (!m || !chord) return null;
    let midi = degreeToMidi(chord, parseInt(m[1], 10), octave);
    for (const c of m[2]) midi += c === '^' ? 12 : -12;
    return midi;
  }
}
