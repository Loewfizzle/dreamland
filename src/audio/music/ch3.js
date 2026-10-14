// ============================================================================
//  CHAPTER 3 — "Moonlight on the Wire"
//  C minor, 84 BPM. Sneaky: ticking hats, a pulsing sub bass, glassy bells,
//  a theremin drifting overhead. ADAPTIVE:
//    'tension' layers (heartbeat kick + tremolo strings) swell while a guard
//      is suspicious,
//    'alert' layers (driving drums, alarm stabs, fast arp) slam in when Ben
//      is SPOTTED, and fade out once the guards lose him.
// ============================================================================
export default {
  name: 'ch3',
  bpm: 84,
  swing: 0.08,
  layers: {
    drone: { inst: 'drone', gain: 0.5, octave: 2, reverb: 0.4, params: { cutoff: 320, attack: 2, release: 2 } },
    pad:   { inst: 'pad', gain: 0.32, reverb: 0.6, voiceLow: 48, params: { cutoff: 900, attack: 1.6, release: 2.2, detune: 14 } },
    bass:  { inst: 'bass', gain: 0.5, octave: 2, reverb: 0.05, params: { cutoff: 300, q: 3 } },
    tick:  { inst: 'drums', gain: 0.45, reverb: 0.2 },
    bell:  { inst: 'bell', gain: 0.38, reverb: 0.7, delay: 0.45, pan: -0.3 },
    ther:  { inst: 'theremin', gain: 0.4, reverb: 0.75, delay: 0.35, pan: 0.3, params: { glide: 0.3, vibDepth: 0.025 } },
    // tension (suspicious)
    heart: { inst: 'drums', gain: 0.6, reverb: 0.1, level: 0 },
    trem:  { inst: 'arp', gain: 0.22, octave: 4, reverb: 0.4, level: 0, params: { cutoff: 1800, gate: 0.05, wave: 'sawtooth' } },
    // alert (spotted)
    drums: { inst: 'drums', gain: 0.75, reverb: 0.12, level: 0 },
    stab:  { inst: 'lead', gain: 0.38, octave: 4, reverb: 0.3, delay: 0.2, level: 0, params: { cutoff: 3000, release: 0.06 } },
    arp:   { inst: 'arp', gain: 0.24, octave: 5, reverb: 0.2, delay: 0.3, level: 0, params: { cutoff: 4000, gate: 0.04 } },
  },
  patterns: {
    droneP: ['0 - - - - - - - - - - - - - - -'],
    bassP: ['0 . . . . . . 0 . . 0 . . . . .', '0 . . . . . . 0 . . 2 . 1 . . .'],
    tickP: ['h . r . h . r . h . r . h . r r', 'h . r . h . r . h . r . h r . h'],
    bellP: ['G5 . . . . . Eb5 . . . . . C5 . . .', '. . . . . . . . . . . . . . . .', 'F5 . . . . . D5 . . . . . B4 . . .', '. . . . . . . . . . . . . . . .'],
    therP: ['C6 - - - - - - - B5 - - - - - - -', 'Ab5 - - - - - - - G5 - - - - - - -'],
    heartP: ['k . . k . . . . k . . k . . . .'],
    tremP: ['0 0 0 0 1 1 1 1 2 2 2 2 1 1 1 1'],
    drumsP: ['kx . h k s . h k k . h k s . s s', 'k . h k s . h k k k h . s s T t'],
    stabP: ['C5+Eb5 . . C5+Eb5 . . . . Bb4+D5 . . Bb4+D5 . . . .', 'Ab4+C5 . . Ab4+C5 . . . . G4+B4 . . G4+B4 . . G4+B4 .'],
    arpP: ['0 2 4 2 0 2 4 6 0 2 4 2 6 4 2 0'],
  },
  sections: {
    A: { bars: 4, chords: ['Cm', 'Cm', 'Ab', 'G'], play: { drone: 'droneP', pad: 'chords', bass: 'bassP', tick: 'tickP', bell: 'bellP', ther: 'therP', heart: 'heartP', trem: 'tremP', drums: 'drumsP', stab: 'stabP', arp: 'arpP' } },
    B: { bars: 4, chords: ['Fm', 'Cm', 'Ab', 'G'], play: { drone: 'droneP', pad: 'chords', bass: 'bassP', tick: 'tickP', bell: 'bellP', heart: 'heartP', trem: 'tremP', drums: 'drumsP', stab: 'stabP', arp: 'arpP' } },
  },
  order: ['A', 'B'],
  loopTo: 0,
};
