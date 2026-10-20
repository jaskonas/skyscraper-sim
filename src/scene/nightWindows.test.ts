import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import { NIGHT_LIGHTS, nightWindowAttributes, windowHash, windowLit } from './nightWindows';

describe('night windows', () => {
  it('always lights the same windows', () => {
    for (let bay = 0; bay < 20; bay++) expect(windowLit(bay, 7, 0.5)).toBe(windowLit(bay, 7, 0.5));
  });

  it('wraps big and negative window numbers the way the shader does', () => {
    expect(windowHash(-3, 7)).toBeCloseTo(windowHash(98, 7), 9);
    expect(windowHash(5, 7 + 89)).toBeCloseTo(windowHash(5, 7), 9);
  });

  it('lights about the share asked for', () => {
    for (const share of [0.4, 0.6, 0.9]) {
      let on = 0;
      for (let bay = 0; bay < 60; bay++) for (let floor = 0; floor < 60; floor++) if (windowLit(bay, floor, share)) on++;
      expect(on / 3600).toBeGreaterThan(share - 0.05);
      expect(on / 3600).toBeLessThan(share + 0.05);
    }
  });

  it("gives each floor its use's lit share and colour", () => {
    const { design } = designFor('chicago', { floors: 10, useMix: { retail: 10, office: 50, hotel: 0, residential: 40 } });
    const a = nightWindowAttributes(design);
    expect(Array.from(a.floor)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(a.lit[0]).toBeCloseTo(NIGHT_LIGHTS.retail.lit);
    expect(a.lit[3]).toBeCloseTo(NIGHT_LIGHTS.office.lit);
    expect(a.lit[9]).toBeCloseTo(NIGHT_LIGHTS.residential.lit);
    expect(a.color).toHaveLength(30);
    // No rooms behind the glass any more, so no room colours.
    expect('room' in a).toBe(false);
  });
});
