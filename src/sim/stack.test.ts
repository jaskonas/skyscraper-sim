import { describe, expect, it } from 'vitest';
import { bandAt, bandFloors, bandMiddle, moveBand, moveBoundary, normalizeStack, removeBand, setBandUse, splitBand, stackFromMix } from './stack';
import { USE_ORDER, type UseBand, type UseType } from './types';

/** The fixed-order rule floorUses used before zones (copied from massing.ts). */
function oldFloorUses(mix: Record<UseType, number>, floors: number): UseType[] {
  const total = USE_ORDER.reduce((s, u) => s + Math.max(0, mix[u]), 0);
  const shares = Object.fromEntries(USE_ORDER.map((u) => [u, Math.max(0, mix[u]) / total])) as Record<UseType, number>;
  const uses: UseType[] = [];
  for (let i = 0; i < floors; i++) {
    const t = (i + 0.5) / floors;
    let use: UseType = 'office';
    let cumulative = 0;
    for (const u of USE_ORDER) {
      cumulative += shares[u];
      if (t <= cumulative + 1e-9) {
        use = u;
        break;
      }
    }
    uses.push(use);
  }
  return uses;
}

const perFloor = (stack: UseBand[], floors: number) => bandFloors(stack, floors).flatMap((b) => Array.from({ length: b.to - b.from + 1 }, () => b.use));
const spans = (stack: UseBand[], floors: number) => bandFloors(stack, floors).map((b) => [b.use, b.from, b.to]);

