import { COEFFICIENTS } from '../catalog/coefficients';
import { FLOOR_HEIGHT } from '../geometry';
import type { Analysis, Design, Material, SchedulePhaseId } from '../types';

export const STAGE_COUNT = 6;
/** A concrete core climbs this many floors ahead of the frame. */
export const CORE_LEAD_FLOORS = 3;
/** How far the frame runs ahead of the poured floor slabs, by material. */
export const SLAB_LAG_FLOORS: Record<Material, number> = { steel: 4, composite: 2, concrete: 0 };
/** The crane is lifted up the core in jumps of this many floors. */
export const CRANE_JUMP_FLOORS = 10;

export type VehicleId = 'excavator' | 'dump-truck' | 'pile-rig' | 'mixer' | 'flatbed';

export interface ConstructionStage {
  id: SchedulePhaseId;
  label: string;
  startDay: number;
  endDay: number;
  /** Dollars spent during this stage. */
  cost: number;
}

/** Where the building site stands at one moment. Heights are metres above ground. */
export interface ConstructionState {
  /** 0..1 of the hole dug. */
  dig: number;
  /** 0..1 of the foundation built. */
  foundation: number;
  isolators: boolean;
  coreTop: number;
  frameTop: number;
  slabTop: number;
  /** The finished tower is shown below this height. */
  facadeTop: number;
  /** 0..1: crown, ornaments, amenities and the tuned mass damper. */
  crown: number;
  /** Floors whose lights have come on. */
  litFloors: number;
  crane: { top: number; up: boolean };
  vehicles: VehicleId[];
  day: number;
  spent: number;
}

/**
 * A concrete core for the core-based systems and any concrete or composite tower; a braced steel core
 * for a steel rigid frame or steel bundled tube.
 */
export function coreKind(design: Design): 'concrete' | 'steel' {
  return design.material === 'steel' && (design.system === 'rigid-frame' || design.system === 'bundled-tube') ? 'steel' : 'concrete';
}

/** Floors carrying outrigger trusses: about ⅓ and ⅔ of the height, or one halfway up below 30 floors. */
export function outriggerFloors(floors: number): number[] {
  return floors < 30 ? [Math.round(floors / 2)] : [Math.round(floors / 3), Math.round((2 * floors) / 3)];
}

/** The six construction stages, in order, with their days and their share of the cost. */
export function constructionStages(design: Design, analysis: Analysis): ConstructionStage[] {
  const { phases } = analysis.schedule;
  const c = analysis.cost;
  const days = (id: SchedulePhaseId) => phases.find((p) => p.id === id)!.days;
  const ground = c.foundation + c.isolation;
  const digShare = days('excavation') / Math.max(1, days('excavation') + days('foundation'));
  const costs: Record<SchedulePhaseId, number> = {
    excavation: ground * digShare,
    foundation: ground * (1 - digShare),
    structure: c.structure + c.elevators + (design.damping === 'viscous' ? c.damping : 0),
    facade: c.facade,
    crown: c.amenities + (design.damping === 'tmd' ? c.damping : 0),
    fitout: 0,
  };
  // Interiors and systems; computed as the remainder so the stages always add up to the total exactly.
  costs.fitout = c.total - (costs.excavation + costs.foundation + costs.structure + costs.facade + costs.crown);
  let day = 0;
  return phases.map((p) => {
    const startDay = day;
    day = Math.max(day, p.startDay + p.days);
    return { id: p.id, label: p.label, startDay, endDay: day, cost: costs[p.id] };
  });
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Where everything stands `t` (0..1) of the way through `stage` (0..5). */
export function constructionState(design: Design, analysis: Analysis, stage: number, t: number): ConstructionState {
  const n = design.floors;
  const at = (s: number) => (stage > s ? 1 : stage < s ? 0 : clamp01(t));
  const lead = coreKind(design) === 'concrete' ? CORE_LEAD_FLOORS : 0;
  const slabLag = SLAB_LAG_FLOORS[design.material];
  const facadeLag = COEFFICIENTS.schedule.facadeLagFloors;

  // Stage 3 (index 2): the core climbs, the frame follows `lead` floors behind, slabs and facade further behind.
  const rise = at(2) * (n + lead);
  const core = Math.min(n, rise);
  const frame = Math.min(n, Math.max(0, rise - lead));
  // Stage 4 (index 3): slabs catch up in the first half, the facade over the whole stage.
  const close = at(3);
  const slab = close > 0 ? n - slabLag * (1 - Math.min(1, 2 * close)) : Math.max(0, frame - slabLag);
  const facade = close > 0 ? n - Math.min(facadeLag, n) * (1 - close) : Math.max(0, frame - facadeLag);

  // Stage 2 (index 1): the foundation, then isolator pads near the end when chosen.
  const found = at(1);
  const foundation = design.baseIsolation ? Math.min(1, found / 0.8) : found;
  const isolators = design.baseIsolation && found >= 0.85;

  // The crane goes up with the frame in 10-floor jumps, and comes down late in the crown stage.
  const crownT = at(4);
  const craneFloors = Math.min(Math.ceil((frame + 2) / CRANE_JUMP_FLOORS) * CRANE_JUMP_FLOORS, n + 2);
  const craneUp = stage >= 2 && (stage < 4 || (stage === 4 && crownT < 0.9));
  const lowering = stage === 4 ? clamp01((crownT - 0.6) / 0.3) : 0;
  const crane = { top: craneUp ? craneFloors * FLOOR_HEIGHT * (1 - lowering) : 0, up: craneUp };

  const stages = constructionStages(design, analysis);
  const current = stages[Math.min(stage, STAGE_COUNT - 1)];
  const tt = clamp01(t);
  const day = Math.round(current.startDay + (current.endDay - current.startDay) * tt);
  const spent = stages.slice(0, stage).reduce((s, x) => s + x.cost, 0) + current.cost * tt;

  return {
    dig: at(0),
    foundation,
    isolators,
    coreTop: core * FLOOR_HEIGHT,
    frameTop: frame * FLOOR_HEIGHT,
    slabTop: Math.min(frame, slab) * FLOOR_HEIGHT,
    facadeTop: Math.min(frame, slab, facade) * FLOOR_HEIGHT,
    crown: crownT,
    litFloors: Math.round(at(5) * n),
    crane,
    vehicles: vehiclesFor(design, stage, tt),
    day,
    spent,
  };
}

function vehiclesFor(design: Design, stage: number, t: number): VehicleId[] {
  switch (stage) {
    case 0:
      return ['excavator', 'dump-truck'];
    case 1:
      return design.foundation === 'piles' || design.foundation === 'caissons' ? ['pile-rig', 'mixer'] : ['mixer'];
    case 2:
      return design.material === 'concrete' ? ['mixer'] : ['flatbed', 'mixer'];
    case 3:
      return ['flatbed'];
    case 4:
      return [];
    default:
      return t < 0.5 ? ['flatbed'] : [];
  }
}
