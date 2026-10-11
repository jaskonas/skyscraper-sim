import { WINDOW_PATTERNS, type AmountRule, type OrnamentDef } from '../sim/catalog/facades';
import { activeOrnaments, amountLevel } from '../sim/facade';
import { FLOOR_HEIGHT, floorSlices, type FloorSlice } from '../sim/geometry';
import { placePart, rotateYXZ, strutPart, type Part } from '../sim/parts';
import type { Design } from '../sim/types';
import {
  baseFloors,
  floorRuns,
  floorTop,
  perimeterPoints,
  planCorners,
  planFaces,
  pointsAlongFaces,
  setbackLevels,
  type Anchor,
} from './parts/placement';

/** Tall ornaments are built in runs of at most this many floors so they follow taper and twist. */
const RUN_FLOORS = 6;
/** Never more than this many bay lines around one floor, however big the plate. */
const MAX_BAYS = 48;

/** A template part moved to an anchor on a floor: scaled, turned to face out, then turned with the floor. */
function atAnchor(t: Part, a: Anchor, slice: FloorSlice, y: number, size: number, stretchY?: number): Part {
  const local: [number, number, number] = [t.position[0] * size, t.position[1] * size, t.position[2] * size];
  const [x, , z] = rotateYXZ(local, [0, a.yaw, 0]);
  const r = t.rotation ?? [0, 0, 0];
  const placed: Part = {
    ...t,
    position: [a.x + x, y + local[1], a.z + z],
    scale: [t.scale[0] * size, stretchY ?? t.scale[1] * size, t.scale[2] * size],
    rotation: [r[0], r[1] + a.yaw, r[2]],
  };
  return placePart(placed, slice.rotation);
}

/** A 'plan' template part becomes a band around the whole floor. */
function band(t: Part, slice: FloorSlice, y: number, size: number): Part {
  const out = 2 * t.scale[2] * size;
  return placePart(
    { ...t, position: [0, y + t.position[1] * size, 0], scale: [slice.width + out, t.scale[1] * size, slice.depth + out] },
    slice.rotation,
  );
}

/** Bands for the template's plan parts at a height, plus per-anchor copies of the rest. */
function stamp(o: OrnamentDef, slice: FloorSlice, y: number, size: number, anchors: Anchor[]): Part[] {
  const parts: Part[] = [];
  for (const t of o.template) {
    if (t.shape === 'plan') parts.push(band(t, slice, y, size));
    else for (const a of anchors) parts.push(atAnchor(t, a, slice, y, size));
  }
  return parts;
}

function levelsFor(design: Design, rule: AmountRule) {
  const all = setbackLevels(design);
  return rule.levels === 'all' ? all : all.slice(-1);
}

function place(o: OrnamentDef, design: Design, rule: AmountRule): Part[] {
  const size = rule.size;
  const parts: Part[] = [];
  switch (o.placement) {
    case 'bay-lines': {
      const bay = WINDOW_PATTERNS[design.windowPattern].bayWidth * (rule.every ?? 1);
      for (const run of floorRuns(design, RUN_FLOORS)) {
        const mid = run[Math.floor(run.length / 2)];
        const y0 = run[0].y;
        const height = run.length * FLOOR_HEIGHT;
        const perimeter = 2 * (mid.width + mid.depth);
        const anchors = perimeterPoints(design.shape, mid.width, mid.depth, Math.max(bay, perimeter / MAX_BAYS));
        for (const t of o.template)
          for (const a of anchors) parts.push(atAnchor(t, a, mid, y0 + height / 2, size, t.scale[1] * height));
      }
      break;
    }
    case 'floor-rings': {
      const every = rule.every ?? 1;
      const slices = floorSlices(design);
      let rings = slices.filter((s) => (s.index + 1) % every === 0 && s.index < design.floors - 1);
      // A short tower still gets one band, halfway up, so the choice is visible.
      if (rings.length === 0 && slices.length > 1) rings = [slices[Math.floor((slices.length - 1) / 2)]];
      for (const s of rings) parts.push(...stamp(o, s, floorTop(s), size, []));
      break;
    }
    case 'setback-corners':
      for (const { slice } of levelsFor(design, rule)) {
        const anchors = planCorners(design.shape, slice.width, slice.depth);
        if (rule.midFaces) anchors.push(...planFaces(design.shape, slice.width, slice.depth));
        parts.push(...stamp(o, slice, floorTop(slice), size, anchors));
      }
      break;
    case 'setback-faces':
      for (const { slice } of levelsFor(design, rule)) {
        const anchors = pointsAlongFaces(design.shape, slice.width, slice.depth, () => rule.count ?? 1);
        parts.push(...stamp(o, slice, slice.y + 0.3, size, anchors));
      }
      break;
    case 'roof-edge':
      for (const { slice } of levelsFor(design, rule)) {
        const inset = 0.8 * size;
        const anchors = pointsAlongFaces(design.shape, slice.width, slice.depth, () => rule.count ?? 1).map((a) => ({
          ...a,
          x: a.x - Math.sin(a.yaw) * inset,
          z: a.z - Math.cos(a.yaw) * inset,
        }));
        parts.push(...stamp(o, slice, floorTop(slice), size, anchors));
      }
      break;
    case 'base-floors':
      for (const s of baseFloors(design, rule.floors ?? 2)) {
        for (const course of [1, 3]) parts.push(...stamp(o, s, s.y + course, size, []));
      }
      break;
    case 'entry': {
      const ground = floorSlices(design)[0];
      const faces = planFaces(design.shape, ground.width, ground.depth);
      const front = faces.reduce((best, f) => (f.z > best.z ? f : best));
      const count = rule.count ?? 1;
      const spacing = 7 * size;
      const ax = Math.cos(front.yaw);
      const az = -Math.sin(front.yaw);
      const anchors = Array.from({ length: count }, (_, k) => {
        const s = (k - (count - 1) / 2) * spacing;
        return { x: front.x + ax * s, z: front.z + az * s, yaw: front.yaw };
      });
      parts.push(...stamp(o, ground, 0, size, anchors));
      break;
    }
  }
  return parts;
}

/** Every ornament the design builds, in building coordinates. */
export function ornamentParts(design: Design): Part[] {
  const level = amountLevel(design);
  return activeOrnaments(design).flatMap((o) => place(o, design, o.amount[level]));
}

const BRACE_FLOORS = 10;

/** X-braces on every wall of each 10-floor segment, following the floor's real shape. */
export function bracingParts(design: Design): Part[] {
  if (!design.exposedStructure) return [];
  const slices = floorSlices(design);
  const parts: Part[] = [];
  for (let start = 0; start < slices.length; start += BRACE_FLOORS) {
    const bottom = slices[start];
    const end = slices[Math.min(start + BRACE_FLOORS, slices.length) - 1];
    const mid = slices[Math.floor((start + end.index) / 2)];
    const y0 = bottom.y;
    const y1 = end.y + FLOOR_HEIGHT;
    const corners = planCorners(design.shape, bottom.width + 1.2, bottom.depth + 1.2);
    corners.forEach((p, i) => {
      const q = corners[(i + 1) % corners.length];
      parts.push(placePart(strutPart([p.x, y0, p.z], [q.x, y1, q.z], 0.8, 'accent'), mid.rotation));
      parts.push(placePart(strutPart([q.x, y0, q.z], [p.x, y1, p.z], 0.8, 'accent'), mid.rotation));
    });
  }
  return parts;
}
