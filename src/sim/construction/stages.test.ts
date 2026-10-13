import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { FLOOR_HEIGHT } from '../geometry';
import { designFor } from '../testUtils';
import type { Design, Material, StructuralSystem } from '../types';
import {
  CRANE_JUMP_FLOORS,
  STAGE_COUNT,
  constructionStages,
  constructionState,
  coreKind,
  outriggerFloors,
  type ConstructionState,
} from './stages';

const SYSTEMS: StructuralSystem[] = ['rigid-frame', 'framed-tube', 'core-outrigger', 'bundled-tube', 'diagrid', 'buttressed-core'];
const MATERIALS: Material[] = ['steel', 'concrete', 'composite'];
const T = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

const setup = (patch: Partial<Design>) => {
  const { site, design } = designFor('chicago', patch);
  return { design, analysis: analyze(site, design) };
};
const HEIGHTS = ['coreTop', 'frameTop', 'slabTop', 'facadeTop', 'dig', 'foundation', 'crown', 'litFloors', 'day', 'spent'] as const;

describe('constructionStages', () => {
  it('has six stages in schedule order whose days run on to the total and whose costs add up to the total', () => {
    for (const patch of [{}, { damping: 'tmd' as const, baseIsolation: true }, { damping: 'viscous' as const, amenities: ['pool' as const] }]) {
      const { design, analysis } = setup(patch);
      const stages = constructionStages(design, analysis);
      expect(stages.map((s) => s.id)).toEqual(['excavation', 'foundation', 'structure', 'facade', 'crown', 'fitout']);
      expect(stages[0].startDay).toBe(0);
      for (let i = 1; i < STAGE_COUNT; i++) expect(stages[i].startDay).toBe(stages[i - 1].endDay);
      for (const s of stages) {
        expect(s.endDay).toBeGreaterThanOrEqual(s.startDay);
        expect(s.cost).toBeGreaterThanOrEqual(0);
      }
      expect(stages[STAGE_COUNT - 1].endDay).toBe(analysis.schedule.totalDays);
      expect(stages.reduce((sum, s) => sum + s.cost, 0)).toBeCloseTo(analysis.cost.total, 0);
    }
  });

  it('pays for the tuned mass damper with the crown and viscous dampers with the frame', () => {
    const tmd = setup({ damping: 'tmd' });
    const viscous = setup({ damping: 'viscous' });
    const crown = (x: typeof tmd) => constructionStages(x.design, x.analysis)[4].cost;
    const frame = (x: typeof tmd) => constructionStages(x.design, x.analysis)[2].cost;
    expect(crown(tmd)).toBeCloseTo(tmd.analysis.cost.amenities + tmd.analysis.cost.damping, 0);
    expect(frame(viscous)).toBeCloseTo(viscous.analysis.cost.structure + viscous.analysis.cost.elevators + viscous.analysis.cost.damping, 0);
  });
});

