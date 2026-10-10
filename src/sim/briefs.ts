import type { AmenityId, CheckId, CheckStatus, Design, Setbacks, SiteId, StyleId, UseType } from './types';

export type Requirement =
  | { kind: 'structural' }
  | { kind: 'minFloors'; value: number }
  | { kind: 'minHeight'; value: number }
  | { kind: 'maxBudget'; value: number }
  | { kind: 'minUseShare'; use: UseType; value: number }
  | { kind: 'check'; check: CheckId; atLeast: Exclude<CheckStatus, 'fail'> }
  | { kind: 'maxComfortMg'; value: number }
  | { kind: 'maxEui'; value: number }
  | { kind: 'maxDays'; value: number }
  | { kind: 'maxSettlementCm'; value: number }
  | { kind: 'style'; style: StyleId }
  | { kind: 'minSetbacks'; value: Exclude<Setbacks, 'none'> }
  | { kind: 'amenity'; id: AmenityId }
  | { kind: 'landmark' };

export interface Brief {
  id: string;
  siteId: SiteId;
  title: string;
  client: string;
  blurb: string;
  /** The engineering idea this brief is built to teach. */
  lesson: string;
  required: Requirement[];
  bonus: Requirement[];
  /** A design that earns at least one star — used by tests and as a hint source. */
  reference: Partial<Design>;
}

