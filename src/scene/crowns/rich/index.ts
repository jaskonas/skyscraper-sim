import type { CrownId } from '../../../sim/types';
import type { CrownBuilder } from '../types';

/** The detailed version of each crown (Detail: High). A crown without one falls back to its simple massing. */
export const RICH_CROWNS: Partial<Record<CrownId, CrownBuilder>> = {};