describe('constructionState', () => {
  const walk = (design: Design, analysis: ReturnType<typeof analyze>) => {
    const out: ConstructionState[] = [];
    for (let stage = 0; stage < STAGE_COUNT; stage++) for (const t of T) out.push(constructionState(design, analysis, stage, t));
    return out;
  };

  it('never goes backwards, and the core leads the frame, the frame the slabs and the slabs the facade', () => {
    for (const system of SYSTEMS)
      for (const material of MATERIALS)
        for (const floors of [5, 150]) {
          const { design, analysis } = setup({ system, material, floors });
          const states = walk(design, analysis);
          const label = `${system} ${material} ${floors}`;
          for (let i = 1; i < states.length; i++)
            for (const k of HEIGHTS) expect(states[i][k], `${label} ${k} @${i}`).toBeGreaterThanOrEqual(states[i - 1][k] - 1e-9);
          for (const s of states) {
            expect(s.coreTop, label).toBeGreaterThanOrEqual(s.frameTop - 1e-9);
            expect(s.frameTop, label).toBeGreaterThanOrEqual(s.slabTop - 1e-9);
            expect(s.slabTop, label).toBeGreaterThanOrEqual(s.facadeTop - 1e-9);
          }
        }
  });

  it('ends with the whole tower built, on the last day, with every dollar spent', () => {
    const { design, analysis } = setup({ floors: 60 });
    const end = constructionState(design, analysis, STAGE_COUNT - 1, 1);
    const roof = 60 * FLOOR_HEIGHT;
    expect([end.coreTop, end.frameTop, end.slabTop, end.facadeTop]).toEqual([roof, roof, roof, roof]);
    expect(end.crown).toBe(1);
    expect(end.litFloors).toBe(60);
    expect(end.day).toBe(analysis.schedule.totalDays);
    expect(end.spent).toBeCloseTo(analysis.cost.total, 0);
    expect(end.crane.up).toBe(false);
    expect(end.vehicles).toEqual([]);
  });

  it('starts the facade 8 floors behind the frame, and steel 4 floors ahead of its slabs', () => {
    const { design, analysis } = setup({ floors: 60, material: 'steel', system: 'core-outrigger' });
    const mid = constructionState(design, analysis, 2, 0.5);
    expect(mid.frameTop - mid.facadeTop).toBeCloseTo(8 * FLOOR_HEIGHT);
    expect(mid.frameTop - mid.slabTop).toBeCloseTo(4 * FLOOR_HEIGHT);
    expect(mid.coreTop - mid.frameTop).toBeCloseTo(3 * FLOOR_HEIGHT);
    const concrete = setup({ floors: 60, material: 'concrete' });
    const c = constructionState(concrete.design, concrete.analysis, 2, 0.5);
    expect(c.frameTop).toBe(c.slabTop);
  });

  it('gives a steel rigid frame or bundled tube a steel core that rises with the frame', () => {
    expect(coreKind(setup({ material: 'steel', system: 'rigid-frame' }).design)).toBe('steel');
    expect(coreKind(setup({ material: 'steel', system: 'bundled-tube' }).design)).toBe('steel');
    expect(coreKind(setup({ material: 'steel', system: 'diagrid' }).design)).toBe('concrete');
    expect(coreKind(setup({ material: 'concrete', system: 'rigid-frame' }).design)).toBe('concrete');
    const { design, analysis } = setup({ material: 'steel', system: 'rigid-frame', floors: 40 });
    const mid = constructionState(design, analysis, 2, 0.5);
    expect(mid.coreTop).toBe(mid.frameTop);
  });

  it('climbs the crane in 10-floor jumps, always above the frame, and takes it down in the crown stage', () => {
    const { design, analysis } = setup({ floors: 73 });
    expect(constructionState(design, analysis, 1, 1).crane.up).toBe(false);
    for (const t of T) {
      const s = constructionState(design, analysis, 2, t);
      expect(s.crane.up).toBe(true);
      expect(s.crane.top).toBeGreaterThanOrEqual(s.frameTop + 2 * FLOOR_HEIGHT);
      const floors = s.crane.top / FLOOR_HEIGHT;
      expect(floors % CRANE_JUMP_FLOORS === 0 || floors === 73 + 2).toBe(true);
    }
    expect(constructionState(design, analysis, 4, 0.5).crane.up).toBe(true);
    expect(constructionState(design, analysis, 4, 1).crane.up).toBe(false);
  });

  it('digs, then builds the foundation, then sets isolators only when chosen', () => {
    const { design, analysis } = setup({ baseIsolation: true });
    expect(constructionState(design, analysis, 0, 0.5).dig).toBeCloseTo(0.5);
    expect(constructionState(design, analysis, 0, 1).foundation).toBe(0);
    expect(constructionState(design, analysis, 1, 0.5).isolators).toBe(false);
    expect(constructionState(design, analysis, 1, 1).isolators).toBe(true);
    const plain = setup({ baseIsolation: false });
    expect(constructionState(plain.design, plain.analysis, 5, 1).isolators).toBe(false);
  });

  it('brings the right vehicles for the foundation and the frame', () => {
    const piles = setup({ foundation: 'piles' });
    expect(constructionState(piles.design, piles.analysis, 1, 0.5).vehicles).toContain('pile-rig');
    const mat = setup({ foundation: 'mat' });
    expect(constructionState(mat.design, mat.analysis, 1, 0.5).vehicles).not.toContain('pile-rig');
    const steel = setup({ material: 'steel' });
    expect(constructionState(steel.design, steel.analysis, 2, 0.5).vehicles).toContain('flatbed');
    const concrete = setup({ material: 'concrete' });
    expect(constructionState(concrete.design, concrete.analysis, 2, 0.5).vehicles).toEqual(['mixer']);
    expect(constructionState(steel.design, steel.analysis, 0, 0.5).vehicles).toEqual(['excavator', 'dump-truck']);
  });

  it('puts outriggers at about a third and two thirds of the height, or halfway on short towers', () => {
    expect(outriggerFloors(90)).toEqual([30, 60]);
    expect(outriggerFloors(20)).toEqual([10]);
  });
});
