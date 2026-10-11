import type { PartMaterial, PartShape } from '../parts';
import type { DetailLevel } from '../types';
import type { CrownId } from './ids';

export type CrownFamily = 'classic' | 'gothic-deco' | 'modern' | 'world' | 'eco';

export const CROWN_FAMILIES: { id: CrownFamily; label: string }[] = [
  { id: 'classic', label: 'Classic & Beaux-Arts' },
  { id: 'gothic-deco', label: 'Gothic & Deco' },
  { id: 'modern', label: 'Modern' },
  { id: 'world', label: 'Around the World' },
  { id: 'eco', label: 'Eco & Experimental' },
];

export type CrownHeightRule =
  | { kind: 'metres'; value: number }
  | { kind: 'floors'; value: number }
  /** Fraction of the tower body's height. */
  | { kind: 'fraction'; value: number };

/**
 * One piece of a crown, described in fractions so it fits any tower:
 * heights are fractions of the crown's height (0 = roof, 1 = tip);
 * widths are fractions of the top floor's width (w) and depth (d, defaults to w).
 */
export interface CrownStage {
  shape: PartShape;
  y0: number;
  y1: number;
  w: number;
  d?: number;
  /** Where copies go: one in the centre (default), one per plan corner, or a 3 × 3 grid. */
  at?: 'center' | 'corners' | 'grid';
  /** For corners and grid: how far out, as a fraction of the plate (1 = at the edge). */
  spread?: number;
  /** Shift as fractions of the top floor's width and depth. */
  offset?: readonly [number, number];
  /** Turn about the vertical axis, radians. */
  rotY?: number;
  material: PartMaterial;
  glow?: boolean;
  animate?: 'spin' | 'blink';
}

export interface CrownDef {
  id: CrownId;
  label: string;
  family: CrownFamily;
  /** A real building that has this kind of top. */
  seenOn: string;
  blurb: string;
  height: CrownHeightRule;
  /** False for antennas — official height rankings don't count them. */
  officialHeight: boolean;
  /** Counts as an eye-catching top for "landmark" briefs. */
  landmark: boolean;
  /** Makes electricity (wind turbines). */
  generatesPower?: true;
  /** Built from stages unless `custom` — then scene/crowns must provide a builder. */
  stages?: readonly CrownStage[];
  custom?: true;
  minDetailLevel: DetailLevel;
}

const S = 'standard' as const;

