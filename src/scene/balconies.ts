import { floorUses } from '../sim/analysis/massing';
import { facadeRecipe } from '../sim/facade';
import { floorSlices } from '../sim/geometry';
import type { Part } from '../sim/parts';
import type { Design } from '../sim/types';
import { placeAtAnchor, worldAnchor } from './detail/frame';
import { isMechanicalFloor } from './facadeDetail';
import { alongFace, planFaces } from './parts/placement';

/** How far a balcony stands out from the wall, and its railing's height, metres. */
const DEPTH = 1.5;
const RAIL = 1.1;
const SLAB = 0.2;
/** Walls with more bays than this get a balcony on every third bay instead of every other. */
const LONG_WALL_BAYS = 16;

/**
 * Balconies on every other bay (every third on long walls) of every home floor (not the ground floor or plant floors): a concrete
 * slab standing out from the wall and a glass railing along its edge. Placed on each wall with the same
 * helpers as the close-up, so they follow taper, twist and round plans. Building coordinates.
 */
export function balconyParts(design: Design): Part[] {
  const uses = floorUses(design);
  const bay = facadeRecipe(design).pattern.bayWidth;
  const width = bay * 0.85;
  const parts: Part[] = [];
  for (const slice of floorSlices(design)) {
    if (slice.index === 0 || uses[slice.index] !== 'residential' || isMechanicalFloor(slice.index, design.floors)) continue;
    for (const face of planFaces(design.shape, slice.width, slice.depth)) {
      const n = Math.floor(face.length / bay);
      // Every other bay; every third on long walls, which keeps the biggest towers within budget.
      const step = n > LONG_WALL_BAYS ? 3 : 2;
      for (let k = 0; k < n; k += step) {
        const anchor = worldAnchor(slice, alongFace(design.shape, slice.width, slice.depth, face, (k - (n - 1) / 2) * bay));
        parts.push(placeAtAnchor({ shape: 'box', position: [0, SLAB / 2, DEPTH / 2], scale: [width, SLAB, DEPTH], material: 'concrete' }, anchor));
        parts.push(placeAtAnchor({ shape: 'box', position: [0, SLAB + RAIL / 2, DEPTH - 0.05], scale: [width, RAIL, 0.06], material: 'glass' }, anchor));
      }
    }
  }
  return parts;
}
