import type { Part } from '../parts';
import type { DetailLevel } from '../types';
import type { OrnamentId, SpandrelId, WindowPatternId } from './ids';

const S = 'standard' as const;

/* ---------- Window patterns (painted) ---------- */

/** One glass pane, as fractions of the window opening's width. */
export interface PaneDef {
  x0: number;
  x1: number;
}

export interface WindowPatternDef {
  id: WindowPatternId;
  label: string;
  seenOn: string;
  blurb: string;
  /** Width of one repeating bay, metres. */
  bayWidth: number;
  panes: readonly PaneDef[];
  /** Frame / mullion thickness as a fraction of the bay width. */
  frame: number;
  /** Pointed arch on top of each pane. */
  arch?: boolean;
  /** Diagonal glazing bars. */
  diagonals?: boolean;
  /** The wall between windows is glass too (curtain wall). */
  glassWall?: boolean;
  minDetailLevel: DetailLevel;
}

export const WINDOW_PATTERNS: Record<WindowPatternId, WindowPatternDef> = {
  'flush-grid': {
    id: 'flush-grid', label: 'Flush glass grid', seenOn: 'Seagram Building, New York',
    blurb: 'One big pane per bay with thin dark mullions — a smooth glass skin.',
    bayWidth: 3, panes: [{ x0: 0, x1: 1 }], frame: 0.03, glassWall: true, minDetailLevel: S,
  },
  chicago: {
    id: 'chicago', label: 'Chicago windows', seenOn: 'Reliance Building, Chicago',
    blurb: 'A wide fixed pane between two narrow windows that open — invented for steel-frame towers.',
    bayWidth: 4.5, panes: [{ x0: 0, x1: 0.2 }, { x0: 0.24, x1: 0.76 }, { x0: 0.8, x1: 1 }], frame: 0.04, minDetailLevel: S,
  },
  arched: {
    id: 'arched', label: 'Tall arched windows', seenOn: 'Woolworth Building, New York',
    blurb: 'Narrow windows with pointed tops, like a cathedral.',
    bayWidth: 3, panes: [{ x0: 0.15, x1: 0.85 }], frame: 0.05, arch: true, minDetailLevel: S,
  },
  punched: {
    id: 'punched', label: 'Punched windows', seenOn: 'Barbican towers, London',
    blurb: 'Small holes in a solid wall — strong, private and good at keeping heat in.',
    bayWidth: 3.5, panes: [{ x0: 0.1, x1: 0.9 }], frame: 0.04, minDetailLevel: S,
  },
  'exposed-frame': {
    id: 'exposed-frame', label: 'Exposed frame', seenOn: 'HSBC Building, Hong Kong',
    blurb: 'Each pane sits inside a chunky frame that shows how the wall is put together.',
    bayWidth: 4, panes: [{ x0: 0, x1: 1 }], frame: 0.1, minDetailLevel: S,
  },
  diamond: {
    id: 'diamond', label: 'Diamond facets', seenOn: 'Hearst Tower, New York',
    blurb: 'Glass split by diagonal bars into triangles and diamonds.',
    bayWidth: 4, panes: [{ x0: 0, x1: 1 }], frame: 0.03, diagonals: true, glassWall: true, minDetailLevel: S,
  },
};

/* ---------- Spandrels (painted) ---------- */

export interface SpandrelDef {
  id: SpandrelId;
  label: string;
  seenOn: string;
  blurb: string;
  motif: 'none' | 'chevron' | 'stripes';
  minDetailLevel: DetailLevel;
}

export const SPANDRELS: Record<SpandrelId, SpandrelDef> = {
  plain: {
    id: 'plain', label: 'Plain', seenOn: 'Most towers',
    blurb: 'A simple band between one floor\'s windows and the next.', motif: 'none', minDetailLevel: S,
  },
  chevron: {
    id: 'chevron', label: 'Deco chevrons', seenOn: 'Chrysler Building, New York',
    blurb: 'Zig-zag metal panels between the windows — a 1930s signature.', motif: 'chevron', minDetailLevel: S,
  },
  stripes: {
    id: 'stripes', label: 'Colour stripes', seenOn: 'Portland Building, Portland',
    blurb: 'Bold two-colour bands — Postmodern architects loved a bit of fun.', motif: 'stripes', minDetailLevel: S,
  },
};

