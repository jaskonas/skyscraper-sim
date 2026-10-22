import { rotateYXZ, strutPart, type Part, type PartMaterial, type Vec3 } from '../../sim/parts';
import { perimeterPoints, planCorners, type Anchor } from '../parts/placement';
import type { CrownContext } from './types';

/**
 * Architectural pieces for building crowns, in the crown's own frame: y = 0 at the roof, centred on the
 * tower's axis. Each returns plain parts; small decorative pieces are marked `fine` (drawn only up close).
 */

const many = (p: Part | Part[]) => (Array.isArray(p) ? p : [p]);

/** Moves a part built at the origin (facing +z) out to an anchor, turned to face out from it. */
export function placeAt(p: Part, at: Vec3, yaw: number): Part {
  const r = p.rotation ?? [0, 0, 0];
  const [x, y, z] = rotateYXZ(p.position, [0, yaw, 0]);
  return { ...p, position: [at[0] + x, at[1] + y, at[2] + z], rotation: [r[0], r[1] + yaw, r[2]] };
}

/** `n` copies round a circle of `radius` at height `y`, each built facing +z and turned to face out. */
export function ring(n: number, radius: number, y: number, make: (angle: number, i: number) => Part | Part[], phase = 0): Part[] {
  const out: Part[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    for (const p of many(make(a, i))) {
      const base = { ...p, rotation: [p.rotation?.[0] ?? 0, 0, p.rotation?.[2] ?? 0] as Vec3 };
      out.push(placeAt(base, [radius * Math.sin(a), y, radius * Math.cos(a)], a));
    }
  }
  return out;
}

/** Copies spaced about `spacing` apart along the plan's walls, `inset` metres in, each facing out. */
export function aroundPlan(ctx: CrownContext, inset: number, spacing: number, y: number, make: (a: Anchor) => Part | Part[], scale = 1): Part[] {
  const w = Math.max(1, ctx.W * scale - 2 * inset);
  const d = Math.max(1, ctx.D * scale - 2 * inset);
  return perimeterPoints(ctx.shape, w, d, spacing).flatMap((a) => many(make(a)).map((p) => placeAt(p, [a.x, y, a.z], a.yaw)));
}

/** A copy at each corner of the plan (four on a round one), `spread` of the way out, facing out. */
export function atCorners(ctx: CrownContext, spread: number, make: (c: Anchor) => Part | Part[]): Part[] {
  return planCorners(ctx.shape, ctx.W * spread, ctx.D * spread).flatMap((c) => many(make(c)).map((p) => placeAt(p, [c.x, 0, c.z], c.yaw)));
}

/** A ball, a neck and a point on top: ends a spire or a pinnacle. `h` tall from `y`. */
export function finial(x: number, y: number, z: number, h: number, material: PartMaterial): Part[] {
  const w = h * 0.3;
  return [
    { shape: 'sphere', position: [x, y + h * 0.2, z], scale: [w, h * 0.4, w], material },
    { shape: 'cylinder', position: [x, y + h * 0.475, z], scale: [w * 0.35, h * 0.15, w * 0.35], material },
    { shape: 'cone', position: [x, y + h * 0.775, z], scale: [w * 0.5, h * 0.45, w * 0.5], material, fine: true },
  ];
}

/**
 * A Gothic pinnacle `h` tall standing at (x, y, z): an eight-sided shaft, a band of little gables, a spire
 * with crockets climbing its edges, and a finial.
 */
export function pinnacle(x: number, y: number, z: number, h: number, w: number, material: PartMaterial, crockets: number): Part[] {
  const shaft = h * 0.4;
  const gable = h * 0.1;
  const spire = h * 0.4;
  const parts: Part[] = [
    { shape: 'octagon', position: [x, y + shaft / 2, z], scale: [w, shaft, w], material },
    { shape: 'octagon', position: [x, y + shaft + gable / 2, z], scale: [w * 1.12, gable, w * 1.12], material },
    { shape: 'cone', position: [x, y + shaft + gable + spire / 2, z], scale: [w * 0.9, spire, w * 0.9], material },
  ];
  // Gablets round the band, and crockets up the spire's edges.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2;
    parts.push({ shape: 'pyramid', position: [x + Math.sin(a) * w * 0.5, y + shaft + gable * 1.2, z + Math.cos(a) * w * 0.5], scale: [w * 0.45, gable * 1.2, 0.12], rotation: [0, a, 0], material, fine: true });
  }
  for (let k = 0; k < crockets; k++) {
    const t = (k + 0.5) / crockets;
    const a = (k / crockets) * Math.PI * 4;
    const r = w * 0.45 * (1 - t);
    const cy = y + shaft + gable + spire * t;
    parts.push({ shape: 'cone', position: [x + Math.sin(a) * r, cy, z + Math.cos(a) * r], scale: [w * 0.14, w * 0.22, w * 0.14], rotation: [0.6, a, 0], material, fine: true });
  }
  parts.push(...finial(x, y + shaft + gable + spire * 0.97, z, h * 0.1 + spire * 0.03, material));
  return parts;
}

