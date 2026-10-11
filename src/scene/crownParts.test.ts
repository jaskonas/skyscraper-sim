import { describe, expect, it } from 'vitest';
import { CROWN_IDS } from '../sim/catalog/ids';
import { FLOOR_HEIGHT, crownHeight, floorSlices } from '../sim/geometry';
import { partBounds, partIsFinite } from '../sim/parts';
import { designFor } from '../sim/testUtils';
import type { Design, PlanShape } from '../sim/types';
import { crownParts } from './crownParts';

const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
const EXTREMES: Partial<Design>[] = [
  { floors: 5, twist: 0, taper: 0 },
  { floors: 150, twist: 120, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15 },
];

describe('crownParts', () => {
  it.each([...CROWN_IDS])('%s: finite, attached to the roof, and reaches the catalog height on every shape', (crown) => {
    for (const shape of SHAPES)
      for (const extreme of EXTREMES) {
        const { design } = designFor('shanghai', { ...extreme, shape, crown });
        const parts = crownParts(design);
        const label = `${crown} ${shape} ${extreme.floors}`;
        expect(parts.length, label).toBeGreaterThan(0);
        expect(parts.every(partIsFinite), label).toBe(true);
        const body = design.floors * FLOOR_HEIGHT;
        const H = crownHeight(crown, body);
        const top = floorSlices(design).at(-1)!;
        const reach = Math.hypot(top.width, top.depth) * 0.6 + 1;
        let tip = -Infinity;
        for (const p of parts) {
          const b = partBounds(p);
          tip = Math.max(tip, b.max[1]);
          expect(b.min[1], label).toBeGreaterThanOrEqual(body - 0.5);
          expect(Math.hypot(p.position[0], p.position[2]), label).toBeLessThanOrEqual(reach);
        }
        expect(Math.abs(tip - (body + H)), label).toBeLessThanOrEqual(Math.max(0.05 * H, 0.5));
      }
  });

  it('turns the crown with a twisted top floor', () => {
    const { design } = designFor('chicago', { crown: 'twin-antennas', twist: 90 });
    const straight = crownParts({ ...design, twist: 0 });
    const twisted = crownParts(design);
    expect(twisted[1].position[0]).not.toBeCloseTo(straight[1].position[0]);
  });
});
