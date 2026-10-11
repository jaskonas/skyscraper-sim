import type { Part } from '../../sim/parts';
import type { PlanShape } from '../../sim/types';

/** Size of the roof a crown sits on, and how tall the crown is. */
export interface CrownContext {
  shape: PlanShape;
  /** Top floor width and depth, metres. */
  W: number;
  D: number;
  /** Crown height, metres. */
  H: number;
}

/** Builds a crown in its own frame: y = 0 at the roof, centred on the tower. */
export type CrownBuilder = (ctx: CrownContext) => Part[];
