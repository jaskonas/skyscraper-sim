import { floorUses } from '../../sim/analysis/massing';
import { facadeRecipe } from '../../sim/facade';
import { floorSlices } from '../../sim/geometry';
import type { Part, Vec3 } from '../../sim/parts';
import type { Design, StyleId } from '../../sim/types';
import { chunkCells } from '../closeWalls/chunks';
import { placeAtAnchor, worldAnchor } from '../detail/frame';
import { detailHash, isMechanicalFloor } from '../facadeDetail';
import { TILE_HEIGHT_M, openingFor } from '../facadeTile';
import { alongFace, planFaces } from '../parts/placement';

/** Share of eligible windows with an air-conditioner under them. */
export const AC_SHARE = 0.15;
/** Styles built before central air, whose flats and hotel rooms got window units. */
export const AC_STYLES: readonly StyleId[] = ['chicago-school', 'gothic-revival', 'art-deco'];

const box = (position: Vec3, scale: Vec3, fine = false): Part => ({ shape: 'box', position, scale, material: 'steel', ...(fine && { fine: true as const }) });

/**
 * An AC unit sitting in the bottom of a window, sticking out of the wall, in the bay's own frame (x along
 * the wall, y up from the floor, z out). Never below 0.05 m, so it clears the slab band of the floor below.
 */
function acUnit(sillY: number): Part[] {
  const y = Math.min(Math.max(sillY, 0.1), TILE_HEIGHT_M - 0.5) + 0.225;
  return [
    box([0, y, 0.275], [0.75, 0.45, 0.55]),
    // The grille on its face and the bracket under it.
    box([0, y, 0.56], [0.6, 0.3, 0.02], true),
    box([0, y - 0.25, 0.3], [0.7, 0.05, 0.4], true),
  ];
}

/**
 * Equipment on the walls: window AC units (old home and hotel floors, about one window in seven, under the
 * same windows the facade draws), a louvre band over the front door, and vent grilles along the base.
 * Building coordinates.
 */
export function wallKitParts(design: Design): Part[] {
  const slices = floorSlices(design);
  const uses = floorUses(design);
  const bay = facadeRecipe(design).pattern.bayWidth;
  const sill = openingFor(design.windowRatio).y * TILE_HEIGHT_M;
  const round = design.shape === 'circle';
  const parts: Part[] = [];
  if (AC_STYLES.includes(design.style)) {
    const unit = acUnit(sill);
    for (const s of slices) {
      const use = uses[s.index];
      if (s.index === 0 || isMechanicalFloor(s.index, slices.length) || (use !== 'residential' && use !== 'hotel')) continue;
      const faces = planFaces(design.shape, s.width, s.depth);
      (round ? faces.slice(0, 1) : faces).forEach((face, fi) => {
        const [a, b] = chunkCells(design, s, face);
        for (let cell = a; cell < b; cell++) {
          // Each wall has its own windows, so the wall's index salts the choice.
          if (detailHash(cell, s.index, 5 + fi * 3) >= AC_SHARE) continue;
          const at = worldAnchor(s, alongFace(design.shape, s.width, s.depth, face, (cell + 0.5) * bay));
          for (const p of unit) parts.push(placeAtAnchor(p, at));
        }
      });
    }
  }
  const ground = slices[0];
  const groundFaces = planFaces(design.shape, ground.width, ground.depth);
  // Louvres across the front, just under the top of the ground floor.
  const front = groundFaces.reduce((best, f) => (f.z > best.z ? f : best));
  const width = Math.min(10, front.length * 0.4);
  const mid = worldAnchor(ground, alongFace(design.shape, ground.width, ground.depth, front, 0));
  // Below the slab band and the canopy, above the lobby glass.
  parts.push(placeAtAnchor(box([0, 3.05, 0.06], [width + 0.2, 0.6, 0.1]), mid));
  for (let k = 0; k < 4; k++) parts.push(placeAtAnchor(box([0, 2.84 + k * 0.14, 0.14], [width, 0.05, 0.14], true), mid));
  // Vent grilles along the base of every wall.
  for (const face of groundFaces) {
    const n = Math.max(1, Math.floor(face.length / 12));
    for (let k = 0; k < n; k++) {
      const along = ((k + 0.5) / n - 0.5) * face.length;
      // Not behind the front door and its lobby glass.
      if (face === front && Math.abs(along) < width / 2 + 2.5) continue;
      const at = worldAnchor(ground, alongFace(design.shape, ground.width, ground.depth, face, along));
      parts.push(placeAtAnchor(box([0, 0.6, 0.04], [1.2, 0.6, 0.08]), at));
      for (let j = 0; j < 3; j++) parts.push(placeAtAnchor(box([0, 0.42 + j * 0.18, 0.09], [1.1, 0.04, 0.04], true), at));
    }
  }
  return parts;
}
