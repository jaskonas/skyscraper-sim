import { describe, expect, it } from 'vitest';
import { designFor } from '../../sim/testUtils';
import type { PlanShape } from '../../sim/types';
import { floorRuns, perimeterPoints, planCorners, planFaces, setbackLevels } from './placement';

const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];

describe('placement', () => {
  it('puts four corners on a square, three on a triangle', () => {
    expect(planCorners('square', 40, 40)).toHaveLength(4);
    expect(planCorners('triangle', 40, 40)).toHaveLength(3);
    const c = planCorners('rectangle', 40, 20)[0];
    expect([c.x, c.z]).toEqual([20, 10]);
  });

  it('every face points outward, away from the centre', () => {
    for (const shape of SHAPES)
      for (const f of planFaces(shape, 40, 30)) {
        const out = Math.sin(f.yaw) * f.x + Math.cos(f.yaw) * f.z;
        expect(out, shape).toBeGreaterThan(0);
      }
  });

  it('spaces perimeter points roughly evenly around every shape', () => {
    for (const shape of SHAPES) {
      const pts = perimeterPoints(shape, 40, 40, 4);
      expect(pts.length, shape).toBeGreaterThan(20);
      expect(pts.length, shape).toBeLessThan(45);
      for (const p of pts) expect(Math.hypot(p.x, p.z), shape).toBeLessThanOrEqual(20 * Math.SQRT2 + 1e-9);
    }
  });

  it('finds one level per setback step plus the roof', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake' });
    const levels = setbackLevels(design);
    expect(levels).toHaveLength(5);
    expect(levels.at(-1)!.isRoof).toBe(true);
    for (const l of levels.slice(0, -1)) expect(l.isRoof).toBe(false);
    expect(setbackLevels({ ...design, setbacks: 'none' })).toHaveLength(1);
  });

  it('splits floors into runs that stop at setbacks and never exceed the chunk size', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'few' });
    const runs = floorRuns(design, 6);
    expect(runs.flat()).toHaveLength(50);
    for (const r of runs) expect(r.length).toBeLessThanOrEqual(6);
    const stepFloors = setbackLevels(design).map((l) => l.slice.index);
    for (const i of stepFloors) expect(runs.some((r) => r.at(-1)!.index === i)).toBe(true);
  });
});
