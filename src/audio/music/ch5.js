// ============================================================================
//  CHAPTER 5 — "Subterranean Protocol"
//  D minor, 116 BPM. Driving dark synthwave for the underground labs.
//  ADAPTIVE: the 'combat' layers (drums2, lead, arpHot) fade in when enemies
//  are engaged; the 'alien' theremin swells near Greys. The scene controls
//  them with Audio.setLayer(name, level).
// ============================================================================
export default {
  name: 'ch5',
  master: 0.88,          // loudness trim (see audio mix notes in README)
  bpm: 116,
  swing: 0,
  layers: {
    drone:  { inst: 'drone', gain: 0.5, octave: 2, reverb: 0.3, params: { cutoff: 380, attack: 2, release: 2 } },
    pad:    { inst: 'pad', gain: 0.38, reverb: 0.5, voiceLow: 50, params: { cutoff: 1100, attack: 1.4, release: 2, detune: 12 } },
    bass:   { inst: 'bass', gain: 0.6, octave: 2, reverb: 0.03, params: { cutoff: 380, q: 6, decay: 0.06 } },
    arp:    { inst: 'arp', gain: 0.26, octave: 4, reverb: 0.25, delay: 0.4, pan: -0.2, params: { cutoff: 2400, gate: 0.06 } },
    drums:  { inst: 'drums', gain: 0.62, reverb: 0.12 },
    // --- combat layers (start silent)
    drums2: { inst: 'drums', gain: 0.55, reverb: 0.1, level: 0 },
    lead:   { inst: 'lead', gain: 0.42, octave: 4, reverb: 0.35, delay: 0.3, pan: 0.1, level: 0, params: { cutoff: 2600, glide: 0.05, release: 0.2 } },
    arpHot: { inst: 'arp', gain: 0.2, octave: 5, reverb: 0.2, delay: 0.35, pan: 0.3, level: 0, params: { cutoff: 4200, gate: 0.04, wave: 'sawtooth' } },
    // --- alien layer
    alien:  { inst: 'theremin', gain: 0.45, reverb: 0.75, delay: 0.35, level: 0.15, params: { glide: 0.25, vibDepth: 0.03 } },
    bell:   { inst: 'bell', gain: 0.35, reverb: 0.7, delay: 0.5, pan: 0.35 },
  },

  patterns: {
    droneP: ['0 - - - - - - - - - - - - - - -'],
    bassA: ['0 . 0 0 . 0 0 . 0 . 0 0 . 0 3 .'],
    bassB: ['0 0 3 0 0 3 0 0 0 0 3 0 2 . 1 .'],
    arpA: ['0 2 4 2 0 2 4 5 0 2 4 2 0 2 4 6'],
    arpHotP: ['6 4 2 4 6 4 2 4 7 5 3 5 7 5 3 5'],
    // alarm-like lead riff for combat
    leadA: [
      'D5 - - F5 - - E5 - D5 - - - A4 - C5 -',
      'Bb4 - - D5 - - C5 - Bb4 - - - F4 - A4 -',
      'G4 - - Bb4 - - A4 - G4 - - - D5 - C5 -',
      'A4 - - - C#5 - - - E5 - - - A5 - - -',
    ],
    alienP: [
      'A5 - - - - - - - G#5 - - - - - - -',
      'F5 - - - - - - - E5 - - - - - D5 -',
    ],
    bellP: ['D6 . . . A5 . . . F5 . . . E5 . . .', '. . . . . . . . . . . . . . . .'],
    drA: [
      'k . h . s . h k . k h . s . h h',
      'k . h . s . h k . k h . s . h o',
    ],
    drB: [
      'kx . h r s . h k . k h r s . h r',
      'k . h r s . h k . k h r s . T t',
    ],
    dr2A: ['. . r . . c r . . . r . . c r r', '. . r . . c r . . . r . . c t T'],
    drSparse: ['k . . . . . . . k . . . . . . .', 'k . . . . . . . k . . . s . . .'],
  },

  sections: {
    // calm exploration
    A: { bars: 8, chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'],
      play: { drone: 'droneP', pad: 'chords', bass: 'bassA', arp: 'arpA', drums: 'drA', drums2: 'dr2A', lead: 'leadA', arpHot: 'arpHotP', alien: 'alienP', bell: 'bellP' } },
    B: { bars: 8, chords: ['Bb', 'C', 'Dm', 'Dm', 'Gm', 'Bb', 'A', 'A'],
      play: { drone: 'droneP', pad: 'chords', bass: 'bassB', arp: 'arpA', drums: 'drB', drums2: 'dr2A', lead: 'leadA', arpHot: 'arpHotP', alien: 'alienP' } },
    // breather (used for dialogue / the rig discovery)
    reveal: { bars: 4, loop: true, chords: ['Dm', 'Bb', 'F', 'A'],
      play: { pad: 'chords', alien: 'alienP', bell: 'bellP', drums: 'drSparse' } },
  },
  order: ['A', 'B'],
  loopTo: 0,
};
