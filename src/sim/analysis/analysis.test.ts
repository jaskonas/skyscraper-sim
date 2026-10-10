import { describe, expect, it } from 'vitest';
import { designFor } from '../testUtils';
import { SITE_IDS } from '../sites';
import type { Design, ElevatorZoning, PlanShape, SiteId, StructuralSystem } from '../types';
import { analyze } from './index';

const run = (siteId: SiteId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor(siteId, patch);
  return analyze(site, design);
};
const status = (a: ReturnType<typeof analyze>, id: string) => a.checks.find((c) => c.id === id)!.status;

describe('wind', () => {
  const tall = { floors: 80, plateWidth: 30, shape: 'square' as const };

  it('dampers reduce felt sway but not structural drift', () => {
    const none = run('new-york', tall);
    const tmd = run('new-york', { ...tall, damping: 'tmd' });
    expect(tmd.wind.accelMg).toBeLessThan(none.wind.accelMg * 0.6);
    expect(tmd.wind.driftRatio).toBeCloseTo(none.wind.driftRatio);
  });

  it('round, twisted, tapered and stepped towers sway less than a square box', () => {
    const box = run('new-york', tall).wind.driftRatio;
    expect(run('new-york', { ...tall, shape: 'circle' }).wind.driftRatio).toBeLessThan(box);
    expect(run('new-york', { ...tall, twist: 120 }).wind.driftRatio).toBeLessThan(box);
    expect(run('new-york', { ...tall, taper: 0.3 }).wind.driftRatio).toBeLessThan(box);
    expect(run('new-york', { ...tall, setbacks: 'wedding-cake' }).wind.driftRatio).toBeLessThan(box);
  });

  it('a rigid frame is far too floppy for a tall tower', () => {
    const frame = run('chicago', { floors: 80, shape: 'square', plateWidth: 50, system: 'rigid-frame' });
    const outrigger = run('chicago', { floors: 80, shape: 'square', plateWidth: 50, system: 'core-outrigger' });
    expect(frame.wind.driftRatio).toBeGreaterThan(outrigger.wind.driftRatio * 2);
  });

  it('a super-slender square tower fails in wind but a round damped one passes', () => {
    expect(status(run('new-york', tall), 'windStrength')).toBe('fail');
    const fixed = run('new-york', { ...tall, shape: 'circle', material: 'composite', damping: 'tmd' });
    expect(status(fixed, 'windStrength')).toBe('pass');
    expect(status(fixed, 'windComfort')).toBe('pass');
  });

  it('homes have a stricter comfort limit than offices', () => {
    const office = run('new-york', { useMix: { retail: 0, office: 100, hotel: 0, residential: 0 } });
    const homes = run('new-york', { useMix: { retail: 0, office: 0, hotel: 0, residential: 100 } });
    expect(homes.wind.comfortLimitMg).toBeLessThan(office.wind.comfortLimitMg);
  });
});

describe('earthquake', () => {
  const tokyo50 = { floors: 50, material: 'steel' as const, foundation: 'piles' as const };

  it('base isolation makes a damaged Tokyo tower fully operational', () => {
    expect(run('tokyo', tokyo50).seismic.outcome).toBe('damaged');
    expect(run('tokyo', { ...tokyo50, baseIsolation: true }).seismic.outcome).toBe('operational');
  });

  it('heavy masonry attracts more earthquake force', () => {
    const glass = run('tokyo', { ...tokyo50, facade: 'glass' });
    const stone = run('tokyo', { ...tokyo50, facade: 'masonry' });
    expect(stone.seismic.ratio).toBeGreaterThan(glass.seismic.ratio);
  });

  it('a short heavy masonry building fails in Tokyo but is fine in Chicago', () => {
    const patch = { floors: 15, facade: 'masonry' as const, system: 'rigid-frame' as const, foundation: 'raft' as const };
    expect(run('tokyo', patch).seismic.outcome).toBe('fails');
    expect(run('chicago', { ...patch, foundation: 'caissons' }).seismic.outcome).toBe('operational');
  });

  it('uses the period ≈ floors ÷ 10 rule of thumb', () => {
    expect(run('tokyo', { floors: 40 }).seismic.periodS).toBeCloseTo(4);
  });
});

