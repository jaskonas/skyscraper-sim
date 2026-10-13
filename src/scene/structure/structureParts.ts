import { FOUNDATION_SPACING } from '../../sim/construction/foundation';
import { coreKind, outriggerFloors } from '../../sim/construction/stages';
import { FLOOR_HEIGHT, floorSlices, plateDims, shapePerimeter, type FloorSlice } from '../../sim/geometry';
import { partBounds, rotateYXZ, strutPart, type Part, type PartMaterial, type Vec3 } from '../../sim/parts';
import type { Design, Material, StructuralSystem } from '../../sim/types';
import { shaftGrid } from '../FoundationView';
import { bracingParts } from '../ornaments';
import { floorRuns, planFaces } from '../parts/placement';
import { chord, insidePlan, perimeterAt, ringPoints } from './planMath';

export type StructureRole =
  | 'core'
  | 'column'
  | 'beam'
  | 'slab'
  | 'brace'
  | 'outrigger'
  | 'wall'
  | 'damper'
  | 'mass-damper'
  | 'isolator';

/** One piece of the bare structure, in building coordinates. */
export interface StructurePart {
  part: Part;
  role: StructureRole;
  /** Height of its top, metres: it counts as built once construction passes this height. */
  top: number;
}

/** How each material looks: column size, slab thickness and the colour of columns and beams. */
const LOOK: Record<Material, { column: number; slab: number; column_material: PartMaterial; beam_material: PartMaterial }> = {
  steel: { column: 0.6, slab: 0.25, column_material: 'girder', beam_material: 'girder' },
  concrete: { column: 1.2, slab: 0.5, column_material: 'concrete', beam_material: 'concrete' },
  composite: { column: 0.9, slab: 0.4, column_material: 'concrete', beam_material: 'girder' },
};

/** Spacing of the outside columns, metres (0: none — the diagrid's diagonals replace them). */
const EDGE_SPACING: Record<StructuralSystem, number> = {
  'rigid-frame': 9,
  'framed-tube': 3,
  'core-outrigger': 9,
  'bundled-tube': 3,
  diagrid: 0,
  'buttressed-core': 9,
};
/** Systems whose deep perimeter beams make a "tube". */
const TUBES: StructuralSystem[] = ['framed-tube', 'bundled-tube'];
const GRID = 9;
const DIAGRID_FLOORS = 6;

const at = (x: number, z: number, rot: number): [number, number] => {
  const [wx, , wz] = rotateYXZ([x, 0, z], [0, rot, 0]);
  return [wx, wz];
};

const tag = (part: Part, role: StructureRole): StructurePart => ({ part, role, top: partBounds(part).max[1] });

function column(x: number, z: number, y0: number, y1: number, size: number, rot: number, material: PartMaterial): Part {
  const [wx, wz] = at(x, z, rot);
  return { shape: 'box', position: [wx, (y0 + y1) / 2, wz], scale: [size, y1 - y0, size], rotation: [0, rot, 0], material };
}

/** A sloping member, pulled in at both ends so its corners stay between `from` and `to` heights. */
function diagonal(from: Vec3, to: Vec3, thickness: number, material: PartMaterial): Part {
  const pull = thickness * 0.6 * Math.sign(to[1] - from[1]);
  return strutPart([from[0], from[1] + pull, from[2]], [to[0], to[1] - pull, to[2]], thickness, material);
}

