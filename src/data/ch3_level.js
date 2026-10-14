// ============================================================================
//  CHAPTER 3 — THE PERIMETER: level layout (world 960 x 1800, north = up).
//  Played from the bottom (south) to the fence at the top. Four sections:
//   A  "First Contact"    one patrolling guard, bushes to hide in
//   B  "Sensor Field"     pulsing motion sensors + a vertical patrol
//   C  "The Chokepoint"   a guard blocks the only gap: BARK to lure him off,
//                          a searchlight sweeps the approach
//   D  "The Fence"        patrol road, a second searchlight, cut the fence
// ============================================================================
export const START = { x: 480, y: 1760 };
export const CUT = { x: 480, y: 172 };       // where Ben cuts the fence
export const FENCE_Y = 150;                  // bottom of the fence line

// Obstacles: sprite + footprint. Block movement AND line of sight.
const R = (key, x, y) => ({ key, x, y });
export const OBSTACLES = [
  // A
  R('rock_m', 300, 1640), R('rock_l', 640, 1660), R('rock_s', 120, 1700), R('rock_s', 860, 1560),
  // B
  R('rock_m', 150, 1320), R('rock_m', 820, 1300), R('rock_s', 560, 1390),
  // C: two rock walls with a 140px gap in the middle, plus cover in front
  R('rock_l', 60, 960), R('rock_l', 180, 960), R('rock_l', 300, 960),
  R('rock_l', 660, 960), R('rock_l', 780, 960), R('rock_l', 900, 960),
  R('rock_m', 250, 1070), R('rock_m', 720, 1080),
  // D
  R('rock_m', 140, 560), R('rock_l', 800, 470), R('rock_s', 360, 420), R('rock_m', 620, 330),
];
export const FOOTPRINT = { rock_s: [34, 16], rock_m: [62, 24], rock_l: [110, 30], pickup: [84, 30] };

export const BUSHES = [
  { x: 180, y: 1590 }, { x: 470, y: 1560 }, { x: 790, y: 1640 },                 // A
  { x: 480, y: 1370 }, { x: 140, y: 1220 }, { x: 640, y: 1180 },                 // B
  { x: 120, y: 1050 }, { x: 840, y: 1040 }, { x: 410, y: 1060 }, { x: 560, y: 850 }, // C
  { x: 300, y: 470 }, { x: 480, y: 600 }, { x: 700, y: 610 }, { x: 160, y: 300 }, { x: 860, y: 280 }, // D
];

// Guards: path = waypoints (loops), wait = ms paused at each point, look = idle sweep
export const GUARDS = [
  { id: 'g1', path: [[200, 1540], [760, 1540]], speed: 38, wait: 1400 },
  { id: 'g2', path: [[700, 1170], [700, 1440]], speed: 42, wait: 1200 },
  { id: 'g3', path: [[480, 920]], speed: 0, facing: Math.PI / 2, look: 0.6, post: true },   // the chokepoint
  { id: 'g4', path: [[140, 800], [820, 800]], speed: 44, wait: 900 },
  { id: 'g5', path: [[100, 250], [860, 250]], speed: 46, wait: 1000 },
  { id: 'g6', path: [[560, 400], [780, 400], [780, 560], [560, 560]], speed: 40, wait: 600 },
];

export const SENSORS = [
  { x: 290, y: 1290, r: 78, period: 2600, phase: 0 },
  { x: 480, y: 1210, r: 78, period: 2600, phase: 0.33 },
  { x: 670, y: 1290, r: 78, period: 2600, phase: 0.66 },
  { x: 380, y: 680, r: 64, period: 2200, phase: 0.2 },
];

// Searchlights: tower position, sweep between angles (radians, 0 = east, PI/2 = south)
export const SEARCHLIGHTS = [
  { x: 470, y: 760, from: 1.15, to: 1.95, range: 250, radius: 36, speed: 0.45 },
  { x: 900, y: 140, from: 1.75, to: 2.75, range: 330, radius: 40, speed: 0.38 },
];

export const CHECKPOINTS = [
  { y: 1460, x: 480, label: 'SENSOR FIELD' },
  { y: 1110, x: 480, label: 'THE CHOKEPOINT' },
  { y: 720, x: 480, label: 'THE FENCE' },
];

export const PROPS = [
  { key: 'sign_warning', x: 420, y: 1490 }, { key: 'sign_force', x: 560, y: 1490 },
  { key: 'sign_warning', x: 240, y: 268 }, { key: 'sign_force', x: 720, y: 268 },
  { key: 'pickup', x: 230, y: 380, solid: true },
];

export const GOLDENS = [
  { x: 900, y: 1720, id: 0 },
  { x: 60, y: 760, id: 1 },
  { x: 900, y: 620, id: 2 },
];

export function coinSpots() {
  const c = [];
  const line = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) c.push([x0 + ((x1 - x0) * i) / (n - 1), y0 + ((y1 - y0) * i) / (n - 1)]); };
  line(480, 1720, 470, 1600, 4);
  line(180, 1640, 180, 1500, 3);
  line(790, 1600, 860, 1480, 3);
  line(400, 1440, 560, 1440, 4);
  line(140, 1280, 140, 1160, 3);
  line(560, 1140, 820, 1140, 4);
  line(440, 1030, 520, 1030, 3);
  line(470, 900, 470, 860, 2);
  line(200, 760, 760, 760, 6);
  line(300, 640, 640, 640, 5);
  line(160, 460, 160, 340, 3);
  line(400, 300, 560, 300, 4);
  return c;
}

export const TIPS = [
  { y: 1700, text: 'GUARDS SEE IN THEIR FLASHLIGHT CONES. HIDE IN BUSHES!' },
  { y: 1430, text: 'MOTION SENSORS PULSE. STAND STILL WHEN THE RING PASSES.' },
  { y: 1090, text: 'A GUARD BLOCKS THE GAP. ZEUS CAN BARK TO LURE HIM AWAY!' },
  { y: 700, text: 'REACH THE FENCE AND CUT THROUGH.' },
];
