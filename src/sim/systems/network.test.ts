import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { FLOOR_HEIGHT, crownHeight, floorSlices } from '../geometry';
import { rotateYXZ, type Vec3 } from '../parts';
import { designFor } from '../testUtils';
import type { Design } from '../types';
import { insidePlan } from '../../scene/structure/planMath';
import { systemFacts, SYSTEM_IDS, type SystemId } from './facts';
import { systemNetwork, type FlowLine, type SystemNetwork } from './network';

const setup = (patch: Partial<Design>) => {
  const { site, design } = designFor('chicago', patch);
  return { site, design, analysis: analyze(site, design) };
};
const net = (patch: Partial<Design>, s: SystemId): SystemNetwork & { design: Design } => {
  const x = setup(patch);
  return { ...systemNetwork(x.site, x.design, x.analysis, s), design: x.design };
};
const pulses = (n: SystemNetwork) => n.lines.reduce((t, l) => t + l.pulses, 0);
const ys = (l: FlowLine) => l.points.map((p) => p[1]);

describe('system networks', () => {
  const extremes: Partial<Design>[] = [
    { floors: 5, shape: 'square' },
    { floors: 30, shape: 'circle' },
    { floors: 150, shape: 'triangle', plateWidth: 50 },
    { floors: 90, shape: 'square', twist: 90, setbacks: 'wedding-cake', taper: 0.3 },
  ];
  it.each(SYSTEM_IDS.map((s) => [s]))('%s: finite, inside the tower, and within the pulse cap on every extreme', (s) => {
    for (const patch of extremes) {
      const n = net(patch, s);
      const d = n.design;
      const slices = floorSlices(d);
      const top = d.floors * FLOOR_HEIGHT + crownHeight(d.crown, d.floors * FLOOR_HEIGHT) + 2;
      expect(pulses(n)).toBeLessThanOrEqual(400);
      for (const l of n.lines) {
        expect(l.points.length).toBeGreaterThanOrEqual(2);
        for (const p of l.points) {
          expect(p.every(Number.isFinite)).toBe(true);
          expect(p[1]).toBeGreaterThanOrEqual(-6);
          expect(p[1]).toBeLessThanOrEqual(top);
        }
        if (l.kind === 'branch') {
          const s = slices[l.floor!];
          for (const p of l.points) {
            const [x, , z] = rotateYXZ(p as Vec3, [0, -s.rotation, 0]);
            expect(insidePlan(d.shape, s.width, s.depth, x, z, 0.3), `${s.index}`).toBe(true);
          }
        }
      }
    }
  });

  it('power rises from the street, with a substation on each plant floor; turbines and solar only when chosen', () => {
    const n = net({ floors: 92 }, 'power');
    expect(n.equipment.filter((p) => p.material === 'light').length).toBe(systemFacts(n.design, setup({ floors: 92 }).analysis).substations);
    const riser = n.lines.find((l) => l.kind === 'riser')!;
    expect(ys(riser)[0]).toBeLessThan(ys(riser).at(-1)!);
    expect(n.lines.some((l) => l.kind === 'feed' && l.points[0][2] > 20)).toBe(true);
    const turbines = net({ floors: 60, crown: 'wind-turbines' }, 'power');
    expect(turbines.lines.some((l) => l.kind === 'source' && ys(l)[0] > 240)).toBe(true);
    expect(net({ floors: 60, crown: 'flat' }, 'power').lines.some((l) => l.kind === 'source')).toBe(false);
    expect(net({ floors: 60, systemsGrade: 'green' }, 'power').lines.some((l) => l.kind === 'source')).toBe(true);
  });

  it('water: pumps lift to tanks, gravity feeds down; floors 0–5 from the city main', () => {
    const n = net({ floors: 92 }, 'water');
    const up = n.lines.filter((l) => l.kind === 'riser' && ys(l)[0] < ys(l).at(-1)!);
    const down = n.lines.filter((l) => l.kind === 'riser' && ys(l)[0] > ys(l).at(-1)!);
    expect(up.length).toBe(4 + 1);
    expect(down.length).toBe(4);
    const low = n.lines.filter((l) => l.kind === 'branch' && l.floor! <= 5);
    expect(low.length).toBe(6);
    expect(net({ floors: 60, amenities: ['pool'] }, 'water').lines.some((l) => l.kind === 'loop')).toBe(true);
    expect(net({ floors: 60, amenities: [] }, 'water').lines.some((l) => l.kind === 'loop')).toBe(false);
    expect(net({ floors: 60, systemsGrade: 'green' }, 'water').lines.some((l) => l.kind === 'grey')).toBe(true);
    expect(net({ floors: 60, systemsGrade: 'standard' }, 'water').lines.some((l) => l.kind === 'grey')).toBe(false);
  });

  it('waste falls the whole height and vents rise; grey water only on green', () => {
    const x = setup({ floors: 92 });
    const n = net({ floors: 92 }, 'waste');
    const stacks = n.lines.filter((l) => l.kind === 'riser');
    expect(stacks.length).toBe(systemFacts(x.design, x.analysis).stacks);
    for (const st of stacks) {
      const y = ys(st);
      for (let i = 1; i < y.length; i++) expect(y[i]).toBeLessThanOrEqual(y[i - 1] + 1e-9);
      expect(st.points.length).toBeGreaterThanOrEqual(2 + 3 * 2);
    }
    const vents = n.lines.filter((l) => l.kind === 'vent');
    expect(vents.length).toBe(stacks.length);
    for (const v of vents) expect(v.pulses).toBe(0);
    const g = net({ floors: 92, systemsGrade: 'green' }, 'waste').lines.find((l) => l.kind === 'grey')!;
    expect(g.points[0][1]).toBeLessThan(0);
  });

  it('elevators: one shaft per car, banked by zoning', () => {
    const single = net({ floors: 120, elevators: 24, zoning: 'single' }, 'elevators');
    expect(single.shafts.length).toBe(24);
    for (const s of single.shafts) expect(s.stops.length).toBe(120);
    const two = net({ floors: 120, elevators: 24, zoning: 'two-zone' }, 'elevators');
    const high = two.shafts.filter((s) => s.express);
    expect(high.length).toBe(12);
    for (const s of high) expect(s.stops.filter((y) => y > 0 && y < 60 * FLOOR_HEIGHT)).toEqual([]);
    const sky = net({ floors: 120, elevators: 24, zoning: 'sky-lobby' }, 'elevators');
    const shuttles = sky.shafts.filter((s) => s.express);
    expect(shuttles.length).toBe(4);
    for (const s of shuttles) expect(s.stops.length).toBe(2);
    const locals = sky.shafts.filter((s) => !s.express);
    expect(new Set(locals.map((s) => s.color)).size).toBe(3);
    for (const s of locals.filter((l) => l.stops[0] > 0)) expect([40, 80].map((f) => f * FLOOR_HEIGHT)).toContain(s.stops[0]);
  });

  it('air: handlers on plant floors, supply out and return back, heat wheels on better systems, fewer pulses on green', () => {
    const n = net({ floors: 92 }, 'air');
    expect(n.equipment.filter((p) => p.shape === 'box' && p.material === 'steel').length).toBe(3);
    expect(net({ floors: 30 }, 'air').equipment.filter((p) => p.shape === 'box' && p.material === 'steel').length).toBe(2);
    expect(n.lines.some((l) => l.kind === 'supply')).toBe(true);
    expect(n.lines.some((l) => l.kind === 'return')).toBe(true);
    expect(n.equipment.some((p) => p.shape === 'torus')).toBe(false);
    expect(net({ floors: 92, systemsGrade: 'efficient' }, 'air').equipment.some((p) => p.shape === 'torus')).toBe(true);
    expect(pulses(net({ floors: 92, systemsGrade: 'green' }, 'air'))).toBeLessThanOrEqual(0.65 * pulses(n));
  });
});
