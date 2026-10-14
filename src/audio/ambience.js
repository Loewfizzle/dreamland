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
};