describe('foundation', () => {
  it('a shallow mat fails on Shanghai clay at 60 floors; piles pass', () => {
    expect(status(run('shanghai', { floors: 60, foundation: 'mat' }), 'foundation')).toBe('fail');
    expect(status(run('shanghai', { floors: 60, foundation: 'piles' }), 'foundation')).toBe('pass');
  });

  it('caissons carry a 100-floor tower in Chicago; a mat does not', () => {
    const patch = { floors: 100, shape: 'square' as const, plateWidth: 60 };
    expect(status(run('chicago', { ...patch, foundation: 'caissons' }), 'foundation')).toBe('pass');
    expect(status(run('chicago', { ...patch, foundation: 'mat' }), 'foundation')).toBe('fail');
  });

  it('a mat is fine on Manhattan bedrock', () => {
    expect(status(run('new-york', { floors: 60, foundation: 'mat' }), 'foundation')).toBe('pass');
  });
});

describe('elevators', () => {
  it('more cars mean shorter waits', () => {
    expect(run('new-york', { elevators: 12 }).elevators.avgWaitS).toBeLessThan(run('new-york', { elevators: 4 }).elevators.avgWaitS);
  });

  it('zoning helps a tall tower', () => {
    const patch = { floors: 80, plateWidth: 30, elevators: 24 };
    const single = run('new-york', { ...patch, zoning: 'single' }).elevators.avgWaitS;
    const zoned = run('new-york', { ...patch, zoning: 'sky-lobby' }).elevators.avgWaitS;
    expect(zoned).toBeLessThan(single);
  });

  it('caps useful cars per zone', () => {
    const a = run('new-york', { elevators: 60, zoning: 'single' });
    expect(a.elevators.effectiveCars).toBe(a.elevators.maxUsefulCars);
  });
});

describe('energy, cost, schedule', () => {
  it('lots of glass costs energy in Chicago winters; green systems save it', () => {
    const glass = run('chicago', { facade: 'glass', windowRatio: 0.9 }).energy.euiKWhPerM2;
    const stone = run('chicago', { facade: 'masonry', windowRatio: 0.4 }).energy.euiKWhPerM2;
    expect(stone).toBeLessThan(glass);
    const green = run('chicago', { facade: 'masonry', windowRatio: 0.4, systemsGrade: 'green' }).energy.euiKWhPerM2;
    expect(green).toBeLessThan(stone);
  });

  it('steel structure costs more than concrete but builds faster', () => {
    const steel = run('chicago', { material: 'steel' });
    const concrete = run('chicago', { material: 'concrete' });
    expect(steel.cost.structure).toBeGreaterThan(concrete.cost.structure);
    expect(steel.schedule.totalDays).toBeLessThan(concrete.schedule.totalDays);
  });

  it('a rooftop pool adds cost and weight', () => {
    const plain = run('chicago');
    const pool = run('chicago', { amenities: ['pool'] });
    expect(pool.cost.total).toBeGreaterThan(plain.cost.total);
    expect(pool.weightKN).toBeGreaterThan(plain.weightKN);
  });

  it('the same tower is cheaper in Shanghai than New York', () => {
    expect(run('shanghai', { foundation: 'piles' }).cost.total).toBeLessThan(run('new-york', { foundation: 'piles' }).cost.total);
  });

  it('cost parts add up to the total', () => {
    const c = run('tokyo').cost;
    const sum = c.structure + c.foundation + c.facade + c.interiors + c.systems + c.elevators + c.damping + c.isolation + c.amenities;
    expect(sum).toBeCloseTo(c.total);
  });

  it('schedule phases start in order and the total covers them all', () => {
    const s = run('chicago').schedule;
    expect(s.phases.map((p) => p.id)).toEqual(['excavation', 'foundation', 'structure', 'facade', 'crown', 'fitout']);
    for (const p of s.phases) expect(p.startDay + p.days).toBeLessThanOrEqual(s.totalDays);
  });
});

describe('robustness', () => {
  it('returns finite numbers for every extreme combination', () => {
    const shapes: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
    const systems: StructuralSystem[] = ['rigid-frame', 'framed-tube', 'core-outrigger', 'bundled-tube', 'diagrid', 'buttressed-core'];
    const zonings: ElevatorZoning[] = ['single', 'two-zone', 'sky-lobby'];
    for (const siteId of SITE_IDS)
      for (const shape of shapes)
        for (const system of systems)
          for (const zoning of zonings)
            for (const floors of [5, 150])
              for (const elevators of [2, 120]) {
                const a = run(siteId, { shape, system, zoning, floors, elevators, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15, plateDepth: 15 });
                const nums = [a.heightM, a.gfa, a.weightKN, a.wind.driftRatio, a.wind.accelMg, a.seismic.ratio, a.foundation.utilization, a.elevators.avgWaitS, a.energy.euiKWhPerM2, a.cost.total, a.schedule.totalDays];
                for (const n of nums) expect(Number.isFinite(n), `${siteId}/${shape}/${system}/${zoning}/${floors}/${elevators}`).toBe(true);
                expect(a.checks).toHaveLength(6);
              }
  });
});
