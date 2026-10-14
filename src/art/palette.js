// ============================================================================
//  CURATED PALETTE — every color in the game comes from here so the whole
//  thing reads as one cohesive piece of art.
// ============================================================================
export const P = {
  // inks / UI darks
  ink: '#0b0a1a', ink2: '#141230', ink3: '#231e4a', ink4: '#332a63',
  outline: '#160d1f',

  // sunset sky (top -> horizon)
  sky0: '#140f33', sky1: '#24154a', sky2: '#3d1a5e', sky3: '#64206e', sky4: '#93296f',
  sky5: '#c23d68', sky6: '#e85f58', sky7: '#f78a45', sky8: '#ffb347', sky9: '#ffd98a',

  // night sky
  night0: '#04050e', night1: '#080d22', night2: '#0e1736', night3: '#16234a', night4: '#22315e', night5: '#33407a',

  // sun
  sun0: '#fff1b8', sun1: '#ffd66b', sun2: '#ffab3d', sun3: '#ff7a3a', sun4: '#f2505a',

  // rock & sand
  sand0: '#f2cf94', sand1: '#d9a066', sand2: '#c4834f', sand3: '#a3643c',
  terra0: '#d4743f', terra1: '#b5562e', terra2: '#8a3b24', terra3: '#5e2a22', terra4: '#3d1d1f',
  mauve0: '#9a4c6e', mauve1: '#743d63', mauve2: '#512d55', mauve3: '#3a2248',

  // plants
  sage0: '#a7b77a', sage1: '#7a9a5a', sage2: '#4f6b3f', sage3: '#2f4430', sage4: '#1d2a22',

  // alien tech
  cyan0: '#d6fffb', cyan1: '#7ff8ff', cyan2: '#3cf2ff', cyan3: '#1aa6c9', cyan4: '#0e5c7a',
  green0: '#e4ffd0', green1: '#9dff8a', green2: '#5dff9a', green3: '#2bd16b', green4: '#137a49',

  // bitcoin
  btc0: '#ffe9b0', btc1: '#ffc35c', btc: '#f7931a', btc2: '#c96d0a', btc3: '#7d3f05',

  // characters
  skin0: '#f5c39a', skin1: '#e0a07a', skin2: '#b87858', skin3: '#8a5040',
  beard: '#6b4027', beard2: '#4a2a1a',
  hood0: '#4a5080', hood1: '#363b66', hood2: '#262947', hood3: '#1a1c33',
  khaki0: '#c8b07a', khaki1: '#a89060', khaki2: '#7d6a44',
  foil0: '#ffffff', foil1: '#d8e2ec', foil2: '#9aa8ba',
  capR: '#c8423a', capR2: '#8f2a2a', cream: '#f2e6c8', cream2: '#cbb894',
  gold0: '#ffe0a0', gold1: '#f5c060', gold2: '#e0a040', gold3: '#b87828', gold4: '#8a5420',
  nose: '#1a1010', tongue: '#e86a7a', collar: '#d63a3a', collar2: '#9a2424',

  // van
  van0: '#9fd8cf', van1: '#6fb5ad', van2: '#4a8a85', van3: '#2f5f60',
  vanTop0: '#f5ead2', vanTop1: '#d9c9a6', vanTop2: '#ad9c7c',
  rust0: '#c46a3a', rust1: '#8a4428', chrome0: '#f0f4f8', chrome1: '#b5c0cc', chrome2: '#6b7686',
  tire: '#1c1a22', tire2: '#2e2b36', glass0: '#ffd7a0', glass1: '#e08a6a', glass2: '#6a3a5a',

  // misc
  white: '#fff6e0', red: '#ff3b4f', red2: '#a01f33', sign: '#2f7a4f', sign2: '#1f5236',
  fire0: '#fff3b0', fire1: '#ffc040', fire2: '#ff7a20', fire3: '#d63a20',
};

/** Hex -> [r,g,b] */
export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Hex -> 0xRRGGBB number for Phaser tints. */
export const hexNum = (hex) => parseInt(hex.slice(1), 16);

/** Linear mix of two hex colors, t in 0..1. */
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Sky gradients per time of day (top -> horizon). */
export const SKIES = {
  golden: [P.sky1, P.sky2, P.sky3, P.sky4, P.sky5, P.sky6, P.sky7, P.sky8, P.sky9],
  sunset: [P.sky0, P.sky1, P.sky2, P.sky3, P.sky4, P.sky5, P.sky6, P.sky7, P.sky8],
  dusk:   [P.night1, P.sky0, P.sky1, P.sky2, P.sky3, P.sky4, P.sky5, P.sky6],
  night:  [P.night0, P.night1, P.night1, P.night2, P.night2, P.night3, P.night4, P.night5],
  sunrise:['#1b2050', '#2c2e66', '#4a3f80', '#7a5a98', '#b06a98', '#e08a8a', '#f5a87a', '#ffd59a', '#fff0c0'],
};
