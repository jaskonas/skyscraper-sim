import { describe, expect, it } from 'vitest';
import { defaultDesign } from '../design';
import { SITES } from '../sites';
import { CITY_WORDS, suggestTowerName } from './towerNames';

const ideas = (site: (typeof SITES)[keyof typeof SITES], d = defaultDesign(site)) =>
  Array.from({ length: 10 }, (_, n) => suggestTowerName(site, d, n));

describe('suggestTowerName', () => {
  for (const site of Object.values(SITES)) {
    it(`gives ten different short city names in ${site.city}`, () => {
      const names = ideas(site);
      expect(new Set(names).size).toBe(10);
      for (const s of names) {
        expect(s.startsWith('The ')).toBe(true);
        expect(Array.from(s).length).toBeLessThanOrEqual(40);
      }
      expect(names.some((s) => CITY_WORDS[site.id].some((w) => s.includes(w)))).toBe(true);
    });
  }
  it('gives ten different ideas when the design adds form words too', () => {
    const site = SITES.tokyo;
    const d = { ...defaultDesign(site), crown: 'spire' as const, twist: 45 };
    expect(new Set(ideas(site, d)).size).toBe(10);
  });
  it('is the same each time for the same n', () => {
    const site = SITES.tokyo;
    const d = defaultDesign(site);
    expect(suggestTowerName(site, d, 3)).toBe(suggestTowerName(site, d, 3));
  });
  it('fits the design: spires, needles and twists', () => {
    const site = SITES.chicago;
    const base = defaultDesign(site);
    const plain = ideas(site, base).join(' ');
    expect(plain).not.toMatch(/Spire|Needle|Twist/);
    expect(ideas(site, { ...base, crown: 'spire' }).join(' ')).toMatch(/Spire/);
    expect(ideas(site, { ...base, floors: 100, plateWidth: 40 }).join(' ')).toMatch(/Needle/);
    expect(ideas(site, { ...base, twist: 45 }).join(' ')).toMatch(/Twist/);
  });
});
