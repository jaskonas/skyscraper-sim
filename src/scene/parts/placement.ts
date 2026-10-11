import { FLOOR_HEIGHT, floorSlices, setbackScale, type FloorSlice } from '../../sim/geometry';
import type { Design, PlanShape } from '../../sim/types';

/**
 * A spot on the outside of one floor plan, in the floor's own (unrotated) frame.
 * `yaw` turns local +z to point straight out of the wall there.
 */
export interface Anchor {
  x: number;
  z: number;
  yaw: number;
}

export interface Face extends Anchor {
  /** Length of the wall, metres. */
  length: number;
}

const outwardYaw = (nx: number, nz: number) => Math.atan2(nx, nz);

/** Corners of the plan, going around. A round plan uses four points at 45°. */
export function planCorners(shape: PlanShape, width: number, depth: number): Anchor[] {
  const hw = width / 2;
  const hd = depth / 2;
  if (shape === 'circle') {
    return [45, 135, 225, 315].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return { x: hw * Math.sin(a), z: hd * Math.cos(a), yaw: a };
    });
  }
  if (shape === 'triangle') {
    // Matches the 3-sided CylinderGeometry used for triangular floors: x = r·sinθ, z = r·cosθ.
    return [0, 120, 240].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return { x: (width / Math.sqrt(3)) * Math.sin(a), z: (depth / Math.sqrt(3)) * Math.cos(a), yaw: a };
    });
  }
  return [
    { x: hw, z: hd, yaw: outwardYaw(1, 1) },
    { x: hw, z: -hd, yaw: outwardYaw(1, -1) },
    { x: -hw, z: -hd, yaw: outwardYaw(-1, -1) },
    { x: -hw, z: hd, yaw: outwardYaw(-1, 1) },
  ];
}

/** The straight walls of the plan (a round plan is treated as four quarter-walls). */
export function planFaces(shape: PlanShape, width: number, depth: number): Face[] {
  if (shape === 'circle') {
    return [0, 90, 180, 270].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return { x: (width / 2) * Math.sin(a), z: (depth / 2) * Math.cos(a), yaw: a, length: (Math.PI * width) / 4 };
    });
  }
  const c = planCorners(shape, width, depth);
  return c.map((p, i) => {
    const q = c[(i + 1) % c.length];
    const mx = (p.x + q.x) / 2;
    const mz = (p.z + q.z) / 2;
    let nx = q.z - p.z;
    let nz = -(q.x - p.x);
    if (nx * mx + nz * mz < 0) [nx, nz] = [-nx, -nz];
    return { x: mx, z: mz, yaw: outwardYaw(nx, nz), length: Math.hypot(q.x - p.x, q.z - p.z) };
  });
}

/** Points spaced about `spacing` apart around the outside of the plan. */
export function perimeterPoints(shape: PlanShape, width: number, depth: number, spacing: number): Anchor[] {
  if (shape === 'circle') {
    const n = Math.max(4, Math.round((Math.PI * width) / spacing));
    return Array.from({ length: n }, (_, i) => {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      return { x: (width / 2) * Math.sin(a), z: (depth / 2) * Math.cos(a), yaw: a };
    });
  }
  return pointsAlongFaces(shape, width, depth, (f) => Math.max(1, Math.round(f.length / spacing)));
}

/** `perFace(face)` evenly spaced points along each straight wall, never on a corner. */
export function pointsAlongFaces(shape: PlanShape, width: number, depth: number, perFace: (f: Face) => number): Anchor[] {
  const out: Anchor[] = [];
  for (const f of planFaces(shape, width, depth)) {
    const n = perFace(f);
    const ax = Math.cos(f.yaw); // local +x along the wall
    const az = -Math.sin(f.yaw);
    for (let k = 0; k < n; k++) {
      const s = ((k + 0.5) / n - 0.5) * f.length;
      out.push({ x: f.x + ax * s, z: f.z + az * s, yaw: f.yaw });
    }
  }
  return out;
}

export interface SetbackLevel {
  /** The last floor before the tower steps in (or the roof floor). */
  slice: FloorSlice;
  isRoof: boolean;
}

/** Floors just below each setback step, then the roof. */
export function setbackLevels(design: Design): SetbackLevel[] {
  const slices = floorSlices(design);
  const n = slices.length;
  const t = (i: number) => (n > 1 ? i / (n - 1) : 0);
  const levels: SetbackLevel[] = [];
  for (let i = 0; i < n - 1; i++) {
    if (setbackScale(design.setbacks, t(i + 1)) < setbackScale(design.setbacks, t(i)) - 1e-9) {
      levels.push({ slice: slices[i], isRoof: false });
    }
  }
  levels.push({ slice: slices[n - 1], isRoof: true });
  return levels;
}

/** Runs of floors between setbacks, split into chunks of at most `maxFloors` floors. */
export function floorRuns(design: Design, maxFloors: number): FloorSlice[][] {
  const slices = floorSlices(design);
  const breaks = new Set(setbackLevels(design).map((l) => l.slice.index));
  const runs: FloorSlice[][] = [];
  let current: FloorSlice[] = [];
  for (const s of slices) {
    current.push(s);
    if (breaks.has(s.index) || current.length >= maxFloors) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

/** The lowest `count` floors. */
export function baseFloors(design: Design, count: number): FloorSlice[] {
  return floorSlices(design).slice(0, Math.max(0, count));
}

/** Top of a floor (where a ledge or band sits). */
export const floorTop = (s: FloorSlice) => s.y + FLOOR_HEIGHT;