/** A horizontal member between two points at height y. */
function beam(a: [number, number], b: [number, number], y: number, depth: number, width: number, material: PartMaterial): Part {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return {
    shape: 'box',
    position: [(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2],
    scale: [len, depth, width],
    rotation: [0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0],
    material,
  };
}

const coreSize = (s: { width: number; depth: number }) => 0.3 * Math.min(s.width, s.depth);
const inCore = (x: number, z: number, c: number) => Math.abs(x) < c / 2 + 1 && Math.abs(z) < c / 2 + 1;

/** Interior column lines: a 9 m grid (rigid frame) or the tube walls between a bundled tube's cells. */
function interiorPoints(design: Design, w: number, d: number, c: number): [number, number][] {
  const pts: [number, number][] = [];
  const keep = (x: number, z: number) => insidePlan(design.shape, w, d, x, z, 2) && !inCore(x, z, c);
  if (design.system === 'rigid-frame') {
    const kx = Math.floor(w / 2 / GRID);
    const kz = Math.floor(d / 2 / GRID);
    for (let i = -kx; i <= kx; i++) for (let j = -kz; j <= kz; j++) if (keep(i * GRID, j * GRID)) pts.push([i * GRID, j * GRID]);
  } else if (design.system === 'bundled-tube') {
    for (const [axis, c0] of bundleLines(design, w, d)) {
      const span = chord(design.shape, w, d, axis, c0, 2);
      if (!span) continue;
      for (let s = span[0]; s <= span[1] + 1e-9; s += 3) {
        const [x, z] = axis === 'x' ? [c0, s] : [s, c0];
        if (!inCore(x, z, c)) pts.push([x, z]);
      }
    }
  }
  return pts;
}

/** Lines dividing a bundled tube into cells: 3×3 on most plans, 2×3 on a rectangle. */
function bundleLines(design: Design, w: number, d: number): ['x' | 'z', number][] {
  if (design.shape === 'rectangle') return w >= d ? [['x', -w / 6], ['x', w / 6], ['z', 0]] : [['z', -d / 6], ['z', d / 6], ['x', 0]];
  return [['x', -w / 6], ['x', w / 6], ['z', -d / 6], ['z', d / 6]];
}

/** Interior beam lines per floor, matching the interior columns. */
function interiorBeamLines(design: Design, w: number, d: number): ['x' | 'z', number][] {
  if (design.system === 'bundled-tube') return bundleLines(design, w, d);
  if (design.system !== 'rigid-frame') return [];
  const lines: ['x' | 'z', number][] = [];
  for (let i = -Math.floor(w / 2 / GRID); i <= Math.floor(w / 2 / GRID); i++) lines.push(['x', i * GRID]);
  for (let j = -Math.floor(d / 2 / GRID); j <= Math.floor(d / 2 / GRID); j++) lines.push(['z', j * GRID]);
  return lines;
}

function coreParts(design: Design, run: FloorSlice[], y0: number, y1: number, rot: number): StructurePart[] {
  const top = run[run.length - 1];
  const c = coreSize(top);
  if (coreKind(design) === 'concrete') {
    return [tag({ shape: 'box', position: [0, (y0 + y1) / 2, 0], scale: [c, y1 - y0, c], rotation: [0, rot, 0], material: 'concrete' }, 'core')];
  }
  // A braced steel core: four corner columns with an X on each face.
  const corners: [number, number][] = [[c / 2, c / 2], [c / 2, -c / 2], [-c / 2, -c / 2], [-c / 2, c / 2]];
  const out = corners.map(([x, z]) => tag(column(x, z, y0, y1, 0.5, rot, 'girder'), 'core'));
  corners.forEach(([x, z], i) => {
    const [nx, nz] = corners[(i + 1) % 4];
    const [ax, az] = at(x, z, rot);
    const [bx, bz] = at(nx, nz, rot);
    out.push(tag(diagonal([ax, y0, az], [bx, y1, bz], 0.3, 'girder'), 'core'));
    out.push(tag(diagonal([bx, y0, bz], [ax, y1, az], 0.3, 'girder'), 'core'));
  });
  return out;
}

/** Three thick concrete wing walls from the core to the edge, 120° apart (the Burj Khalifa "Y"). */
function wingWalls(design: Design, run: FloorSlice[], y0: number, y1: number, rot: number): StructurePart[] {
  const top = run[run.length - 1];
  const c = coreSize(top);
  const thick = Math.max(0.6, 0.06 * Math.min(top.width, top.depth));
  return [0, 120, 240].map((deg) => {
    const a = (deg * Math.PI) / 180;
    // Reach out until just inside the plan.
    let r = c / 2;
    while (insidePlan(design.shape, top.width, top.depth, Math.sin(a) * (r + 0.5), Math.cos(a) * (r + 0.5), 0.6)) r += 0.5;
    const mid = (c / 2 + r) / 2;
    const [x, z] = at(Math.sin(a) * mid, Math.cos(a) * mid, rot);
    return tag({ shape: 'box', position: [x, (y0 + y1) / 2, z], scale: [thick, y1 - y0, Math.max(0.5, r - c / 2)], rotation: [0, a + rot, 0], material: 'concrete' }, 'wall');
  });
}

function diagridParts(design: Design, slices: FloorSlice[], material: PartMaterial, thickness: number): StructurePart[] {
  const out: StructurePart[] = [];
  for (let f0 = 0; f0 < slices.length; f0 += DIAGRID_FLOORS) {
    const b = slices[f0];
    const t = slices[Math.min(f0 + DIAGRID_FLOORS, slices.length) - 1];
    const yTop = t.y + FLOOR_HEIGHT;
    const n = Math.max(4, Math.round(shapePerimeter(design.shape, b.width, b.depth) / (DIAGRID_FLOORS * FLOOR_HEIGHT)));
    const lower = (u: number): Vec3 => {
      const [x, z] = perimeterAt(design.shape, b.width, b.depth, u, thickness);
      const [wx, wz] = at(x, z, b.rotation);
      return [wx, b.y, wz];
    };
    const upper = (u: number): Vec3 => {
      const [x, z] = perimeterAt(design.shape, t.width, t.depth, u, thickness);
      const [wx, wz] = at(x, z, t.rotation);
      return [wx, yTop, wz];
    };
    for (let k = 0; k < n; k++) {
      out.push(tag(diagonal(lower(k / n), upper((k + 1) / n), thickness, material), 'column'));
      out.push(tag(diagonal(lower((k + 1) / n), upper(k / n), thickness, material), 'column'));
    }
  }
  return out;
}

function outriggerParts(design: Design, slices: FloorSlice[]): StructurePart[] {
  const out: StructurePart[] = [];
  for (const f of outriggerFloors(design.floors)) {
    const s = slices[Math.min(slices.length - 1, Math.max(1, f))];
    const below = slices[s.index - 1];
    const y0 = below.y;
    const y1 = s.y + FLOOR_HEIGHT;
    const c = coreSize(s);
    // Arms from the core to the middle of each wall.
    for (const face of planFaces(design.shape, s.width, s.depth)) {
      const r = Math.hypot(face.x, face.z);
      const ux = face.x / r;
      const uz = face.z / r;
      const [ix, iz] = at(ux * (c / 2), uz * (c / 2), s.rotation);
      const [ox, oz] = at(ux * (r - 1), uz * (r - 1), s.rotation);
      out.push(tag(diagonal([ix, y1, iz], [ox, y0, oz], 0.8, 'girder'), 'outrigger'));
      out.push(tag(diagonal([ix, y0, iz], [ox, y1, oz], 0.8, 'girder'), 'outrigger'));
    }
    // A belt truss round the outside: an X on each side.
    const ring = ringPoints(design.shape, s.width, s.depth, 0.6);
    ring.forEach((p, i) => {
      const q = ring[(i + 1) % ring.length];
      const [ax, az] = at(p[0], p[1], s.rotation);
      const [bx, bz] = at(q[0], q[1], s.rotation);
      out.push(tag(diagonal([ax, y0, az], [bx, y1, bz], 0.6, 'girder'), 'outrigger'));
      out.push(tag(diagonal([bx, y0, bz], [ax, y1, az], 0.6, 'girder'), 'outrigger'));
    });
  }
  return out;
}

function perFloorParts(design: Design, s: FloorSlice): StructurePart[] {
  const look = LOOK[design.material];
  const out: StructurePart[] = [];
  const yTop = s.y + FLOOR_HEIGHT;
  const depth = TUBES.includes(design.system) ? 1.2 : 0.6;
  // The floor slab, poured onto the beams.
  out.push(
    tag({ shape: 'plan', position: [0, yTop - look.slab / 2, 0], scale: [s.width - 0.6, look.slab, s.depth - 0.6], rotation: [0, s.rotation, 0], material: 'concrete' }, 'slab'),
  );
  // Edge beams round the outside, straight from corner to corner (12 segments round a circle).
  const ring = ringPoints(design.shape, s.width, s.depth, 0.4);
  ring.forEach((p, i) => {
    const q = ring[(i + 1) % ring.length];
    out.push(tag(beam(at(p[0], p[1], s.rotation), at(q[0], q[1], s.rotation), yTop - depth / 2, depth, 0.4, look.beam_material), 'beam'));
  });
  // Interior beams along the column lines.
  for (const [axis, c] of interiorBeamLines(design, s.width, s.depth)) {
    const span = chord(design.shape, s.width, s.depth, axis, c, 0.6);
    if (!span) continue;
    const a: [number, number] = axis === 'x' ? [c, span[0]] : [span[0], c];
    const b: [number, number] = axis === 'x' ? [c, span[1]] : [span[1], c];
    out.push(tag(beam(at(a[0], a[1], s.rotation), at(b[0], b[1], s.rotation), yTop - 0.3, 0.6, 0.35, look.beam_material), 'beam'));
  }
  // Viscous dampers: a red shock-absorber brace on each side, every 5th floor.
  if (design.damping === 'viscous' && s.index % 5 === 4) {
    for (const face of planFaces(design.shape, s.width, s.depth)) {
      const r = Math.hypot(face.x, face.z);
      const k = (r - 1.2) / r;
      const along: [number, number] = [Math.cos(face.yaw), -Math.sin(face.yaw)];
      const [ax, az] = at(face.x * k - along[0] * 1.5, face.z * k - along[1] * 1.5, s.rotation);
      const [bx, bz] = at(face.x * k + along[0] * 1.5, face.z * k + along[1] * 1.5, s.rotation);
      out.push(tag(diagonal([ax, s.y, az], [bx, yTop, bz], 0.35, 'ruby'), 'damper'));
    }
  }
  return out;
}

function massDamper(slices: FloorSlice[]): StructurePart[] {
  const roof = slices[slices.length - 1];
  const hang = slices[Math.max(0, slices.length - 3)];
  const size = Math.min(0.25 * Math.min(roof.width, roof.depth), FLOOR_HEIGHT * 0.8);
  const y = hang.y + FLOOR_HEIGHT / 2;
  const roofY = roof.y + FLOOR_HEIGHT;
  const out: StructurePart[] = [
    tag({ shape: 'box', position: [0, y, 0], scale: [size, size, size], rotation: [0, roof.rotation, 0], material: 'steel' }, 'mass-damper'),
  ];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const [x, z] = at((sx * size) / 2.5, (sz * size) / 2.5, roof.rotation);
    out.push(tag(strutPart([x, y + size / 2, z], [x, roofY - 0.1, z], 0.1, 'girder'), 'mass-damper'));
  }
  return out;
}

