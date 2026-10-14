// ============================================================================
//  Music theory helpers: note names, chords and pattern-token parsing.
// ============================================================================

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** "A4" / "C#3" / "Bb2" -> midi number, or null. */
export function noteToMidi(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return null;
  let pc = PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return pc + 12 * (parseInt(m[3], 10) + 1);
}

const QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11], sus2: [0, 2, 7], sus4: [0, 5, 7], dim: [0, 3, 6],
  aug: [0, 4, 8], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], m9: [0, 3, 7, 10, 14],
  '7b9': [0, 4, 7, 10, 13],
};

const chordCache = new Map();
/** "Am" -> { root: 9, intervals: [0,3,7] } (root as pitch class) */
export function parseChord(name) {
  if (chordCache.has(name)) return chordCache.get(name);
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  if (!m) return null;
  const root = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const intervals = QUALITIES[m[3]] ?? QUALITIES[''];
  const c = { root, intervals, name };
  chordCache.set(name, c);
  return c;
}

/**
 * Close-voiced chord: every chord tone is folded into [low, low+12) so that
 * consecutive chords voice-lead smoothly (like a real keyboard player would).
 */
export function voiceChord(chord, low = 52) {
  const notes = chord.intervals.map((iv) => {
    let m = chord.root + iv;
    while (m < low) m += 12;
    while (m >= low + 12) m -= 12;
    return m;
  });
  notes.sort((a, b) => a - b);
  return notes;
}

/** Chord-degree index -> midi. 0 = root, 1 = 3rd, 2 = 5th, 3 = root+8va ... */
export function degreeToMidi(chord, idx, octave) {
  const n = chord.intervals.length;
  const oct = Math.floor(idx / n);
  const iv = chord.intervals[((idx % n) + n) % n];
  return chord.root + iv + 12 * (octave + 1 + oct);
}

/**
 * Expand a bar string into exactly 16 step tokens.
 * Bars may be written with 4, 8 or 16 tokens; coarser bars are stretched.
 * '-' = hold previous note, '.' = rest.
 */
export function expandBar(str, isDrum) {
  const toks = str.trim().split(/\s+/);
  const per = 16 / toks.length;
  if (!Number.isInteger(per)) throw new Error(`Bar needs 4/8/16 tokens: "${str}"`);
  const out = [];
  for (const t of toks) {
    out.push(t);
    for (let i = 1; i < per; i++) out.push(isDrum || t === '.' ? '.' : '-');
  }
  return out;
}
