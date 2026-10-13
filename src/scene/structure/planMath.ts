import type { PlanShape } from '../../sim/types';
import { planCorners } from '../parts/placement';

/** A point a fraction `u` (0..1) of the way round the outside of the plan, pulled `inset` metres inwards. */
export function perimeterAt(shape: PlanShape, width: number, depth: number, u: number, inset = 0): [number, number] {
  if (shape === 'circle') {
    const a = u * Math.PI * 2;
    return [(width / 2 - inset) * Math.sin(a), (depth / 2 - inset) * Math.cos(a)];
  }
  const c = planCorners(shape, width, depth);
  const lengths = c.map((p, i) => Math.hypot(c[(i + 1) % c.length].x - p.x, c[(i + 1) % c.length].z - p.z));
  let s = (((u % 1) + 1) % 1) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < c.length; i++) {
    if (s <= lengths[i] || i === c.length - 1) {
      const p = c[i];
      const q = c[(i + 1) % c.length];
      const k = Math.min(1, s / lengths[i]);
      const x = p.x + (q.x - p.x) * k;
      const z = p.z + (q.z - p.z) * k;
      const r = Math.hypot(x, z);
      return r > 1e-9 ? [x - (x / r) * inset, z - (z / r) * inset] : [x, z];
    }
    s -= lengths[i];
  }
  return [c[0].x, c[0].z];
}

/** True when (x, z) is inside the plan and at least `margin` metres from its edge. */
export function insidePlan(shape: PlanShape, width: number, depth: number, x: number, z: number, margin = 0): boolean {
  if (shape === 'circle') return Math.hypot(x / (width / 2 - margin), z / (depth / 2 - margin)) <= 1;
  if (shape !== 'triangle') return Math.abs(x) <= width / 2 - margin && Math.abs(z) <= depth / 2 - margin;
  const c = planCorners(shape, width, depth);
  return c.every((p, i) => {
    const q = c[(i + 1) % c.length];
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    const side = ((q.x - p.x) * (z - p.z) - (q.z - p.z) * (x - p.x)) / len;
    const centre = ((q.x - p.x) * -p.z - (q.z - p.z) * -p.x) / len;
    return Math.sign(side) === Math.sign(centre) && Math.abs(side) >= margin;
  });
}

/**
 * The stretch of a straight line inside the plan: the line x = c (axis 'x') or z = c (axis 'z'),
 * kept `margin` metres from the edge. Returns [from, to] along the other axis, or null if it misses.
 */
export function chord(shape: PlanShape, width: number, depth: number, axis: 'x' | 'z', c: number, margin = 0): [number, number] | null {
  const span = axis === 'x' ? depth : width;
  let lo = Infinity;
  let hi = -Infinity;
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const s = -span / 2 + (span * i) / steps;
    const inside = axis === 'x' ? insidePlan(shape, width, depth, c, s, margin) : insidePlan(shape, width, depth, s, c, margin);
    if (inside) {
      lo = Math.min(lo, s);
      hi = Math.max(hi, s);
    }
  }
  return hi > lo ? [lo, hi] : null;
}

/** Points round the outside, as straight segments: the plan's corners, or 12 points round a circle. */
export function ringPoints(shape: PlanShape, width: number, depth: number, inset: number): [number, number][] {
  const n = shape === 'circle' ? 12 : shape === 'triangle' ? 3 : 4;
  if (shape === 'circle') return Array.from({ length: n }, (_, i) => perimeterAt(shape, width, depth, i / n, inset));
  return planCorners(shape, width, depth).map((p) => {
    const r = Math.hypot(p.x, p.z);
    return [p.x - (p.x / r) * inset * Math.SQRT2, p.z - (p.z / r) * inset * Math.SQRT2] as [number, number];
  });
}
