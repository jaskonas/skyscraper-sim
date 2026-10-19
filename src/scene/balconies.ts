import { floorUses } from '../sim/analysis/massing';
import { facadeRecipe } from '../sim/facade';
import { floorSlices, type FloorSlice } from '../sim/geometry';
import type { Part } from '../sim/parts';
import type { Design } from '../sim/types';
import { placeAtAnchor, worldAnchor } from './detail/frame';
import { isMechanicalFloor } from './facadeDetail';
import { tileLayout } from './facadeTile';
import { alongFace, planFaces, type Face } from './parts/placement';

/** How far a balcony stands out from the wall, and its railing's height, metres. */
const DEPTH = 1.5;
const RAIL = 1.1;
const SLAB = 0.2;
/** Walls with more bays than this get a balcony on every third bay instead of every other. */
const LONG_WALL_BAYS = 16;

/** Width of one facade bay, metres: the painted tile's width, which is the shader's bay grid. */
export function facadeTileWidth(design: Design): number {
  return tileLayout(facadeRecipe(design)).widthM;
}

/**
 * Balconies on every other bay (every third on long walls) of every home floor (not the ground floor or
 * plant floors): a concrete slab standing out from the wall and a glass railing along its edge. Each is
 * centred on a window of the facade's own bay grid — measured across each straight wall from its middle,
 * and round a round tower as arc length from its seam, exactly as the facade shader measures — so a
 * balcony fronts one window, the same window the night lights use. Building coordinates.
 */
export function balconyParts(design: Design): Part[] {
  const uses = floorUses(design);
  const bay = facadeTileWidth(design);
  const width = bay * 0.85;
  const parts: Part[] = [];
  const put = (slice: FloorSlice, face: Face, s: number) => {
    const anchor = worldAnchor(slice, alongFace(design.shape, slice.width, slice.depth, face, s));
    parts.push(placeAtAnchor({ shape: 'box', position: [0, SLAB / 2, DEPTH / 2], scale: [width, SLAB, DEPTH], material: 'concrete' }, anchor));
    parts.push(placeAtAnchor({ shape: 'box', position: [0, SLAB + RAIL / 2, DEPTH - 0.05], scale: [width, RAIL, 0.06], material: 'glass' }, anchor));
  };
  for (const slice of floorSlices(design)) {
    if (slice.index === 0 || uses[slice.index] !== 'residential' || isMechanicalFloor(slice.index, design.floors)) continue;
    const faces = planFaces(design.shape, slice.width, slice.depth);
    if (design.shape === 'circle') {
      // Arc length from the seam (the +z point, where the facade's measure starts), whole bays only.
      const bays = Math.floor((Math.PI * slice.width) / bay);
      const step = bays / 4 > LONG_WALL_BAYS ? 3 : 2;
      const seam = faces.find((f) => Math.abs(f.yaw) < 1e-9)!;
      for (let j = 0; j < bays; j += step) put(slice, seam, (j + 0.5) * bay);
      continue;
    }
    for (const face of faces) {
      // Whole bays either side of the wall's middle; their centres are the windows.
      const half = Math.floor(face.length / 2 / bay);
      // Every other bay; every third on long walls, which keeps the biggest towers within budget.
      const step = 2 * half > LONG_WALL_BAYS ? 3 : 2;
      for (let j = -half; j < half; j += step) put(slice, face, (j + 0.5) * bay);
    }
  }
  return parts;
}
