// ============================================================================
//  CHAPTER 5 LEVEL LAYOUT — "UNDERGROUND"
//  Built from readable helper calls instead of a giant ASCII blob.
//  Units are TILES (16px). Row 0 is the top. The main floor surface is row 20.
//
//  Reachability rules (verified by tools/reach-check.mjs, which simulates
//  Ben's real jump physics): climb ≤ 3 rows at once; gaps ≤ 3 tiles when
//  climbing, ≤ 4 when level.
//
//  Grid legend:  '#' solid steel   '=' one-way catwalk   '.' empty
// ============================================================================
export const COLS = 240;
export const ROWS = 23;
export const FLOOR = 20;

export function buildLevel() {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  const solid = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = '#'; };
  const catwalk = (x0, x1, y) => { for (let x = x0; x <= x1; x++) g[y][x] = '='; };
  const clear = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = '.'; };

  const L = {
    start: { x: 4, y: FLOOR },
    coins: [], goldens: [], hotdogs: [], enemies: [], lasers: [], elevators: [],
    checkpoints: [], lamps: [], decor: [], triggers: [], doors: [], rig: null,
  };
  const coinRow = (x0, x1, y, step = 1) => { for (let x = x0; x <= x1; x += step) L.coins.push({ x, y }); };
  const coinArc = (x0, y, n, h = 2) => { for (let i = 0; i < n; i++) L.coins.push({ x: x0 + i, y: y - Math.round(Math.sin((i / (n - 1)) * Math.PI) * h) }); };

  // --- shell: ceiling, floor, end walls
  solid(0, 0, COLS - 1, 1);
  solid(0, FLOOR, COLS - 1, ROWS - 1);
  solid(0, 0, 1, ROWS - 1);
  solid(COLS - 2, 0, COLS - 1, ROWS - 1);

  // ===========================================================================
  // 1) ARRIVAL (cols 2–30): elevator shaft, first soldier
  // ===========================================================================
  L.decor.push({ type: 'shaft', x: 4, y: FLOOR });
  L.decor.push({ type: 'crate', x: 9, y: FLOOR }, { type: 'barrel', x: 11, y: FLOOR });
  solid(14, 18, 15, 19);                                  // first step up (2 rows)
  coinArc(12, 17, 6, 2);
  catwalk(18, 23, 17);                                    // 3 rows above floor
  coinRow(19, 22, 16);
  L.lamps.push({ x: 8 }, { x: 20 }, { x: 28 });
  L.enemies.push({ type: 'soldier', x: 26, y: FLOOR, patrol: [22, 30] });
  coinRow(26, 30, 19, 2);

  // ===========================================================================
  // 2) SPECIMEN HALL (cols 31–80): tanks, catwalk climb to golden #1
  // ===========================================================================
  L.checkpoints.push({ x: 33, y: FLOOR });
  for (const x of [38, 44, 50, 56, 74]) L.decor.push({ type: 'tank', x, y: FLOOR });
  catwalk(36, 42, 17);
  catwalk(45, 51, 14);
  catwalk(54, 59, 11);
  coinRow(37, 41, 16);
  coinRow(46, 50, 13);
  coinRow(55, 58, 10);
  L.goldens.push({ x: 58, y: 9, id: 0 });                 // hidden: Zeus must SNIFF it out
  L.enemies.push({ type: 'soldier', x: 48, y: FLOOR, patrol: [40, 57] });
  L.enemies.push({ type: 'drone', x: 61, y: 12, patrol: [56, 68] });
  solid(64, 18, 65, 19);
  solid(66, 17, 68, 19);
  L.hotdogs.push({ x: 67, y: 16 });
  coinArc(60, 19, 4, 1);
  L.enemies.push({ type: 'soldier', x: 74, y: FLOOR, patrol: [70, 79] });
  coinRow(70, 79, 19, 3);
  L.lamps.push({ x: 35 }, { x: 47 }, { x: 60 }, { x: 72 });

  // ===========================================================================
  // 3) LASER CORRIDOR (cols 81–114): low ceiling, timed laser gates, drones
  // ===========================================================================
  solid(82, 2, 114, 9);
  const laserXs = [87, 93, 99, 105, 111];
  laserXs.forEach((x, i) => L.lasers.push({ x, y0: 10, y1: FLOOR - 1, phase: i * 0.37 }));
  for (let i = 0; i < laserXs.length - 1; i++) coinRow(laserXs[i] + 2, laserXs[i + 1] - 2, 19, 2);
  L.enemies.push({ type: 'drone', x: 96, y: 13, patrol: [89, 103] });
  L.enemies.push({ type: 'drone', x: 108, y: 13, patrol: [101, 113] });
  for (const x of [84, 96, 108]) L.lamps.push({ x, y: 10 });
  L.hotdogs.push({ x: 113, y: 19 });

  // ===========================================================================
  // 4) THE LIFT (cols 115–152): elevator to an upper catwalk; two paths
  // ===========================================================================
  L.checkpoints.push({ x: 117, y: FLOOR });
  L.elevators.push({ x: 121, w: 3, top: 8, bottom: FLOOR });   // platform surface rows
  catwalk(124, 152, 8);                                    // upper route (one-way)
  coinRow(126, 150, 7, 3);
  L.enemies.push({ type: 'grey', x: 140, y: 8, patrol: [130, 150] });
  L.goldens.push({ x: 151, y: 6, id: 1 });
  // lower route
  L.enemies.push({ type: 'soldier', x: 138, y: FLOOR, patrol: [128, 150] });
  solid(132, 18, 134, 19);
  coinArc(131, 17, 5, 1);
  L.lamps.push({ x: 119 }, { x: 131 }, { x: 145 });
  L.decor.push({ type: 'crate', x: 146, y: FLOOR }, { type: 'crate', x: 147, y: FLOOR - 1.25 });

  // ===========================================================================
  // 5) SERVER FARM (cols 153–195): racks, CIA agents, golden #3 up high
  // ===========================================================================
  for (let x = 155; x <= 193; x += 3) L.decor.push({ type: 'rack', x, y: FLOOR });
  solid(158, 18, 163, 19);
  solid(170, 17, 175, 19);
  solid(182, 18, 186, 19);
  catwalk(165, 170, 14);
  coinRow(159, 162, 17);
  coinRow(171, 174, 16);
  coinRow(165, 169, 13);
  L.goldens.push({ x: 166, y: 12, id: 2 });
  L.enemies.push({ type: 'agent', x: 167, y: FLOOR, patrol: [164, 169] });
  L.enemies.push({ type: 'drone', x: 178, y: 12, patrol: [172, 186] });
  L.enemies.push({ type: 'agent', x: 190, y: FLOOR, patrol: [187, 194] });
  L.hotdogs.push({ x: 173, y: 16 });
  coinRow(177, 181, 19, 2);
  L.lamps.push({ x: 157 }, { x: 168 }, { x: 180 }, { x: 192 });

  // ===========================================================================
  // 6) CONTAINMENT (cols 196–222): Greys escaped their tanks
  // ===========================================================================
  L.checkpoints.push({ x: 197, y: FLOOR });
  for (const x of [201, 208, 219]) L.decor.push({ type: 'tank', x, y: FLOOR, broken: x !== 208 });
  catwalk(211, 216, 17);
  coinRow(212, 215, 16);
  L.enemies.push({ type: 'grey', x: 205, y: FLOOR, patrol: [200, 210] });
  L.enemies.push({ type: 'soldier', x: 209, y: FLOOR, patrol: [203, 220] });
  L.enemies.push({ type: 'grey', x: 214, y: 17, patrol: [211, 216] });
  L.lamps.push({ x: 199 }, { x: 212 });
  coinArc(203, 19, 6, 1);

  // ===========================================================================
  // 7) THE RIG ROOM (cols 223–237)
  // ===========================================================================
  L.doors.push({ x: 223, y: FLOOR, requires: 'containment' });   // opens when area cleared
  solid(223, 2, 223, 16);                                   // wall above the door
  L.rig = { x: 233, y: FLOOR };
  L.triggers.push({ x: 229, type: 'rig' });
  L.lamps.push({ x: 228 }, { x: 234 });
  L.decor.push({ type: 'rack', x: 226, y: FLOOR }, { type: 'rack', x: 236, y: FLOOR });

  void clear;
  L.grid = g.map((r) => r.join(''));
  return L;
}
