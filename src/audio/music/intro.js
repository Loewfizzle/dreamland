// ============================================================================
//  INTRO CUTSCENE — "Something In The Blockchain"
//  E minor, 84 BPM. Sections are switched by the cutscene script:
//    night   — late-night mining hum, curious arpeggios, theremin hints
//    signal  — the strange message: alien theremin + bells
//    raid    — black SUVs: tense drums and driving bass
//    resolve — Ben decides: heroic, hopeful, into the desert
// ============================================================================
export default {
  name: 'intro',
  bpm: 84,
  swing: 0,
  layers: {
    drone: { inst: 'drone', gain: 0.45, octave: 2, reverb: 0.35, params: { cutoff: 420, attack: 2, release: 2 } },
    pad:   { inst: 'pad', gain: 0.42, reverb: 0.5, voiceLow: 52, params: { cutoff: 1200, attack: 1.2, release: 2 } },
    arp:   { inst: 'arp', gain: 0.24, octave: 4, reverb: 0.3, delay: 0.45, pan: -0.2, params: { cutoff: 2600, gate: 0.06 } },
    ther:  { inst: 'theremin', gain: 0.5, reverb: 0.7, delay: 0.35, pan: 0.2, params: { glide: 0.2, vibDepth: 0.025 } },
    bell:  { inst: 'bell', gain: 0.4, reverb: 0.7, delay: 0.4, pan: 0.3 },
    bass:  { inst: 'bass', gain: 0.55, octave: 2, reverb: 0.03, params: { cutoff: 400, q: 5 } },
    drums: { inst: 'drums', gain: 0.65, reverb: 0.14 },
    lead:  { inst: 'lead', gain: 0.4, octave: 4, reverb: 0.4, delay: 0.3, params: { cutoff: 2800, glide: 0.06 } },
  },
  patterns: {
    droneP: ['0 - - - - - - - - - - - - - - -'],
    arpA: ['0 . 2 . 4 . 2 . 0 . 2 . 4 . 5 .'],
    arpB: ['0 2 4 2 0 2 4 6 0 2 4 2 0 2 5 4'],
    therSig: ['B5 - - - - - - - C6 - - - B5 - - -', 'G5 - - - - - - - F#5 - - - - - - -'],
    bellSig: ['E6 . . . B5 . . . G5 . . . F#5 . . .', '. . . . . . . . . . . . . . . .'],
    bassRaid: ['0 0 . 0 0 . 0 . 0 0 . 0 3 . 2 .'],
    drRaid: ['k . h . s . h k k . h . s . h s', 'k . h . s . h k k . h . s s T t'],
    drResolve: ['kx . h . s . h . k . h k s . h .', 'k . h . s . h . k . h k s . o .'],
    leadRes: ['E5 - - - G5 - - - B5 - - - A5 - G5 -', 'F#5 - - - - - D5 - E5 - - - - - - -'],
  },
  sections: {
    night: { bars: 4, chords: ['Em', 'C', 'Am', 'B7'], play: { drone: 'droneP', pad: 'chords', arp: 'arpA' } },
    signal: { bars: 4, loop: true, chords: ['Em', 'C', 'Em', 'B7'], play: { drone: 'droneP', pad: 'chords', ther: 'therSig', bell: 'bellSig', arp: 'arpA' } },
    raid: { bars: 4, loop: true, chords: ['Em', 'Em', 'C', 'B7'], play: { drone: 'droneP', bass: 'bassRaid', drums: 'drRaid', arp: 'arpB' } },
    resolve: { bars: 4, loop: true, chords: ['C', 'G', 'D', 'Em'], play: { pad: 'chords', bass: 'bassRaid', drums: 'drResolve', lead: 'leadRes', arp: 'arpB' } },
  },
  order: ['night', 'night'],
  loopTo: 0,
};
