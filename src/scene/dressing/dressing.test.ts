import { describe, expect, it } from 'vitest';
import { CROWNS } from '../../sim/catalog/crowns';
import { CROWN_IDS } from '../../sim/catalog/ids';
import { FLOOR_HEIGHT, floorSlices, plateDims } from '../../sim/geometry';
import { partBounds, partIsFinite, type Part } from '../../sim/parts';
import { SITES } from '../../sim/sites';
import { designFor } from '../../sim/testUtils';
import type { Design, PlanShape } from '../../sim/types';
import { planFaces, setbackLevels } from '../parts/placement';
import { fastestMs } from '../../test/fastest';
import { dressingParts, entranceParts, roofParts, terraceParts } from './dressing';

const NY = SITES['new-york'];
const build = (patch: Partial<Design>) => designFor('new-york', { shape: 'square', plateWidth: 36, floors: 40, setbacks: 'none', taper: 0, twist: 0, crown: 'flat', amenities: [], ...patch }).design;
const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];

describe('roof machinery', () => {
  it('fits out open roofs only, never ones a crown covers', () => {
    for (const crown of CROWN_IDS) {
      const parts = roofParts(NY, build({ crown }));
      expect(parts.length > 0, crown).toBe(!!CROWNS[crown].openRoof);
    }
  });

  it('stands on the roof, inside the top floor, clear of a helipad and a pool', () => {
    for (const shape of SHAPES) {
      const design = build({ shape, amenities: ['helipad', 'pool'] });
      const top = floorSlices(design).at(-1)!;
      const roof = design.floors * FLOOR_HEIGHT;
      const r = Math.min(top.width, top.depth) * 0.35;
      for (const p of roofParts(NY, design)) {
        expect(partIsFinite(p), shape).toBe(true);
        const b = partBounds(p);
        expect(b.min[1], shape).toBeGreaterThanOrEqual(roof - 1e-6);
        expect(Math.hypot(p.position[0], p.position[2]), shape).toBeLessThan(Math.hypot(top.width, top.depth) / 2 + 0.5);
        // Machinery (not the parapet or the cleaning rail round the edge) keeps out of the helipad's circle.
        if (p.material !== 'stone' && p.scale[1] > 1.5 && !p.animate) expect(Math.hypot(p.position[0], p.position[2]), `${shape} ${p.shape}`).toBeGreaterThan(r);
      }
    }
  });

  it('includes cooling towers, a plant room, a window-cleaning crane, a parapet and a blinking antenna', () => {
    const parts = roofParts(NY, build({}));
    expect(parts.some((p) => p.shape === 'cylinder' && p.material === 'concrete')).toBe(true);
    expect(parts.some((p) => p.material === 'steel' && p.shape === 'box')).toBe(true);
    expect(parts.some((p) => p.material === 'gold')).toBe(true);
    expect(parts.filter((p) => p.material === 'stone').length).toBeGreaterThanOrEqual(4);
    expect(parts.some((p) => p.animate === 'blink')).toBe(true);
  });

  it('puts wooden water tanks on old New York styles', () => {
    const tank = (siteId: 'new-york' | 'tokyo') => {
      const { site, design } = designFor(siteId, { crown: 'flat', windowPattern: 'chicago', amenities: [] });
      return roofParts(site, design).some((p) => p.material === 'wood');
    };
    expect(tank('new-york')).toBe(true);
    expect(tank('tokyo')).toBe(false);
  });
});

describe('setback terraces', () => {
  it('plants every setback ledge, inside the ledge, with a railing at its edge', () => {
    for (const shape of SHAPES) {
      const design = build({ shape, setbacks: 'wedding-cake', ornament: 'high' });
      const parts = terraceParts(design);
      const levels = setbackLevels(design).filter((l) => !l.isRoof);
      expect(levels.length).toBeGreaterThan(0);
      for (const level of levels) {
        const y = level.slice.y + FLOOR_HEIGHT;
        const here = parts.filter((p) => Math.abs(partBounds(p).min[1] - y) < 0.01);
        expect(here.some((p) => p.material === 'foliage'), `${shape} @${y}`).toBe(true);
        expect(here.some((p) => p.material === 'glass'), `${shape} @${y}`).toBe(true);
        const above = floorSlices(design)[level.slice.index + 1];
        // The floor above's walls are this far from the middle at their closest (a triangle's are much closer than half its width).
        const inner = Math.min(...planFaces(design.shape, above.width, above.depth).map((f) => Math.hypot(f.x, f.z)));
        for (const p of here) {
          const d = Math.hypot(p.position[0], p.position[2]);
          // On the ledge: outside the floor above, inside the floor below.
          expect(d, `${shape}`).toBeLessThan(Math.hypot(level.slice.width, level.slice.depth) / 2 + 0.5);
          expect(d, `${shape}`).toBeGreaterThan(inner - 0.5);
        }
      }
      expect(parts.every(partIsFinite)).toBe(true);
    }
  });

  it('has no terraces without setbacks, and only railings when ornament amount is None', () => {
    expect(terraceParts(build({ setbacks: 'none' }))).toHaveLength(0);
    const bare = terraceParts(build({ setbacks: 'few', ornament: 'none' }));
    expect(bare.length).toBeGreaterThan(0);
    expect(bare.every((p) => p.material === 'glass')).toBe(true);
  });
});

describe('entrance', () => {
  it('gives the front a canopy, revolving doors and bollards along the sidewalk', () => {
    const design = build({ ornament: 'none' });
    const { depth } = plateDims(design);
    const parts = entranceParts(design);
    const front = parts.filter((p) => p.position[2] > depth / 2);
    expect(front.length).toBe(parts.length);
    expect(parts.some((p) => p.shape === 'cylinder' && p.material === 'glass')).toBe(true);
    expect(parts.filter((p) => p.material === 'steel' && p.scale[1] < 1.2).length).toBeGreaterThanOrEqual(4);
    for (const p of parts) expect(partBounds(p).min[1]).toBeGreaterThanOrEqual(-1e-6);
  });
});

describe('dressingParts', () => {
  it('is everything together, finite for every shape and extreme, and quick', () => {
    for (const shape of SHAPES)
      for (const extreme of [{ floors: 5 }, { floors: 150, taper: 0.6, twist: 120, setbacks: 'wedding-cake' as const, plateWidth: 15 }]) {
        const design = build({ shape, ...extreme, ornament: 'high' });
        const parts = dressingParts(NY, design);
        expect(parts.length).toBe(roofParts(NY, design).length + terraceParts(design).length + entranceParts(design).length);
        expect(parts.every(partIsFinite)).toBe(true);
      }
    const worst = designFor('shanghai', { floors: 150, plateWidth: 80, shape: 'circle', setbacks: 'wedding-cake', crown: 'flat', ornament: 'high' });
    let parts: Part[] = [];
    expect(fastestMs(5, () => (parts = dressingParts(worst.site, worst.design)))).toBeLessThan(10);
    expect(parts.length).toBeLessThan(3000);
  });
});
