// ============================================================================
//  CHAPTER 1 TRACK — Nevada SR-375, the Extraterrestrial Highway.
//  Road shape = list of pieces (curves/hills); events are placed by segment.
//  Offsets are in road half-widths: -1 = left road edge, +1 = right edge.
//  The two lanes are centred at -0.5 and +0.5.
// ============================================================================
export const LANES = [-0.5, 0.5];

// Road pieces: [kind, length (segments), curve, hill]
// curve: + right / - left (2 easy, 4 medium, 6 hard). hill: height in segment-lengths.
export const ROAD = [
  ['straight', 160, 0, 0],
  ['rolling', 320, 0, 6],
  ['curve', 260, 3, 0],
  ['straight', 200, 0, 0],
  ['scurves', 420, 4, 0],
  ['hill', 300, 0, 30],
  ['curve', 240, -4, -12],
  ['curve', 260, 3, 10],
  ['straight', 160, 0, 0],
  ['curve', 220, -2, 0],
  ['rolling', 380, 0, 8],
  ['straight', 420, 0, 0],
  ['hill', 320, 0, 45],
  ['hill', 200, 0, -30],
  ['scurves', 480, 5, 0],
  ['curve', 300, -3, 14],
  ['curve', 260, 4, -10],
  ['straight', 260, 0, 0],
  ['hill', 320, 0, -25],
  ['straight', 380, 0, 0],
];

export function trackLength() {
  return ROAD.reduce((a, p) => a + p[1], 0);
}

