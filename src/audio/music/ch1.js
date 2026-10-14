// ============================================================================
//  CHAPTER 1 — "Golden Hour Pursuit"
//  E minor, 128 BPM. Open-road synthwave with a twangy surf-western lead.
//  ADAPTIVE: 'chase' layers (drums2, stab, lead2) come in when SUVs are close.
// ============================================================================
export default {
  name: 'ch1',
  bpm: 128,
  swing: 0,
  layers: {
    pad:   { inst: 'pad', gain: 0.4, reverb: 0.45, voiceLow: 52, params: { cutoff: 1800, attack: 0.6, release: 1.2, detune: 11 } },
    bass:  { inst: 'bass', gain: 0.6, octave: 2, reverb: 0.03, params: { cutoff: 520, q: 5, decay: 0.05 } },
    arp:   { inst: 'arp', gain: 0.24, octave: 4, reverb: 0.2, delay: 0.4, pan: -0.25, params: { cutoff: 3000, gate: 0.05 } },
    drums: { inst: 'drums', gain: 0.7, reverb: 0.12 },
    gtr:   { inst: 'pluck', gain: 0.6, reverb: 0.45, delay: 0.32, pan: 0.15,
             tremolo: { rate: 7, depth: 0.35 }, params: { damping: 0.997, bright: 0.65, twang: 8, ring: 0.6, slide: true } },
    // chase layers
    drums2: { inst: 'drums', gain: 0.5, reverb: 0.1, level: 0 },
    stab:   { inst: 'lead', gain: 0.3, octave: 4, reverb: 0.3, delay: 0.25, level: 0, params: { cutoff: 3200, release: 0.08 } },
  },
  patterns: {
    bassA: ['0 0 0^ 0 0 0 0^ 0 0 0 0^ 0 0 0^ 0 2'],
    arpA: ['0 2 4 2 0 2 4 5 0 2 4 2 0 2 5 4'],
    drA: ['kx . h . s . h . k . h k s . h h', 'k . h . s . h . k k h . s . h o'],
    drB: ['k . h r s . h r k . h k s . h r', 'k . h r s . h r k k h . s s T t'],
    dr2: ['. . o . . . o . . . o . . c o .'],
    gtrA: [
      'E5 - - - B4 - D5 - E5 - G5 - F#5 - E5 -',
      'D5 - - - B4 - - - A4 - B4 - D5 - - -',
      'C5 - - - E5 - G5 - B5 - - - A5 - G5 -',
      'F#5 - - - D#5 - - - B4 - - - - - - -',
    ],
    gtrB: [
      'B5 - A5 - G5 - E5 - G5 - A5 - B5 - - -',
      'D6 - B5 - A5 - G5 - A5 - - - - - - -',
      'C6 - B5 - G5 - E5 - G5 - - - E5 - G5 -',
      'F#5 - - - A5 - - - B5 - - - - - - -',
    ],
    stabA: ['E5+G5 . . E5+G5 . . E5+G5 . . . E5+G5 . . . . .', 'D5+F#5 . . D5+F#5 . . D5+F#5 . . . D5+F#5 . . . . .'],
  },
  sections: {
    A: { bars: 4, chords: ['Em', 'D', 'C', 'B7'], play: { pad: 'chords', bass: 'bassA', arp: 'arpA', drums: 'drA', gtr: 'gtrA', drums2: 'dr2', stab: 'stabA' } },
    B: { bars: 4, chords: ['C', 'D', 'Em', 'B7'], play: { pad: 'chords', bass: 'bassA', arp: 'arpA', drums: 'drB', gtr: 'gtrB', drums2: 'dr2', stab: 'stabA' } },
    C: { bars: 4, chords: ['Em', 'G', 'D', 'B7'], play: { pad: 'chords', bass: 'bassA', drums: 'drB', arp: 'arpA', drums2: 'dr2', stab: 'stabA' } },
  },
  order: ['A', 'A', 'B', 'C', 'B'],
  loopTo: 0,
};
