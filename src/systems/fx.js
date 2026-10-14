// ============================================================================
//  VISUAL FX helpers: post-processing film shader, screen shake, hit-stop,
//  vibration — all respecting the player's settings.
// ============================================================================
import Phaser from 'phaser';
import { Save } from './save.js';

const FRAG = `
#define SHADER_NAME DREAMLAND_FILM
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uGrain;
uniform float uScan;
uniform float uVignette;
uniform vec3 uTint;
uniform vec2 uRes;
uniform float uHeat;
uniform float uHorizon;
varying vec2 outTexCoord;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = outTexCoord;
  // heat shimmer: wobble pixels in a band around the horizon
  if (uHeat > 0.0) {
    float band = smoothstep(0.07, 0.0, abs(uv.y - uHorizon));
    uv.x += sin(uv.y * uRes.y * 0.75 + uTime * 9.0) * 0.0016 * uHeat * band;
  }
  vec4 c = texture2D(uMainSampler, uv);
  // vignette: darken + slightly cool the corners
  vec2 d = uv - 0.5;
  float v = smoothstep(0.85, 0.2, length(d * vec2(1.0, 0.85)) * uVignette);
  c.rgb *= mix(vec3(0.55, 0.45, 0.7), vec3(1.0), v);
  // global color grade tint (multiplicative)
  c.rgb *= uTint;
  // film grain (animated, per game-pixel)
  vec2 px = floor(uv * uRes);
  float n = hash(px + fract(uTime * 7.13) * 91.7) - 0.5;
  // grain scales with brightness so dark scenes stay clean instead of noisy
  float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  c.rgb += n * uGrain * (0.25 + lum);
  // scanlines every other game pixel row
  float s = mod(px.y, 2.0);
  c.rgb *= 1.0 - s * uScan;
  gl_FragColor = c;
}`;

export class FilmFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'FilmFX', fragShader: FRAG });
    this.vignette = 1.0;
    this.tint = [1, 1, 1];
    this.heat = 0;
    this.horizon = 0.5;
  }
  onPreRender() {
    const film = Save.settings.film;
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uGrain', film ? 0.045 : 0.0);
    this.set1f('uScan', film ? 0.06 : 0.0);
    this.set1f('uVignette', this.vignette);
    this.set3f('uTint', this.tint[0], this.tint[1], this.tint[2]);
    this.set2f('uRes', this.renderer.width, this.renderer.height);
    this.set1f('uHeat', this.heat);
    this.set1f('uHorizon', this.horizon);
  }
}

/** Attach the film/vignette pass to a scene's main camera (WebGL only). */
export function applyFilm(scene, { vignette = 1.0, tint = [1, 1, 1] } = {}) {
  if (scene.renderer.type !== Phaser.WEBGL) return null;
  scene.cameras.main.setPostPipeline(FilmFX);
  const p = scene.cameras.main.getPostPipeline(FilmFX);
  const inst = Array.isArray(p) ? p[0] : p;
  if (inst) { inst.vignette = vignette; inst.tint = tint; }
  return inst;
}

export function shake(scene, duration = 120, intensity = 0.006) {
  if (!Save.settings.shake) return;
  scene.cameras.main.shake(duration, intensity);
}

export function vibrate(ms = 20) {
  if (!Save.settings.vibration) return;
  try { navigator.vibrate?.(ms); } catch (_) { /* unsupported */ }
}

/** Freeze the scene's time for a few ms on big impacts. */
export function hitStop(scene, ms = 60) {
  scene.physics?.world && (scene.physics.world.isPaused = true);
  scene.tweens.timeScale = 0.0001;
  scene.anims.globalTimeScale = 0.0001;
  setTimeout(() => {
    if (scene.physics?.world) scene.physics.world.isPaused = false;
    scene.tweens.timeScale = 1;
    scene.anims.globalTimeScale = 1;
  }, ms);
}
