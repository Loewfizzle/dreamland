// ============================================================================
//  CHAPTER 6 — "The Enforcer"
//  B minor, 140 BPM. The big one. The scene jumps between sections as the
//  boss changes phase (Audio.queueSection):
//    p1 — driving synthwave battle, heroic tremolo-guitar lead
//    p2 — tractor beam: half-time, theremin wails over a pounding beat
//    p3 — ENRAGED: double-time drums, alarm stabs, everything at once
//    win — triumphant major-key release as the Enforcer goes down
// ============================================================================
export default {
  name: 'ch6',
  master: 0.68,          // loudness trim (see audio mix notes in README)
  bpm: 140,
  swing: 0,
  layers: {
    pad:   { inst: 'pad', gain: 0.36, reverb: 0.45, voiceLow: 50, params: { cutoff: 1800, attack: 0.4, release: 1, detune: 12 } },
    bass:  { inst: 'bass', gain: 0.62, octave: 2, reverb: 0.03, params: { cutoff: 600, q: 6, decay: 0.05 } },
    arp:   { inst: 'arp', gain: 0.24, octave: 4, reverb: 0.2, delay: 0.35, pan: -0.25, params: { cutoff: 3600, gate: 0.04 } },
    drums: { inst: 'drums', gain: 0.75, reverb: 0.1 },
    gtr:   { inst: 'pluck', gain: 0.6, reverb: 0.4, delay: 0.28, pan: 0.15, tremolo: { rate: 8, depth: 0.3 }, params: { damping: 0.997, bright: 0.7, twang: 9, ring: 0.5, slide: true } },
    lead:  { inst: 'lead', gain: 0.38, octave: 4, reverb: 0.35, delay: 0.25, params: { cutoff: 3000, glide: 0.04 } },
    ther:  { inst: 'theremin', gain: 0.5, reverb: 0.7, delay: 0.3, params: { glide: 0.12, vibDepth: 0.035 } },
    stab:  { inst: 'lead', gain: 0.34, octave: 4, reverb: 0.2, params: { cutoff: 3400, release: 0.05 } },
  },
  patterns: {
    bassA: ['0 0 0^ 0 0 0 0^ 0 0 0 0^ 0 0 0^ 0 3'],
    bassHalf: ['0 . . . . . 0 . 0 . . . 3 . 2 .'],
    bassFast: ['0 0^ 0 0^ 0 0^ 0 0^ 0 0^ 0 0^ 2 3 2 1'],
    arpA: ['0 2 4 2 0 2 4 6 0 2 4 2 0 2 6 4'],
    drA: ['kx . h k s . h . k k h . s . h h', 'k . h k s . h . k k h . s s T t'],
    drHalf: ['kx . h . h . h . s . h . h . h k', 'k . h . h . h . s . h . h k T t'],
    drFast: ['kx h k h s h k h k h k h s h s s', 'k h k h s h k h k k k h s s T t'],
    gtrA: [
      'F#5 - - - D5 - B4 - D5 - E5 - F#5 - - -',
      'A5 - - - G5 - F#5 - E5 - - - D5 - - -',
      'G5 - - - F#5 - E5 - D5 - E5 - F#5 - - -',
      'E5 - - - C#5 - - - A#4 - - - - - - -',
    ],
    therP: ['B5 - - - - - - - A#5 - - - - - - -', 'D6 - - - C#6 - - - B5 - - - - - - -'],
    stabA: ['B4+D5 . . B4+D5 . . B4+D5 . . . B4+D5 . A4+C#5 . . .', 'G4+B4 . . G4+B4 . . G4+B4 . . . F#4+A#4 . . . . .'],
    leadWin: ['D5 - - - F#5 - - - A5 - - - D6 - - -', 'C#6 - - - B5 - A5 - B5 - - - - - - -', 'G5 - - - B5 - - - D6 - - - G6 - - -', 'F#6 - - - - - - - - - - - - - - -'],
    drWin: ['kx . h . s . h . k . h k s . o .'],
  },
  sections: {
    p1: { bars: 4, loop: true, chords: ['Bm', 'G', 'D', 'F#'], play: { pad: 'chords', bass: 'bassA', arp: 'arpA', drums: 'drA', gtr: 'gtrA' } },
    p2: { bars: 4, loop: true, chords: ['Bm', 'Bm', 'G', 'F#'], play: { pad: 'chords', bass: 'bassHalf', drums: 'drHalf', ther: 'therP', arp: 'arpA' } },
    p3: { bars: 4, loop: true, chords: ['Bm', 'G', 'Em', 'F#'], play: { pad: 'chords', bass: 'bassFast', drums: 'drFast', stab: 'stabA', gtr: 'gtrA', arp: 'arpA', ther: 'therP' } },
    win: { bars: 4, loop: true, chords: ['D', 'A', 'G', 'D'], play: { pad: 'chords', bass: 'bassHalf', drums: 'drWin', lead: 'leadWin' } },
  },
  order: ['p1'],
  loopTo: 0,
};