/**
 * The bare structure of the whole tower, in building coordinates: core, columns, beams, slabs and any
 * outriggers, wing walls, diagrid, dampers, isolators and exposed bracing. Shown during construction,
 * where the main material and structural system each have their own look.
 */
export function structureParts(design: Design): StructurePart[] {
  const slices = floorSlices(design);
  const look = LOOK[design.material];
  const out: StructurePart[] = [];
  // Long columns over a few floors at a time keep the part count down on tall towers.
  const runFloors = Math.max(1, Math.ceil(design.floors / 25));
  for (const run of floorRuns(design, runFloors)) {
    const top = run[run.length - 1];
    const y0 = run[0].y;
    const y1 = top.y + FLOOR_HEIGHT;
    const rot = run[Math.floor(run.length / 2)].rotation;
    const c = coreSize(top);
    out.push(...coreParts(design, run, y0, y1, rot));
    if (design.system === 'buttressed-core') out.push(...wingWalls(design, run, y0, y1, rot));
    const spacing = EDGE_SPACING[design.system];
    if (spacing > 0) {
      const n = Math.max(3, Math.round(shapePerimeter(design.shape, top.width, top.depth) / spacing));
      for (let k = 0; k < n; k++) {
        const [x, z] = perimeterAt(design.shape, top.width, top.depth, (k + 0.5) / n, look.column / 2 + 0.2);
        out.push(tag(column(x, z, y0, y1, look.column, rot, look.column_material), 'column'));
      }
    }
    for (const [x, z] of interiorPoints(design, top.width, top.depth, c)) out.push(tag(column(x, z, y0, y1, look.column, rot, look.column_material), 'column'));
  }
  if (design.system === 'diagrid') out.push(...diagridParts(design, slices, look.column_material === 'concrete' ? 'concrete' : 'girder', design.material === 'steel' ? 0.7 : 1));
  if (design.system === 'core-outrigger') out.push(...outriggerParts(design, slices));
  for (const s of slices) out.push(...perFloorParts(design, s));
  if (design.damping === 'tmd') out.push(...massDamper(slices));
  if (design.baseIsolation) {
    const { width, depth } = plateDims(design);
    for (const [x, z] of shaftGrid(width, depth, FOUNDATION_SPACING.isolators)) {
      out.push(tag({ shape: 'cylinder', position: [x, -0.5, z], scale: [1.4, 1, 1.4], material: 'interior' }, 'isolator'));
    }
  }
  for (const p of bracingParts(design)) out.push(tag(p, 'brace'));
  return out;
}
