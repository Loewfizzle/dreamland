// ============================================================================
//  ENDING & CREDITS — "Sunrise Over Dreamland"
//  D major, 92 BPM. The title theme's desert guitar, now hopeful: warm pads,
//  a music-box motif, a theremin that finally sounds happy. The credits loop
//  the 'roll' section; the ending cutscene steps through 'dawn' → 'liftoff'.
// ============================================================================
export default {
  name: 'ending',
  master: 1.46,          // loudness trim (see audio mix notes in README)
  bpm: 92,
  swing: 0.06,
  layers: {
    pad:   { inst: 'pad', gain: 0.45, reverb: 0.55, voiceLow: 54, params: { cutoff: 1600, attack: 1.2, release: 2, detune: 9, sub: true } },
    gtr:   { inst: 'pluck', gain: 0.58, reverb: 0.55, delay: 0.38, pan: -0.15, tremolo: { rate: 5.5, depth: 0.35 }, params: { damping: 0.997, bright: 0.55, twang: 6, ring: 1, slide: true } },
    bass:  { inst: 'bass', gain: 0.45, octave: 2, reverb: 0.05, params: { cutoff: 420, q: 2 } },
    bell:  { inst: 'bell', gain: 0.42, reverb: 0.6, delay: 0.4, pan: 0.3 },
    ther:  { inst: 'theremin', gain: 0.42, reverb: 0.7, delay: 0.35, pan: 0.2, params: { glide: 0.18, vibDepth: 0.018 } },
    drums: { inst: 'drums', gain: 0.5, reverb: 0.15 },
  },
  patterns: {
    gtrMel: [
      'F#5 - - - E5 - D5 - A4 - - - B4 - D5 -',
      'E5 - - - - - D5 - C#5 - - - A4 - - -',
      'B4 - - - D5 - G5 - F#5 - - - E5 - D5 -',
      'E5 - - - - - - - A4 - - - - - - -',
    ],
    bassP: ['0 . . . 2 . . . 0 . . . 2 . 1 .'],
    bellP: ['D6 . A5 . F#5 . A5 . D6 . A5 . F#5 . E5 .', 'C#6 . A5 . E5 . A5 . C#6 . A5 . E5 . . .', 'B5 . G5 . D5 . G5 . B5 . G5 . D5 . G5 .', 'A5 . E5 . C#5 . E5 . A5 . . . . . . .'],
    therP: ['A5 - - - - - - - F#5 - - - - - - -', 'B5 - - - A5 - - - G5 - - - F#5 - - -'],
    drP: ['k . r . c . r . k . r k c . r .', 'k . r . c . r . k . r k c . o .'],
    drSoft: ['k . . . . . r . k . . . . . r .'],
  },
  sections: {
    dawn:    { bars: 4, loop: true, chords: ['D', 'A', 'G', 'A'], play: { pad: 'chords', bell: 'bellP', ther: 'therP' } },
    liftoff: { bars: 4, loop: true, chords: ['D', 'A', 'Bm', 'G'], play: { pad: 'chords', gtr: 'gtrMel', bass: 'bassP', bell: 'bellP', drums: 'drSoft' } },
    roll:    { bars: 4, chords: ['D', 'A', 'G', 'A'], play: { pad: 'chords', gtr: 'gtrMel', bass: 'bassP', drums: 'drP', bell: 'bellP' } },
    roll2:   { bars: 4, chords: ['Bm', 'G', 'D', 'A'], play: { pad: 'chords', bass: 'bassP', drums: 'drP', ther: 'therP', bell: 'bellP' } },
  },
  order: ['dawn', 'roll', 'roll2'],
  loopTo: 1,
};