/* ---------- Ornaments (3D relief) ---------- */

export type OrnamentGroup = 'vertical' | 'horizontal' | 'corners' | 'base' | 'structure';

export const ORNAMENT_GROUPS: { id: OrnamentGroup; label: string }[] = [
  { id: 'vertical', label: 'Vertical' },
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'corners', label: 'Corners & setbacks' },
  { id: 'base', label: 'Base' },
  { id: 'structure', label: 'Structure' },
];

/**
 * Where an ornament goes (each rule is shared by many ornaments):
 * - bay-lines: on the wall at every bay, either full height between setbacks or once per floor
 * - floor-rings: a band around the whole floor every few floors
 * - setback-corners: at the corners where the tower steps in, and at the roof
 * - setback-faces: centred on each face just above each step
 * - roof-edge: spaced along the roof and setback edges
 * - base-floors: wrapped around the lowest floors
 * - entry: the middle of the front face at ground level
 */
export type PlacementRule =
  | 'bay-lines'
  | 'floor-rings'
  | 'setback-corners'
  | 'setback-faces'
  | 'roof-edge'
  | 'base-floors'
  | 'entry';

/** How much of an ornament to place at an amount setting. */
export interface AmountRule {
  /** Size multiplier for the template. */
  size: number;
  /** bay-lines: every Nth bay. floor-rings: every Nth floor. */
  every?: number;
  /** setback-faces / roof-edge / entry: copies per face. */
  count?: number;
  /** setback-corners / setback-faces: only the top step, or every step. */
  levels?: 'top' | 'all';
  /** setback-corners: also put copies in the middle of each face. */
  midFaces?: boolean;
  /** base-floors: how many floors. */
  floors?: number;
}

export interface OrnamentDef {
  id: OrnamentId;
  label: string;
  group: OrnamentGroup;
  seenOn: string;
  blurb: string;
  placement: PlacementRule;
  /**
   * Geometry at one anchor, in metres, in a local frame where +x runs along the wall, +y is up and
   * +z points out of the wall. For bay-lines, a y-scale of 1 means "stretch to the run of floors".
   * A part with shape 'plan' is a band around the whole floor instead: its y-scale is the band's
   * thickness and its z-scale how far it sticks out.
   */
  template: readonly Part[];
  amount: { low: AmountRule; high: AmountRule };
  /** Pure decoration — removed when Ornament amount is None. */
  decorative: boolean;
  /** Carved stone or terracotta — adds weight. */
  stone: boolean;
  minDetailLevel: DetailLevel;
}

