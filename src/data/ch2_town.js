// ============================================================================
//  CHAPTER 2 — RACHEL, NEVADA: layout, locals, dialogue, dig spots.
//  World is 1600 x 960. The diner interior lives off to the side at IX.
//
//  Story stages:
//   0  arrive — ask around about the note
//   1  Dolores: "prove it" → dig by the Black Mailbox
//   2  got the hardware wallet → bring it to Dolores
//   3  Dolores's two favours: find the keycard (coyote den) + fix the sign
//   4  both done → talk to Dolores → the map → chapter complete
// ============================================================================
export const IX = 1800;          // interior origin (x)
export const DOOR = { x: 760, y: 478 };
export const FUSE = { x: 892, y: 452 };
export const START = { x: 560, y: 560 };

// solid footprints [x, y, w, h] — the bottoms of buildings & props
export const SOLIDS = [
  [636, 424, 248, 50],        // diner
  [230, 330, 140, 50],        // Mabel's trailer
  [1188, 316, 140, 50],       // mobile home NE
  [372, 726, 140, 50],        // mobile home S
  [904, 500, 100, 26],        // tow truck
  [1032, 522, 16, 10],        // gas pump
  [598, 548, 84, 12],         // the van
  [158, 470, 30, 12],         // water tank legs
  [460, 520, 42, 10],         // picnic table
  [1476, 708, 12, 8],         // mailbox post
  [176, 808, 56, 22],         // coyote den
  // keep everyone inside the playable areas
  [1600, 0, 200, 960],        // gap between town and diner interior
  [IX, 360, 640, 600],        // below the interior
  // interior walls / furniture
  [IX + 0, 0, 640, 118],      // back wall + counter
  [IX + 0, 0, 12, 360],       // left wall
  [IX + 628, 0, 12, 360],     // right wall
  [IX + 14, 136, 48, 76],     // jukebox
  [IX + 90, 250, 90, 70],     // booth L
  [IX + 470, 250, 90, 70],    // booth R
  [IX + 0, 352, 280, 8], [IX + 360, 352, 280, 8],   // front wall either side of the door
];

export const PROPS = [
  { key: 'diner', x: 760, y: 474 },
  { key: 'mabelhome', x: 300, y: 380 },
  { key: 'mobilehome', x: 1258, y: 366 },
  { key: 'mobilehome', x: 442, y: 776 },
  { key: 'towtruck', x: 954, y: 528 },
  { key: 'gaspump', x: 1040, y: 532 },
  { key: 'watertank', x: 174, y: 482 },
  { key: 'picnic', x: 480, y: 530 },
  { key: 'telescope', x: 236, y: 574 },
  { key: 'mailbox', x: 1482, y: 714 },
  { key: 'den', x: 204, y: 832 },
  { key: 'fusebox', x: FUSE.x, y: FUSE.y },
  { key: 'streetlamp', x: 600, y: 598, light: true },
  { key: 'streetlamp', x: 1120, y: 598, light: true },
  { key: 'sign_et', x: 120, y: 596, scale: 1 },
  { key: 'fence', x: 1360, y: 820 }, { key: 'fence', x: 1424, y: 820 }, { key: 'fence', x: 1488, y: 820 },
  { key: 'fence', x: 80, y: 260 }, { key: 'fence', x: 144, y: 260 },
  { key: 'joshua_big', x: 70, y: 420 }, { key: 'joshua_med', x: 640, y: 300 }, { key: 'joshua_big', x: 1540, y: 470 },
  { key: 'joshua_med', x: 980, y: 860 }, { key: 'joshua_med', x: 1380, y: 220 }, { key: 'joshua_big', x: 880, y: 180 },
  { key: 'cactus', x: 540, y: 900 }, { key: 'cactus', x: 1300, y: 560 }, { key: 'boulder', x: 300, y: 920 },
  { key: 'van', x: 640, y: 560, scale: 1 },
];

