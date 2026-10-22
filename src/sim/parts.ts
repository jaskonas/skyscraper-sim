/**
 * A part is one simple solid in a crown or ornament. Every unit shape fits the cube
 * [-0.5, 0.5]³, so `scale` is the part's size in metres and `position` its centre.
 * Rotation is Euler angles in Y-X-Z order (yaw first), so turning a whole group about
 * the vertical axis just adds to `rotation[1]`.
 */
export type Vec3 = [number, number, number];

export type PartShape =
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'pyramid'
  | 'sphere'
  | 'dome'
  | 'torus'
  /** A half ring standing upright in the x-y plane, open at the bottom: a doorway arch. */
  | 'arch'
  | 'wedge'
  /** A slab of the tower's own plan shape (square, round or triangular). */
  | 'plan'
  /** A pointed cap of the tower's own plan shape (pyramid, cone or 3-sided pyramid). */
  | 'plan-cone';

export const PART_MATERIALS = [
  'body', 'accent', 'glass', 'stone', 'concrete', 'copper', 'gold', 'steel', 'foliage', 'ruby', 'light', 'interior', 'girder', 'wood', 'blind', 'pane',
] as const;
export type PartMaterial = (typeof PART_MATERIALS)[number];

export interface Part {
  shape: PartShape;
  position: Vec3;
  scale: Vec3;
  rotation?: Vec3;
  material: PartMaterial;
  /** Glows at night. */
  glow?: boolean;
  /** The colour it glows in, instead of its material's (a lit window, in its floor's light). */
  glowColor?: string;
  /** 'spin': turns about its own z axis. 'blink': aircraft-warning light at night. */
  animate?: 'spin' | 'blink';
}

/** R = Ry(y) · Rx(x) · Rz(z), applied to v. */
export function rotateYXZ(v: Vec3, r: Vec3 = [0, 0, 0]): Vec3 {
  let [x, y, z] = v;
  const [rx, ry, rz] = r;
  // Rz
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  // Rx
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  // Ry
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  return [x, y, z];
}

/** Axis-aligned bounds of the part's unit cube after scale, rotation and translation. */
export function partBounds(p: Part): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const sx of [-0.5, 0.5])
    for (const sy of [-0.5, 0.5])
      for (const sz of [-0.5, 0.5]) {
        const c = rotateYXZ([sx * p.scale[0], sy * p.scale[1], sz * p.scale[2]], p.rotation);
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], c[i] + p.position[i]);
          max[i] = Math.max(max[i], c[i] + p.position[i]);
        }
      }
  return { min, max };
}

/** A thin box running from `from` to `to`. */
export function strutPart(from: Vec3, to: Vec3, thickness: number, material: PartMaterial): Part {
  const d: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(...d);
  const horizontal = Math.hypot(d[0], d[2]);
  const tilt = Math.atan2(horizontal, d[1]);
  const yaw = horizontal > 1e-9 ? Math.atan2(d[0], d[2]) : 0;
  return {
    shape: 'box',
    position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2],
    scale: [thickness, length, thickness],
    rotation: [tilt, yaw, 0],
    material,
  };
}

/** Rotate a part about the vertical axis through the origin, then lift it by `dy`. */
export function placePart(p: Part, yaw: number, dy = 0): Part {
  const [x, y, z] = rotateYXZ(p.position, [0, yaw, 0]);
  const r = p.rotation ?? [0, 0, 0];
  return { ...p, position: [x, y + dy, z], rotation: [r[0], r[1] + yaw, r[2]] };
}

export function partIsFinite(p: Part): boolean {
  return [...p.position, ...p.scale, ...(p.rotation ?? [])].every(Number.isFinite);
}