describe('stack', () => {
  it('stackFromMix keeps the old order and drops zeros', () => {
    expect(stackFromMix({ retail: 10, office: 90, hotel: 0, residential: 0 })).toEqual([
      { use: 'retail', share: 10 },
      { use: 'office', share: 90 },
    ]);
  });

  it('bandFloors matches the old midpoint rule', () => {
    const cases: [Record<UseType, number>, number][] = [
      [{ retail: 10, office: 50, hotel: 0, residential: 40 }, 10],
      [{ retail: 5, office: 60, hotel: 25, residential: 10 }, 110],
      [{ retail: 10, office: 90, hotel: 0, residential: 0 }, 40],
      [{ retail: 0, office: 1, hotel: 0, residential: 3 }, 37],
    ];
    for (const [mix, floors] of cases) expect(perFloor(stackFromMix(mix), floors)).toEqual(oldFloorUses(mix, floors));
  });

  it('bandFloors covers every floor once even with fewer floors than bands', () => {
    const six: UseBand[] = ['retail', 'office', 'hotel', 'residential', 'office', 'retail'].map((use) => ({ use: use as UseType, share: 10 }));
    const b = bandFloors(six, 4);
    expect(b.flatMap((s) => Array.from({ length: s.to - s.from + 1 }, (_, k) => s.from + k))).toEqual([0, 1, 2, 3]);
    for (const s of b) expect(s.from).toBeLessThanOrEqual(s.to);
  });

  it('bandFloors gives each band at least one floor when there is room', () => {
    const s: UseBand[] = [{ use: 'retail', share: 1 }, { use: 'office', share: 98 }, { use: 'hotel', share: 1 }];
    expect(spans(s, 40)).toEqual([['retail', 0, 0], ['office', 1, 38], ['hotel', 39, 39]]);
  });

  it('normalizeStack merges same-use neighbours and caps at 6', () => {
    expect(normalizeStack([{ use: 'office', share: 30 }, { use: 'office', share: 30 }])).toEqual([{ use: 'office', share: 100 }]);
    const seven = (['retail', 'office', 'hotel', 'residential', 'office', 'retail', 'hotel'] as UseType[]).map((use) => ({ use, share: 10 }));
    const n = normalizeStack(seven);
    expect(n).toHaveLength(6);
    expect(n.reduce((s, b) => s + b.share, 0)).toBeCloseTo(100);
    expect(normalizeStack([])).toEqual([{ use: 'office', share: 100 }]);
    expect(normalizeStack([{ use: 'hotel', share: 0 }, { use: 'office', share: -5 }])).toEqual([{ use: 'office', share: 100 }]);
  });

  it('moveBoundary clamps so both bands keep a floor', () => {
    const s: UseBand[] = [{ use: 'office', share: 50 }, { use: 'residential', share: 50 }];
    expect(spans(moveBoundary(s, 40, 0, 0), 40)).toEqual([['office', 0, 0], ['residential', 1, 39]]);
    expect(spans(moveBoundary(s, 40, 0, 99), 40)).toEqual([['office', 0, 38], ['residential', 39, 39]]);
    expect(spans(moveBoundary(s, 40, 0, 30), 40)).toEqual([['office', 0, 29], ['residential', 30, 39]]);
  });

  it('moveBoundary only moves the two bands it sits between', () => {
    const s: UseBand[] = [{ use: 'retail', share: 10 }, { use: 'office', share: 60 }, { use: 'hotel', share: 30 }];
    expect(spans(moveBoundary(s, 40, 1, 20), 40)).toEqual([['retail', 0, 3], ['office', 4, 19], ['hotel', 20, 39]]);
  });

  it('moveBand swaps with the neighbour and ignores the ends', () => {
    const s: UseBand[] = [{ use: 'retail', share: 10 }, { use: 'office', share: 60 }, { use: 'hotel', share: 30 }];
    expect(moveBand(s, 0, 1).map((b) => b.use)).toEqual(['office', 'retail', 'hotel']);
    expect(moveBand(s, 2, -1).map((b) => b.use)).toEqual(['retail', 'hotel', 'office']);
    expect(moveBand(s, 0, -1)).toEqual(s);
    expect(moveBand(s, 2, 1)).toEqual(s);
  });

  it('setBandUse changes one band and merges', () => {
    const s: UseBand[] = [{ use: 'retail', share: 10 }, { use: 'office', share: 60 }, { use: 'hotel', share: 30 }];
    expect(setBandUse(s, 2, 'office')).toEqual([{ use: 'retail', share: 10 }, { use: 'office', share: 90 }]);
  });

  it('splitBand halves the band', () => {
    expect(spans(splitBand([{ use: 'office', share: 100 }], 0, 'hotel'), 40)).toEqual([['office', 0, 19], ['hotel', 20, 39]]);
    const six = (['retail', 'office', 'hotel', 'residential', 'office', 'retail'] as UseType[]).map((use) => ({ use, share: 100 / 6 }));
    expect(splitBand(six, 0, 'hotel')).toEqual(normalizeStack(six));
  });

  it('removeBand merges same-use neighbours', () => {
    const s: UseBand[] = [{ use: 'retail', share: 10 }, { use: 'office', share: 60 }, { use: 'retail', share: 30 }];
    expect(removeBand(s, 1)).toEqual([{ use: 'retail', share: 100 }]);
    expect(removeBand([{ use: 'office', share: 100 }], 0)).toEqual([{ use: 'office', share: 100 }]);
    expect(removeBand([{ use: 'retail', share: 10 }, { use: 'office', share: 90 }], 0)).toEqual([{ use: 'office', share: 100 }]);
  });

  it('moveBoundary keeps zones that have no floors', () => {
    const six = (['retail', 'office', 'hotel', 'residential', 'office', 'retail'] as UseType[]).map((use) => ({ use, share: 100 / 6 }));
    const visible = bandFloors(six, 4);
    expect(visible.length).toBeLessThan(6);
    const moved = moveBoundary(six, 4, 0, 2);
    expect(moved).toHaveLength(6);
    expect(bandFloors(moved, 40)).toHaveLength(6);
  });

  it('bandAt finds the zone covering a point, bandMiddle gives a zone\'s middle', () => {
    const s: UseBand[] = [{ use: 'retail', share: 10 }, { use: 'office', share: 60 }, { use: 'hotel', share: 30 }];
    expect(bandMiddle(s, 1)).toBeCloseTo(40);
    expect(bandAt(s, 5)).toBe(0);
    expect(bandAt(s, 40)).toBe(1);
    expect(bandAt(s, 99)).toBe(2);
  });
});
