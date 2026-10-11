import { describe, expect, it } from 'vitest';
import { CROWN_IDS } from '../sim/catalog/ids';
import { strutPart, type Part } from '../sim/parts';
import { designFor } from '../sim/testUtils';
import { crownParts } from './crownParts';
import { partOutline, silhouette } from './silhouette';

describe('silhouette', () => {
  it('outlines an upright box as its front rectangle', () => {
    const p: Part = { shape: 'box', position: [0, 5, 0], scale: [4, 10, 2], material: 'body' };
    const o = partOutline(p);
    expect(o).toHaveLength(4);
    expect(Math.min(...o.map((q) => q[1]))).toBeCloseTo(0);
    expect(Math.max(...o.map((q) => q[0]))).toBeCloseTo(2);
  });

  it('outlines a cone as a triangle and a tilted strut along its slope', () => {
    expect(partOutline({ shape: 'cone', position: [0, 0, 0], scale: [2, 4, 2], material: 'steel' })).toHaveLength(3);
    const strut = partOutline(strutPart([0, 0, 0], [10, 10, 0], 0.5, 'steel'));
    expect(Math.max(...strut.map((q) => q[0]))).toBeGreaterThan(9.5);
  });

  it('draws every crown as a non-empty, finite square icon', () => {
    for (const crown of CROWN_IDS) {
      const { design } = designFor('chicago', { crown, floors: 30 });
      const s = silhouette(crownParts(design));
      expect(s.paths.length, crown).toBeGreaterThan(0);
      expect(s.viewBox, crown).not.toMatch(/NaN|Infinity/);
      for (const p of s.paths) expect(p.d, crown).toMatch(/^M/);
    }
  });
});