/** Events along the road. */
export function buildEvents() {
  const ev = [];
  const coinLine = (seg, n, lane, gap = 6) => { for (let i = 0; i < n; i++) ev.push({ seg: seg + i * gap, type: 'coin', x: lane }); };
  const coinZig = (seg, n, gap = 6) => { for (let i = 0; i < n; i++) ev.push({ seg: seg + i * gap, type: 'coin', x: Math.sin(i * 0.55) * 0.75 }); };
  const coinArc = (seg, n, from, to, gap = 6) => { for (let i = 0; i < n; i++) ev.push({ seg: seg + i * gap, type: 'coin', x: from + (to - from) * (i / (n - 1)) }); };

  // --- intro
  ev.push({ seg: 30, type: 'dialog', id: 'start' });
  ev.push({ seg: 70, type: 'prop', key: 'sign_et', x: 1.6, w: 1.4 });
  coinLine(110, 8, 0.5);
  coinZig(260, 12);
  ev.push({ seg: 330, type: 'prop', key: 'billboard0', x: -2.2, w: 1.8 });
  coinArc(480, 10, -0.6, 0.6);
  coinLine(700, 10, -0.5);
  ev.push({ seg: 760, type: 'prop', key: 'billboard1', x: 2.2, w: 1.8 });
  coinZig(900, 14);
  // golden #1: hidden off the left shoulder on the first big hill
  ev.push({ seg: 1310, type: 'golden', x: -1.25, id: 0 });
  coinLine(1240, 6, -0.9, 8);

  // --- SUV wave 1
  ev.push({ seg: 1450, type: 'dialog', id: 'suvs' });
  ev.push({ seg: 1520, type: 'suv', lane: 0.5, speed: 0.62, ai: 'cruise' });
  ev.push({ seg: 1600, type: 'suv', lane: -0.5, speed: 0.66, ai: 'weave' });
  ev.push({ seg: 1700, type: 'suv', lane: 0.5, speed: 0.6, ai: 'block' });
  coinZig(1560, 16);
  ev.push({ seg: 1900, type: 'suv', lane: -0.5, speed: 0.65, ai: 'weave' });
  ev.push({ seg: 1960, type: 'suv', lane: 0.5, speed: 0.68, ai: 'cruise' });
  coinLine(1980, 10, 0);
  ev.push({ seg: 2150, type: 'checkpoint', mile: 20 });

  // --- open range: cattle crossing
  ev.push({ seg: 2240, type: 'prop', key: 'sign_cow', x: 1.5, w: 0.6 });
  ev.push({ seg: 2270, type: 'dialog', id: 'cows' });
  ev.push({ seg: 2400, type: 'cow', x: -1.8, dir: 1 });
  ev.push({ seg: 2520, type: 'cow', x: 1.8, dir: -1 });
  ev.push({ seg: 2560, type: 'cow', x: 2.2, dir: -1 });
  coinArc(2420, 10, 0.6, -0.6);
  ev.push({ seg: 2700, type: 'cow', x: -1.8, dir: 1 });
  ev.push({ seg: 2760, type: 'cow', x: -2.3, dir: 1 });
  ev.push({ seg: 2780, type: 'prop', key: 'billboard2', x: -2.3, w: 1.8 });
  coinZig(2800, 12);

  // --- the long straight: roadblocks
  ev.push({ seg: 3050, type: 'dialog', id: 'roadblock' });
  ev.push({ seg: 3150, type: 'roadblock', x: 0.5 });
  coinLine(3120, 6, -0.5);
  ev.push({ seg: 3260, type: 'roadblock', x: -0.5 });
  coinLine(3230, 6, 0.5);
  ev.push({ seg: 3370, type: 'roadblock', x: 0.5 });
  ev.push({ seg: 3380, type: 'roadblock', x: -1.1 });
  coinLine(3340, 6, -0.4);
  // golden #2: just over the crest of the big hill, far right
  ev.push({ seg: 3700, type: 'golden', x: 1.3, id: 1 });
  coinArc(3620, 12, -0.7, 0.9);
  ev.push({ seg: 3900, type: 'checkpoint', mile: 10 });

  // --- SUV wave 2 (they mean business now)
  ev.push({ seg: 3980, type: 'dialog', id: 'wave2' });
  ev.push({ seg: 4060, type: 'suv', lane: -0.5, speed: 0.7, ai: 'block' });
  ev.push({ seg: 4120, type: 'suv', lane: 0.5, speed: 0.66, ai: 'weave' });
  ev.push({ seg: 4250, type: 'suv', lane: 0.5, speed: 0.72, ai: 'block' });
  ev.push({ seg: 4330, type: 'roadblock', x: -0.5 });
  ev.push({ seg: 4420, type: 'suv', lane: -0.5, speed: 0.7, ai: 'weave' });
  ev.push({ seg: 4480, type: 'suv', lane: 0.5, speed: 0.64, ai: 'cruise' });
  ev.push({ seg: 4560, type: 'cow', x: 1.9, dir: -1 });
  coinZig(4100, 20);
  coinLine(4520, 10, 0);
  ev.push({ seg: 4700, type: 'suv', lane: -0.5, speed: 0.74, ai: 'block' });
  ev.push({ seg: 4760, type: 'suv', lane: 0.5, speed: 0.7, ai: 'block' });
  coinArc(4800, 12, 0.7, -0.7);

  // --- downhill into Rachel
  ev.push({ seg: 5300, type: 'golden', x: -1.3, id: 2 });
  coinLine(5100, 14, 0.5);
  coinZig(5450, 16);
  ev.push({ seg: 5600, type: 'prop', key: 'billboard0', x: 2.2, w: 1.8 });
  ev.push({ seg: trackLength() - 260, type: 'prop', key: 'sign_rachel', x: 1.8, w: 2.2 });
  ev.push({ seg: trackLength() - 200, type: 'finish' });
  return ev.sort((a, b) => a.seg - b.seg);
}

export const DIALOG = {
  start: [
    { who: 'ben', mood: 'talk', text: 'State Route 375. The Extraterrestrial Highway. Rachel\'s about 40 miles out.' },
    { who: 'zeus', mood: 'happy', text: '*ears flapping majestically*' },
  ],
  suvs: [
    { who: 'radio', mood: 'stern', text: '"...all units, target is a teal van heading north on 375. Stop it."' },
    { who: 'ben', mood: 'shocked', text: 'They\'re listening to my CB radio?! Zeus, we got company!' },
  ],
  cows: [
    { who: 'ben', mood: 'talk', text: 'Open range. Cows have the right of way out here, buddy. Bark if they wander out!' },
  ],
  roadblock: [
    { who: 'ben', mood: 'angry', text: 'ROADBLOCKS?! For ONE guy with a van? ...I\'m flattered, honestly.' },
  ],
  wave2: [
    { who: 'radio', mood: 'stern', text: '"Box him in. He doesn\'t reach Rachel."' },
    { who: 'ben', mood: 'smug', text: 'Hold onto your ears, Zeus.' },
  ],
};