/**
 * A braced lattice tower from y0 to y1, `sides`-sided, tapering from radius r0 to r1, in `bays` stories:
 * corner chords, a ring at each joint, and X-bracing on every face of every bay (fine).
 */
export function lattice(y0: number, y1: number, r0: number, r1: number, sides: number, bays: number, thickness: number, material: PartMaterial): Part[] {
  const parts: Part[] = [];
  const corner = (i: number, t: number): Vec3 => {
    const a = (i / sides) * Math.PI * 2 + Math.PI / sides;
    const r = r0 + (r1 - r0) * t;
    return [Math.sin(a) * r, y0 + (y1 - y0) * t, Math.cos(a) * r];
  };
  for (let i = 0; i < sides; i++) parts.push(strutPart(corner(i, 0), corner(i, 1), thickness, material));
  for (let b = 1; b <= bays; b++) {
    const t = b / bays;
    const t0 = (b - 1) / bays;
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      if (i === 0) parts.push(...Array.from({ length: sides }, (_, k) => strutPart(corner(k, t), corner((k + 1) % sides, t), thickness * 0.8, material)));
      parts.push({ ...strutPart(corner(i, t0), corner(j, t), thickness * 0.5, material), fine: true });
      parts.push({ ...strutPart(corner(j, t0), corner(i, t), thickness * 0.5, material), fine: true });
    }
  }
  return parts;
}

/**
 * One tier of a stepped crown: a slab of the plan shape `w` of the roof's width from y0 to y1, with a
 * moulding band on top and `windows` lit windows per side (round plans: per quarter).
 */
export function tier(ctx: CrownContext, y0: number, y1: number, w: number, material: PartMaterial, opts: { windows?: number; band?: boolean } = {}): Part[] {
  const h = y1 - y0;
  const band = opts.band ? Math.min(0.6, h * 0.12) : 0;
  const parts: Part[] = [{ shape: 'plan', position: [0, y0 + (h - band) / 2, 0], scale: [ctx.W * w, h - band, ctx.D * w], material }];
  if (band) parts.push({ shape: 'plan', position: [0, y1 - band / 2, 0], scale: [ctx.W * w * 1.06, band, ctx.D * w * 1.06], material: 'accent' });
  if (opts.windows) {
    const side = Math.min(ctx.W, ctx.D) * w;
    const spacing = side / opts.windows;
    const winH = Math.min(h * 0.55, 3);
    parts.push(
      ...aroundPlan(
        ctx,
        0,
        spacing,
        y0 + h * 0.45,
        () => windowPane([spacing * 0.45, winH, 0.1], [0, 0, 0.02]),
        w,
      ),
    );
  }
  return parts;
}

/** `n` vertical ribs round a circle from (r0, y0) to (r1, y1): the ribs of a dome, a drum or a spire. */
export function ribs(n: number, r0: number, r1: number, y0: number, y1: number, thickness: number, material: PartMaterial, fine = false): Part[] {
  const out: Part[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = strutPart([Math.sin(a) * r0, y0, Math.cos(a) * r0], [Math.sin(a) * r1, y1, Math.cos(a) * r1], thickness, material);
    out.push(fine ? { ...p, fine: true } : p);
  }
  return out;
}

/** Warm light from a lit window at night. */
export const WINDOW_GLOW = '#ffd98a';

/** A window: glass by day, glowing warm at night (fine work). */
export function windowPane(scale: Vec3, position: Vec3 = [0, 0, 0], extra: Partial<Part> = {}): Part {
  return { shape: 'box', position, scale, material: 'pane', glow: true, glowColor: WINDOW_GLOW, fine: true, ...extra };
}

/** The rough width of the roof: the smaller of its two sides. */
export const roofSize = (ctx: CrownContext) => Math.min(ctx.W, ctx.D);
