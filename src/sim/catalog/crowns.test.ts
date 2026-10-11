import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { crownHeight, FLOOR_HEIGHT } from '../geometry';
import { isLandmark } from '../scoring';
import { designFor } from '../testUtils';
import type { Design } from '../types';
import { CROWN_FAMILIES, CROWNS } from './crowns';
import { CROWN_IDS } from './ids';
import { PARAMS_BY_ID, type EnumParam } from './parameters';

describe('crown catalog', () => {
  it('has 28 crowns, each with a family, a real example and a blurb', () => {
    expect(CROWN_IDS).toHaveLength(28);
    const families = CROWN_FAMILIES.map((f) => f.id);
    for (const id of CROWN_IDS) {
      const c = CROWNS[id];
      expect(c.id).toBe(id);
      expect(families).toContain(c.family);
      expect(c.seenOn.length).toBeGreaterThan(3);
      expect(c.blurb.length).toBeGreaterThan(10);
    }
  });

  it('every crown is either built from stages that reach the tip, or custom', () => {
    for (const id of CROWN_IDS) {
      const c = CROWNS[id];
      if (c.custom) {
        expect(c.stages, id).toBeUndefined();
        continue;
      }
      expect(c.stages!.length, id).toBeGreaterThan(0);
      for (const s of c.stages!) {
        expect(s.y0, id).toBeGreaterThanOrEqual(0);
        expect(s.y1, id).toBeGreaterThan(s.y0);
        expect(s.y1, id).toBeLessThanOrEqual(1);
        expect(s.w, id).toBeGreaterThan(0);
      }
      expect(Math.max(...c.stages!.map((s) => s.y1)), id).toBe(1);
    }
  });

  it('turns each height rule into metres', () => {
    expect(crownHeight('flat', 200)).toBe(2);
    expect(crownHeight('stepped', 200)).toBe(3 * FLOOR_HEIGHT);
    expect(crownHeight('spire', 200)).toBeCloseTo(30);
  });

  it('offers every crown in the Crown control, drawn as a gallery', () => {
    const def = PARAMS_BY_ID.crown as EnumParam;
    expect(def.widget).toBe('gallery');
    expect(def.options.map((o) => o.value)).toEqual([...CROWN_IDS]);
  });
});

const run = (patch: Partial<Design>) => {
  const { site, design } = designFor('chicago', patch);
  return analyze(site, design);
};

describe('crown effects', () => {
  it('antennas reach higher but do not count toward official height', () => {
    const a = run({ floors: 100, crown: 'twin-antennas' });
    expect(a.heightM).toBe(400);
    expect(a.tipHeightM).toBeCloseTo(460);
    const s = run({ floors: 100, crown: 'spire' });
    expect(s.heightM).toBeCloseTo(460);
    expect(s.tipHeightM).toBe(s.heightM);
  });

  it('wind turbines cut energy use by about 5%', () => {
    const flat = run({ crown: 'flat' }).energy.euiKWhPerM2;
    const turbines = run({ crown: 'wind-turbines' }).energy.euiKWhPerM2;
    expect(turbines / flat).toBeCloseTo(0.95, 5);
  });

  it('showpiece crowns make a landmark; plain ones do not', () => {
    const { design } = designFor('chicago');
    expect(isLandmark({ ...design, crown: 'deco-arches' })).toBe(true);
    expect(isLandmark({ ...design, crown: 'flat' })).toBe(false);
  });
});
