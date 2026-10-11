import { rotateYXZ, type Part } from '../sim/parts';

type Pt = [number, number];

/** Outline of a unit shape in its own x-y plane (front view), before scale/rotation. */
function unitOutline(p: Part): [number, number, number][] {
  switch (p.shape) {
    case 'cone':
    case 'pyramid':
    case 'plan-cone':
      return [[-0.5, -0.5, 0], [0.5, -0.5, 0], [0, 0.5, 0]];
    case 'wedge':
      return [[-0.5, -0.5, 0], [0.5, -0.5, 0], [-0.5, 0.5, 0]];
    case 'sphere':
      return Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return [0.5 * Math.cos(a), 0.5 * Math.sin(a), 0];
      });
    case 'dome':
      return Array.from({ length: 9 }, (_, i) => {
        const a = (i / 8) * Math.PI;
        return [0.5 * Math.cos(a), -0.5 + Math.sin(a), 0];
      });
    default: {
      const c: [number, number, number][] = [];
      for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) c.push([x, y, z]);
      return c;
    }
  }
}

/** Convex hull (monotone chain), counter-clockwise. */
function hull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** The part as seen from the front: a polygon in world x (right) and y (up). */
export function partOutline(p: Part): Pt[] {
  const pts = unitOutline(p).map(([x, y, z]) => {
    const r = rotateYXZ([x * p.scale[0], y * p.scale[1], z * p.scale[2]], p.rotation);
    return [r[0] + p.position[0], r[1] + p.position[1]] as Pt;
  });
  return hull(pts);
}

export interface Silhouette {
  /** SVG viewBox "minX minY width height" in a y-down frame. */
  viewBox: string;
  /** Width (= height) of the view box, in metres. */
  size: number;
  /** One path per material, so icons can colour the tower and its detail differently. */
  paths: { material: Part['material']; d: string }[];
}

/** Front-view SVG paths for a set of parts, fitted to a square box with a little margin. */
export function silhouette(parts: Part[]): Silhouette {
  const outlines = parts.map((p) => ({ material: p.material, pts: partOutline(p) }));
  const all = outlines.flatMap((o) => o.pts);
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  const size = Math.max(maxX - minX, maxY - minY) * 1.08;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const byMaterial = new Map<Part['material'], string>();
  for (const o of outlines) {
    const d = o.pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x - cx).toFixed(2)} ${(cy - y).toFixed(2)}`).join('') + 'Z';
    byMaterial.set(o.material, (byMaterial.get(o.material) ?? '') + d);
  }
  return {
    size,
    viewBox: `${(-size / 2).toFixed(2)} ${(-size / 2).toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)}`,
    paths: [...byMaterial].map(([material, d]) => ({ material, d })),
  };
}
