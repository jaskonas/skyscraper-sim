export type Vec3 = [number, number, number];

/**
 * Toward the sun, world space (not normalised). Shared by the light, its shadows and the glass glint.
 * The sun is front-left and about 40° up, while the default camera looks from the front-right: shadows fall
 * back and to the right where you can see them, and the tower's right face is in shade, which shows its depth.
 */
export const SUN_DIRECTION: Vec3 = [-450, 420, 300];
/** How far back along the sun's direction the shadow camera sits from what it looks at. */
export const SUN_DISTANCE = 1500;
/** One shadow map, square: the most a low-end Chromebook GPU should be asked for. */
export const SHADOW_MAP_SIZE = 2048;

const MIN_HALF = 30;
const MAX_HALF = 600;

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * Where the sun's shadow camera goes to cover what the player is looking at: centred on the orbit target,
 * and as wide as the view (three quarters of the camera's distance), so shadows are crisp up close and
 * still there from far out. Deep enough to take in the tallest tower and its long shadow.
 */
export function shadowFrame(target: Vec3, cameraDistance: number): { position: Vec3; target: Vec3; halfSize: number; near: number; far: number } {
  const sun = norm(SUN_DIRECTION);
  const halfSize = Math.min(MAX_HALF, Math.max(MIN_HALF, 0.75 * cameraDistance));
  return {
    position: [target[0] + sun[0] * SUN_DISTANCE, target[1] + sun[1] * SUN_DISTANCE, target[2] + sun[2] * SUN_DISTANCE],
    target: [...target],
    halfSize,
    near: 1,
    far: 2 * SUN_DISTANCE + 1,
  };
}

/** Snaps a point to whole shadow-map texels across the sun's view, so shadow edges don't crawl while orbiting. */
export function snapToTexel(p: Vec3, halfSize: number): Vec3 {
  const f = norm(SUN_DIRECTION);
  const right = norm([f[2], 0, -f[0]]); // cross(up, f): level, across the sun's view
  const up: Vec3 = [f[1] * right[2] - f[2] * right[1], f[2] * right[0] - f[0] * right[2], f[0] * right[1] - f[1] * right[0]];
  const texel = (2 * halfSize) / SHADOW_MAP_SIZE;
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const dr = Math.round(dot(p, right) / texel) * texel - dot(p, right);
  const du = Math.round(dot(p, up) / texel) * texel - dot(p, up);
  return [p[0] + right[0] * dr + up[0] * du, p[1] + right[1] * dr + up[1] * du, p[2] + right[2] * dr + up[2] * du];
}

/** Solid things cast shadows and receive them; see-through things (a pool's water, ghosted floors) only receive. */
export function shadowFlags(material: { transparent?: boolean; opacity?: number }): { castShadow: boolean; receiveShadow: boolean } {
  const seeThrough = !!material.transparent && (material.opacity ?? 1) < 1;
  return { castShadow: !seeThrough, receiveShadow: true };
}

/** How far the soft contact shade spreads beyond a building's footprint, metres. */
export const CONTACT_MARGIN = 6;

export interface Footprint {
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation?: number;
}

/** The ground patches darkened where buildings meet it: each footprint grown by the margin all round. */
export function contactPatches(footprints: Footprint[]): Required<Footprint>[] {
  return footprints.map((f) => ({
    x: f.x,
    z: f.z,
    width: f.width + 2 * CONTACT_MARGIN,
    depth: f.depth + 2 * CONTACT_MARGIN,
    rotation: f.rotation ?? 0,
  }));
}