export const BRIEFS: Brief[] = [
  {
    id: 'ny-slender',
    siteId: 'new-york',
    title: 'Pencil Tower',
    client: 'Skyline Residences',
    blurb: 'Seventy floors of luxury apartments on a lot barely 30 m wide. Residents pay for views — not for seasickness.',
    lesson: 'Super-slender towers fight the wind with stiffness, rounded shapes, and dampers.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 70 },
      { kind: 'minUseShare', use: 'residential', value: 0.8 },
      { kind: 'check', check: 'windComfort', atLeast: 'pass' },
      { kind: 'maxBudget', value: 450_000_000 },
    ],
    bonus: [
      { kind: 'maxBudget', value: 350_000_000 },
      { kind: 'check', check: 'energy', atLeast: 'marginal' },
    ],
    reference: {
      floors: 72, plateWidth: 30, shape: 'circle', system: 'core-outrigger', material: 'composite', damping: 'tmd',
      useMix: { retail: 5, office: 0, hotel: 0, residential: 95 }, elevators: 10, zoning: 'single', facade: 'glass', windowRatio: 0.7,
    },
  },
  {
    id: 'ny-deco',
    siteId: 'new-york',
    title: 'Midtown Jewel',
    client: 'Gotham Trust Bank',
    blurb: 'An Art Deco office tower that fits in with its 1930s neighbors and steps back from the street.',
    lesson: 'Setbacks let light reach the street — and also calm the wind.',
    required: [
      { kind: 'structural' },
      { kind: 'style', style: 'art-deco' },
      { kind: 'minSetbacks', value: 'few' },
      { kind: 'minFloors', value: 50 },
      { kind: 'minUseShare', use: 'office', value: 0.7 },
      { kind: 'check', check: 'elevators', atLeast: 'pass' },
      { kind: 'maxBudget', value: 300_000_000 },
    ],
    bonus: [
      { kind: 'maxBudget', value: 220_000_000 },
      { kind: 'check', check: 'windComfort', atLeast: 'pass' },
    ],
    reference: {
      style: 'art-deco', shape: 'square', setbacks: 'wedding-cake', crown: 'spire', facade: 'masonry', windowRatio: 0.4, ornament: 'high',
      floors: 55, plateWidth: 30, material: 'concrete', system: 'core-outrigger', elevators: 12, zoning: 'two-zone',
      useMix: { retail: 10, office: 90, hotel: 0, residential: 0 },
    },
  },
  {
    id: 'tokyo-quake',
    siteId: 'tokyo',
    title: 'Open for Business',
    client: 'Kanto Electric Co.',
    blurb: 'Our headquarters must keep working the day after a major earthquake — the city will depend on us.',
    lesson: 'Base isolation and ductile, lightweight structures keep buildings working after quakes.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 45 },
      { kind: 'minUseShare', use: 'office', value: 0.7 },
      { kind: 'check', check: 'seismic', atLeast: 'pass' },
      { kind: 'maxBudget', value: 550_000_000 },
    ],
    bonus: [
      { kind: 'check', check: 'elevators', atLeast: 'pass' },
      { kind: 'maxBudget', value: 420_000_000 },
    ],
    reference: {
      floors: 48, plateWidth: 45, shape: 'square', material: 'steel', system: 'core-outrigger', baseIsolation: true,
      foundation: 'piles', elevators: 18, zoning: 'two-zone', useMix: { retail: 10, office: 90, hotel: 0, residential: 0 },
    },
  },
  {
    id: 'tokyo-landmark',
    siteId: 'tokyo',
    title: 'Tokyo Icon',
    client: 'Sakura Hotels',
    blurb: 'A hotel tower so distinctive it ends up on postcards — and it must survive the big one.',
    lesson: 'A striking shape can also be a smart one, if the structure keeps up.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 40 },
      { kind: 'minUseShare', use: 'hotel', value: 0.5 },
      { kind: 'landmark' },
      { kind: 'maxBudget', value: 550_000_000 },
    ],
    bonus: [
      { kind: 'amenity', id: 'observation-deck' },
      { kind: 'check', check: 'seismic', atLeast: 'pass' },
    ],
    reference: {
      style: 'neo-futurist', shape: 'circle', taper: 0.3, twist: 120, crown: 'pointed', facade: 'glass', windowRatio: 0.85,
      floors: 45, plateWidth: 50, material: 'steel', system: 'diagrid', foundation: 'piles', elevators: 12, zoning: 'two-zone',
      useMix: { retail: 10, office: 0, hotel: 90, residential: 0 },
    },
  },
  {
    id: 'chicago-lakefront',
    siteId: 'chicago',
    title: 'Windy City Tower',
    client: 'Lakeshore Capital',
    blurb: 'An 80-storey office tower by the lake. Our traders cannot have their coffee sloshing in a storm.',
    lesson: 'Tall towers in windy places need stiff tube structures, deep foundations, and dampers.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 80 },
      { kind: 'minUseShare', use: 'office', value: 0.8 },
      { kind: 'maxComfortMg', value: 10 },
      { kind: 'maxBudget', value: 1_300_000_000 },
    ],
    bonus: [
      { kind: 'check', check: 'elevators', atLeast: 'pass' },
      { kind: 'maxBudget', value: 1_000_000_000 },
    ],
    reference: {
      floors: 82, plateWidth: 50, shape: 'square', material: 'steel', system: 'bundled-tube', damping: 'tmd', foundation: 'caissons',
      elevators: 40, zoning: 'sky-lobby', useMix: { retail: 5, office: 95, hotel: 0, residential: 0 },
    },
  },
  {
    id: 'chicago-green',
    siteId: 'chicago',
    title: 'Green Loop',
    client: 'Prairie Living Co-op',
    blurb: 'Homes over offices, built to sip energy through long Chicago winters.',
    lesson: 'In cold climates, solid walls, fewer windows, and efficient systems save huge amounts of energy.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 40 },
      { kind: 'minUseShare', use: 'office', value: 0.3 },
      { kind: 'minUseShare', use: 'residential', value: 0.3 },
      { kind: 'maxEui', value: 180 },
      { kind: 'maxBudget', value: 380_000_000 },
    ],
    bonus: [
      { kind: 'amenity', id: 'sky-garden' },
      { kind: 'maxEui', value: 150 },
    ],
    reference: {
      floors: 42, plateWidth: 40, shape: 'square', material: 'concrete', system: 'core-outrigger', foundation: 'caissons',
      facade: 'precast', windowRatio: 0.4, systemsGrade: 'green', elevators: 10, zoning: 'single',
      useMix: { retail: 5, office: 45, hotel: 0, residential: 50 },
    },
  },
  {
    id: 'shanghai-supertall',
    siteId: 'shanghai',
    title: 'Cloud Piercer',
    client: 'Pudong Development Group',
    blurb: 'A supertall over 450 m with offices and a hotel — on ground that is mostly mud.',
    lesson: 'Deep piles hold up giants on soft ground; tapering and twisting tame typhoon winds.',
    required: [
      { kind: 'structural' },
      { kind: 'minHeight', value: 450 },
      { kind: 'minUseShare', use: 'office', value: 0.4 },
      { kind: 'minUseShare', use: 'hotel', value: 0.15 },
      { kind: 'maxSettlementCm', value: 10 },
      { kind: 'maxBudget', value: 1_100_000_000 },
    ],
    bonus: [
      { kind: 'check', check: 'elevators', atLeast: 'pass' },
      { kind: 'check', check: 'windComfort', atLeast: 'pass' },
    ],
    reference: {
      style: 'neo-futurist', shape: 'circle', taper: 0.3, twist: 120, crown: 'pointed', facade: 'glass', windowRatio: 0.85,
      floors: 110, plateWidth: 70, material: 'composite', system: 'buttressed-core', damping: 'tmd', foundation: 'piles',
      elevators: 56, zoning: 'sky-lobby', useMix: { retail: 5, office: 60, hotel: 25, residential: 10 },
    },
  },
  {
    id: 'shanghai-fast',
    siteId: 'shanghai',
    title: 'Fast Track',
    client: 'Huangpu Logistics',
    blurb: 'We need a 50-storey office tower open in about 15 months, on a tight budget.',
    lesson: 'Steel frames go up fastest; foundation choice drives both cost and schedule.',
    required: [
      { kind: 'structural' },
      { kind: 'minFloors', value: 50 },
      { kind: 'minUseShare', use: 'office', value: 0.8 },
      { kind: 'maxDays', value: 460 },
      { kind: 'maxBudget', value: 260_000_000 },
    ],
    bonus: [
      { kind: 'maxDays', value: 440 },
      { kind: 'check', check: 'energy', atLeast: 'marginal' },
    ],
    reference: {
      floors: 50, plateWidth: 40, shape: 'square', material: 'steel', system: 'core-outrigger', foundation: 'piles',
      elevators: 16, zoning: 'two-zone', useMix: { retail: 5, office: 95, hotel: 0, residential: 0 },
    },
  },
];

export function getBrief(id: string): Brief | undefined {
  return BRIEFS.find((b) => b.id === id);
}

export function briefsForSite(siteId: SiteId): Brief[] {
  return BRIEFS.filter((b) => b.siteId === siteId);
}
