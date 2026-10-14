// ============================================================================
//  TITLE THEME — "Sunset Over Groom Lake"
//  A minor, spaghetti-western synthwave. Twangy tremolo guitar over warm pads,
//  half-time drums with a big reverb snare, and a theremin for the UFO.
// ============================================================================
export default {
  name: 'title',
  bpm: 86,
  swing: 0.04,
  layers: {
    pad:   { inst: 'pad', gain: 0.55, reverb: 0.45, voiceLow: 52, params: { cutoff: 1500, attack: 1.0, release: 1.8, detune: 10, sub: true } },
    bass:  { inst: 'bass', gain: 0.55, octave: 2, reverb: 0.04, params: { cutoff: 420 } },
    arp:   { inst: 'arp', gain: 0.32, octave: 4, reverb: 0.25, delay: 0.45, pan: 0.15, params: { cutoff: 2800, gate: 0.07 } },
    gtr:   { inst: 'pluck', gain: 0.62, reverb: 0.55, delay: 0.38, pan: -0.12,
             tremolo: { rate: 6.2, depth: 0.45 }, params: { damping: 0.997, bright: 0.55, twang: 7, ring: 0.9, slide: true } },
    ther:  { inst: 'theremin', gain: 0.5, reverb: 0.7, delay: 0.3, pan: 0.2, params: { glide: 0.15, vibDepth: 0.022 } },
    drums: { inst: 'drums', gain: 0.75, reverb: 0.16 },
    bell:  { inst: 'bell', gain: 0.5, reverb: 0.6, delay: 0.4, pan: 0.3 },
  },

  patterns: {
    // --- bass: octave-pumping eighths following the chord root
    bassA: ['0 . 0 3 . 0 3 0 . 0 0 3 . 0 2 3'],
    bassB: ['0 0 3 0 0 3 0 3 0 0 3 0 2 2 3 1'],

    // --- arpeggio: chord tones, sixteenths
    arpA: ['0 1 2 3 4 3 2 1 0 1 2 3 4 3 2 1'],
    arpB: ['0 2 4 2 3 5 4 2 0 2 4 2 6 5 4 2'],

    // --- spaghetti western guitar melody (eighth notes)
    gtrB: [
      'E5 - - - D5 C5 B4 C5',
      'A4 - - - - - E4 F4',
      'D5 - - - C5 B4 A4 B4',
      'G#4 - - - E4 - - -',
      'A4 - C5 - E5 - A5 -',
      'G5 - F5 - E5 - C5 -',
      'D5 - C5 - B4 - G#4 -',
      'A4 - - - - - - -',
    ],
    // sparse twangs for the breakdown
    gtrC: [
      'A3 - - - - - - -',
      '. . . . E4 - - -',
      'D4 - - - - - - -',
      '. . . . G#3 - B3 -',
    ],

    // --- theremin: long eerie lines
    therIntro: [
      'E5 - - - - - - -',
      'F5 - - - E5 - - -',
      'D5 - - - - - F5 -',
      'G#5 - - - - - - .',
    ],
    therC: [
      'A5 - - - - - - -',
      'C6 - - - B5 - A5 -',
      'F5 - - - - - - -',
      'E5 - - - - - . .',
    ],

    // --- music box sparkle on top of the intro
    bellIntro: ['A5 . E5 . C6 . E5 .', 'A5 . F5 . C6 . F5 .', 'A5 . D5 . F5 . D5 .', 'G#5 . E5 . B5 . . .'],

    // --- drums (k kick, s snare, c clap, h hat, o open hat, r shaker, x crash, t/T toms, w whoosh)
    drA: [
      'kx . h . s . h . k . h k s . h .',
      'k . h . s . h . k . h k s . h r',
      'k . h . s . h . k . h k s . h .',
      'k . h . s . h . k k h . s . sT st',
    ],
    drB: [
      'kx . h r sc . h r k . h k sc . o .',
      'k . h r sc . h r k . h k sc . o .',
      'k . h r sc . h r k . h k sc . o .',
      'k . h r sc . h r k k h . sc . o w',
    ],
    drFill: ['k . . . s . . . k . . . s . s s'],
  },

  sections: {
    intro: { bars: 4, chords: ['Am', 'F', 'Dm', 'E'], play: { pad: 'chords', ther: 'therIntro', bell: 'bellIntro' } },
    A:     { bars: 8, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'], play: { pad: 'chords', bass: 'bassA', arp: 'arpA', drums: 'drA' } },
    B:     { bars: 8, chords: ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'E', 'Am'], play: { pad: 'chords', bass: 'bassB', arp: 'arpB', gtr: 'gtrB', drums: 'drB' } },
    C:     { bars: 4, chords: ['Am', 'C', 'F', 'E'], play: { pad: 'chords', gtr: 'gtrC', ther: 'therC' } },
  },
  order: ['intro', 'A', 'B', 'C', 'B'],
  loopTo: 1,
};
