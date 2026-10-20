/**
 * The fastest of `runs` timings of `fn`, in milliseconds. Speed tests compare this to their budget rather
 * than an average: when the whole suite runs in parallel, other test files steal the CPU at random, which
 * slows some runs but never makes one faster than the code really is.
 */
export function fastestMs(runs: number, fn: (run: number) => void): number {
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn(i);
    best = Math.min(best, performance.now() - t0);
  }
  return best;
}
