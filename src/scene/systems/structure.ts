import { FLOOR_HEIGHT, floorSlices } from '../../sim/geometry';
import { placePart, strutPart, type Part, type Vec3 } from '../../sim/parts';
import type { Design } from '../../sim/types';
import { mechanicalFloors } from '../facadeDetail';
import { BRACE_FLOORS, braceCorners } from '../ornaments';
import { planFaces } from '../parts/placement';

/**
 * The engineering on exposed structure: flanges, node plates, gussets and bolts on X-braces (cast nodes on
 * a diagrid), and belt trusses round the plant floors of outrigger and bundled-tube towers.
 * Built in each floor's own frame, then turned with it. Small pieces are `fine`.
 */

const add = (a: Vec3, b: Vec3, k = 1): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** How far proud of the brace's centre line its face plates sit. */
const PROUD = 0.45;

/** Bolts on a plate facing `out`: `n` × `n` grid, `gap` apart. */
function bolts(at: Vec3, out: Vec3, yaw: number, n: number, gap: number): Part[] {
  const along: Vec3 = [out[2], 0, -out[0]];
  const parts: Part[] = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const u = (i - (n - 1) / 2) * gap;
      const v = (j - (n - 1) / 2) * gap;
      const p = add(add(add(at, along, u), [0, 1, 0], v), out, 0.1);
      parts.push({ shape: 'cylinder', position: p, scale: [0.16, 0.2, 0.16], rotation: [Math.PI / 2, yaw, 0], material: 'steel', fine: true });
    }
  return parts;
}

/** Detail on the exposed braces that `bracingParts` draws: same segments, same corners. */
export function braceDetailParts(design: Design): Part[] {
  if (!design.exposedStructure) return [];
  const slices = floorSlices(design);
  const diagrid = design.system === 'diagrid';
  const parts: Part[] = [];
  for (let start = 0; start < slices.length; start += BRACE_FLOORS) {
    const bottom = slices[start];
    const end = slices[Math.min(start + BRACE_FLOORS, slices.length) - 1];
    const mid = slices[Math.floor((start + end.index) / 2)];
    const y0 = bottom.y;
    const y1 = end.y + FLOOR_HEIGHT;
    const corners = braceCorners(design.shape, bottom.width + 1.2, bottom.depth + 1.2);
    const local: Part[] = [];
    corners.forEach((c, i) => {
      const q = corners[(i + 1) % corners.length];
      // The face's outward direction (away from the tower's axis).
      let out: Vec3 = norm([q.z - c.z, 0, -(q.x - c.x)]);
      if (out[0] * (c.x + q.x) + out[2] * (c.z + q.z) < 0) out = [-out[0], 0, -out[2]];
      const yaw = Math.atan2(out[0], out[2]);
      const ends: [Vec3, Vec3][] = [
        [[c.x, y0, c.z], [q.x, y1, q.z]],
        [[q.x, y0, q.z], [c.x, y1, c.z]],
      ];
      // Flanges: two rails along the face of each brace, either side of its centre line.
      for (const [a, b] of ends) {
        const side = norm(cross(out, norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]])));
        for (const k of [-0.3, 0.3]) local.push({ ...strutPart(add(add(a, side, k), out, PROUD), add(add(b, side, k), out, PROUD), 0.18, 'accent'), fine: true });
      }
      const centre: Vec3 = [(c.x + q.x) / 2, (y0 + y1) / 2, (c.z + q.z) / 2];
      if (diagrid) {
        // A cast steel node where the members cross.
        local.push({ shape: 'octagon', position: add(centre, out, 0.3), scale: [1.6, 1.6, 1.6], material: 'accent' });
        return;
      }
      // A node plate where the X crosses, gusset plates at its four ends, and bolts on every plate.
      const plate = add(centre, out, PROUD);
      local.push({ shape: 'box', position: plate, scale: [2.4, 2.4, 0.15], rotation: [0, yaw, 0], material: 'accent' });
      local.push(...bolts(plate, out, yaw, 2, 1.2));
      for (const p of [ends[0][0], ends[0][1], ends[1][0], ends[1][1]]) {
        const at = add(p, out, PROUD);
        local.push({ shape: 'box', position: at, scale: [1.4, 1.4, 0.12], rotation: [0, yaw, 0], material: 'accent', fine: true });
        local.push(...bolts(at, out, yaw, 1, 0).concat(bolts(add(at, [0, 1, 0], 0.4), out, yaw, 1, 0)));
      }
    });
    parts.push(...local.map((p) => placePart(p, mid.rotation)));
  }
  return parts;
}

/** Systems whose outriggers or tube walls tie in at the plant floors, with a belt truss round the outside. */
const BELTED = new Set<Design['system']>(['core-outrigger', 'bundled-tube']);
/** How far the truss stands proud of the wall. */
const BELT_OUT = 0.25;

/** A steel belt truss round each mechanical floor: top and bottom chords and V-diagonals, on every face. */
export function beltTrussParts(design: Design): Part[] {
  if (!BELTED.has(design.system)) return [];
  const slices = floorSlices(design);
  const parts: Part[] = [];
  for (const f of mechanicalFloors(design.floors)) {
    const s = slices[f];
    const lo = s.y + 0.35;
    const hi = s.y + FLOOR_HEIGHT - 0.35;
    // The outline as straight runs: a round floor as 24 chords just outside its wall.
    const runs: [Vec3, Vec3][] = [];
    if (design.shape === 'circle') {
      const r = s.width / 2 + BELT_OUT;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const b = ((i + 1) / 24) * Math.PI * 2;
        runs.push([[Math.sin(a) * r, 0, Math.cos(a) * r], [Math.sin(b) * r, 0, Math.cos(b) * r]]);
      }
    } else {
      for (const face of planFaces(design.shape, s.width, s.depth)) {
        const t: Vec3 = [Math.cos(face.yaw), 0, -Math.sin(face.yaw)];
        const n: Vec3 = [Math.sin(face.yaw), 0, Math.cos(face.yaw)];
        const m = add([face.x, 0, face.z], n, BELT_OUT);
        runs.push([add(m, t, -face.length / 2), add(m, t, face.length / 2)]);
      }
    }
    const local: Part[] = [];
    for (const [a, b] of runs) {
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      for (const y of [lo, hi]) local.push(strutPart([a[0], y, a[2]], [b[0], y, b[2]], 0.35, 'steel'));
      const n = Math.max(1, Math.round(len / 4));
      for (let k = 0; k < n; k++) {
        const p = (t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t];
        const p0 = p(k / n);
        const pm = p((k + 0.5) / n);
        const p1 = p((k + 1) / n);
        local.push(strutPart([p0[0], hi, p0[2]], [pm[0], lo, pm[2]], 0.28, 'steel'));
        local.push(strutPart([pm[0], lo, pm[2]], [p1[0], hi, p1[2]], 0.28, 'steel'));
      }
    }
    parts.push(...local.map((p) => placePart(p, s.rotation)));
  }
  return parts;
}
