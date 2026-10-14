// ============================================================================
//  CHAPTER 2 — "Neon Dusk in Rachel"
//  A major, 96 BPM shuffle. Outside: dusky pads, lazy tremolo guitar, brushed
//  groove. ADAPTIVE: step into the Little A'Le'Inn and the 'outside' layers
//  dip while the 'jukebox' (organ-ish chords + bell melody + bass walk) comes up.
// ============================================================================
export default {
  name: 'ch2',
  master: 1.0,          // loudness trim (see audio mix notes in README)
  bpm: 96,
  swing: 0.2,
  layers: {
    pad:   { inst: 'pad', gain: 0.4, reverb: 0.5, voiceLow: 55, params: { cutoff: 1100, attack: 1, release: 1.8 } },
    gtr:   { inst: 'pluck', gain: 0.5, octave: 3, reverb: 0.5, delay: 0.3, pan: -0.2, tremolo: { rate: 5.5, depth: 0.4 }, params: { damping: 0.996, bright: 0.5, twang: 6, ring: 0.6 } },
    lead:  { inst: 'pluck', gain: 0.45, reverb: 0.55, delay: 0.35, pan: 0.2, tremolo: { rate: 6, depth: 0.45 }, params: { damping: 0.997, bright: 0.6, twang: 7, ring: 0.9, slide: true } },
    drums: { inst: 'drums', gain: 0.45, reverb: 0.14 },
    ther:  { inst: 'theremin', gain: 0.35, reverb: 0.7, delay: 0.3, level: 0.6, params: { glide: 0.25 } },
    // inside the diner
    organ: { inst: 'pad', gain: 0.45, reverb: 0.2, voiceLow: 57, level: 0, params: { cutoff: 2400, attack: 0.02, release: 0.3, detune: 4, wave: 'square', width: 0.3 } },
    walk:  { inst: 'bass', gain: 0.55, octave: 2, reverb: 0.05, level: 0, params: { cutoff: 700, q: 2 } },
    bell:  { inst: 'bell', gain: 0.45, reverb: 0.35, delay: 0.2, level: 0 },
    jdrum: { inst: 'drums', gain: 0.5, reverb: 0.08, level: 0 },
  },
  patterns: {
    pick: ['0 . 2 . 1^ . 2 . 0 . 2 . 1^ . 2 2'],
    leadA: ['E5 - - - C#5 - - - A4 - B4 - C#5 - - -', 'B4 - - - - - A4 - F#4 - - - - - - -', 'D5 - - - B4 - - - G#4 - A4 - B4 - - -', 'C#5 - - - - - - - - - - - - - - -'],
    drOut: ['k . r . c . r r k . r . c . r .'],
    therP: ['E6 - - - - - - - - - - - - - - -', 'D6 - - - - - - - C#6 - - - - - - -'],
    walkP: ['0 . 1 . 2 . 3 . 0 . 1 . 2 . 1 .'],
    organP: ['. . 0+2 . . . 0+2 . . . 0+2 . . . 0+2 .'],
    bellP: ['A5 . C#6 . E6 . C#6 . B5 . . . A5 . . .', 'F#5 . A5 . D6 . A5 . G#5 . . . E5 . . .'],
    drIn: ['k . h . s . h h k . h . s . h .'],
  },
  sections: {
    A: { bars: 4, chords: ['A', 'F#m', 'D', 'E'], play: { pad: 'chords', gtr: 'pick', lead: 'leadA', drums: 'drOut', ther: 'therP', organ: 'organP', walk: 'walkP', bell: 'bellP', jdrum: 'drIn' } },
    B: { bars: 4, chords: ['D', 'A', 'Bm', 'E'], play: { pad: 'chords', gtr: 'pick', drums: 'drOut', ther: 'therP', organ: 'organP', walk: 'walkP', bell: 'bellP', jdrum: 'drIn' } },
  },
  order: ['A', 'B'],
  loopTo: 0,
};
