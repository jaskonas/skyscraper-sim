import { facadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT, floorSlices, type FloorSlice } from '../../sim/geometry';
import type { Vec3 } from '../../sim/parts';
import type { Design } from '../../sim/types';
import { worldAnchor } from '../detail/frame';
import { isMechanicalFloor } from '../facadeDetail';
import { alongFace, planFaces, type Face } from '../parts/placement';

/**
 * Close-range walls: the tower's walls cut into chunks on the facade shader's own grid, and the ones
 * near the camera chosen to be rebuilt in true 3D.
 */

/** Floors per chunk. */
export const CHUNK_FLOORS = 4;
/** Window bays per chunk. */
export const CHUNK_BAYS = 6;
/** A chunk turns 3D when the camera comes this close… */
export const ENTER_M = 110;
/** …and flat again only once it is this far, so it doesn't flicker at the edge. */
export const LEAVE_M = 130;
export const MAX_CHUNKS = 8;
/** A chunk already in 3D counts as this much nearer when ranking, so a new one must be clearly closer to bump it. */
export const KEEP_BONUS_M = 20;
export const MAX_CHUNK_PARTS = 3000;

export interface Chunk {
  key: string;
  /** Floors floor0 ≤ i < floor1. */
  floor0: number;
  floor1: number;
  /** Which wall (index into planFaces; 0 on a round plan, whose cells run round the drum). */
  face: number;
  /** Bay cells cell0 ≤ j < cell1, numbered as the facade shader numbers them. */
  cell0: number;
  cell1: number;
  /** Middle of the chunk, building coordinates. */
  centre: Vec3;
  /** World xz direction the wall faces, or null on a round plan. */
  normal: [number, number] | null;
  /** The same in the floor's own unturned frame (the facade shader tells walls apart by it), or null. */
  localNormal: [number, number] | null;
  /** Half its diagonal, metres. */
  radius: number;
}

/** The whole bay cells on one floor's wall (flat walls are numbered from the middle; a drum from its seam). */
export function chunkCells(design: Design, slice: FloorSlice, face: Face): [number, number] {
  const bay = facadeRecipe(design).pattern.bayWidth;
  if (design.shape === 'circle') return [0, Math.floor((Math.PI * slice.width) / bay)];
  const k = Math.floor(face.length / 2 / bay);
  return [-k, k];
}

const faceOf = (design: Design, slice: FloorSlice, index: number): Face => planFaces(design.shape, slice.width, slice.depth)[index];

const cache = new WeakMap<Design, Chunk[]>();

/** Every chunk of the tower's walls. */
export function towerChunks(design: Design): Chunk[] {
  const hit = cache.get(design);
  if (hit) return hit;
  const slices = floorSlices(design);
  const bay = facadeRecipe(design).pattern.bayWidth;
  const faces = design.shape === 'circle' ? 1 : planFaces(design.shape, 1, 1).length;
  const out: Chunk[] = [];
  for (let f0 = 0; f0 < slices.length; f0 += CHUNK_FLOORS) {
    const f1 = Math.min(f0 + CHUNK_FLOORS, slices.length);
    const group = slices.slice(f0, f1);
    if (group.every((s) => isMechanicalFloor(s.index, slices.length))) continue;
    const mid = slices[Math.floor((f0 + f1 - 1) / 2)];
    for (let fi = 0; fi < faces; fi++) {
      let a = -Infinity;
      let b = Infinity;
      for (const s of group) {
        const [lo, hi] = chunkCells(design, s, faceOf(design, s, fi));
        a = Math.max(a, lo);
        b = Math.min(b, hi);
      }
      if (!(b > a)) continue;
      for (let k = Math.floor(a / CHUNK_BAYS); k * CHUNK_BAYS < b; k++) {
        const cell0 = Math.max(a, k * CHUNK_BAYS);
        const cell1 = Math.min(b, (k + 1) * CHUNK_BAYS);
        if (cell1 <= cell0) continue;
        const midFace = faceOf(design, mid, fi);
        const at = worldAnchor(mid, alongFace(design.shape, mid.width, mid.depth, midFace, ((cell0 + cell1) / 2) * bay));
        const height = (f1 - f0) * FLOOR_HEIGHT;
        out.push({
          key: `${f0}-${f1}:${fi}:${cell0}-${cell1}`,
          floor0: f0,
          floor1: f1,
          face: fi,
          cell0,
          cell1,
          centre: [at.position[0], slices[f0].y + height / 2, at.position[2]],
          normal: design.shape === 'circle' ? null : [Math.sin(at.yaw), Math.cos(at.yaw)],
          localNormal: design.shape === 'circle' ? null : [Math.sin(midFace.yaw), Math.cos(midFace.yaw)],
          radius: Math.hypot((cell1 - cell0) * bay, height) / 2,
        });
      }
    }
  }
  cache.set(design, out);
  return out;
}

export function chunkDistance(c: Chunk, camera: Vec3): number {
  return Math.max(0, Math.hypot(camera[0] - c.centre[0], camera[1] - c.centre[1], camera[2] - c.centre[2]) - c.radius);
}

function facing(c: Chunk, camera: Vec3): boolean {
  // A drum's chunk faces straight out from the axis.
  const [nx, nz] = c.normal ?? [c.centre[0], c.centre[2]];
  return (camera[0] - c.centre[0]) * nx + (camera[2] - c.centre[2]) * nz > 0;
}

/**
 * The chunks to show in 3D for a camera (building coordinates): the walls facing it, nearest first,
 * new ones inside ENTER_M and ones already showing until LEAVE_M, within the chunk and part budgets.
 */
export function nearChunks(design: Design, camera: Vec3, previous: ReadonlySet<string>, partsPerChunk: (c: Chunk) => number): Chunk[] {
  const candidates: { c: Chunk; d: number }[] = [];
  for (const c of towerChunks(design)) {
    const d = chunkDistance(c, camera);
    const kept = previous.has(c.key);
    if (d < (kept ? LEAVE_M : ENTER_M) && facing(c, camera)) candidates.push({ c, d: kept ? d - KEEP_BONUS_M : d });
  }
  candidates.sort((x, y) => x.d - y.d);
  const out: Chunk[] = [];
  let parts = 0;
  for (const { c } of candidates) {
    if (out.length >= MAX_CHUNKS) break;
    const n = partsPerChunk(c);
    if (parts + n > MAX_CHUNK_PARTS) break;
    parts += n;
    out.push(c);
  }
  return out;
}
