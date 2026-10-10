import * as THREE from 'three';
import { FLOOR_HEIGHT, floorSlices, type FloorSlice } from '../sim/geometry';
import type { Design, PlanShape } from '../sim/types';

export type Vec3 = [number, number, number];

export interface BoxInstance {
  position: Vec3;
  scale: Vec3;
  rotationY: number;
}

const BODY_FRACTION = 0.85;

/** A unit-sized solid of the plan shape: 1 wide, 1 tall, 1 deep (triangle: side 1). */
export function unitGeometry(shape: PlanShape): THREE.BufferGeometry {
  switch (shape) {
    case 'circle':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    case 'triangle':
      return new THREE.CylinderGeometry(1 / Math.sqrt(3), 1 / Math.sqrt(3), 1, 3);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

function sliceInstance(s: FloorSlice, yOffset: number, height: number, grow = 1): BoxInstance {
  return {
    position: [0, s.y + yOffset, 0],
    scale: [s.width * grow, height, s.depth * grow],
    rotationY: s.rotation,
  };
}

/** The glazed or walled part of each floor. */
export function bodyInstances(design: Design): BoxInstance[] {
  const h = FLOOR_HEIGHT * BODY_FRACTION;
  return floorSlices(design).map((s) => sliceInstance(s, h / 2, h));
}

/** The floor-slab edge band between floors — gives the tower its horizontal lines. */
export function slabInstances(design: Design): BoxInstance[] {
  const h = FLOOR_HEIGHT * (1 - BODY_FRACTION);
  return floorSlices(design).map((s) => sliceInstance(s, FLOOR_HEIGHT * BODY_FRACTION + h / 2, h, 1.03));
}

/** Facade colour: glass towers use the glass colour; others blend toward glass by window share. */
export function facadeColor(design: Design): string {
  if (design.facade === 'glass') return design.palette.glass;
  const body = new THREE.Color(design.palette.body);
  return '#' + body.lerp(new THREE.Color(design.palette.glass), design.windowRatio * 0.5).getHexString();
}

export interface Strut {
  from: Vec3;
  to: Vec3;
}

const BRACE_FLOORS = 10;

/** X-braces on the four faces of each 10-floor segment, for exposed structure. */
export function bracingStruts(design: Design): Strut[] {
  if (!design.exposedStructure) return [];
  const slices = floorSlices(design);
  const struts: Strut[] = [];
  for (let start = 0; start < slices.length; start += BRACE_FLOORS) {
    const bottom = slices[start];
    const endIndex = Math.min(start + BRACE_FLOORS, slices.length) - 1;
    const y0 = bottom.y;
    const y1 = slices[endIndex].y + FLOOR_HEIGHT;
    const hw = bottom.width / 2 + 0.6;
    const hd = bottom.depth / 2 + 0.6;
    const rot = slices[Math.floor((start + endIndex) / 2)].rotation;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const p = (x: number, y: number, z: number): Vec3 => [x * c + z * s, y, -x * s + z * c];
    const faces: [number, number, number, number][] = [
      [-hw, hd, hw, hd],
      [hw, -hd, -hw, -hd],
      [hw, hd, hw, -hd],
      [-hw, -hd, -hw, hd],
    ];
    for (const [ax, az, bx, bz] of faces) {
      struts.push({ from: p(ax, y0, az), to: p(bx, y1, bz) });
      struts.push({ from: p(bx, y0, bz), to: p(ax, y1, az) });
    }
  }
  return struts;
}

/** Matrix for a thin box running from `from` to `to`. */
export function strutMatrix(strut: Strut, thickness: number): THREE.Matrix4 {
  const a = new THREE.Vector3(...strut.from);
  const b = new THREE.Vector3(...strut.to);
  const dir = b.clone().sub(a);
  const length = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return new THREE.Matrix4().compose(a.add(b).multiplyScalar(0.5), q, new THREE.Vector3(thickness, length, thickness));
}

export function instanceMatrix(i: BoxInstance): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...i.position),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i.rotationY),
    new THREE.Vector3(...i.scale),
  );
}
