import { describe, expect, it } from 'vitest';
import { ORNAMENTS } from '../sim/catalog/facades';
import { ORNAMENT_IDS } from '../sim/catalog/ids';
import { FLOOR_HEIGHT, floorSlices } from '../sim/geometry';
import { partBounds, partIsFinite } from '../sim/parts';
import { designFor } from '../sim/testUtils';
import type { Design, PlanShape } from '../sim/types';
import { crownParts } from './crownParts';
import { bracingParts, ornamentParts } from './ornaments';

const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
const EXTREMES: Partial<Design>[] = [
  { floors: 5, twist: 0, taper: 0, setbacks: 'none' },
  { floors: 150, twist: 120, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15 },
];

describe('ornamentParts', () => {
  it.each([...ORNAMENT_IDS])('%s: finite and stuck to the tower on every shape and amount', (id) => {
    for (const shape of SHAPES)
      for (const extreme of EXTREMES)
        for (const ornament of ['low', 'high'] as const) {
          const { design } = designFor('shanghai', { ...extreme, shape, ornaments: [id], ornament });
          const parts = ornamentParts(design);
          const label = `${id} ${shape} ${extreme.floors} ${ornament}`;
          expect(parts.length, label).toBeGreaterThan(0);
          expect(parts.every(partIsFinite), label).toBe(true);
          const slices = floorSlices(design);
          const reach = Math.hypot(slices[0].width, slices[0].depth) / 2 + 12;
          for (const p of parts) {
            const b = partBounds(p);
            expect(b.min[1], label).toBeGreaterThanOrEqual(-0.5);
            expect(b.max[1], label).toBeLessThanOrEqual(design.floors * FLOOR_HEIGHT + 15);
            expect(Math.hypot(p.position[0], p.position[2]), label).toBeLessThanOrEqual(reach);
          }
        }
  });

  it('amount None builds the working parts only', () => {
    const { design } = designFor('chicago', { ornaments: ['stone-ribs', 'gargoyles'], ornament: 'none' });
    const ribsOnly = ornamentParts({ ...design, ornaments: ['stone-ribs'] });
    expect(ornamentParts(design)).toEqual(ribsOnly);
    expect(ribsOnly.length).toBeGreaterThan(0);
  });

  it('High places more than Low', () => {
    for (const id of ORNAMENT_IDS) {
      const { design } = designFor('chicago', { floors: 60, setbacks: 'wedding-cake', ornaments: [id] });
      const low = ornamentParts({ ...design, ornament: 'low' });
      const high = ornamentParts({ ...design, ornament: 'high' });
      const volume = (ps: typeof low) => ps.reduce((s, p) => s + p.scale[0] * p.scale[1] * p.scale[2], 0);
      expect(volume(high), id).toBeGreaterThanOrEqual(volume(low));
    }
  });

  it('keeps a 150-floor tower with every ornament at High within the instance budget', () => {
    const { design } = designFor('shanghai', {
      floors: 150, plateWidth: 80, shape: 'square', setbacks: 'wedding-cake',
      ornaments: [...ORNAMENT_IDS], ornament: 'high', exposedStructure: true, crown: 'pagoda',
    });
    const total = ornamentParts(design).length + crownParts(design).length + bracingParts(design).length;
    expect(total).toBeLessThanOrEqual(20_000);
  });

  it('builds the worst-case tower fast enough to redraw while a slider is dragged', () => {
    const { design } = designFor('shanghai', {
      floors: 150, plateWidth: 80, shape: 'circle', twist: 120, taper: 0.3, setbacks: 'wedding-cake',
      ornaments: [...ORNAMENT_IDS], ornament: 'high',
    });
    ornamentParts(design);
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) ornamentParts({ ...design, floors: 150 - i });
    expect((performance.now() - t0) / 5).toBeLessThan(50);
  });

  it('every ornament in the catalog is placed by some rule', () => {
    for (const id of ORNAMENT_IDS) expect(ORNAMENTS[id].placement).toBeTruthy();
  });
});

describe('ornaments on a round tower', () => {
  it('urns, sunbursts and arched entries sit against the curved wall', () => {
    for (const id of ['urns', 'sunburst-bands', 'arched-entry'] as const) {
      const { design } = designFor('chicago', { shape: 'circle', plateWidth: 40, floors: 30, setbacks: 'none', taper: 0, ornaments: [id], ornament: 'high' });
      for (const p of ornamentParts(design)) {
        const off = Math.hypot(p.position[0], p.position[2]) - 20;
        expect(Math.abs(off), id).toBeLessThan(2);
      }
    }
  });
});

describe('bracingParts', () => {
  it('adds X-braces only for exposed structure, two per wall per 10 floors', () => {
    const { design } = designFor('chicago', { floors: 30, shape: 'square' });
    expect(bracingParts(design)).toEqual([]);
    expect(bracingParts({ ...design, exposedStructure: true })).toHaveLength(3 * 4 * 2);
    expect(bracingParts({ ...design, shape: 'triangle', exposedStructure: true })).toHaveLength(3 * 3 * 2);
  });

  it('keeps braces on a round tower outside the wall so they show', () => {
    const { design } = designFor('chicago', { floors: 30, shape: 'circle', plateWidth: 40, taper: 0, exposedStructure: true });
    for (const p of bracingParts(design)) expect(Math.hypot(p.position[0], p.position[2])).toBeGreaterThanOrEqual(20);
  });
});
