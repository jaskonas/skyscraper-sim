import { describe, expect, it } from 'vitest';
import { SITES } from '../sim/sites';
import { lighting } from './Scene';

describe('scene lighting', () => {
  it('uses the city sky by day and a dark, dim sky at night', () => {
    const day = lighting(SITES.tokyo, false);
    const night = lighting(SITES.tokyo, true);
    expect(day.sky).toBe(SITES.tokyo.visuals.sky);
    expect(night.sky).not.toBe(day.sky);
    expect(night.sun).toBeLessThan(day.sun);
    expect(night.hemi).toBeLessThan(day.hemi);
  });
});
