// ============================================================================
//  ENVIRONMENT ART — procedural desert scenery.
//  All layer generators are horizontally TILEABLE (features wrap around the
//  width), so the same textures work as scrolling parallax TileSprites.
// ============================================================================
import { P, mix } from './palette.js';
import { PixelCanvas, dither, rng, addPixelTexture, addCanvasTexture } from './pixel.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
//  Sky: banded gradient with ordered dithering between bands.
// ---------------------------------------------------------------------------
export function makeSky(scene, key, colors, w, h) {
  const pc = new PixelCanvas(w, h);
  const n = colors.length - 1;
  for (let y = 0; y < h; y++) {
    // ease so the colorful bands bunch up near the horizon, like a real sunset
    const t = Math.pow(y / (h - 1), 1.35) * n;
    const i = Math.min(n - 1, Math.floor(t));
    const f = t - i;
    for (let x = 0; x < w; x++) {
      pc.px(x, y, dither(x, y, f) ? colors[i + 1] : colors[i]);
    }
  }
  return addPixelTexture(scene, key, pc);
}

// ---------------------------------------------------------------------------
//  Synthwave sun: banded gradient disc with horizontal slits near the bottom.
// ---------------------------------------------------------------------------
export function makeSun(scene, key, r, colors = [P.sun0, P.sun1, P.sun2, P.sun3, P.sun4]) {
  const d = r * 2 + 1;
  const pc = new PixelCanvas(d, d);
  for (let y = -r; y <= r; y++) {
    const t = (y + r) / (2 * r);
    // slits get thicker toward the bottom
    if (t > 0.5) {
      const band = (t - 0.5) / 0.5;
      const period = 7;
      const gap = Math.round(1 + band * 3.5);
      if (((y + r) % period) < gap) continue;
    }
    const ci = t * (colors.length - 1);
    const i = Math.min(colors.length - 2, Math.floor(ci));
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r + r * 0.6) continue;
      pc.px(x + r, y + r, dither(x, y, ci - i) ? colors[i + 1] : colors[i]);
    }
  }
  return addPixelTexture(scene, key, pc);
}