export const NPCS = [
  { id: 'earl', name: 'EARL', x: 1072, y: 548 },
  { id: 'mabel', name: 'MABEL', x: 360, y: 420 },
  { id: 'tourist', name: 'KEVIN', x: 254, y: 586 },
  { id: 'dolores', name: 'DOLORES', x: IX + 320, y: 96, inside: true, behindCounter: 82 },
];

// Dig spots. kind: 'wallet' | 'keycard' | 'junk' | 'golden'
export const DIGS = [
  { id: 'wallet', kind: 'wallet', x: 1500, y: 750, item: 'item_wallet', needStage: 1 },
  { id: 'den1', kind: 'junk', x: 150, y: 870, item: 'item_boot', needStage: 3 },
  { id: 'den2', kind: 'keycard', x: 262, y: 880, item: 'item_keycard', needStage: 3 },
  { id: 'den3', kind: 'junk', x: 120, y: 790, item: 'item_bone', needStage: 3 },
  { id: 'can', kind: 'junk', x: 1180, y: 860, item: 'item_can', needStage: 0 },
  { id: 'g0', kind: 'golden', x: 120, y: 160, golden: 0, needStage: 0 },
  { id: 'g1', kind: 'golden', x: 1490, y: 180, golden: 1, needStage: 0 },
  { id: 'g2', kind: 'golden', x: 860, y: 900, golden: 2, needStage: 0 },
];

export function coinSpots() {
  const c = [];
  const line = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) c.push([x0 + ((x1 - x0) * i) / (n - 1), y0 + ((y1 - y0) * i) / (n - 1)]); };
  line(580, 494, 1000, 494, 9);
  line(340, 470, 420, 550, 5);
  line(1190, 510, 1260, 420, 5);
  line(1300, 690, 1460, 690, 6);
  line(180, 700, 300, 760, 5);
  line(700, 760, 1000, 800, 6);
  line(120, 230, 300, 230, 5);
  line(1420, 260, 1520, 260, 3);
  line(IX + 140, 180, IX + 500, 180, 7);           // inside the diner, along the stools
  line(IX + 220, 300, IX + 420, 300, 4);
  return c;
}

export const FUSE_ORDER = ['A', 'L', 'E'];       // Apple, Lemon, Elderberry — see the menu board
export const FUSE_LAYOUT = ['E', 'A', 'L'];      // how the levers are physically arranged

