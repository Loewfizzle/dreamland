// ============================================================================
//  MAP ROUTE — the road the van follows on the chapter map. Waypoints between
//  chapter stops make the highway wind naturally. Shared by the map texture
//  generator (to paint the road) and the map scene (to drive the van).
// ============================================================================
import { CHAPTERS } from './chapters.js';

export const HOME = { x: 58, y: 300 };

// [x, y, stop] — stop = chapter id when the point is a chapter location
export const ROUTE = [
  [HOME.x, HOME.y, 'home'],
  [96, 292], [134, 270], [160, 252],
  [CHAPTERS[0].map.x, CHAPTERS[0].map.y, 'ch1'],
  [222, 222], [242, 200],
  [CHAPTERS[1].map.x, CHAPTERS[1].map.y, 'ch2'],
  [292, 178], [326, 170],
  [CHAPTERS[2].map.x, CHAPTERS[2].map.y, 'ch3'],
  [384, 146], [410, 132],
  [CHAPTERS[3].map.x, CHAPTERS[3].map.y, 'ch4'],
  [454, 136], [468, 162],
  [CHAPTERS[4].map.x, CHAPTERS[4].map.y, 'ch5'],
  [510, 160], [532, 124],
  [CHAPTERS[5].map.x, CHAPTERS[5].map.y, 'ch6'],
];

/** Catmull–Rom sample of the whole route: returns [{x, y, stop?}] dense points. */
export function sampleRoute(stepsPerSeg = 14) {
  const pts = ROUTE;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < stepsPerSeg; s++) {
      const t = s / stepsPerSeg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]), stop: s === 0 ? p1[2] : undefined });
    }
  }
  const last = pts[pts.length - 1];
  out.push({ x: last[0], y: last[1], stop: last[2] });
  return out;
}