const CROWN_DATA = {
  cornice: {
    id: 'cornice', label: 'Heavy cornice', family: 'classic', seenOn: 'Reliance Building, Chicago',
    blurb: 'A deep stone ledge that "caps" the tower like the top of a classical column.',
    height: { kind: 'metres', value: 2 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.4, w: 1, material: 'body' },
      { shape: 'plan', y0: 0.4, y1: 1, w: 1.08, material: 'accent' },
    ],
  },
  mansard: {
    id: 'mansard', label: 'Mansard roof', family: 'classic', seenOn: 'The Plaza Hotel, New York',
    blurb: 'A steep copper roof with a flat top, borrowed from 1800s Paris.',
    height: { kind: 'floors', value: 2 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.15, w: 1.02, material: 'stone' },
      { shape: 'plan', y0: 0.15, y1: 0.75, w: 0.9, material: 'copper' },
      { shape: 'plan', y0: 0.75, y1: 1, w: 0.7, material: 'copper' },
    ],
  },
  'dome-lantern': {
    id: 'dome-lantern', label: 'Dome and lantern', family: 'classic', seenOn: 'Singer Building, New York',
    blurb: 'A copper dome topped by a little glass "lantern" — like a cathedral on a tower.',
    height: { kind: 'fraction', value: 0.08 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.25, w: 0.7, material: 'stone' },
      { shape: 'cylinder', y0: 0.25, y1: 0.35, w: 0.55, material: 'stone' },
      { shape: 'dome', y0: 0.35, y1: 0.75, w: 0.55, material: 'copper' },
      { shape: 'cylinder', y0: 0.75, y1: 0.9, w: 0.12, material: 'light', glow: true },
      { shape: 'cone', y0: 0.9, y1: 1, w: 0.12, material: 'copper' },
    ],
  },
  'clock-tower': {
    id: 'clock-tower', label: 'Clock tower and cupola', family: 'classic', seenOn: 'Metropolitan Life Tower, New York',
    blurb: 'A giant clock on every side and a golden cupola, modelled on a bell tower in Venice.',
    height: { kind: 'fraction', value: 0.1 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.45, w: 0.45, material: 'stone' },
      { shape: 'box', y0: 0.28, y1: 0.38, w: 0.47, material: 'light', glow: true },
      { shape: 'plan', y0: 0.45, y1: 0.6, w: 0.38, material: 'stone' },
      { shape: 'dome', y0: 0.6, y1: 0.8, w: 0.3, material: 'gold' },
      { shape: 'cone', y0: 0.8, y1: 1, w: 0.06, material: 'gold' },
    ],
  },
  'gothic-pinnacles': {
    id: 'gothic-pinnacles', label: 'Gothic pinnacles', family: 'gothic-deco', seenOn: 'Woolworth Building, New York',
    blurb: 'A copper roof ringed by stone spikes, like a cathedral — the "Cathedral of Commerce".',
    height: { kind: 'fraction', value: 0.1 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.15, w: 0.9, material: 'stone' },
      { shape: 'plan-cone', y0: 0.15, y1: 1, w: 0.75, material: 'copper' },
      { shape: 'cone', y0: 0, y1: 0.55, w: 0.08, at: 'corners', spread: 0.95, material: 'stone' },
    ],
  },
  'flying-buttresses': {
    id: 'flying-buttresses', label: 'Flying buttresses', family: 'gothic-deco', seenOn: 'Tribune Tower, Chicago',
    blurb: 'Stone arms leap from the corners to hold up a central lantern — copied from French cathedrals.',
    height: { kind: 'fraction', value: 0.06 }, officialHeight: true, landmark: true, minDetailLevel: S,
    custom: true,
  },
  'deco-arches': {
    id: 'deco-arches', label: 'Deco arches and needle', family: 'gothic-deco', seenOn: 'Chrysler Building, New York',
    blurb: 'Shiny stacked arches with sunburst windows and a needle on top — pure 1930s glamour.',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.08, w: 0.8, material: 'body' },
      { shape: 'dome', y0: 0.08, y1: 0.24, w: 0.78, material: 'steel', glow: true },
      { shape: 'plan', y0: 0.24, y1: 0.3, w: 0.58, material: 'body' },
      { shape: 'dome', y0: 0.3, y1: 0.44, w: 0.56, material: 'steel', glow: true },
      { shape: 'plan', y0: 0.44, y1: 0.48, w: 0.38, material: 'body' },
      { shape: 'dome', y0: 0.48, y1: 0.6, w: 0.36, material: 'steel', glow: true },
      { shape: 'cone', y0: 0.6, y1: 1, w: 0.07, material: 'steel' },
    ],
  },
  'mooring-mast': {
    id: 'mooring-mast', label: 'Mooring mast', family: 'gothic-deco', seenOn: 'Empire State Building, New York',
    blurb: 'A glass-and-steel mast first meant for tying up airships. It never worked — too windy!',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.25, w: 0.6, material: 'body' },
      { shape: 'cylinder', y0: 0.25, y1: 0.45, w: 0.35, material: 'light', glow: true },
      { shape: 'dome', y0: 0.45, y1: 0.55, w: 0.35, material: 'accent' },
      { shape: 'cylinder', y0: 0.55, y1: 1, w: 0.03, material: 'steel', animate: 'blink' },
    ],
  },
  spire: {
    id: 'spire', label: 'Spire', family: 'gothic-deco', seenOn: 'One World Trade Center, New York',
    blurb: 'A tall needle on top — adds a lot of height.',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.15, w: 0.4, material: 'accent' },
      { shape: 'cone', y0: 0.15, y1: 1, w: 0.16, material: 'steel', animate: 'blink' },
    ],
  },
  stepped: {
    id: 'stepped', label: 'Stepped', family: 'gothic-deco', seenOn: 'Bank of Manhattan Trust, New York',
    blurb: 'Small blocks stacked like a ziggurat.',
    height: { kind: 'floors', value: 3 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 1 / 3, w: 0.75, material: 'accent' },
      { shape: 'plan', y0: 1 / 3, y1: 2 / 3, w: 0.55, material: 'accent' },
      { shape: 'plan', y0: 2 / 3, y1: 1, w: 0.35, material: 'accent' },
    ],
  },
  flat: {
    id: 'flat', label: 'Flat roof', family: 'modern', seenOn: 'Seagram Building, New York',
    blurb: 'A simple flat top with the machinery hidden behind a low wall. Good for a helipad or pool.',
    height: { kind: 'metres', value: 2 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.5, w: 0.96, material: 'accent' },
      { shape: 'box', y0: 0.5, y1: 1, w: 0.25, d: 0.2, offset: [-0.2, 0.1], material: 'steel' },
      { shape: 'box', y0: 0.5, y1: 0.9, w: 0.15, d: 0.3, offset: [0.22, -0.15], material: 'steel' },
    ],
  },
  'concrete-cap': {
    id: 'concrete-cap', label: 'Concrete cap', family: 'modern', seenOn: 'Barbican towers, London',
    blurb: 'A chunky overhanging concrete top — bold and blocky, the Brutalist way.',
    height: { kind: 'floors', value: 1 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.3, w: 0.8, material: 'concrete' },
      { shape: 'plan', y0: 0.3, y1: 1, w: 1.12, material: 'concrete' },
    ],
  },
  pointed: {
    id: 'pointed', label: 'Pointed pyramid', family: 'modern', seenOn: 'Transamerica Pyramid, San Francisco',
    blurb: 'A pyramid-like cap that sheds wind and snow.',
    height: { kind: 'fraction', value: 0.08 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [{ shape: 'plan-cone', y0: 0, y1: 1, w: 1, material: 'accent' }],
  },
  sloped: {
    id: 'sloped', label: 'Sloped', family: 'modern', seenOn: 'Citigroup Center, New York',
    blurb: 'A slanted top, like a ramp to the sky. Citigroup\'s was meant to hold solar panels.',
    height: { kind: 'fraction', value: 0.05 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [{ shape: 'wedge', y0: 0, y1: 1, w: 1, material: 'accent' }],
  },
  'split-pediment': {
    id: 'split-pediment', label: 'Split pediment', family: 'modern', seenOn: '550 Madison (AT&T Building), New York',
    blurb: 'A giant triangle with a notch, like the top of an old grandfather clock — a Postmodern joke.',
    height: { kind: 'floors', value: 2 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.4, w: 1, material: 'body' },
      { shape: 'wedge', y0: 0.4, y1: 1, w: 0.44, d: 0.9, offset: [-0.28, 0], rotY: Math.PI, material: 'accent' },
      { shape: 'wedge', y0: 0.4, y1: 1, w: 0.44, d: 0.9, offset: [0.28, 0], material: 'accent' },
    ],
  },
  'lattice-mast': {
    id: 'lattice-mast', label: 'Lattice mast', family: 'modern', seenOn: "Lloyd's Building, London",
    blurb: 'An open steel frame with a mast — High-Tech towers show off their engineering.',
    height: { kind: 'fraction', value: 0.1 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'box', y0: 0, y1: 0.08, w: 0.5, material: 'steel' },
      { shape: 'cylinder', y0: 0.08, y1: 0.85, w: 0.03, at: 'corners', spread: 0.35, material: 'accent' },
      { shape: 'box', y0: 0.45, y1: 0.48, w: 0.36, material: 'accent' },
      { shape: 'box', y0: 0.82, y1: 0.85, w: 0.36, material: 'accent' },
      { shape: 'cylinder', y0: 0.08, y1: 1, w: 0.05, material: 'steel', animate: 'blink' },
    ],
  },
  'twin-antennas': {
    id: 'twin-antennas', label: 'Twin antennas', family: 'modern', seenOn: 'Willis Tower, Chicago',
    blurb: 'Broadcast antennas. They make the tower look taller, but official height rankings don\'t count them!',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: false, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'box', y0: 0, y1: 0.05, w: 0.3, material: 'steel' },
      { shape: 'cylinder', y0: 0.05, y1: 1, w: 0.03, offset: [-0.2, 0.1], material: 'steel', animate: 'blink' },
      { shape: 'cylinder', y0: 0.05, y1: 0.85, w: 0.03, offset: [0.2, -0.1], material: 'steel', animate: 'blink' },
    ],
  },
  'gold-obelisk': {
    id: 'gold-obelisk', label: 'Gold obelisk lantern', family: 'modern', seenOn: 'Bank of America Plaza, Atlanta',
    blurb: 'An open golden pyramid-topped frame that glows at night.',
    height: { kind: 'fraction', value: 0.08 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.2, w: 0.5, material: 'body' },
      { shape: 'box', y0: 0.2, y1: 0.85, w: 0.3, material: 'gold', glow: true },
      { shape: 'pyramid', y0: 0.85, y1: 1, w: 0.3, material: 'gold', glow: true },
    ],
  },
  'star-spire': {
    id: 'star-spire', label: 'Star spire', family: 'world', seenOn: 'Moscow State University ("Seven Sisters")',
    blurb: 'Stacked towers and a golden spire topped with a red star — the Soviet wedding-cake style.',
    height: { kind: 'fraction', value: 0.18 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.15, w: 0.5, material: 'body' },
      { shape: 'plan', y0: 0.15, y1: 0.3, w: 0.35, material: 'body' },
      { shape: 'cone', y0: 0.3, y1: 0.92, w: 0.12, material: 'gold' },
      { shape: 'sphere', y0: 0.92, y1: 1, w: 0.06, material: 'ruby', glow: true },
    ],
  },
  pagoda: {
    id: 'pagoda', label: 'Pagoda tiers', family: 'world', seenOn: 'Jin Mao Tower, Shanghai / Taipei 101',
    blurb: 'Flared roofs stacked like a pagoda — eight is a lucky number, so Jin Mao has eight-part rhythms.',
    height: { kind: 'fraction', value: 0.1 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.2, w: 0.8, material: 'body' },
      { shape: 'plan-cone', y0: 0.2, y1: 0.3, w: 1.05, material: 'accent' },
      { shape: 'plan', y0: 0.3, y1: 0.48, w: 0.62, material: 'body' },
      { shape: 'plan-cone', y0: 0.48, y1: 0.58, w: 0.85, material: 'accent' },
      { shape: 'plan', y0: 0.58, y1: 0.74, w: 0.45, material: 'body' },
      { shape: 'plan-cone', y0: 0.74, y1: 0.84, w: 0.65, material: 'accent' },
      { shape: 'cone', y0: 0.84, y1: 1, w: 0.05, material: 'gold' },
    ],
  },
  'ringed-pinnacle': {
    id: 'ringed-pinnacle', label: 'Ringed pinnacle', family: 'world', seenOn: 'Petronas Towers, Kuala Lumpur',
    blurb: 'Stainless-steel rings and a slender point, inspired by Islamic geometry.',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'cylinder', y0: 0, y1: 0.3, w: 0.45, material: 'steel' },
      { shape: 'torus', y0: 0.3, y1: 0.34, w: 0.5, material: 'steel' },
      { shape: 'cylinder', y0: 0.34, y1: 0.55, w: 0.3, material: 'steel' },
      { shape: 'torus', y0: 0.55, y1: 0.58, w: 0.36, material: 'steel' },
      { shape: 'cylinder', y0: 0.58, y1: 0.7, w: 0.18, material: 'steel' },
      { shape: 'sphere', y0: 0.7, y1: 0.76, w: 0.16, material: 'steel' },
      { shape: 'cylinder', y0: 0.76, y1: 1, w: 0.03, material: 'steel', animate: 'blink' },
    ],
  },
  'stepped-needle': {
    id: 'stepped-needle', label: 'Stepped needle', family: 'world', seenOn: 'Burj Khalifa, Dubai',
    blurb: 'The tower steps in and in until it becomes a needle — the tallest building on Earth.',
    height: { kind: 'fraction', value: 0.2 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.2, w: 0.6, material: 'glass' },
      { shape: 'plan', y0: 0.2, y1: 0.38, w: 0.42, material: 'glass' },
      { shape: 'plan', y0: 0.38, y1: 0.52, w: 0.28, material: 'glass' },
      { shape: 'cylinder', y0: 0.52, y1: 1, w: 0.08, material: 'steel', animate: 'blink' },
    ],
  },
  'sky-bridge-arch': {
    id: 'sky-bridge-arch', label: 'Sky-bridge arch', family: 'world', seenOn: 'Kingdom Centre, Riyadh',
    blurb: 'Two prongs joined by a glass bridge high up, leaving a huge opening the wind blows through.',
    height: { kind: 'floors', value: 4 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'box', y0: 0, y1: 1, w: 0.3, d: 0.9, offset: [-0.35, 0], material: 'body' },
      { shape: 'box', y0: 0, y1: 1, w: 0.3, d: 0.9, offset: [0.35, 0], material: 'body' },
      { shape: 'box', y0: 0.7, y1: 0.8, w: 0.42, d: 0.5, material: 'glass', glow: true },
    ],
  },
  'open-frame': {
    id: 'open-frame', label: 'Open frame ("bottle opener")', family: 'eco', seenOn: 'Shanghai World Financial Center',
    blurb: 'A hole through the top lets wind pass straight through, so the tower sways less.',
    height: { kind: 'floors', value: 3 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'box', y0: 0, y1: 1, w: 0.22, d: 1, offset: [-0.39, 0], material: 'body' },
      { shape: 'box', y0: 0, y1: 1, w: 0.22, d: 1, offset: [0.39, 0], material: 'body' },
      { shape: 'box', y0: 0.85, y1: 1, w: 1, d: 1, material: 'body' },
    ],
  },
  'glass-dome': {
    id: 'glass-dome', label: 'Glass bullet dome', family: 'eco', seenOn: '30 St Mary Axe ("The Gherkin"), London',
    blurb: 'A rounded glass cap with a restaurant inside and 360° views.',
    height: { kind: 'fraction', value: 0.04 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [{ shape: 'dome', y0: 0, y1: 1, w: 1, material: 'glass', glow: true }],
  },
  'glass-shards': {
    id: 'glass-shards', label: 'Glass shards', family: 'eco', seenOn: 'The Shard, London',
    blurb: 'Leaning glass panes that never quite meet, so the top looks unfinished on purpose.',
    height: { kind: 'fraction', value: 0.06 }, officialHeight: true, landmark: true, minDetailLevel: S,
    custom: true,
  },
  'wind-turbines': {
    id: 'wind-turbines', label: 'Wind turbines', family: 'eco', seenOn: 'Strata SE1, London',
    blurb: 'Three turbines in the roof make a little electricity — about 5% of what the building uses.',
    height: { kind: 'floors', value: 2 }, officialHeight: true, landmark: true, generatesPower: true, minDetailLevel: S,
    custom: true,
  },
  'roof-forest': {
    id: 'roof-forest', label: 'Roof forest', family: 'eco', seenOn: 'Bosco Verticale, Milan',
    blurb: 'Real trees on the roof shade it, clean the air and give birds a home.',
    height: { kind: 'floors', value: 1 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.3, w: 0.95, material: 'concrete' },
      { shape: 'cone', y0: 0.3, y1: 1, w: 0.18, at: 'grid', spread: 0.7, material: 'foliage' },
    ],
  },
} as const satisfies Record<CrownId, CrownDef>;

export const CROWNS: Record<CrownId, CrownDef> = CROWN_DATA;

/** Crowns marked `custom: true`; scene/crowns must give each one a builder. */
export type CustomCrownId = {
  [K in CrownId]: (typeof CROWN_DATA)[K] extends { custom: true } ? K : never;
}[CrownId];
