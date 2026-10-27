import type { Vec3 } from '../../sim/parts';
import type { FlowLine } from '../../sim/systems/network';

const dist = (a: Vec3, b: Vec3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

export function lengthOf(points: Vec3[]): number {
  let L = 0;
  for (let i = 1; i < points.length; i++) L += dist(points[i - 1], points[i]);
  return L;
}

/** The point `t` (0..1) of the way along a polyline, by length. */
export function pointAlong(points: Vec3[], t: number): Vec3 {
  const L = lengthOf(points);
  let left = Math.min(1, Math.max(0, t)) * L;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const d = dist(a, b);
    if (left <= d || i === points.length - 1) {
      const k = d > 0 ? Math.min(1, left / d) : 0;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    }
    left -= d;
  }
  return [...points[points.length - 1]] as Vec3;
}

/**
 * Where the pulses go: each flowing line gets its pulses spread evenly along it (offsets 0..1), scaled down
 * together so the total stays within `cap`, but every flowing line keeps at least one while the cap allows.
 */
export function pulseLayout(lines: FlowLine[], cap: number): { line: number; offset: number }[] {
  const flowing = lines.map((l, i) => ({ i, n: l.pulses })).filter((x) => x.n > 0);
  const total = flowing.reduce((s, x) => s + x.n, 0);
  const k = total > cap ? cap / total : 1;
  let counts = flowing.map((x) => ({ i: x.i, n: Math.max(1, Math.floor(x.n * k)) }));
  let sum = counts.reduce((s, x) => s + x.n, 0);
  // Still over (many one-pulse lines): trim the biggest first, then drop lines.
  counts.sort((a, b) => b.n - a.n);
  for (const c of counts) {
    while (sum > cap && c.n > 1) {
      c.n--;
      sum--;
    }
  }
  if (sum > cap) counts = counts.slice(0, cap);
  const out: { line: number; offset: number }[] = [];
  for (const c of counts) for (let j = 0; j < c.n; j++) out.push({ line: c.i, offset: j / c.n });
  return out;
}

/** Every straight piece of every line, for drawing as struts. */
export function segmentsOf(lines: FlowLine[]): { a: Vec3; b: Vec3; color: string; width: number }[] {
  const out: { a: Vec3; b: Vec3; color: string; width: number }[] = [];
  for (const l of lines) for (let i = 1; i < l.points.length; i++) out.push({ a: l.points[i - 1], b: l.points[i], color: l.color, width: l.width });
  return out;
}

/** An elevator car's round trip: the stops it pauses at, going up and then down again. */
export interface CarTrip {
  times: number[];
  heights: number[];
}

const PAUSE_S = 1;

/** A car's trip: up through its pauses and back, at a speed that makes the ride take a few seconds. */
export function carTrip(stops: number[], express: boolean, seed: number): CarTrip {
  const pauses = express || stops.length <= 6 ? stops : [0, 1, 2, 3, 4, 5].map((k) => stops[Math.min(stops.length - 1, Math.round(((k + (seed % 3) * 0.3) * (stops.length - 1)) / 5))]);
  const unique = [...new Set(pauses)].sort((a, b) => a - b);
  const span = Math.max(1, unique[unique.length - 1] - unique[0]);
  const speed = span / 4;
  const path = [...unique, ...unique.slice(0, -1).reverse()];
  const times: number[] = [];
  const heights: number[] = [];
  let t = 0;
  path.forEach((h, i) => {
    if (i > 0) t += Math.abs(h - path[i - 1]) / speed;
    times.push(t, t + PAUSE_S);
    heights.push(h, h);
    t += PAUSE_S;
  });
  return { times, heights };
}

/** A car's height `t` seconds into its looping trip. */
export function carHeight(trip: CarTrip, t: number): number {
  const total = trip.times[trip.times.length - 1];
  if (total <= 0) return trip.heights[0];
  const u = ((t % total) + total) % total;
  for (let i = 1; i < trip.times.length; i++) {
    if (u <= trip.times[i]) {
      const span = trip.times[i] - trip.times[i - 1];
      const k = span > 0 ? (u - trip.times[i - 1]) / span : 0;
      return trip.heights[i - 1] + (trip.heights[i] - trip.heights[i - 1]) * k;
    }
  }
  return trip.heights[trip.heights.length - 1];
}
