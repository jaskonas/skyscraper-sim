import { describe, expect, it } from 'vitest';
import { fastestMs } from '../test/fastest';
import { FLOOR_HEIGHT, floorSlices, plateDims } from '../sim/geometry';
import { partBounds, partIsFinite } from '../sim/parts';
import { designFor } from '../sim/testUtils';
import type { Design, PlanShape } from '../sim/types';
import { balconyParts, facadeTileWidth } from './balconies';
import { isMechanicalFloor } from './facadeDetail';

const homes = { retail: 0, office: 0, hotel: 0, residential: 100 };
const offices = { retail: 0, office: 100, hotel: 0, residential: 0 };
const build = (patch: Partial<Design>) => {
  const { design } = designFor('shanghai', { shape: 'square', plateWidth: 40, floors: 30, setbacks: 'none', taper: 0, twist: 0, ...patch });
  return { design, parts: balconyParts(design) };
};

describe('balconyParts', () => {
  it('puts balconies only on homes', () => {
    expect(build({ useMix: offices }).parts).toHaveLength(0);
    expect(build({ useMix: homes }).parts.length).toBeGreaterThan(0);
  });

  it('gives every home floor a slab and a glass railing on every other bay, but not plant floors', () => {
    const { design, parts } = build({ useMix: homes, floors: 70 });
    const slabs = parts.filter((p) => p.material === 'concrete');
    const rails = parts.filter((p) => p.material === 'glass');
    expect(rails.length).toBe(slabs.length);
    const floorsWith = new Set(slabs.map((p) => Math.floor(p.position[1] / FLOOR_HEIGHT)));
    for (let f = 1; f < design.floors; f++) expect(floorsWith.has(f), `floor ${f}`).toBe(!isMechanicalFloor(f, design.floors));
    // A 40 m square with 3 m bays: 12 whole bays a side (6 each way from the middle), balconies on 6 of them.
    const perFloor = slabs.filter((p) => Math.floor(p.position[1] / FLOOR_HEIGHT) === 10).length;
    expect(perFloor).toBe(4 * 6);
  });

  it("centres every balcony on a window of the facade's own bay grid, so it fronts one window, not two", () => {
    const near = (v: number, w: number) => Math.abs((((v % w) + w) % w) - w / 2) < 1e-6;
    // Square: on the front wall (+z) the facade measures across from the wall's middle, along +x.
    const square = build({ useMix: homes, shape: 'square', plateWidth: 40 });
    const w = facadeTileWidth(square.design);
    const front = square.parts.filter((p) => p.material === 'concrete' && p.position[2] > 20);
    expect(front.length).toBeGreaterThan(0);
    for (const p of front) expect(near(p.position[0], w), `x ${p.position[0]}`).toBe(true);
    // An odd number of bays fits on a 39 m wall too: still centred on windows.
    const odd = build({ useMix: homes, shape: 'square', plateWidth: 39 });
    for (const p of odd.parts.filter((q) => q.material === 'concrete' && q.position[2] > 19)) expect(near(p.position[0], facadeTileWidth(odd.design))).toBe(true);
    // Round: the facade measures arc length from the +z seam.
    const round = build({ useMix: homes, shape: 'circle', floors: 12 });
    const rw = facadeTileWidth(round.design);
    const r = floorSlices(round.design)[5].width / 2;
    for (const p of round.parts.filter((q) => q.material === 'concrete' && Math.floor(q.position[1] / FLOOR_HEIGHT) === 5)) {
      const arc = ((Math.atan2(p.position[0], p.position[2]) + 2 * Math.PI) % (2 * Math.PI)) * r;
      expect(near(arc, rw), `arc ${arc}`).toBe(true);
    }
  });

  it.each(['square', 'rectangle', 'circle', 'triangle'] as PlanShape[])('%s: stands out from the wall, finite and within reach', (shape) => {
    for (const extreme of [{ floors: 5 }, { floors: 150, taper: 0.6, twist: 120, setbacks: 'wedding-cake' as const, plateWidth: 15 }]) {
      const { design, parts } = build({ useMix: homes, shape, ...extreme });
      const { width, depth } = plateDims(design);
      expect(parts.length).toBeGreaterThan(0);
      for (const p of parts) {
        expect(partIsFinite(p)).toBe(true);
        const b = partBounds(p);
        expect(Math.hypot(p.position[0], p.position[2])).toBeLessThan(Math.hypot(width, depth) / 2 + 2);
        expect(b.min[1]).toBeGreaterThanOrEqual(-1e-6);
        expect(b.max[1]).toBeLessThanOrEqual(design.floors * FLOOR_HEIGHT + 1e-6);
      }
    }
  });

  it('follows a round plan: every balcony sits just outside its floor', () => {
    const { design, parts } = build({ useMix: homes, shape: 'circle', floors: 20 });
    const r = floorSlices(design)[5].width / 2;
    for (const p of parts.filter((q) => q.material === 'concrete' && Math.floor(q.position[1] / FLOOR_HEIGHT) === 5)) {
      const d = Math.hypot(p.position[0], p.position[2]);
      expect(d).toBeGreaterThan(r);
      expect(d).toBeLessThan(r + 1.6);
    }
  });

  it('builds the worst case quickly, under 10,000 parts', () => {
    const { design } = designFor('shanghai', { floors: 150, plateWidth: 80, shape: 'circle', useMix: homes, setbacks: 'none' });
    balconyParts(design);
    let n = 0;
    expect(fastestMs(5, (i) => (n = balconyParts({ ...design, floors: 150 - i }).length))).toBeLessThan(30);
    expect(n).toBeLessThan(10000);
  });
});
