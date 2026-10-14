// ============================================================================
//  REACH CHECK — proves every coin, golden bitcoin, hot dog and goal in the
//  Chapter 5 level can actually be reached with Ben's real jump physics.
//  Usage:  node tools/reach-check.mjs        (exit code 1 if anything fails)
// ============================================================================
import { buildLevel, COLS, ROWS } from '../src/data/ch5_level.js';
import { CH5 } from '../src/config.js';

const T = CH5.TILE;
const BW = 10, BH = 26;             // Ben's physics body (keep in sync with Ch5 Player)
const MAX_FALL = 600;
const DT = 1 / 60;
const L = buildLevel();
const grid = L.grid;
const cell = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS ? '#' : grid[r][c]);
const isSolid = (c, r) => cell(c, r) === '#';
const isPlat = (c, r) => cell(c, r) === '=';

// elevator platforms behave like extra one-way surfaces at their stops
const elevatorStops = [];
for (const e of L.elevators) for (const row of [e.top, e.bottom]) for (let c = e.x; c < e.x + e.w; c++) elevatorStops.push({ c, r: row });
const isElev = (c, r) => elevatorStops.some((s) => s.c === c && s.r === r);

function overlapsSolid(x, feet) {
  const l = Math.floor((x - BW / 2) / T), rr = Math.floor((x + BW / 2 - 0.01) / T);
  const top = Math.floor((feet - BH) / T), bot = Math.floor((feet - 0.01) / T);
  for (let r = top; r <= bot; r++) for (let c = l; c <= rr; c++) if (isSolid(c, r)) return true;
  return false;
}

/** Simulate one jump/walk-off. dirFn(frame) -> -1|0|1. Returns { land:{c,r}|null, path:[{x,feet}] } */
function simulate(x, feet, vx0, vy0, dirFn) {
  let vx = vx0, vy = vy0;
  const path = [];
  for (let f = 0; f < 240; f++) {
    const dir = dirFn(f);
    const target = dir * CH5.RUN_SPEED;
    const acc = CH5.AIR_ACCEL * DT;
    vx += Math.max(-acc, Math.min(acc, target - vx));
    // horizontal move + resolve
    let nx = x + vx * DT;
    if (overlapsSolid(nx, feet)) { nx = x; vx = 0; }
    x = nx;
    // vertical move
    vy = Math.min(MAX_FALL, vy + CH5.GRAVITY * DT);
    let nf = feet + vy * DT;
    if (vy < 0 && overlapsSolid(x, nf)) { vy = 0; nf = feet; }
    if (vy > 0) {
      // landing check across every tile row crossed this frame
      const l = Math.floor((x - BW / 2) / T), rr = Math.floor((x + BW / 2 - 0.01) / T);
      for (let r = Math.floor(feet / T); r <= Math.floor(nf / T); r++) {
        const surf = r * T;
        if (feet <= surf + 0.01 && nf >= surf) {
          for (let c = l; c <= rr; c++) {
            if (isSolid(c, r) || isPlat(c, r) || isElev(c, r)) {
              path.push({ x, feet: surf });
              return { land: { c: Math.floor(x / T), r }, path };
            }
          }
        }
      }
    }
    feet = nf;
    path.push({ x, feet });
    if (feet > ROWS * T + 40) return { land: null, path };
  }
  return { land: null, path };
}

const standable = (c, r) => (isSolid(c, r) || isPlat(c, r) || isElev(c, r)) && !isSolid(c, r - 1) && !isSolid(c, r - 2);
const key = (c, r) => `${c},${r}`;
const seen = new Set();
const queue = [{ c: L.start.x, r: L.start.y }];
seen.add(key(L.start.x, L.start.y));
const visitedPts = [];

function push(c, r) {
  if (!standable(c, r)) return;
  const k = key(c, r);
  if (seen.has(k)) return;
  seen.add(k);
  queue.push({ c, r });
}

while (queue.length) {
  const { c, r } = queue.shift();
  const feet = r * T;
  visitedPts.push({ x: c * T + T / 2, feet });
  // walk to neighbours on the same surface
  for (const d of [-1, 1]) if (standable(c + d, r)) push(c + d, r);
  // elevator: ride between its stops
  for (const e of L.elevators) {
    if (c >= e.x && c < e.x + e.w && (r === e.top || r === e.bottom)) { push(c, r === e.top ? e.bottom : e.top); for (let k = e.x; k < e.x + e.w; k++) { push(k, e.top); push(k, e.bottom); } }
  }
  // drop through one-way catwalks (down + jump isn't a thing here, but walking off is)
  for (const ox of [2, 6, 10, 14]) {
    const x = c * T + ox;
    for (const vx0 of [0, CH5.RUN_SPEED, -CH5.RUN_SPEED]) {
      for (const dir of [-1, 0, 1]) {
        for (const release of [999, 8, 16, 24, 32]) {
          const dirFn = (f) => (f < release ? dir : 0);
          for (const vy0 of [-CH5.JUMP_VELOCITY, 0]) {
            if (vy0 === 0 && dir === 0) continue;
            const res = simulate(x, feet, vx0 * (dir === 0 ? 0 : Math.sign(dir) === Math.sign(vx0) ? 1 : 0), vy0, dirFn);
            for (const p of res.path) visitedPts.push(p);
            if (res.land) push(res.land.c, res.land.r);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
const hits = (item, rad = 6) => {
  const ix = item.x * T + T / 2, iy = item.y * T + T / 2;
  return visitedPts.some((p) => Math.abs(p.x - ix) < BW / 2 + rad && iy > p.feet - BH - rad && iy < p.feet + rad);
};
const report = [];
const check = (label, list, rad) => list.forEach((it) => { if (!hits(it, rad)) report.push(`${label} at (${it.x}, ${it.y})`); });
check('coin', L.coins);
check('golden bitcoin', L.goldens, 8);
check('hot dog', L.hotdogs);
check('checkpoint', L.checkpoints.map((c) => ({ x: c.x, y: c.y - 1 })));
check('rig trigger', [{ x: L.triggers[0].x, y: 19 }]);
// every catwalk tile should be standable-reachable
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  if (isPlat(c, r) && !seen.has(key(c, r))) report.push(`catwalk tile (${c}, ${r}) unreachable`);
}

console.log(`Standable spots reached: ${seen.size}`);
console.log(`Items: ${L.coins.length} coins, ${L.goldens.length} golden, ${L.hotdogs.length} hot dogs, ${L.enemies.length} enemies`);
if (report.length) {
  console.log(`\n❌ ${report.length} unreachable:\n  ` + report.join('\n  '));
  process.exit(1);
}
console.log('✅ Everything is reachable.');
