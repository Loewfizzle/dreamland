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
// Chapter 1 — EXTRATERRESTRIAL HIGHWAY (pseudo-3D driving)
// Sizes are in "road units": the road spans -1..+1, each lane is 1 unit wide.
// ---------------------------------------------------------------------------
export const CH1 = {
  SEGMENT_LENGTH: 200,     // world length of one road segment
  RUMBLE_LENGTH: 3,        // segments per light/dark stripe (sense of speed)
  ROAD_WIDTH: 2000,        // half-width of the road in world units
  DRAW_DISTANCE: 150,      // segments drawn ahead (lower = faster on old phones)
  CAMERA_HEIGHT: 1000,
  FOV: 100,
  MAX_SPEED: 7400,         // world units / sec
  ACCEL: 2200,
  OFFROAD_LIMIT: 0.38,     // off the asphalt, speed is capped to this fraction
  OFFROAD_DECEL: 6000,
  STEER: 2.1,              // lane widths per second at full speed
  CENTRIFUGAL: 0.32,       // how hard curves push you outward
  BOOST_MULT: 1.35,
  BOOST_SECONDS: 2.6,
  BOOST_START: 0.5,        // boost meter at the start (0..1)
  BOOST_PER_COIN: 0.035,
  BOOST_COST: 0.34,
  MAX_DENTS: 4,            // hits before the van has to restart from the last mile marker
  SNIFF_COOLDOWN_MS: 3500,
  SNIFF_RANGE: 200,        // segments ahead Zeus can smell golden bitcoins
  BARK_RANGE: 110,         // segments ahead cows hear Zeus
  PAR_TIME: 170,           // seconds for the SPEEDY bonus
  MPH_PER_UNIT: 1 / 74,    // speedometer display scale
};

// ---------------------------------------------------------------------------
// Chapter 2 — RACHEL, NEVADA (top-down exploration)
// ---------------------------------------------------------------------------
export const CH2 = {
  WALK_SPEED: 105,
  ZEUS_SPEED: 125,
  TALK_RANGE: 34,          // how close Ben must be to talk / use things
  DIG_RANGE: 30,           // how close to a revealed dig spot to dig
  DIG_MS: 1500,            // how long Zeus digs (POWER PAWS upgrade shortens it)
  SNIFF_RADIUS: 170,       // reveals dig spots this close (SUPER SNIFFER upgrade extends it)
  SNIFF_TRAIL_RANGE: 700,  // the glowing paw-print trail points at a spot this far away
  SNIFF_COOLDOWN_MS: 1200,
  AMBIENT_OUT: 0x7a6694,   // dusk light outside
  AMBIENT_IN: 0xc8b0b0,    // warm diner light inside
  PAR_TIME: 300,
};

// ---------------------------------------------------------------------------
// Chapter 3 — THE PERIMETER (top-down stealth)
// ---------------------------------------------------------------------------
export const CH3 = {
  WALK_SPEED: 92,
  SNEAK_SPEED: 52,         // hold the SNEAK button (or Shift) to move slowly and silently
  ZEUS_SPEED: 115,
  GUARD_FOV: 1.15,         // radians (~66°) of the flashlight cone
  GUARD_RANGE: 132,        // px the cone reaches
  CONE_RAYS: 22,           // smoothness of the cone (lower = faster on old phones)
  NOTICE_RATE: 0.9,        // suspicion per second at the cone's far edge…
  NOTICE_RATE_CLOSE: 3.6,  // …rising to this right in front of the guard
  NOTICE_DECAY: 0.55,      // suspicion drains this fast when out of sight
  HIDE_SEEN_DIST: 20,      // guards only spot a hidden Ben this close
  CHASE_SPEED: 88,         // guards chase a bit slower than Ben walks
  CATCH_DIST: 14,
  LOSE_SIGHT_MS: 2600,     // chasing guard gives up after this long without seeing Ben
  SEARCH_MS: 3200,
  BARK_RADIUS: 230,        // guards this close come to investigate a bark
  BARK_INVESTIGATE_MS: 2400, // how long they snoop around (BIG BARK upgrade adds more)
  BARK_COOLDOWN_MS: 3200,
  SNIFF_RADIUS: 160,
  SNIFF_COOLDOWN_MS: 1500,
  CUT_MS: 2200,            // hold to cut the fence
  AMBIENT: 0x4a4a7e,       // moonlight (lower = darker)
  ALERT_TINT: 0x6a2a3a,    // ambient when spotted
  PAR_TIME: 280,
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
  COMPLETE_BONUS: 150,    // sats for finishing any chapter
  FAST_BONUS: 100,        // extra sats for beating a chapter's par time
  CLEAN_BONUS: 100,       // extra sats for a "clean" run (no hits / not spotted, per chapter)
  STAR_COIN_SHARE: 0.6,   // collect this share of a chapter's coins for the 2nd star
};

// ---------------------------------------------------------------------------
// THE VAN shop. A full playthrough earns roughly 7–9k sats, enough for most
// (but not all) of this. `prices` has one entry per upgrade level.
// ---------------------------------------------------------------------------
export const SHOP = {
  upgrades: [
    { id: 'benHealth',  who: 'ben',  name: 'EXTRA HEART',     desc: '+1 max heart. Hot dogs for breakfast.', prices: [150, 320, 520] },
    { id: 'benSpeed',   who: 'ben',  name: 'COMFY SNEAKERS',  desc: '+7% run speed per level.',              prices: [120, 280] },
    { id: 'blaster',    who: 'ben',  name: 'BLASTER MOD',     desc: '+1 damage per level. Faster firing.',   prices: [220, 420, 680] },
    { id: 'zeusSniff',  who: 'zeus', name: 'SUPER SNIFFER',   desc: '+40 sniff radius per level.',           prices: [100, 240] },
    { id: 'zeusBark',   who: 'zeus', name: 'BIG BARK',        desc: '+0.7s guard stun per level.',           prices: [100, 240] },
    { id: 'zeusDig',    who: 'zeus', name: 'POWER PAWS',      desc: 'Zeus digs 35% faster per level.',       prices: [80, 180] },
    { id: 'zeusTackle', who: 'zeus', name: 'ZOOMIES',         desc: '-25% tackle cooldown per level.',       prices: [160, 320] },
  ],
  cosmetics: [
    { id: 'bandana_red',  slot: 'bandana', name: 'RED BANDANA',    color: '#d63a3a', price: 80 },
    { id: 'bandana_cyan', slot: 'bandana', name: 'ALIEN BANDANA',  color: '#3cf2ff', price: 90 },
    { id: 'bandana_btc',  slot: 'bandana', name: 'BTC BANDANA',      color: '#f7931a', price: 140 },
    { id: 'cap_foil',     slot: 'cap',     name: 'FULL FOIL CAP',  color: '#c8d4e0', dark: '#8a98aa', price: 120 },
    { id: 'cap_green',    slot: 'cap',     name: 'GREY-GREEN CAP', color: '#5dbf6a', dark: '#2f7a40', price: 120 },
    { id: 'cap_gold',     slot: 'cap',     name: 'SATOSHI GOLD',   color: '#f5c060', dark: '#b87828', price: 260 },
    { id: 'van_sunset',   slot: 'van',     name: 'SUNSET PAINT',   paint: 'sunset', price: 260 },
    { id: 'van_alien',    slot: 'van',     name: 'ALIEN PAINT',    paint: 'alien', price: 320 },
    { id: 'van_stealth',  slot: 'van',     name: 'STEALTH PAINT',  paint: 'stealth', price: 320 },
  ],
};
