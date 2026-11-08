import { describe, expect, it } from 'vitest';
import { COEFFICIENTS } from '../catalog/coefficients';
import { floorSlices, sliceArea } from '../geometry';
import { sandboxGrades } from '../scoring';
import { designFor } from '../testUtils';
import type { Design, SiteId } from '../types';
import { analyze } from './index';

const run = (siteId: SiteId, patch: Partial<Design> = {}) => {
  const { site, design } = designFor(siteId, patch);
  return { site, design, a: analyze(site, design) };
};

/** Income per m² of floor for band `k`. */
function perM2(design: Design, a: ReturnType<typeof analyze>, k: number) {
  const b = a.value.bands[k];
  const area = floorSlices(design).slice(b.from, b.to + 1).reduce((s, f) => s + sliceArea(design.shape, f), 0);
  return b.incomePerYear / area;
}

describe('value', () => {
  it('default New York tower pays back in 15–25 years', () => {
    const { a } = run('new-york');
    expect(a.value.paybackYears).toBeGreaterThanOrEqual(15);
    expect(a.value.paybackYears).toBeLessThanOrEqual(25);
    expect(a.value.incomePerYear).toBeCloseTo(a.value.bands.reduce((s, b) => s + b.incomePerYear, 0));
  });

  it('a homes floor is worth more higher up', () => {
    const { design, a } = run('new-york', {
      plateWidth: 30,
      floors: 100,
      stack: [{ use: 'office', share: 10 }, { use: 'residential', share: 20 }, { use: 'office', share: 30 }, { use: 'residential', share: 20 }, { use: 'office', share: 20 }],
    });
    expect(a.value.bands[1].fit).toBe(a.value.bands[3].fit);
    expect(perM2(design, a, 3)).toBeGreaterThan(perM2(design, a, 1) * 1.3);
  });

  it('bad fit costs money', () => {
    const stack = [{ use: 'office' as const, share: 25 }, { use: 'hotel' as const, share: 75 }];
    const bad = run('chicago', { plateWidth: 40, stack });
    const good = run('chicago', { plateWidth: 26, stack });
    expect(bad.a.value.bands[1].fit).toBe('bad');
    expect(good.a.value.bands[1].fit).toBe('good');
    expect(perM2(bad.design, bad.a, 1) / perM2(good.design, good.a, 1)).toBeCloseTo(0.55, 5);
  });

  it('city market: homes earn 1.3× in New York vs Chicago', () => {
    const stack = [{ use: 'residential' as const, share: 100 }];
    const ny = run('new-york', { plateWidth: 30, stack });
    const chi = run('chicago', { plateWidth: 30, stack });
    expect(ny.a.value.incomePerYear / chi.a.value.incomePerYear).toBeCloseTo(1.3, 5);
  });

  it('shops up high earn the height premium only with an observation deck', () => {
    const stack = [{ use: 'office' as const, share: 80 }, { use: 'retail' as const, share: 20 }];
    const plain = run('chicago', { stack });
    const deck = run('chicago', { stack, amenities: ['observation-deck'] });
    // Without a deck: no premium and a 😐 fit; with one: the homes premium and 👍.
    expect(deck.a.value.bands[1].incomePerYear / plain.a.value.bands[1].incomePerYear).toBeGreaterThan(1.25 / 0.8);
  });

  it('payback is Infinity when income is zero', () => {
    const rent = COEFFICIENTS.zones.rent;
    const saved = { ...rent };
    Object.assign(rent, { office: 0, residential: 0, hotel: 0, retail: 0 });
    try {
      const { site, a } = run('chicago');
      expect(a.value.incomePerYear).toBe(0);
      expect(a.value.paybackYears).toBe(Infinity);
      expect(sandboxGrades(site, a).value).toBe('F');
    } finally {
      Object.assign(rent, saved);
    }
  });
});
