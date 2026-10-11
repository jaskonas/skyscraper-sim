import type { CrownId, OrnamentId, SpandrelId, WindowPatternId } from './catalog/ids';

export type { CrownId, OrnamentId, SpandrelId, WindowPatternId } from './catalog/ids';
export type DetailLevel = 'standard' | 'advanced';
export type SiteId = 'new-york' | 'tokyo' | 'chicago' | 'shanghai';
export type PlanShape = 'square' | 'rectangle' | 'circle' | 'triangle';
export type Setbacks = 'none' | 'few' | 'wedding-cake';
export type StructuralSystem =
  | 'rigid-frame'
  | 'framed-tube'
  | 'core-outrigger'
  | 'bundled-tube'
  | 'diagrid'
  | 'buttressed-core';
export type Material = 'steel' | 'concrete' | 'composite';
export type Damping = 'none' | 'tmd' | 'viscous';
export type FoundationType = 'mat' | 'raft' | 'piles' | 'caissons';
export type FacadeType = 'glass' | 'masonry' | 'precast' | 'metal';
export type ElevatorZoning = 'single' | 'two-zone' | 'sky-lobby';
export type SystemsGrade = 'standard' | 'efficient' | 'green';
/** Stacking order is fixed bottom-to-top in this order. */
export type UseType = 'retail' | 'office' | 'hotel' | 'residential';
export type AmenityId = 'helipad' | 'pool' | 'observation-deck' | 'sky-garden';
export type StyleId =
  | 'chicago-school'
  | 'gothic-revival'
  | 'art-deco'
  | 'international'
  | 'brutalist'
  | 'postmodern'
  | 'high-tech'
  | 'neo-futurist';
export type Ornament = 'none' | 'low' | 'high';

export const USE_ORDER: UseType[] = ['retail', 'office', 'hotel', 'residential'];

export interface Palette {
  body: string;
  accent: string;
  glass: string;
}

export interface Design {
  /** The preset most recently applied. */
  style: StyleId;
  floors: number;
  /** Metres. Plate width (x). */
  plateWidth: number;
  /** Metres. Only used when shape is 'rectangle'; otherwise depth = width. */
  plateDepth: number;
  shape: PlanShape;
  setbacks: Setbacks;
  /** 0..0.6 — fraction the top floor is narrower than the base. */
  taper: number;
  /** Degrees of rotation from bottom to top, 0..120. */
  twist: number;
  crown: CrownId;
  /** Percentages per use; normalized when used. */
  useMix: Record<UseType, number>;
  system: StructuralSystem;
  material: Material;
  exposedStructure: boolean;
  damping: Damping;
  baseIsolation: boolean;
  foundation: FoundationType;
  facade: FacadeType;
  /** 0.2..0.95 */
  windowRatio: number;
  elevators: number;
  zoning: ElevatorZoning;
  systemsGrade: SystemsGrade;
  amenities: AmenityId[];
  palette: Palette;
  /** Ornament amount: how densely the chosen ornaments are placed. */
  ornament: Ornament;
  windowPattern: WindowPatternId;
  spandrel: SpandrelId;
  /** Chosen relief ornaments. */
  ornaments: OrnamentId[];
}

export interface SoilLayer {
  name: string;
  /** Metres. */
  thickness: number;
  color: string;
}

export interface FoundationSoilData {
  /** kPa the foundation type can safely carry on this site. */
  capacity: number;
  /** Settlement in cm when loaded to 100% of capacity. */
  settlementCm: number;
  /** Multiplier on the base foundation cost (deeper piles cost more). */
  costFactor: number;
  /** Depth in metres the foundation reaches (for drawing). */
  depth: number;
}

export interface Site {
  id: SiteId;
  name: string;
  city: string;
  challenge: string;
  fact: string;
  lookUp: string[];
  mapPos: { lat: number; lon: number };
  /** Metres. */
  lot: { width: number; depth: number };
  /** Design wind speed, m/s. */
  windSpeed: number;
  /** Design peak ground acceleration, in g. */
  seismicHazard: number;
  /** 0..1 relative heating and cooling demand. */
  climate: { heating: number; cooling: number };
  snow: boolean;
  soil: SoilLayer[];
  /** Metres below ground. */
  bedrockDepth: number;
  foundation: Record<FoundationType, FoundationSoilData>;
  costMultiplier: number;
  visuals: {
    sky: string;
    ground: string;
    neighborColors: string[];
    /** Min/max neighbor height in metres. */
    neighborHeight: [number, number];
    landmark: string;
  };
}

export type CheckStatus = 'pass' | 'marginal' | 'fail';
export type CheckId =
  | 'windStrength'
  | 'windComfort'
  | 'seismic'
  | 'foundation'
  | 'elevators'
  | 'energy';

export interface Check {
  id: CheckId;
  label: string;
  status: CheckStatus;
  value: number;
  limit: number;
  unit: string;
  message: string;
}

export type SchedulePhaseId =
  | 'excavation'
  | 'foundation'
  | 'structure'
  | 'facade'
  | 'crown'
  | 'fitout';

export interface SchedulePhase {
  id: SchedulePhaseId;
  label: string;
  /** Day the phase starts (phases overlap). */
  startDay: number;
  days: number;
}

export interface CostBreakdown {
  structure: number;
  foundation: number;
  facade: number;
  interiors: number;
  systems: number;
  elevators: number;
  damping: number;
  isolation: number;
  amenities: number;
  total: number;
}

export type SeismicOutcome = 'operational' | 'damaged' | 'fails';

export interface Analysis {
  /** Official height: roof plus crown, but not antennas. */
  heightM: number;
  /** To the very tip, antennas included. */
  tipHeightM: number;
  gfa: number;
  footprint: number;
  weightKN: number;
  slenderness: number;
  wind: { driftRatio: number; accelMg: number; comfortLimitMg: number };
  seismic: { periodS: number; ratio: number; outcome: SeismicOutcome };
  foundation: {
    pressureKPa: number;
    capacityKPa: number;
    utilization: number;
    settlementCm: number;
  };
  elevators: {
    population: number;
    peakDemand: number;
    avgWaitS: number;
    targetS: number;
    effectiveCars: number;
    maxUsefulCars: number;
  };
  energy: { euiKWhPerM2: number; annualCost: number };
  cost: CostBreakdown;
  schedule: { phases: SchedulePhase[]; totalDays: number };
  checks: Check[];
}
