import { CROWNS, type CustomCrownId } from '../sim/catalog/crowns';
import { FLOOR_HEIGHT, crownHeight, floorSlices } from '../sim/geometry';
import { placePart, type Part } from '../sim/parts';
import type { Design } from '../sim/types';
import { CUSTOM_CROWN_BUILDERS } from './crowns/custom';
import { buildStages } from './crowns/stages';
import type { CrownContext } from './crowns/types';

/** The crown's parts in building coordinates, turned with the top floor. */
export function crownParts(design: Design): Part[] {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const bodyHeight = design.floors * FLOOR_HEIGHT;
  const def = CROWNS[design.crown];
  const ctx: CrownContext = { shape: design.shape, W: top.width, D: top.depth, H: crownHeight(design.crown, bodyHeight) };
  const local = def.custom ? CUSTOM_CROWN_BUILDERS[design.crown as CustomCrownId](ctx) : buildStages(def.stages ?? [], ctx);
  return local.map((p) => placePart(p, top.rotation, bodyHeight));
}