// ---------------------------------------------------------------------------
//  Dialogue — keyed by NPC and story stage (falls back to the closest lower stage)
// ---------------------------------------------------------------------------
export const TALK = {
  earl: {
    0: [
      { who: 'earl', mood: 'talk', text: 'Name\'s Earl. Been prospectin\' out here since \'71. Found nothin\' but quartz and government trucks.' },
      { who: 'ben', mood: 'talk', text: 'Earl, someone left me a note signed "D". Know any D\'s?' },
      { who: 'earl', mood: 'happy', text: 'Only one D in Rachel worth knowin\'. Dolores. Runs the Little A\'Le\'Inn. Tell her Earl sent ya.' },
    ],
    3: [
      { who: 'earl', mood: 'talk', text: 'Dolores\'s sign is on the fritz again? Ha. That woman numbers EVERYTHING, son.' },
      { who: 'earl', mood: 'happy', text: 'Menu, fuses, ex-husbands. Flip \'em in the same order she lists her pies.' },
    ],
    4: [{ who: 'earl', mood: 'happy', text: 'Go on, git. And if you see a little green fella, tell him Earl says howdy.' }],
  },
  mabel: {
    0: [
      { who: 'mabel', mood: 'happy', text: 'Ooh, a fellow tinfoil enthusiast! You\'ve got good taste in hats, young man.' },
      { who: 'mabel', mood: 'talk', text: 'They fly over every Tuesday. Never Wednesdays. Wednesdays are for pie.' },
    ],
    1: [
      { who: 'mabel', mood: 'talk', text: 'The Black Mailbox? East of town, past the tire tracks. Folks leave letters for the aliens.' },
      { who: 'mabel', mood: 'happy', text: 'Something else got buried out there years ago. My old dog never stopped digging at it. Bring your pup!' },
    ],
    3: [{ who: 'mabel', mood: 'talk', text: 'The coyote den is southwest. Those rascals bury EVERYTHING. Shiny things especially.' }],
    4: [{ who: 'mabel', mood: 'happy', text: 'Give my regards to the Greys, dear. Wear the hat. ALWAYS wear the hat.' }],
  },
  tourist: {
    0: [
      { who: 'tourist', mood: 'happy', text: 'Dude! Have you SEEN anything? We drove all the way from Ohio!' },
      { who: 'tourist', mood: 'talk', text: 'Kelly says the aliens are shy. I say they\'re union. Mandatory breaks.' },
    ],
    2: [{ who: 'tourist', mood: 'happy', text: 'Bro. Your dog just found more out here than we did all WEEK.' }],
  },
  dolores: {
    0: [
      { who: 'dolores', mood: 'smug', text: 'Sit anywhere, hon. Pie\'s fresh. Coffee\'s older than you.' },
      { who: 'ben', mood: 'talk', text: 'Ma\'am, I\'m looking for whoever wrote this note. Signed "D".' },
      { who: 'dolores', mood: 'stern', text: 'Never seen it in my life.' },
      { who: 'dolores', mood: 'smug', text: '...But if you\'re who I THINK you are, prove it. Something\'s buried by the Black Mailbox, east of town. Been there since \'08. Bring it here.' },
      { who: 'zeus', mood: 'excited', text: '*tail wagging intensifies*' },
    ],
    1: [{ who: 'dolores', mood: 'stern', text: 'Black Mailbox. East. Your dog looks like a digger, hon.' }],
    2: [
      { who: 'ben', mood: 'talk', text: 'Found this buried by the mailbox. An old hardware wallet... with "S.N." scratched on the back.' },
      { who: 'dolores', mood: 'shocked', text: 'Well I\'ll be. That\'s HIS.' },
      { who: 'ben', mood: 'shocked', text: 'His WHO?!' },
      { who: 'dolores', mood: 'soft', text: 'Sat. Quiet fella. Paid for a slice of apple pie in some made-up internet money back in \'08. Big eyes. Real big eyes.' },
      { who: 'dolores', mood: 'stern', text: 'Then the trucks came and took him. Hangar 18. He\'s been there ever since.' },
      { who: 'ben', mood: 'shocked', text: 'SATOSHI NAKAMOTO ate PIE here?!' },
      { who: 'dolores', mood: 'smug', text: 'Two favours and I\'ll show you a way in. My nephew pulls security at the base. Lost his keycard out by the coyote den, southwest.' },
      { who: 'dolores', mood: 'stern', text: 'And my sign\'s on the fritz. Fuse box is round the side. Fix both. Then we talk.' },
    ],
    3: [{ who: 'dolores', mood: 'stern', text: 'Keycard by the coyote den. Fuse box round the side. Clock\'s tickin\', hon.' }],
    4: [
      { who: 'dolores', mood: 'soft', text: 'Sign\'s lit. Keycard\'s back. You\'re alright, Ben.' },
      { who: 'dolores', mood: 'soft', text: 'I wrote that note. Been sneaking Sat a slice of pie through my nephew every week for fifteen years.' },
      { who: 'dolores', mood: 'stern', text: 'Last week he asked me for help. First time ever. Said a signal was going out on that blockchain of yours.' },
      { who: 'dolores', mood: 'smug', text: 'Here. The old cattle road runs right up to the perimeter fence. Guards change at midnight.' },
      { who: 'ben', mood: 'angry', text: 'Thank you, Dolores. We\'re getting him out.' },
      { who: 'zeus', mood: 'excited', text: '*BOOF!*' },
      { who: 'dolores', mood: 'smug', text: 'And Ben? Take a pie for the road. Apple. It was his favourite.' },
    ],
  },
};

export const OBJECTIVES = {
  0: 'Find out who "D" is. Ask the locals.',
  1: 'Dig up whatever is buried by the Black Mailbox (east).',
  2: 'Bring the hardware wallet to Dolores.',
  3: 'Find the keycard (coyote den, SW) and fix the diner sign (fuse box).',
  4: 'Talk to Dolores.',
};
