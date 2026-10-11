/**
 * Ids for the expandable look catalogs. Add an id here, then its entry in the matching
 * catalog file — the compiler refuses to build until every id has an entry.
 */
export const CROWN_IDS = [
  'flat', 'cornice', 'concrete-cap', 'stepped', 'pointed', 'gothic-pinnacles', 'flying-buttresses',
  'deco-arches', 'mooring-mast', 'spire', 'split-pediment', 'lattice-mast', 'twin-antennas', 'gold-obelisk',
  'sloped', 'mansard', 'dome-lantern', 'clock-tower', 'star-spire', 'pagoda', 'ringed-pinnacle',
  'stepped-needle', 'sky-bridge-arch', 'open-frame', 'glass-dome', 'glass-shards', 'wind-turbines', 'roof-forest',
] as const;
export type CrownId = (typeof CROWN_IDS)[number];

export const WINDOW_PATTERN_IDS = ['flush-grid', 'chicago', 'arched', 'punched', 'exposed-frame', 'diamond'] as const;
export type WindowPatternId = (typeof WINDOW_PATTERN_IDS)[number];

export const SPANDREL_IDS = ['plain', 'chevron', 'stripes'] as const;
export type SpandrelId = (typeof SPANDREL_IDS)[number];

export const ORNAMENT_IDS = [
  'stone-ribs', 'ibeam-mullions', 'concrete-fins', 'belt-courses', 'setback-cornices', 'sunburst-bands',
  'ribbon-bands', 'pinnacles', 'deco-steps', 'gargoyles', 'urns', 'rusticated-base', 'arched-entry', 'accent-ties',
] as const;
export type OrnamentId = (typeof ORNAMENT_IDS)[number];
