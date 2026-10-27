import { describe, expect, it } from 'vitest';
import type { FlowLine } from '../../sim/systems/network';
import { pointAlong, pulseLayout, segmentsOf } from './flow';

const line = (pulses: number, points: [number, number, number][] = [[0, 0, 0], [10, 0, 0], [10, 10, 0]]): FlowLine => ({ kind: 'riser', points, color: '#fff', width: 0.2, pulses });

describe('flow', () => {
  it('walks a polyline by length', () => {
    const pts = line(1).points;
    expect(pointAlong(pts, 0)).toEqual([0, 0, 0]);
    expect(pointAlong(pts, 1)).toEqual([10, 10, 0]);
    expect(pointAlong(pts, 0.25)).toEqual([5, 0, 0]);
    expect(pointAlong(pts, 0.75)).toEqual([10, 5, 0]);
  });

  it('keeps pulses under the cap, keeps every flowing line flowing, and skips still lines', () => {
    const lines = [line(300), line(300), line(0), line(2)];
    const layout = pulseLayout(lines, 400);
    expect(layout.length).toBeLessThanOrEqual(400);
    expect(layout.some((p) => p.line === 2)).toBe(false);
    for (const i of [0, 1, 3]) expect(layout.some((p) => p.line === i)).toBe(true);
    for (const p of layout) expect(p.offset).toBeGreaterThanOrEqual(0);
    expect(pulseLayout([line(3)], 400)).toHaveLength(3);
  });

  it('splits lines into segments for drawing', () => {
    expect(segmentsOf([line(1), line(0, [[0, 0, 0], [1, 0, 0]])])).toHaveLength(3);
  });
});
