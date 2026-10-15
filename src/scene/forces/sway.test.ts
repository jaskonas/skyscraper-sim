import { describe, expect, it } from 'vitest';
import { createSway, swayAt } from './sway';

describe('swayAt', () => {
  it('is nothing at rest', () => {
    expect(swayAt(createSway(), 50)).toBe(0);
  });

  it('moves the base with the ground share and bends the rest, most at the top', () => {
    const s = { ...createSway(), active: true, baseX: 2, topX: 10, height: 100 };
    expect(swayAt(s, 0)).toBe(2);
    expect(swayAt(s, 100)).toBe(12);
    expect(swayAt(s, 50)).toBeGreaterThan(2);
    expect(swayAt(s, 50)).toBeLessThan(7);
  });

  it('adds a lean that grows with height', () => {
    const s = { ...createSway(), active: true, lean: Math.atan(0.05), height: 100 };
    expect(swayAt(s, 100)).toBeCloseTo(5, 9);
    expect(swayAt(s, 0)).toBe(0);
  });
});
