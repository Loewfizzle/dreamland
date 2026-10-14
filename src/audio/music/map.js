// ============================================================================
//  MAP / VAN SHOP THEME — "Rest Stop"
//  G major, 90 BPM. Warm and laid back: fingerpicked tremolo guitar, soft pads,
//  brushed shaker groove, a little music-box melody. Time to count your sats.
// ============================================================================
export default {
  name: 'map',
  master: 0.91,          // loudness trim (see audio mix notes in README)
  bpm: 90,
  swing: 0.12,
  layers: {
    pad:   { inst: 'pad', gain: 0.4, reverb: 0.45, voiceLow: 55, params: { cutoff: 1300, attack: 0.9, release: 1.6, detune: 8 } },
    gtr:   { inst: 'pluck', gain: 0.55, octave: 3, reverb: 0.4, delay: 0.25, pan: -0.15,
             tremolo: { rate: 5, depth: 0.25 }, params: { damping: 0.996, bright: 0.45, twang: 5, ring: 0.5 } },
    bass:  { inst: 'bass', gain: 0.45, octave: 2, reverb: 0.05, params: { cutoff: 360, q: 2 } },
    drums: { inst: 'drums', gain: 0.5, reverb: 0.15 },
    bell:  { inst: 'bell', gain: 0.42, reverb: 0.6, delay: 0.35, pan: 0.25 },
    lead:  { inst: 'pluck', gain: 0.5, reverb: 0.55, delay: 0.35, pan: 0.2, tremolo: { rate: 6, depth: 0.4 }, params: { damping: 0.997, bright: 0.6, twang: 7, ring: 0.8, slide: true } },
  },
  patterns: {
    pick: ['0 2 1^ 2 0^ 2 1^ 2'],
    bassA: ['0 - - . 2 - . . 0 - - . 2 - 1 .'],
    drA: ['k . r . c . r r k . r k c . r .'],
    drSoft: ['. . r . . . r . . . r . . . r r'],
    bellA: ['B5 . . . D6 . . . G5 . . . A5 . . .', 'G5 . . . . . . . . . . . . . . .', 'E5 . . . G5 . . . C6 . . . B5 . . .', 'A5 . . . . . F#5 . D5 . . . . . . .'],
    leadA: [
      'D5 - - B4 - - G4 - A4 - B4 - D5 - - -',
      'E5 - - D5 - - B4 - G4 - - - - - - -',
      'C5 - - E5 - - G5 - E5 - D5 - C5 - - -',
      'D5 - - - F#5 - - - A5 - G5 - F#5 - D5 -',
    ],
  },
  sections: {
    A: { bars: 4, chords: ['G', 'Em', 'C', 'D'], play: { pad: 'chords', gtr: 'pick', bass: 'bassA', drums: 'drSoft', bell: 'bellA' } },
    B: { bars: 4, chords: ['G', 'Em', 'C', 'D'], play: { pad: 'chords', gtr: 'pick', bass: 'bassA', drums: 'drA', lead: 'leadA' } },
    C: { bars: 4, chords: ['C', 'G', 'Am', 'D'], play: { pad: 'chords', gtr: 'pick', bass: 'bassA', drums: 'drA', bell: 'bellA' } },
  },
  order: ['A', 'B', 'C', 'B'],
  loopTo: 0,
};
