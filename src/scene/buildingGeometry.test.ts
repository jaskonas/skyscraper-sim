import { describe, expect, it } from 'vitest';
import { FLOOR_HEIGHT } from '../sim/geometry';
import { designFor } from '../sim/testUtils';
import { bodyInstances, bracingStruts, facadeColor, slabInstances } from './buildingGeometry';

describe('building geometry', () => {
  it('has one body and one slab per floor, stacked', () => {
    const { design } = designFor('chicago', { floors: 30 });
    const body = bodyInstances(design);
    expect(body).toHaveLength(30);
    expect(slabInstances(design)).toHaveLength(30);
    expect(body[29].position[1]).toBeGreaterThan(29 * FLOOR_HEIGHT);
    expect(body[29].position[1]).toBeLessThan(30 * FLOOR_HEIGHT);
  });

  it('adds X-bracing only for exposed structure', () => {
    const { design } = designFor('chicago', { floors: 30 });
    expect(bracingStruts(design)).toEqual([]);
    expect(bracingStruts({ ...design, exposedStructure: true })).toHaveLength(3 * 4 * 2);
  });

  it('glass towers use the glass colour', () => {
    const { design } = designFor('chicago', { facade: 'glass' });
    expect(facadeColor(design)).toBe(design.palette.glass);
    expect(facadeColor({ ...design, facade: 'masonry' })).toMatch(/^#[0-9a-f]{6}$/);
  });
});
