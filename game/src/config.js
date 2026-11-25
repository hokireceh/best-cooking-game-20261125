// Dapur Kilat — shared constants: canvas size, palette, ingredients and recipes.
// One job: every number the rest of the game agrees on lives here, so tuning the
// kitchen never means hunting literals across files.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 96;
export const SHIFT_SECONDS = 150;
export const CHEF_SPEED = 265;
export const CHEF_RADIUS = 24;
export const INTERACT_DIST = 96;
export const CHOP_SECONDS = 1.4;
export const GRILL_COOK_SECONDS = 6;
export const GRILL_BURN_SECONDS = 12;
export const MAX_TICKETS = 4;

export const PALETTE = {
  floorA: '#c98d5f',
  floorB: '#bd7f52',
  wall: '#8a4f3d',
  wallTrim: '#f2e3c6',
  counterTop: '#e8c890',
  counterSide: '#a9713f',
  boardWood: '#d9a066',
  grillMetal: '#4a4a55',
  plateWhite: '#fdf8ee',
  ink: '#2e2118',
  cream: '#f7ead0',
  teal: '#2f7d7a',
  tealDark: '#1f5b58',
  tomato: '#d94f3d',
  gold: '#f2b234',
  danger: '#c0392b',
};

// Ingredient catalogue. `chop` means the raw item must visit the chopping board,
// `grill` means it must visit the grill; `state` tracks where it is in its prep.
export const INGREDIENTS = {
  bun: { label: 'Roti', color: '#e0a458', chop: false, grill: false },
  patty: { label: 'Patty', color: '#7a4a2b', chop: false, grill: true },
  lettuce: { label: 'Selada', color: '#58a34a', chop: true, grill: false },
  tomato: { label: 'Tomat', color: '#d94f3d', chop: true, grill: false },
  cheese: { label: 'Keju', color: '#f2b234', chop: false, grill: false },
  onion: { label: 'Bawang', color: '#b678c2', chop: true, grill: false },
};

// A recipe is a multiset of prepared items. `need` entries name the ingredient
// kind plus the state it must be in when it lands on the plate.
export const RECIPES = [
  {
    id: 'burger-kilat',
    name: 'Burger Kilat',
    need: [
      { kind: 'bun', state: 'raw' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
    ],
  },
  {
    id: 'salad-segar',
    name: 'Salad Segar',
    need: [
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'cheese', state: 'raw' },
    ],
  },
  {
    id: 'burger-keju',
    name: 'Burger Keju',
    need: [
      { kind: 'bun', state: 'raw' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'raw' },
      { kind: 'tomato', state: 'chopped' },
    ],
  },
  {
    id: 'roti-bawang',
    name: 'Roti Bawang',
    need: [
      { kind: 'bun', state: 'raw' },
      { kind: 'cheese', state: 'raw' },
      { kind: 'onion', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
    ],
  },
];

// Difficulty curve: orders arrive faster and patience shrinks as the shift wears on.
// `t` is seconds elapsed in the shift, 0..SHIFT_SECONDS.
export function spawnIntervalAt(t) {
  const k = Math.min(1, t / SHIFT_SECONDS);
  return 16 - 7 * k;
}

export function patienceAt(t) {
  const k = Math.min(1, t / SHIFT_SECONDS);
  return 48 - 16 * k;
}

export function isRush(t) {
  return SHIFT_SECONDS - t <= 30;
}
