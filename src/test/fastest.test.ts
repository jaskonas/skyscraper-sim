import { describe, expect, it } from 'vitest';
import { fastestMs } from './fastest';

describe('fastestMs', () => {
  it('runs the function the given number of times and reports the quickest run', () => {
    const seen: number[] = [];
    const ms = fastestMs(4, (i) => {
      seen.push(i);
      const until = performance.now() + (i === 2 ? 1 : 6);
      while (performance.now() < until);
    });
    expect(seen).toEqual([0, 1, 2, 3]);
    expect(ms).toBeGreaterThanOrEqual(1);
    expect(ms).toBeLessThan(5);
  });
});
