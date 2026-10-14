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
// Chapter 5 — UNDERGROUND (side-scrolling run & gun)
// Level design rule of thumb (checked automatically by tools/reach-check.mjs):
// with these numbers Ben clears 4 tiles up and ~5 tiles across.
// ---------------------------------------------------------------------------
export const CH5 = {
  TILE: 16,
  RUN_SPEED: 128,          // px/sec
  ACCEL: 1400,             // ground acceleration (snappy but not twitchy)
  AIR_ACCEL: 900,
  JUMP_VELOCITY: 345,
  GRAVITY: 900,
  COYOTE_MS: 100,
  JUMP_BUFFER_MS: 120,     // press jump slightly before landing and it still counts
  MAX_HEALTH: 5,           // hearts (van shop upgrade adds more later)
  INVULN_MS: 1100,         // flashing invincibility after a hit
  KNOCKBACK: 170,

  BLASTER_COOLDOWN_MS: 170,
  BLASTER_SPEED: 420,
  BLASTER_DAMAGE: 1,

  TACKLE_RANGE: 150,       // Zeus finds a target within this distance
  TACKLE_SPEED: 330,
  TACKLE_DAMAGE: 3,
  TACKLE_STUN_MS: 1600,
  TACKLE_COOLDOWN_MS: 2600,
  SNIFF_RADIUS: 150,
  ZEUS_RUN: 150,
  ZEUS_JUMP: 360,

  ENEMY_BULLET_SPEED: 150, // slow enough to dodge — this is a B-movie, not a bullet hell
  SOLDIER_HP: 3, SOLDIER_SPEED: 40, SOLDIER_SIGHT: 210, SOLDIER_FIRE_MS: 1500,
  AGENT_HP: 4, AGENT_SPEED: 60, AGENT_SIGHT: 240, AGENT_FIRE_MS: 1100,
  DRONE_HP: 2, DRONE_SPEED: 55, DRONE_SIGHT: 200, DRONE_FIRE_MS: 1700,
  GREY_HP: 3, GREY_SIGHT: 230, GREY_FIRE_MS: 2100, GREY_TELEPORT_MS: 3200,

  SATS_PER_KILL: 15,
  HOTDOG_HEAL: 2,
  LASER_ON_MS: 1400, LASER_OFF_MS: 1400,
  ELEVATOR_SPEED: 40,
  AMBIENT_LIGHT: 0x40385e, // how dark the labs are (lower = darker)
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
