import { describe, expect, it } from 'vitest';
import { defaultDesign, maxPlateWidth, normalizeDesign } from './design';
import { SITES, SITE_IDS } from './sites';

describe('design', () => {
  it('default design fits on every lot', () => {
    for (const id of SITE_IDS) {
      const site = SITES[id];
      const d = defaultDesign(site);
      expect(d.plateWidth).toBeLessThanOrEqual(maxPlateWidth(site, d));
      expect(d.plateDepth).toBeLessThanOrEqual(site.lot.depth);
    }
  });

  it('shrinks the width when a rectangle becomes a square on a narrow lot', () => {
    const site = { ...SITES['new-york'], lot: { width: 50, depth: 30 } };
    const rect = normalizeDesign({ ...defaultDesign(site), shape: 'rectangle', plateWidth: 50, plateDepth: 30 }, site);
    expect(rect.plateWidth).toBe(50);
    const square = normalizeDesign({ ...rect, shape: 'square' }, site);
    expect(square.plateWidth).toBe(30);
  });

  it('returns the same object when nothing needs clamping', () => {
    const d = defaultDesign(SITES.chicago);
    expect(normalizeDesign(d, SITES.chicago)).toBe(d);
  });
});
