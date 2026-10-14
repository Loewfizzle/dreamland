// ============================================================================
//  DREAMLAND HEIST — TUNABLES
//  Every number you might want to tweak lives here. Change, save, refresh.
// ============================================================================

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------
export const GAME = {
  WIDTH: 640,            // base (virtual) resolution; scaled to fit the screen
  HEIGHT: 360,
  BG_COLOR: '#0b0a1a',   // letterbox / clear color
  SAVE_KEY: 'dreamland_heist_save_v1',
};

// ---------------------------------------------------------------------------
// Audio mix (0..1). Player settings multiply on top of these.
// ---------------------------------------------------------------------------
export const AUDIO = {
  MASTER: 0.9,
  MUSIC_DEFAULT: 0.7,     // default slider position for new players
  SFX_DEFAULT: 0.8,
  MUSIC_BUS: 0.55,        // internal headroom for the music bus
  SFX_BUS: 0.8,
  AMBIENCE_BUS: 0.5,
  REVERB_SECONDS: 2.8,    // length of the generated convolution reverb tail
  REVERB_RETURN: 0.55,    // how loud the reverb comes back
  DELAY_FEEDBACK: 0.38,
  DELAY_RETURN: 0.32,
  CROSSFADE: 1.6,         // seconds to crossfade between music tracks
  LOOKAHEAD: 0.15,        // sequencer schedules this far ahead (seconds)
};

// ---------------------------------------------------------------------------
// Touch controls
// ---------------------------------------------------------------------------
export const CONTROLS = {
  JOYSTICK_RADIUS: 34,       // knob travel radius in game pixels (before size setting)
  JOYSTICK_DEADZONE: 0.18,   // ignore tiny thumb wobbles
  BUTTON_RADIUS: 26,         // action button radius in game pixels
  SIZE_DEFAULT: 1.0,         // settings slider default (0.75 .. 1.35)
  OPACITY_DEFAULT: 0.65,     // settings slider default (0.25 .. 1)
  VIBRATE_MS: 12,            // haptic tap length on button press
};

// ---------------------------------------------------------------------------
// Ben & Zeus (shared by the side-view test range; chapters add their own)
// ---------------------------------------------------------------------------
export const PLAYER = {
  WALK_SPEED: 95,       // px/sec on foot
  JUMP_VELOCITY: 300,   // initial upward speed
  GRAVITY: 820,
  COYOTE_MS: 90,        // grace period to still jump after walking off a ledge
};

export const ZEUS = {
  FOLLOW_DISTANCE: 26,  // how far behind Ben Zeus likes to trot
  TROT_SPEED: 130,
  BARK_COOLDOWN_MS: 600,
  DIZZY_MS: 2500,       // how long Zeus sees stars when hit (he can't be killed!)
  IDLE_SIT_MS: 1400,    // stands still this long before sitting down
};

// ---------------------------------------------------------------------------
// Title screen ambience
// ---------------------------------------------------------------------------
export const TITLE = {
  UFO_INTERVAL_MS: 14000,      // how often the UFO crosses the sky
  SHOOTING_STAR_MS: [3500, 9000], // random gap range between shooting stars
  DUST_COUNT: 40,              // floating dust motes
};

// ---------------------------------------------------------------------------
// Economy (expanded in later milestones)
// ---------------------------------------------------------------------------
export const ECONOMY = {
  COIN_VALUE: 10,         // sats per normal coin
  GOLDEN_VALUE: 250,      // sats per golden bitcoin
};