// ---------------------------------------------------------------------------
//  Soft radial glow (smoothly filtered — used additively for light).
// ---------------------------------------------------------------------------
export function makeGlow(scene, key, size = 128, falloff = 2.2) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    g.addColorStop(t, `rgba(255,255,255,${Math.pow(1 - t, falloff).toFixed(3)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = addCanvasTexture(scene, key, c);
  tex.setFilter(1); // Phaser.Textures.FilterMode.LINEAR — smooth light on crisp pixels
  return tex;
}

/** A soft vertical light beam (searchlights, tractor beams, god rays). */
export function makeBeam(scene, key, w = 64, h = 256) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const ty = y / h;
    const halfW = (0.15 + 0.85 * ty) * (w / 2);
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x - w / 2) / halfW;
      const a = dx >= 1 ? 0 : Math.pow(1 - dx, 1.6) * (0.35 + 0.65 * (1 - ty * 0.6));
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = addCanvasTexture(scene, key, c);
  tex.setFilter(1);
  return tex;
}

// ---------------------------------------------------------------------------
//  Tiny sprites: stars & particles
// ---------------------------------------------------------------------------
export function makeStars(scene) {
  let pc = new PixelCanvas(1, 1);
  pc.px(0, 0, P.white);
  addPixelTexture(scene, 'star1', pc);
  pc = new PixelCanvas(3, 3);
  pc.px(1, 1, P.white); pc.px(0, 1, '#fff6e080'); pc.px(2, 1, '#fff6e080'); pc.px(1, 0, '#fff6e080'); pc.px(1, 2, '#fff6e080');
  addPixelTexture(scene, 'star2', pc);
  pc = new PixelCanvas(7, 7);
  pc.vline(3, 0, 6, '#fff6e070'); pc.hline(0, 6, 3, '#fff6e070');
  pc.vline(3, 2, 4, P.white); pc.hline(2, 4, 3, P.white);
  addPixelTexture(scene, 'star3', pc);
  // particles
  pc = new PixelCanvas(2, 2);
  pc.rect(0, 0, 2, 2, P.white);
  addPixelTexture(scene, 'px2', pc);
  pc = new PixelCanvas(1, 1);
  pc.px(0, 0, P.white);
  addPixelTexture(scene, 'px1', pc);
  pc = new PixelCanvas(5, 5);
  pc.circle(2, 2, 2, '#ffffff60'); pc.circle(2, 2, 1, P.white);
  addPixelTexture(scene, 'mote', pc);
  // shooting star streak
  pc = new PixelCanvas(24, 3);
  for (let x = 0; x < 24; x++) pc.px(x, 1, mix(P.night3, P.white, x / 23) + Math.round(40 + 215 * (x / 23)).toString(16).padStart(2, '0'));
  pc.px(22, 0, '#ffffff80'); pc.px(22, 2, '#ffffff80'); pc.px(23, 1, P.white);
  addPixelTexture(scene, 'streak', pc);
}

// ---------------------------------------------------------------------------
//  Clouds: long streaky sunset clouds, lit from below.
// ---------------------------------------------------------------------------
export function makeCloud(scene, key, w, h, seed, { top = P.sky3, mid = P.sky5, under = P.sky7 } = {}) {
  const pc = new PixelCanvas(w, h);
  const r = rng(seed);
  const puffs = 5 + Math.floor(r() * 5);
  for (let i = 0; i < puffs; i++) {
    const cx = w * (0.12 + r() * 0.76);
    const rx = 8 + r() * (w * 0.22);
    const ry = 2 + r() * (h * 0.32);
    const cy = h * 0.55 + (r() - 0.5) * h * 0.3;
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue;
        const ny = (y + ry) / (2 * ry);
        const c = ny > 0.72 ? under : ny > 0.35 ? mid : top;
        pc.px(cx + x, cy + y, c);
      }
    }
  }
  // fray the edges with dithering so they feel wispy
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const edge = Math.min(x, w - 1 - x) / (w * 0.18);
    if (edge < 1 && !dither(x, y, edge)) pc.clearPx(x, y);
  }
  return addPixelTexture(scene, key, pc);
}

// ---------------------------------------------------------------------------
//  Far mountain range: tileable sine-sum ridge, hazy at the base.
// ---------------------------------------------------------------------------
export function makeRange(scene, key, w, h, { color, haze, rim, seed = 3, rough = 1 } = {}) {
  const pc = new PixelCanvas(w, h);
  const r = rng(seed);
  const waves = [2, 3, 5, 8, 13, 21, 34].map((k, i) => ({ k, a: (h * 0.32) / (i + 1.2) * (i > 3 ? rough : 1), p: r() * TAU }));
  const top = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let y = h * 0.42;
    for (const v of waves) y += Math.sin((x / w) * v.k * TAU + v.p) * v.a * 0.5;
    top[x] = Math.max(1, Math.min(h - 2, y));
  }
  for (let x = 0; x < w; x++) {
    const ty = Math.round(top[x]);
    for (let y = ty; y < h; y++) {
      const t = (y - ty) / (h - ty + 1);
      const ht = Math.min(1, (y / h) * 1.15);
      let c = dither(x, y, ht * ht) ? haze : color;
      if (y === ty && rim) c = rim;
      else if (y === ty + 1 && rim && (top[x - 1] > top[x] || x % 3 === 0)) c = mix(rim, color, 0.5);
      void t;
      pc.px(x, y, c);
    }
  }
  return addPixelTexture(scene, key, pc);
}

// ---------------------------------------------------------------------------
//  Mesas & buttes: flat tops, terraced slopes, strata bands and rim light.
// ---------------------------------------------------------------------------
export function makeMesas(scene, key, w, h, opts = {}) {
  const {
    seed = 7, count = 4, base = P.terra2, dark = P.terra3, light = P.terra1, rim = P.sky7,
    haze = null, minH = 0.35, maxH = 0.85, light_dir = 0,
  } = opts;
  const pc = new PixelCanvas(w, h);
  const r = rng(seed);
  const top = new Float32Array(w).fill(h);
  // low rolling foothills underneath everything
  const hp = [r() * TAU, r() * TAU];
  for (let x = 0; x < w; x++) {
    top[x] = h * 0.78 + Math.sin((x / w) * 3 * TAU + hp[0]) * h * 0.06 + Math.sin((x / w) * 7 * TAU + hp[1]) * h * 0.03;
  }
  for (let m = 0; m < count; m++) {
    const cx = (m + 0.2 + r() * 0.6) * (w / count);
    const hw = 10 + r() * (w / count) * 0.32;
    const th = h * (1 - (minH + r() * (maxH - minH)));
    const slope = 10 + r() * 16;
    const cliff = 4 + Math.floor(r() * 6);          // sheer caprock height
    const ledge = r() < 0.5 ? 0.35 + r() * 0.2 : -1; // optional bench partway down the talus
    const reach = Math.ceil(hw + 2 + slope * 3);
    for (let dx = -reach; dx <= reach; dx++) {
      const x = ((Math.round(cx + dx) % w) + w) % w;
      const ad = Math.abs(dx);
      let y;
      if (ad <= hw) y = th + (Math.abs(Math.sin(dx * 1.7 + m)) > 0.97 ? 1 : 0);
      else if (ad <= hw + 2) y = th + ((ad - hw) / 2) * cliff;              // near-vertical cliff
      else {
        let s = (ad - hw - 2) / (slope * 3);
        if (ledge > 0 && s > ledge && s < ledge + 0.12) s = ledge;          // flat bench
        y = th + cliff + Math.pow(s, 0.55) * (h - th - cliff);              // concave talus
        y += Math.sin(dx * 0.9 + m * 3) * 0.8;
      }
      top[x] = Math.min(top[x], y);
    }
  }
  for (let x = 0; x < w; x++) {
    const ty = Math.round(top[x]);
    const l = top[(x - 1 + w) % w], rr = top[(x + 1) % w];
    const facingLeft = l > top[x] + 0.5;
    const facingRight = rr > top[x] + 0.5;
    for (let y = ty; y < h; y++) {
      const depth = y - ty;
      // strata: horizontal bands in absolute space
      const band = Math.floor((y + (x % 2)) / 5) % 4;
      let c = band === 0 ? dark : base;
      if (band === 2 && dither(x, y, 0.5)) c = dark;
      // sun-facing walls
      if (light_dir < 0 && facingLeft && depth < 4) c = light;
      if (light_dir > 0 && facingRight && depth < 4) c = light;
      if (light_dir === 0 && (facingLeft || facingRight) && depth < 2) c = light;
      // erosion gullies: thin dark vertical runnels on steep faces
      if (depth > 2 && depth < 22 && ((x * 7919) % 23) < 2 && (facingLeft || facingRight || depth < 8)) c = dark;
      if (depth === 0) c = rim;
      else if (depth === 1) c = dither(x, y, 0.5) ? rim : light;
      if (haze) {
        const hz = Math.max(0, (y - h * 0.55) / (h * 0.45));
        if (dither(x, y, hz * 0.85)) c = haze;
      }
      pc.px(x, y, c);
    }
  }
  return addPixelTexture(scene, key, pc);
}

// ---------------------------------------------------------------------------
//  Joshua trees
// ---------------------------------------------------------------------------
export function drawJoshuaTree(pc, x, baseY, height, r, { trunk = P.terra3, trunk2 = P.terra4, leaf = P.sage2, leaf2 = P.sage3, tip = P.sage1, silhouette = null } = {}) {
  const T = silhouette ?? trunk, T2 = silhouette ?? trunk2;
  const L = silhouette ?? leaf, L2 = silhouette ?? leaf2, LT = silhouette ?? tip;
  const clusters = [];
  const branch = (bx, by, ang, len, thick, depth) => {
    let cx = bx, cy = by;
    for (let i = 0; i < len; i++) {
      // branches curve upward like a Joshua tree's "arms raised"
      ang += (-Math.PI / 2 - ang) * 0.12;
      cx += Math.cos(ang);
      cy += Math.sin(ang);
      pc.rect(Math.round(cx), Math.round(cy), thick, thick, i % 3 === 0 ? T2 : T);
      if (thick > 1) pc.px(Math.round(cx) + thick - 1, Math.round(cy), T2);
    }
    if (depth > 0 && len > 3) {
      const n = 1 + Math.floor(r() * 2.2);
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.4;
        branch(cx, cy, a, Math.max(3, len * (0.5 + r() * 0.3)), Math.max(1, thick - 1), depth - 1);
      }
      if (n === 1 && r() < 0.6) clusters.push([cx, cy]);
    } else clusters.push([cx, cy]);
  };
  const trunkLen = Math.max(4, height * 0.45);
  branch(x, baseY, -Math.PI / 2 + (r() - 0.5) * 0.2, trunkLen, height > 30 ? 3 : 2, height > 18 ? 3 : 2);
  // spiky leaf rosettes at every branch tip
  for (const [cx, cy] of clusters) {
    const rad = height > 30 ? 4 : 3;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU;
      const len = rad * (0.6 + r() * 0.5);
      const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * 0.85 - 1;
      pc.line(cx, cy - 1, ex, ey, a > Math.PI ? L : L2);
      if (a > Math.PI * 1.1 && a < Math.PI * 1.9) pc.px(ex, ey, LT);
    }
  }
}

/** Small round sagebrush bush. */
export function drawSage(pc, x, y, s, r, { c0 = P.sage1, c1 = P.sage2, c2 = P.sage3, hi = P.sage0 } = {}) {
  for (let i = 0; i < s * 3; i++) {
    const ax = x + (r() - 0.5) * s * 2.2, ay = y - r() * s;
    pc.circle(ax, ay, Math.max(1, Math.round(s * 0.45)), i % 3 === 0 ? c2 : c1);
  }
  for (let i = 0; i < s; i++) pc.px(x + (r() - 0.5) * s * 1.6, y - s * 0.6 - r() * s * 0.5, hi ?? c0);
  pc.hline(x - s, x + s, y + 1, c2);
}

/** Rock with a lit top. */
export function drawRock(pc, x, y, w, h, { c = P.terra2, lit = P.terra1, dark = P.terra3 } = {}) {
  pc.ellipse(x, y, w, h, c);
  pc.hline(x - w + 1, x + w - 2, y - h, lit);
  pc.hline(x - w + 2, x + w - 1, y + h, dark);
  pc.px(x - w + 2, y - h + 1, lit);
}

// ---------------------------------------------------------------------------
//  Near ridge with Joshua trees, power poles and sagging wires (tileable).
// ---------------------------------------------------------------------------
export function makeNearLayer(scene, key, w, h, opts = {}) {
  const {
    seed = 11, ground = P.terra3, ground2 = P.terra4, rim = P.sky6, trees = 6, poles = 3,
    silhouette = P.mauve3, poleColor = null, wire = null,
  } = opts;
  const pc = new PixelCanvas(w, h);
  const r = rng(seed);
  // ground strip with gentle undulation
  const gy = new Float32Array(w);
  const ph = r() * TAU;
  for (let x = 0; x < w; x++) gy[x] = h - 14 + Math.sin((x / w) * 4 * TAU + ph) * 3 + Math.sin((x / w) * 11 * TAU) * 1.2;
  // power poles first (behind trees)
  const polesX = [];
  for (let i = 0; i < poles; i++) polesX.push(Math.round((i + 0.5) * (w / poles)));
  const pcol = poleColor ?? silhouette;
  const wcol = wire ?? silhouette;
  for (let i = 0; i < polesX.length; i++) {
    const px = polesX[i];
    const top = Math.round(gy[px] - h * 0.62);
    pc.rect(px, top, 2, Math.round(gy[px]) - top, pcol);
    pc.rect(px - 7, top + 3, 16, 2, pcol);
    pc.rect(px - 5, top + 9, 12, 1, pcol);
    for (const ix of [-6, -1, 4, 8]) pc.px(px + ix, top + 2, pcol);
    // wires to the next pole (wrapping for seamless tiling)
    const nx = i + 1 < polesX.length ? polesX[i + 1] : polesX[0] + w;
    for (const [ox, oy] of [[-6, 2], [8, 2], [-4, 8]]) {
      const x0 = px + ox, x1 = nx + ox;
      for (let x = x0; x <= x1; x++) {
        const t = (x - x0) / (x1 - x0);
        const sag = Math.sin(t * Math.PI) * 10;
        pc.px(((x % w) + w) % w, top + oy + sag, wcol);
      }
    }
  }
  // Joshua tree silhouettes with a warm rim
  for (let i = 0; i < trees; i++) {
    const tx = Math.round(r() * w);
    const tall = 14 + r() * 26;
    for (const off of [0, -w, w]) {
      const rr = rng(seed * 100 + i);
      drawJoshuaTree(pc, tx + off, gy[tx] + 1, tall, rr, { silhouette });
    }
  }
  // ground
  for (let x = 0; x < w; x++) {
    const ty = Math.round(gy[x]);
    for (let y = ty; y < h; y++) {
      let c = dither(x, y, (y - ty) / 10) ? ground2 : ground;
      if (y === ty) c = rim;
      pc.px(x, y, c);
    }
  }
  // sage bushes on the ridge line
  for (let i = 0; i < 18; i++) {
    const bx = Math.round(r() * w);
    drawSage(pc, bx, gy[bx] + 1, 2 + r() * 2, r, { c0: silhouette, c1: silhouette, c2: ground2, hi: rim });
  }
  return addPixelTexture(scene, key, pc);
}

// ---------------------------------------------------------------------------
//  Foreground desert floor (for static scenes like the title).
// ---------------------------------------------------------------------------
export function makeDesertFloor(scene, key, w, h, opts = {}) {
  const { seed = 21, c0 = P.terra1, c1 = P.terra2, c2 = P.terra3, c3 = P.terra4, rim = P.sky7 } = opts;
  const pc = new PixelCanvas(w, h);
  const r = rng(seed);
  const gy = new Float32Array(w);
  for (let x = 0; x < w; x++) gy[x] = 6 + Math.sin((x / w) * 2 * TAU) * 2 + Math.sin((x / w) * 9 * TAU + 1) * 1;
  const ramp = [c0, c1, c2, c3];
  for (let x = 0; x < w; x++) {
    const ty = Math.round(gy[x]);
    for (let y = ty; y < h; y++) {
      const t = Math.min(0.999, ((y - ty) / (h - ty)) * 3);
      const i = Math.floor(t);
      let c = dither(x, y, t - i) ? ramp[i + 1] : ramp[i];
      if (y === ty) c = rim;
      else if (y === ty + 1 && dither(x, y, 0.5)) c = rim;
      pc.px(x, y, c);
    }
  }
  // tire tracks / dirt road ruts curving off to the right
  for (let x = 0; x < w; x++) {
    const t = x / w;
    const y = gy[x] + 10 + t * t * 26;
    if (y < h - 1) { pc.px(x, y, c3); pc.px(x, y + 5 + t * 6, c3); if (x % 2) pc.px(x, y - 1, c2); }
  }
  // pebbles, sage, cacti, grass tufts
  for (let i = 0; i < 140; i++) {
    const x = r() * w, y = gy[Math.floor(x)] + 3 + r() * (h - 8);
    pc.px(x, y, r() < 0.5 ? c0 : c3);
    if (r() < 0.3) pc.px(x + 1, y, c2);
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.round(r() * w);
    const y = Math.round(gy[x] + 8 + r() * (h - 18));
    drawSage(pc, x, y, 2 + r() * 3, r);
  }
  for (let i = 0; i < 26; i++) {
    const x = Math.round(r() * w), y = Math.round(gy[x] + 4 + r() * (h - 10));
    for (let k = 0; k < 4; k++) pc.line(x, y, x + (k - 1.5) * 1.5, y - 2 - r() * 3, k % 2 ? P.sand1 : P.sage1);
  }
  return addPixelTexture(scene, key, pc);
}

/** A standalone, detailed foreground Joshua tree sprite. */
export function makeJoshuaSprite(scene, key, height, seed, opts = {}) {
  const w = Math.round(height * 1.4), h = height + 6;
  const pc = new PixelCanvas(w, h);
  drawJoshuaTree(pc, Math.round(w / 2), h - 1, height, rng(seed), opts);
  pc.outline(P.outline);
  return addPixelTexture(scene, key, pc);
}

/** Saguaro-ish small cactus sprite. */
export function makeCactus(scene, key, seed = 1) {
  const pc = new PixelCanvas(16, 26);
  const r = rng(seed);
  pc.rect(6, 3, 4, 23, P.sage2);
  pc.vline(7, 3, 25, P.sage1);
  pc.vline(9, 4, 25, P.sage3);
  const armY = 9 + Math.floor(r() * 5);
  pc.rect(2, armY, 4, 3, P.sage2); pc.rect(2, armY - 6, 3, 7, P.sage2); pc.vline(2, armY - 6, armY, P.sage1);
  pc.rect(10, armY + 3, 4, 3, P.sage2); pc.rect(11, armY - 2, 3, 6, P.sage2); pc.vline(13, armY - 2, armY + 4, P.sage3);
  pc.hline(6, 9, 2, P.sage1);
  for (let y = 5; y < 24; y += 3) pc.px(8, y, P.sage0);
  pc.outline(P.outline);
  return addPixelTexture(scene, key, pc);
}

/** Tumbleweed: a tangled ball of dry branches. */
export function makeTumbleweed(scene, key = 'tumbleweed', size = 18, seed = 5) {
  const pc = new PixelCanvas(size, size);
  const r = rng(seed);
  const c = size / 2 - 0.5, R = size / 2 - 1.5;
  for (let i = 0; i < 26; i++) {
    const a0 = r() * TAU, a1 = a0 + (r() - 0.5) * 2.4;
    const r0 = R * (0.3 + r() * 0.7), r1 = R * (0.3 + r() * 0.7);
    pc.line(c + Math.cos(a0) * r0, c + Math.sin(a0) * r0, c + Math.cos(a1) * r1, c + Math.sin(a1) * r1, i % 3 === 0 ? P.sand2 : i % 3 === 1 ? P.sand3 : P.terra2);
  }
  pc.outline('#2c162080');
  return addPixelTexture(scene, key, pc);
}

/** Sandstone ledge platform (tileable horizontally in 16px steps). */
export function makeLedge(scene, key = 'ledge', w = 64, h = 14) {
  const pc = new PixelCanvas(w, h);
  const r = rng(77);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const inset = y > h - 4 ? (y - (h - 4)) * 2 : 0;
    if (x < inset || x >= w - inset) continue;
    let c = y < 2 ? P.sand0 : y < 4 ? P.sand1 : (Math.floor(y / 3) % 2 ? P.terra1 : P.terra0);
    if (y >= 4 && dither(x, y, 0.3)) c = P.terra2;
    if (y > h - 5) c = P.terra2;
    pc.px(x, y, c);
  }
  for (let i = 0; i < 10; i++) pc.px(Math.floor(r() * w), 5 + Math.floor(r() * 5), P.terra3);
  pc.outline(P.outline);
  return addPixelTexture(scene, key, pc);
}
