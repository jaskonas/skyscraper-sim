import { describe, expect, it } from 'vitest';
import { partBounds, type Part } from '../../sim/parts';
import { aroundPlan, atCorners, finial, lattice, pinnacle, ribs, ring, tier } from './kit';
import type { CrownContext } from './types';

const ctx: CrownContext = { shape: 'square', W: 30, D: 30, H: 40, ornament: 'high' };
const top = (parts: Part[]) => Math.max(...parts.map((p) => partBounds(p).max[1]));
const radius = (p: Part) => Math.hypot(p.position[0], p.position[2]);

describe('crown kit', () => {
  it('rings copies round a circle, each facing out', () => {
    const parts = ring(8, 10, 2, (a) => ({ shape: 'box', position: [0, 0, 0], scale: [1, 1, 1], material: 'stone', rotation: [0, a, 0] }));
    expect(parts).toHaveLength(8);
    for (const p of parts) {
      expect(radius(p)).toBeCloseTo(10, 6);
      expect(p.position[1]).toBe(2);
      const d = p.rotation![1] - Math.atan2(p.position[0], p.position[2]);
      expect(Math.cos(d)).toBeCloseTo(1, 6);
    }
  });

  it('places along the walls and at the corners', () => {
    expect(aroundPlan(ctx, 1, 3, 0, () => ({ shape: 'box', position: [0, 0, 0], scale: [1, 1, 1], material: 'stone' })).length).toBeGreaterThanOrEqual(36);
    expect(atCorners(ctx, 0.9, () => ({ shape: 'box', position: [0, 0, 0], scale: [1, 1, 1], material: 'stone' }))).toHaveLength(4);
  });

  it('a pinnacle reaches its height, with crockets and a finial as fine work', () => {
    const p = pinnacle(5, 2, -3, 12, 1.5, 'stone', 6);
    expect(top(p)).toBeCloseTo(14, 1);
    expect(p.filter((q) => q.fine).length).toBeGreaterThanOrEqual(7);
    expect(Math.min(...p.map((q) => partBounds(q).min[1]))).toBeGreaterThanOrEqual(2 - 1e-9);
  });

  it('a finial is a ball, a neck and a point', () => {
    const f = finial(0, 10, 0, 3, 'gold');
    expect(f).toHaveLength(3);
    expect(top(f)).toBeCloseTo(13, 6);
  });

  it('a lattice has chords, rings and fine diagonals, within its radius', () => {
    const l = lattice(0, 20, 3, 1, 4, 5, 0.2, 'steel');
    const fine = l.filter((p) => p.fine);
    expect(fine.length).toBeGreaterThanOrEqual(4 * 5 * 2);
    expect(l.length - fine.length).toBeGreaterThanOrEqual(4 + 5);
    for (const p of l) expect(radius(p)).toBeLessThanOrEqual(3.2);
    expect(top(l)).toBeCloseTo(20, 0);
  });

  it('a tier is a slab with a moulding and lit windows round it', () => {
    const t = tier(ctx, 0, 6, 0.8, 'body', { windows: 6, band: true });
    expect(t.filter((p) => p.glow && p.fine).length).toBeGreaterThanOrEqual(24);
    expect(top(t)).toBeCloseTo(6, 6);
  });

  it('ribs taper from one radius to another', () => {
    const r = ribs(12, 5, 1, 0, 10, 0.3, 'steel');
    expect(r).toHaveLength(12);
    for (const p of r) expect(radius(p)).toBeGreaterThan(1 - 0.01);
  });
});