export const ORNAMENTS: Record<OrnamentId, OrnamentDef> = {
  'stone-ribs': {
    id: 'stone-ribs', label: 'Stone ribs', group: 'vertical', seenOn: 'Woolworth Building, New York',
    blurb: 'Tall stone piers between the windows make the tower look even taller.',
    placement: 'bay-lines',
    template: [{ shape: 'box', position: [0, 0, 0.3], scale: [0.5, 1, 0.6], material: 'stone' }],
    amount: { low: { size: 1, every: 2 }, high: { size: 1.4, every: 1 } },
    decorative: false, stone: true, minDetailLevel: S,
  },
  'ibeam-mullions': {
    id: 'ibeam-mullions', label: 'I-beam mullions', group: 'vertical', seenOn: 'Seagram Building, New York',
    blurb: 'Slim bronze I-beams on the glass. Fun fact: Mies added them to show the steel hidden inside!',
    placement: 'bay-lines',
    template: [
      { shape: 'box', position: [0, 0, 0.15], scale: [0.08, 1, 0.3], material: 'accent' },
      { shape: 'box', position: [0, 0, 0.3], scale: [0.25, 1, 0.05], material: 'accent' },
    ],
    amount: { low: { size: 1, every: 2 }, high: { size: 1, every: 1 } },
    decorative: false, stone: false, minDetailLevel: S,
  },
  'concrete-fins': {
    id: 'concrete-fins', label: 'Concrete fins', group: 'vertical', seenOn: 'Barbican towers, London',
    blurb: 'Deep concrete fins shade the windows from the sun and give the wall a bold, ribbed look.',
    placement: 'bay-lines',
    template: [{ shape: 'box', position: [0, 0, 0.6], scale: [0.6, 1, 1.2], material: 'concrete' }],
    amount: { low: { size: 1, every: 1 }, high: { size: 1.5, every: 1 } },
    decorative: false, stone: false, minDetailLevel: S,
  },
  'belt-courses': {
    id: 'belt-courses', label: 'Belt courses', group: 'horizontal', seenOn: 'Flatiron Building, New York',
    blurb: 'Stone bands that wrap the tower every few floors, like belts.',
    placement: 'floor-rings',
    template: [{ shape: 'plan', position: [0, 0, 0], scale: [1, 0.6, 0.35], material: 'stone' }],
    amount: { low: { size: 1, every: 10 }, high: { size: 1.3, every: 5 } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'setback-cornices': {
    id: 'setback-cornices', label: 'Setback cornices', group: 'horizontal', seenOn: 'Empire State Building, New York',
    blurb: 'A projecting stone ledge at every step and at the roof.',
    placement: 'setback-faces',
    template: [
      { shape: 'plan', position: [0, 0, 0], scale: [1, 0.8, 0.8], material: 'stone' },
      { shape: 'plan', position: [0, 0.7, 0], scale: [1, 0.3, 1.1], material: 'stone' },
    ],
    amount: { low: { size: 1, count: 1, levels: 'all' }, high: { size: 1.4, count: 2, levels: 'all' } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'sunburst-bands': {
    id: 'sunburst-bands', label: 'Sunburst bands', group: 'horizontal', seenOn: 'Chrysler Building, New York',
    blurb: 'Fans of rays, like a rising sun — an Art Deco favourite.',
    placement: 'setback-faces',
    template: [
      { shape: 'wedge', position: [-1.2, 1, 0.2], scale: [0.5, 2, 0.4], rotation: [0, 0, 0.6], material: 'accent' },
      { shape: 'wedge', position: [0, 1.2, 0.2], scale: [0.5, 2.4, 0.4], material: 'accent' },
      { shape: 'wedge', position: [1.2, 1, 0.2], scale: [0.5, 2, 0.4], rotation: [0, 0, -0.6], material: 'accent' },
    ],
    amount: { low: { size: 1, count: 1, levels: 'all' }, high: { size: 1.3, count: 3, levels: 'all' } },
    decorative: true, stone: false, minDetailLevel: S,
  },
  'ribbon-bands': {
    id: 'ribbon-bands', label: 'Ribbon bands', group: 'horizontal', seenOn: 'Shanghai Tower',
    blurb: 'Thin sunshades at every floor that follow the tower\'s curve and twist.',
    placement: 'floor-rings',
    template: [{ shape: 'plan', position: [0, 0, 0], scale: [1, 0.25, 0.6], material: 'accent' }],
    amount: { low: { size: 1, every: 1 }, high: { size: 1.6, every: 1 } },
    decorative: false, stone: false, minDetailLevel: S,
  },
  pinnacles: {
    id: 'pinnacles', label: 'Pinnacles', group: 'corners', seenOn: 'Woolworth Building, New York',
    blurb: 'Pointed stone spikes on the corners, straight from Gothic cathedrals.',
    placement: 'setback-corners',
    template: [
      { shape: 'box', position: [0, 1, 0], scale: [1.2, 2, 1.2], material: 'stone' },
      { shape: 'pyramid', position: [0, 3.5, 0], scale: [1.2, 3, 1.2], material: 'stone' },
    ],
    amount: { low: { size: 1, levels: 'all' }, high: { size: 1.4, levels: 'all', midFaces: true } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'deco-steps': {
    id: 'deco-steps', label: 'Deco step ornaments', group: 'corners', seenOn: 'Empire State Building, New York',
    blurb: 'Little stacked blocks at the corners that echo the tower\'s own setbacks.',
    placement: 'setback-corners',
    template: [
      { shape: 'box', position: [0, 0.6, 0], scale: [2, 1.2, 2], material: 'stone' },
      { shape: 'box', position: [0, 1.6, 0], scale: [1.4, 0.8, 1.4], material: 'stone' },
      { shape: 'box', position: [0, 2.3, 0], scale: [0.8, 0.6, 0.8], material: 'accent' },
    ],
    amount: { low: { size: 0.8, levels: 'top' }, high: { size: 1.2, levels: 'all' } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  gargoyles: {
    id: 'gargoyles', label: 'Gargoyles', group: 'corners', seenOn: 'Chrysler Building, New York',
    blurb: 'Steel eagle heads stare out from the corners — Chrysler\'s are copies of its car hood ornaments.',
    placement: 'setback-corners',
    template: [
      { shape: 'box', position: [0, 0, 1], scale: [0.8, 0.8, 2], material: 'steel' },
      { shape: 'wedge', position: [-0.8, 0.2, 0.8], scale: [1, 0.4, 1.4], rotation: [0, 0, 0.3], material: 'steel' },
      { shape: 'wedge', position: [0.8, 0.2, 0.8], scale: [1, 0.4, 1.4], rotation: [0, Math.PI, 0.3], material: 'steel' },
      { shape: 'cone', position: [0, 0, 2.3], scale: [0.4, 0.8, 0.4], rotation: [Math.PI / 2, 0, 0], material: 'gold' },
    ],
    amount: { low: { size: 1, levels: 'top' }, high: { size: 1.3, levels: 'all' } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  urns: {
    id: 'urns', label: 'Urns and finials', group: 'corners', seenOn: 'Woolworth Building, New York',
    blurb: 'Carved vases and balls lined up along the roof edge.',
    placement: 'roof-edge',
    template: [
      { shape: 'cylinder', position: [0, 0.3, 0], scale: [0.6, 0.6, 0.6], material: 'stone' },
      { shape: 'sphere', position: [0, 1, 0], scale: [0.9, 0.9, 0.9], material: 'stone' },
    ],
    amount: { low: { size: 1, count: 3, levels: 'top' }, high: { size: 1.2, count: 6, levels: 'all' } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'rusticated-base': {
    id: 'rusticated-base', label: 'Rusticated stone base', group: 'base', seenOn: 'Chicago Board of Trade',
    blurb: 'Big rough stone blocks with deep gaps make the base look strong enough to carry everything above.',
    placement: 'base-floors',
    template: [{ shape: 'plan', position: [0, 0, 0], scale: [1, 0.8, 0.3], material: 'stone' }],
    amount: { low: { size: 1, floors: 2 }, high: { size: 1.3, floors: 3 } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'arched-entry': {
    id: 'arched-entry', label: 'Arched entry', group: 'base', seenOn: 'Woolworth Building, New York',
    blurb: 'A grand arched doorway welcomes people in.',
    placement: 'entry',
    template: [
      { shape: 'box', position: [-2.4, 2.5, 0.5], scale: [0.8, 5, 1], material: 'stone' },
      { shape: 'box', position: [2.4, 2.5, 0.5], scale: [0.8, 5, 1], material: 'stone' },
      { shape: 'arch', position: [0, 6.4, 0.5], scale: [5.6, 2.8, 1], material: 'stone' },
    ],
    amount: { low: { size: 1, count: 1 }, high: { size: 1.1, count: 3 } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'accent-ties': {
    id: 'accent-ties', label: 'Accent ties', group: 'structure', seenOn: 'Centre Pompidou, Paris',
    blurb: 'Brightly painted straps that show where the structure ties the tower together.',
    placement: 'floor-rings',
    template: [{ shape: 'plan', position: [0, 0, 0], scale: [1, 0.5, 0.8], material: 'accent' }],
    amount: { low: { size: 1, every: 10 }, high: { size: 1.5, every: 10 } },
    decorative: false, stone: false, minDetailLevel: S,
  },
};
