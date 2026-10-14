// ============================================================================
//  CHAPTER LIST — titles, scenes, map positions and star targets.
//  `scene: null` = not built yet (shown as "under construction" on the map).
// ============================================================================
export const CHAPTERS = [
  {
    id: 'ch1', num: 1, title: 'EXTRATERRESTRIAL HIGHWAY', place: 'NEVADA STATE ROUTE 375', scene: 'Chapter1',
    blurb: 'Floor it down the E.T. Highway at golden hour. Dodge the black SUVs.',
    map: { x: 196, y: 236 }, parTime: 170,
  },
  {
    id: 'ch2', num: 2, title: 'RACHEL, NEVADA', place: 'POPULATION 54', scene: null,
    blurb: 'A tiny town, a neon diner, and locals who know more than they say.',
    map: { x: 262, y: 186 },
  },
  {
    id: 'ch3', num: 3, title: 'THE PERIMETER', place: 'GROOM LAKE BOUNDARY', scene: null,
    blurb: 'Sneak past patrols and searchlights. Zeus can bark to distract guards.',
    map: { x: 356, y: 160 },
  },
  {
    id: 'ch4', num: 4, title: 'THE HANGAR', place: 'HANGAR 18', scene: null,
    blurb: 'Hack the blast doors before the agents close in.',
    map: { x: 432, y: 122 },
  },
  {
    id: 'ch5', num: 5, title: 'UNDERGROUND', place: 'SUB-LEVEL S-4', scene: 'Chapter5',
    blurb: 'Fight through the secret labs to find Ben\'s rig... and the truth.',
    map: { x: 486, y: 184 }, parTime: 240,
  },
  {
    id: 'ch6', num: 6, title: 'DREAMLAND', place: 'THE SKY ABOVE AREA 51', scene: null,
    blurb: 'Protect Satoshi\'s escape from the UFO enforcer.',
    map: { x: 560, y: 92 },
  },
];

export const chapterById = (id) => CHAPTERS.find((c) => c.id === id);
export const chapterByScene = (key) => CHAPTERS.find((c) => c.scene === key);
