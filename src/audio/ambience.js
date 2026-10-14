// ============================================================================
//  AMBIENT SOUNDSCAPES — beds of looping sound plus random one-shot events.
//  loops:  [{ name: LOOPS key, vol }]
//  events: [{ sfx: SFX key, every: [minSec, maxSec], vol, pan: [min, max] }]
// ============================================================================
export const AMBIENCES = {
  // Title screen: sunset campfire in the desert.
  title: {
    loops: [
      { name: 'wind', vol: 0.45 },
      { name: 'fire', vol: 0.3 },
      { name: 'crickets', vol: 0.12 },
    ],
    events: [
      { sfx: 'coyote', every: [16, 32], vol: 0.55, pan: [-0.9, 0.9] },
      { sfx: 'fire_pop', every: [0.6, 2.2], vol: 0.6, pan: [-0.3, -0.1] },
    ],
  },
  desert_day: {
    loops: [{ name: 'wind', vol: 0.55 }],
    events: [],
  },
  desert_night: {
    loops: [
      { name: 'wind', vol: 0.35 },
      { name: 'crickets', vol: 0.35 },
    ],
    events: [{ sfx: 'coyote', every: [14, 30], vol: 0.5, pan: [-0.9, 0.9] }],
  },
  // Underground labs: mains hum, drips, buzzing tubes, distant machinery.
  lab: {
    loops: [{ name: 'hum', vol: 0.5 }],
    events: [
      { sfx: 'drip', every: [1.5, 5], vol: 0.6, pan: [-0.9, 0.9] },
      { sfx: 'buzz', every: [4, 11], vol: 0.5, pan: [-0.7, 0.7] },
      { sfx: 'clank', every: [7, 16], vol: 0.35, pan: [-1, 1] },
      { sfx: 'steam', every: [12, 25], vol: 0.4, pan: [-0.8, 0.8] },
    ],
  },
};
