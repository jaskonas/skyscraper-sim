import { describe, expect, it } from 'vitest';
import { WEATHER, WEATHER_GLSL, weatherShade } from './weathering';

const base = { worldY: 60, floorShare: 0.5, streak: 0, noise: 0.5 };

describe('weathering', () => {
  it('is subtle', () => {
    for (const worldY of [0, 3, 30, 300])
      for (const floorShare of [0, 0.5, 0.8, 1])
        for (const streak of [0, 0.5, 1])
          for (const noise of [0, 0.5, 1]) {
            const s = weatherShade({ worldY, floorShare, streak, noise });
            expect(s).toBeGreaterThanOrEqual(0.7);
            expect(s).toBeLessThanOrEqual(1.12);
          }
  });

  it('darkens under windows and near the street, and fades in the sun at the top', () => {
    expect(weatherShade({ ...base, streak: 1 })).toBeLessThan(weatherShade(base));
    expect(weatherShade({ ...base, worldY: 0 })).toBeLessThan(weatherShade({ ...base, worldY: 100 }));
    expect(weatherShade({ ...base, floorShare: 1 })).toBeGreaterThan(weatherShade(base));
    expect(weatherShade({ ...base, noise: 0 })).toBeCloseTo(1 - WEATHER.tintRange, 2);
  });

  it('has a GLSL twin', () => {
    for (const name of ['weatherNoise', 'weatherShade']) expect(WEATHER_GLSL).toContain(name);
  });
});
