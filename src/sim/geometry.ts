import { CROWNS } from './catalog/crowns';
import type { CrownId, Design, PlanShape, Setbacks } from './types';

/** Metres per storey. Fixed at the standard detail level. */
export const FLOOR_HEIGHT = 4;

export interface FloorSlice {
  index: number;
  /** Height of the bottom of this floor, metres. */
  y: number;
  width: number;
  depth: number;
  /** Radians about the vertical axis. */
  rotation: number;
}

/** Plan area of a shape divided by its bounding width × depth. */
export function shapeAreaFactor(shape: PlanShape): number {
  switch (shape) {
    case 'circle':
      return Math.PI / 4;
    case 'triangle':
      return Math.sqrt(3) / 4;
    default:
      return 1;
  }
}

export function shapePerimeter(shape: PlanShape, width: number, depth: number): number {
  switch (shape) {
    case 'circle':
      return Math.PI * width;
    case 'triangle':
      return 3 * width;
    default:
      return 2 * (width + depth);
  }
}

/** Width multiplier from setbacks at fraction t (0 = ground, 1 = top). */
export function setbackScale(setbacks: Setbacks, t: number): number {
  if (setbacks === 'few') {
    if (t >= 0.75) return 0.7;
    if (t >= 0.5) return 0.85;
    return 1;
  }
  if (setbacks === 'wedding-cake') {
    if (t >= 0.8) return 0.6;
    if (t >= 0.6) return 0.7;
    if (t >= 0.4) return 0.8;
    if (t >= 0.2) return 0.9;
    return 1;
  }
  return 1;
}

export function plateDims(design: Design): { width: number; depth: number } {
  const width = design.plateWidth;
  const depth = design.shape === 'rectangle' ? design.plateDepth : design.plateWidth;
  return { width, depth };
}

function heightFraction(index: number, floors: number): number {
  return floors > 1 ? index / (floors - 1) : 0;
}

/** Width multiplier for floor `index` from taper and setbacks. */
export function floorScale(design: Design, index: number): number {
  const t = heightFraction(index, design.floors);
  return (1 - design.taper * t) * setbackScale(design.setbacks, t);
}

export function floorSlices(design: Design): FloorSlice[] {
  const { width, depth } = plateDims(design);
  const slices: FloorSlice[] = [];
  for (let i = 0; i < design.floors; i++) {
    const s = floorScale(design, i);
    const t = heightFraction(i, design.floors);
    slices.push({
      index: i,
      y: i * FLOOR_HEIGHT,
      width: width * s,
      depth: depth * s,
      rotation: (design.twist * t * Math.PI) / 180,
    });
  }
  return slices;
}

export function sliceArea(shape: PlanShape, slice: FloorSlice): number {
  return slice.width * slice.depth * shapeAreaFactor(shape);
}

/** Extra height above the roof, metres, for a crown on a body of height `bodyHeight`. */
export function crownHeight(crown: CrownId, bodyHeight: number): number {
  const rule = CROWNS[crown].height;
  switch (rule.kind) {
    case 'metres':
      return rule.value;
    case 'floors':
      return rule.value * FLOOR_HEIGHT;
    case 'fraction':
      return rule.value * bodyHeight;
  }
}
