import type { Part } from '../../sim/parts';
import type { Ornament, PlanShape } from '../../sim/types';

/** Size of the roof a crown sits on, and how tall the crown is. */
export interface CrownContext {
  shape: PlanShape;
  /** Top floor width and depth, metres. */
  W: number;
  D: number;
  /** Crown height, metres. */
  H: number;
  /** Ornament amount: None drops purely decorative fine work. */
  ornament: Ornament;
}

/** Builds a crown in its own frame: y = 0 at the roof, centred on the tower. */
export type CrownBuilder = (ctx: CrownContext) => Part[];
