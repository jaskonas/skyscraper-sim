import type { FoundationType, Material, SchedulePhaseId, StructuralSystem } from '../types';

/** Facts about one tower that the construction cards quote. */
export interface BuildFacts {
  floors: number;
  /** Days per floor of frame, one decimal. */
  daysPerFloor: number;
  structureDays: number;
  foundationDepth: number;
  shafts: number;
  /** Soil layers passed through, as words: "fill, soft blue clay and hardpan". */
  layers: string;
  reachesBedrock: boolean;
  isolators: number;
  outriggers: number[];
}

/** Words for a list: "a", "a and b", "a, b and c". */
export function listWords(items: (string | number)[]): string {
  const s = items.map(String);
  return s.length <= 1 ? (s[0] ?? '') : `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}`;
}

/** The general idea of each stage — the same for every tower. */
export const STAGE_TEXT: Record<SchedulePhaseId, { title: string; idea: string }> = {
  excavation: {
    title: 'Digging the hole',
    idea: 'Before anything goes up, diggers clear the lot and dig out the ground where the foundation and basements will go. Trucks carry the soil away load by load.',
  },
  foundation: {
    title: 'Laying the foundation',
    idea: "The foundation spreads the tower's enormous weight into the ground. Soft soil needs a foundation that reaches deeper, down to firmer layers or solid rock.",
  },
  structure: {
    title: 'Core and frame',
    idea: "The core goes up first. It's the tower's spine and holds the elevators and stairs. The frame follows, and the outside wall starts a few floors below the top.",
  },
  facade: {
    title: 'Closing in the facade',
    idea: 'Facade panels are hung on the frame from the bottom up, sealing the tower against wind and rain so work inside can begin.',
  },
  crown: {
    title: 'Crown and amenities',
    idea: 'The top of the tower goes on last: the crown, rooftop features and decoration. Then the crane that built everything is taken apart and lowered down.',
  },
  fitout: {
    title: 'Interiors and opening',
    idea: 'Inside, workers finish the floors, walls, elevators, wiring, pipes and air systems. When every system is tested, the lights come on and the tower opens.',
  },
};

/** How each structural system goes up. */
export const SYSTEM_BUILD: Record<StructuralSystem, (f: BuildFacts) => string> = {
  'rigid-frame': () => 'Your rigid frame is a grid of columns and beams across every floor, locked together at each joint.',
  'framed-tube': () => 'Your framed tube packs columns about 3 m apart around the outside, so the walls work together like one hollow tube.',
  'core-outrigger': (f) =>
    `The outrigger trusses at floor${f.outriggers.length > 1 ? 's' : ''} ${listWords(f.outriggers)} tie the core to the outside columns so the tower sways less.`,
  'bundled-tube': () => 'Your bundled tube is several tubes side by side, with rows of columns inside the floor as well as around it, like Willis Tower.',
  diagrid: () => 'Your diagrid wraps the outside in a lattice of diagonals with no upright edge columns; each diamond spans 6 floors.',
  'buttressed-core': () => 'Your buttressed core has three concrete wings reaching out from the middle, like Burj Khalifa, bracing it in every direction.',
};

/** How each material goes up, with the tower's own pace. */
export const MATERIAL_BUILD: Record<Material, (f: BuildFacts) => string> = {
  steel: (f) =>
    `Your steel frame goes up about ${f.daysPerFloor} days a floor: ${f.floors} floors in ${f.structureDays} days. The steel runs a few floors ahead of the concrete floors poured onto it.`,
  concrete: (f) =>
    `Your concrete is poured into moulds floor by floor, about ${f.daysPerFloor} days a floor: ${f.floors} floors in ${f.structureDays} days.`,
  composite: (f) =>
    `Your composite frame puts up steel first, then pours concrete around it, about ${f.daysPerFloor} days a floor: ${f.floors} floors in ${f.structureDays} days.`,
};

/** How each foundation is built, in the tower's own soil. */
export const FOUNDATION_BUILD: Record<FoundationType, (f: BuildFacts) => string> = {
  mat: (f) => `Your shallow mat is one thick concrete slab poured in the bottom of the hole, ${f.foundationDepth} m down.`,
  raft: (f) => `Your raft is a deep, thick slab with basements, ${f.foundationDepth} m down, spreading the weight over the whole lot.`,
  piles: (f) =>
    `${f.shafts} piles are driven ${f.foundationDepth} m down through ${f.layers}${f.reachesBedrock ? ' to bedrock' : ''}; friction holds them in the soil.`,
  caissons: (f) =>
    `${f.shafts} caissons are drilled ${f.foundationDepth} m down through ${f.layers}${f.reachesBedrock ? ' to bedrock' : ''} and filled with concrete.`,
};

export const ISOLATION_BUILD = (f: BuildFacts) =>
  `Then ${f.isolators} rubber pads go on top: base isolation lets the ground shake under the tower instead of through it.`;

export const DAMPING_BUILD = {
  tmd: 'A tuned mass damper, a huge weight hung on cables near the top, is installed to sway against the wind.',
  viscous: 'Viscous dampers, giant shock absorbers, are built into the frame every 5 floors.',
} as const;

export const EXPOSED_BUILD = 'The giant X-braces on the outside go up with the frame.';
