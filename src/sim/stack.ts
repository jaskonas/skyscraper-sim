import { USE_ORDER, type UseBand, type UseType } from './types';

/** A band laid out on whole floors. `from`/`to` are floor indices (0 = street), inclusive. */
export interface BandSpan {
  /** Position of the band in the normalized stack, bottom first. */
  index: number;
  use: UseType;
  from: number;
  to: number;
}

export const MAX_BANDS = 6;

/** An old fixed-order four-percentage mix as a stack, bottom to top, zeros dropped. */
export function stackFromMix(mix: Record<UseType, number>): UseBand[] {
  return USE_ORDER.filter((u) => mix[u] > 0).map((use) => ({ use, share: mix[use] }));
}

/** Drop empty bands, merge same-use neighbours, cap at MAX_BANDS, and rescale shares to sum 100. */
export function normalizeStack(stack: UseBand[]): UseBand[] {
  const merged: UseBand[] = [];
  for (const b of stack ?? []) {
    if (!(b.share > 0) || !USE_ORDER.includes(b.use)) continue;
    const last = merged[merged.length - 1];
    if (last && last.use === b.use) last.share += b.share;
    else merged.push({ use: b.use, share: b.share });
  }
  if (merged.length === 0) return [{ use: 'office', share: 100 }];
  while (merged.length > MAX_BANDS) merged[MAX_BANDS - 1].share += merged.splice(MAX_BANDS, 1)[0].share;
  const total = merged.reduce((s, b) => s + b.share, 0);
  return merged.map((b) => ({ use: b.use, share: Number(((b.share / total) * 100).toFixed(6)) }));
}

/** Floors per band: the midpoint rule, then every band gets at least one floor while there are enough to go round. */
function floorCounts(stack: UseBand[], floors: number): number[] {
  const counts = stack.map(() => 0);
  let cumulative = 0;
  const ends = stack.map((b) => (cumulative += b.share / 100));
  for (let i = 0; i < floors; i++) {
    const t = (i + 0.5) / floors;
    const k = ends.findIndex((e) => t <= e + 1e-9);
    counts[k === -1 ? stack.length - 1 : k]++;
  }
  if (floors >= stack.length) {
    for (let k = 0; k < counts.length; k++) {
      if (counts[k] > 0) continue;
      const below = counts[k - 1] ?? 0;
      const above = counts[k + 1] ?? 0;
      const donor = below > 1 || above > 1 ? (below >= above ? k - 1 : k + 1) : counts.indexOf(Math.max(...counts));
      counts[donor]--;
      counts[k]++;
    }
  }
  return counts;
}

/** Whole-floor spans of the normalized stack, bottom to top. Bands with no floors are left out. */
export function bandFloors(stack: UseBand[], floors: number): BandSpan[] {
  const bands = normalizeStack(stack);
  const counts = floorCounts(bands, Math.max(0, Math.floor(floors)));
  const spans: BandSpan[] = [];
  let from = 0;
  bands.forEach((b, index) => {
    if (counts[index] > 0) spans.push({ index, use: b.use, from, to: from + counts[index] - 1 });
    from += counts[index];
  });
  return spans;
}

/**
 * Move the line between visible band `boundary` and the one above it so the upper band starts on floor `toFloor`.
 * Both bands keep at least one floor. Only those two bands change, so zones too small to show on a short tower survive.
 */
export function moveBoundary(stack: UseBand[], floors: number, boundary: number, toFloor: number): UseBand[] {
  const bands = normalizeStack(stack);
  const spans = bandFloors(bands, floors);
  const lower = spans[boundary];
  const upper = spans[boundary + 1];
  if (!lower || !upper) return bands;
  const start = Math.min(upper.to, Math.max(lower.from + 1, Math.round(toFloor)));
  // Shares before the lower band and after the upper band stay; the line lands exactly on `start`.
  const before = bands.slice(0, lower.index).reduce((sum, b) => sum + b.share, 0);
  const through = bands.slice(0, upper.index + 1).reduce((sum, b) => sum + b.share, 0);
  const line = (start / floors) * 100;
  const tiny = 1e-3;
  const next = bands.map((b) => ({ ...b }));
  next[lower.index].share = Math.max(tiny, line - before);
  next[upper.index].share = Math.max(tiny, through - line);
  // Hidden bands between the two shrink to a sliver: still there for a taller tower, never in the way of the line.
  for (let k = lower.index + 1; k < upper.index; k++) next[k].share = tiny;
  return normalizeStack(next);
}

/** The middle of band `index`, as a percent of the way up the tower. */
export function bandMiddle(stack: UseBand[], index: number): number {
  const bands = normalizeStack(stack);
  const below = bands.slice(0, index).reduce((sum, b) => sum + b.share, 0);
  return below + (bands[index]?.share ?? 0) / 2;
}

/** The band covering the point `percent` of the way up the tower. */
export function bandAt(stack: UseBand[], percent: number): number {
  const bands = normalizeStack(stack);
  let top = 0;
  for (let k = 0; k < bands.length; k++) {
    top += bands[k].share;
    if (percent < top) return k;
  }
  return bands.length - 1;
}

/** Swap band `index` with its neighbour below (-1) or above (+1). */
export function moveBand(stack: UseBand[], index: number, dir: -1 | 1): UseBand[] {
  const bands = normalizeStack(stack);
  const other = index + dir;
  if (index < 0 || index >= bands.length || other < 0 || other >= bands.length) return bands;
  [bands[index], bands[other]] = [bands[other], bands[index]];
  return normalizeStack(bands);
}

export function setBandUse(stack: UseBand[], index: number, use: UseType): UseBand[] {
  return normalizeStack(normalizeStack(stack).map((b, k) => (k === index ? { ...b, use } : b)));
}

/** Halve band `index`; the upper half gets `use`. No change at MAX_BANDS. */
export function splitBand(stack: UseBand[], index: number, use: UseType): UseBand[] {
  const bands = normalizeStack(stack);
  const b = bands[index];
  if (!b || bands.length >= MAX_BANDS) return bands;
  bands.splice(index, 1, { use: b.use, share: b.share / 2 }, { use, share: b.share / 2 });
  return normalizeStack(bands);
}

/** Remove band `index`, giving its floors to the band below (or above, for the bottom band). Keeps the last band. */
export function removeBand(stack: UseBand[], index: number): UseBand[] {
  const bands = normalizeStack(stack);
  if (bands.length <= 1 || !bands[index]) return bands;
  const heir = index > 0 ? index - 1 : 1;
  bands[heir] = { ...bands[heir], share: bands[heir].share + bands[index].share };
  bands.splice(index, 1);
  return normalizeStack(bands);
}
