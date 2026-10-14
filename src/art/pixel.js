// ============================================================================
//  PIXEL TOOLKIT — draw crisp pixel art into a raw RGBA buffer, then hand the
//  result to Phaser as a canvas texture. No anti-aliasing anywhere.
// ============================================================================
import { rgb } from './palette.js';

const colorCache = new Map();
function parse(c) {
  if (c == null) return null;
  let v = colorCache.get(c);
  if (!v) {
    if (c.length === 9) { const [r, g, b] = rgb(c.slice(0, 7)); v = [r, g, b, parseInt(c.slice(7), 16)]; }
    else v = [...rgb(c), 255];
    colorCache.set(c, v);
  }
  return v;
}

// 4x4 Bayer matrix for ordered dithering (values 0..15).
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
export const dither = (x, y, t) => t * 16 > BAYER4[y & 3][x & 3] + 0.5;

/** Deterministic PRNG so procedural art looks the same every load. */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  px(x, y, c) {
    x |= 0; y |= 0;
    if (!this.inBounds(x, y)) return;
    const v = parse(c);
    if (!v) return;
    const i = (y * this.w + x) * 4;
    if (v[3] === 255) {
      this.data[i] = v[0]; this.data[i + 1] = v[1]; this.data[i + 2] = v[2]; this.data[i + 3] = 255;
    } else {
      // alpha blend over existing
      const a = v[3] / 255, ia = 1 - a;
      this.data[i] = v[0] * a + this.data[i] * ia;
      this.data[i + 1] = v[1] * a + this.data[i + 1] * ia;
      this.data[i + 2] = v[2] * a + this.data[i + 2] * ia;
      this.data[i + 3] = Math.min(255, v[3] + this.data[i + 3] * ia);
    }
  }

  get(x, y) {
    if (!this.inBounds(x | 0, y | 0)) return 0;
    return this.data[((y | 0) * this.w + (x | 0)) * 4 + 3];
  }

  clearPx(x, y) {
    if (!this.inBounds(x, y)) return;
    this.data[(y * this.w + x) * 4 + 3] = 0;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }

  hline(x0, x1, y, c) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.px(x, y, c); }
  vline(x, y0, y1, c) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.px(x, y, c); }

  /** Bresenham line with optional square brush thickness. */
  line(x0, y0, x1, y1, c, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const o = Math.floor((thick - 1) / 2);
    for (;;) {
      if (thick === 1) this.px(x0, y0, c);
      else this.rect(x0 - o, y0 - o, thick, thick, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled ellipse (pixel-exact). */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx + 0.25) + (y * y) / (ry * ry + 0.25) <= 1) this.px(cx + x, cy + y, c);
      }
    }
  }
  circle(cx, cy, r, c) { this.ellipse(cx, cy, r, r, c); }

  /** Filled polygon (even-odd scanline). pts = [[x,y],...] */
  poly(pts, c) {
    const ys = pts.map((p) => p[1]);
    const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) {
          xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
      }
    }
  }

  /** Draw a hand-written sprite map. Each char indexes `pal`; '.' / ' ' = transparent. */
  map(rows, pal, ox = 0, oy = 0, flip = false) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c) this.px(ox + (flip ? row.length - 1 - x : x), oy + y, c);
      }
    });
  }

  /**
   * Add a 1px outline around opaque pixels inside a region (default: whole canvas).
   * Gives sprites that crisp "finished" pop against busy backgrounds.
   */
  outline(c, rx = 0, ry = 0, rw = this.w, rh = this.h, diagonal = false) {
    const mark = [];
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (this.get(x, y) > 0) continue;
        const n = (xx, yy) => xx >= rx && yy >= ry && xx < rx + rw && yy < ry + rh && this.get(xx, yy) > 0;
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1) ||
            (diagonal && (n(x - 1, y - 1) || n(x + 1, y - 1) || n(x - 1, y + 1) || n(x + 1, y + 1)))) mark.push(x, y);
      }
    }
    for (let i = 0; i < mark.length; i += 2) this.px(mark[i], mark[i + 1], c);
  }

  /** Copy another PixelCanvas onto this one. */
  blit(src, dx, dy, flip = false) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.data[i + 3] === 0) continue;
        const tx = dx + (flip ? src.w - 1 - x : x), ty = dy + y;
        if (!this.inBounds(tx, ty)) continue;
        const j = (ty * this.w + tx) * 4;
        this.data[j] = src.data[i]; this.data[j + 1] = src.data[i + 1];
        this.data[j + 2] = src.data[i + 2]; this.data[j + 3] = src.data[i + 3];
      }
    }
  }

  toCanvas() {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    c.getContext('2d').putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    return c;
  }
}

/**
 * Build a horizontal strip spritesheet from per-frame draw functions and
 * register it with Phaser (frames named 0..n-1, usable with generateFrameNumbers).
 */
export function buildSheet(scene, key, fw, fh, frames, { outline = null } = {}) {
  const sheet = new PixelCanvas(fw * frames.length, fh);
  frames.forEach((draw, i) => {
    const pc = new PixelCanvas(fw, fh);
    draw(pc, i);
    if (outline) pc.outline(outline);
    sheet.blit(pc, i * fw, 0);
  });
  return addCanvasTexture(scene, key, sheet.toCanvas(), fw, fh, frames.length);
}

export function addCanvasTexture(scene, key, canvas, fw, fh, count) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, canvas);
  if (fw && count) {
    for (let i = 0; i < count; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  }
  return tex;
}

/** Register a single PixelCanvas as a texture. */
export function addPixelTexture(scene, key, pc) {
  return addCanvasTexture(scene, key, pc.toCanvas());
}
