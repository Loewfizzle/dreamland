// ============================================================================
//  CHAPTER 4 — "Hangar 18"
//  F# minor, 112 BPM. Ticking-clock heist groove: muted pulse bass, hats like
//  a stopwatch, cold pads, a sly guitar motif. ADAPTIVE:
//    'hack'   — sparkly arp + bells while a hacking terminal is open
//    'danger' — driving drums + alarm stabs when the timer runs low
//    'alien'  — theremin swells near the saucer under the tarp
// ============================================================================
export default {
  name: 'ch4',
  master: 1.3,          // loudness trim (see audio mix notes in README)
  bpm: 112,
  swing: 0.05,
  layers: {
    pad:    { inst: 'pad', gain: 0.32, reverb: 0.55, voiceLow: 50, params: { cutoff: 1000, attack: 1.2, release: 1.6, detune: 12 } },
    bass:   { inst: 'bass', gain: 0.55, octave: 2, reverb: 0.03, params: { cutoff: 360, q: 4, decay: 0.05 } },
    clock:  { inst: 'drums', gain: 0.5, reverb: 0.12 },
    gtr:    { inst: 'pluck', gain: 0.5, octave: 3, reverb: 0.45, delay: 0.35, pan: -0.2, tremolo: { rate: 6, depth: 0.3 }, params: { damping: 0.996, bright: 0.55, twang: 6, ring: 0.5 } },
    hack:   { inst: 'arp', gain: 0.24, octave: 5, reverb: 0.3, delay: 0.4, pan: 0.25, level: 0, params: { cutoff: 4200, gate: 0.04 } },
    hbell:  { inst: 'bell', gain: 0.32, reverb: 0.5, delay: 0.3, level: 0 },
    drums:  { inst: 'drums', gain: 0.7, reverb: 0.1, level: 0 },
    stab:   { inst: 'lead', gain: 0.32, octave: 4, reverb: 0.25, level: 0, params: { cutoff: 2800, release: 0.06 } },
    alien:  { inst: 'theremin', gain: 0.4, reverb: 0.75, delay: 0.3, level: 0.1, params: { glide: 0.3, vibDepth: 0.03 } },
  },
  patterns: {
    bassP: ['0 . . 0 . . 0 . . 0 . . 3 . 2 .'],
    clockP: ['h . r . h . r . h . r . h . r .', 'k . r . h . r . k . r . h . r r'],
    gtrP: ['. . . . F#4 - A4 - . . C#5 - B4 - A4 -', '. . . . E4 - - - . . . . . . . .'],
    hackP: ['0 2 4 6 4 2 0 2 4 6 7 6 4 2 0 2'],
    hbellP: ['F#6 . . . C#6 . . . A5 . . . C#6 . . .'],
    drumsP: ['kx . h k s . h k k . h k s . s s', 'k . h k s . h k k k h . s s T t'],
    stabP: ['F#4+A4 . . F#4+A4 . . . . E4+G#4 . . E4+G#4 . . . .'],
    alienP: ['C#6 - - - - - - - D6 - - - C#6 - - -', 'A5 - - - - - - - G#5 - - - - - - -'],
  },
  sections: {
    A: { bars: 4, chords: ['F#m', 'F#m', 'D', 'C#'], play: { pad: 'chords', bass: 'bassP', clock: 'clockP', gtr: 'gtrP', hack: 'hackP', hbell: 'hbellP', drums: 'drumsP', stab: 'stabP', alien: 'alienP' } },
    B: { bars: 4, chords: ['Bm', 'F#m', 'D', 'C#'], play: { pad: 'chords', bass: 'bassP', clock: 'clockP', hack: 'hackP', hbell: 'hbellP', drums: 'drumsP', stab: 'stabP', alien: 'alienP' } },
  },
  order: ['A', 'A', 'B', 'A'],
  loopTo: 0,
};
