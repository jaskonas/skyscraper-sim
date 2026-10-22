import { describe, expect, it } from 'vitest';
import { applyAction } from '../../sim/actions';
import { designFor } from '../../sim/testUtils';
import type { Design, StyleId } from '../../sim/types';
import { LIBRARY, modulate, partLibrary, surfacesFor } from './library';

const styled = (style: StyleId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor('chicago');
  return { ...applyAction(design, { type: 'apply_style_preset', style }, site), ...patch };
};

describe('material library', () => {
  it('masonry follows the style', () => {
    expect(surfacesFor(styled('chicago-school'))).toEqual({ wall: 'brick-red', trim: 'terracotta' });
    expect(surfacesFor(styled('gothic-revival'))).toEqual({ wall: 'limestone', trim: 'limestone' });
    expect(surfacesFor(styled('art-deco'))).toEqual({ wall: 'brick-buff', trim: 'limestone' });
    expect(surfacesFor(styled('postmodern'))).toEqual({ wall: 'granite', trim: 'granite' });
  });

  it('facade type decides the rest', () => {
    expect(surfacesFor(styled('international', { facade: 'glass' }))).toEqual({ wall: 'metal-panel', trim: 'metal-panel' });
    expect(surfacesFor(styled('high-tech', { facade: 'metal' }))).toEqual({ wall: 'metal-panel', trim: 'metal-panel' });
    expect(surfacesFor(styled('international', { facade: 'precast' }))).toEqual({ wall: 'concrete-precast', trim: 'concrete-precast' });
  });

  it('Brutalist is board-formed while its facade is precast', () => {
    expect(styled('brutalist').facade).toBe('precast');
    expect(surfacesFor(styled('brutalist'))).toEqual({ wall: 'concrete-board', trim: 'concrete-board' });
    expect(surfacesFor(styled('brutalist', { facade: 'glass' }))).toEqual({ wall: 'metal-panel', trim: 'metal-panel' });
  });

  it('a masonry facade on a non-masonry style is limestone', () => {
    expect(surfacesFor(styled('international', { facade: 'masonry' }))).toEqual({ wall: 'limestone', trim: 'limestone' });
  });

  it('gives each part material its library material, or none', () => {
    const s = { wall: 'brick-red', trim: 'terracotta' } as const;
    expect(partLibrary('body', s)).toBe('brick-red');
    expect(partLibrary('accent', s)).toBe('terracotta');
    expect(partLibrary('stone', s)).toBe('limestone');
    expect(partLibrary('concrete', s)).toBe('concrete-board');
    expect(partLibrary('copper', s)).toBe('copper');
    for (const m of ['gold', 'steel', 'girder'] as const) expect(partLibrary(m, s)).toBe('metal-panel');
    expect(partLibrary('wood', s)).toBe('wood');
    for (const m of ['glass', 'foliage', 'ruby', 'light', 'interior'] as const) expect(partLibrary(m, s)).toBeNull();
    expect(partLibrary('body', undefined)).toBeNull();
    expect(partLibrary('stone', undefined)).toBe('limestone');
  });

  it('every size is real', () => {
    for (const m of Object.values(LIBRARY)) {
      expect(m.sizeM).toBeGreaterThanOrEqual(0.5);
      expect(m.sizeM).toBeLessThanOrEqual(3);
    }
  });

  it("repaints by the palette: the texture only lightens and darkens, keeping the colour's hue", () => {
    const out = modulate([0.1, 0.2, 0.8], 0.3, 1);
    expect(out[1] / out[0]).toBeCloseTo(2, 6);
    expect(out[2] / out[0]).toBeCloseTo(8, 6);
    expect(out[0]).toBeCloseTo(0.1 * 0.6, 6);
    expect(modulate([0.5, 0.5, 0.5], 0.5, 1)).toEqual([0.5, 0.5, 0.5]);
    expect(Math.min(...modulate([0.5, 0.5, 0.5], 0, 2))).toBeGreaterThanOrEqual(0);
  });
});
