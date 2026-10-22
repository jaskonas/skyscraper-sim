import type { CrownId } from '../../../sim/types';
import type { CrownBuilder } from '../types';
import { CLASSIC_CROWNS } from './classic';
import { MODERN_CROWNS } from './modern';
import { SPIRE_CROWNS } from './spires';
import { WORLD_CROWNS } from './world';

/** The detailed version of each crown (Detail: High). A crown without one falls back to its simple massing. */
export const RICH_CROWNS: Partial<Record<CrownId, CrownBuilder>> = {
  ...SPIRE_CROWNS,
  ...CLASSIC_CROWNS,
  ...MODERN_CROWNS,
  ...WORLD_CROWNS,
};
