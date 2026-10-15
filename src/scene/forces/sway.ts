import { bendShape } from '../../sim/forces/motion';

/**
 * Where the tower is this frame while a force acts on it. One mutable object, written each frame by the
 * forces view and read each frame by the tower, so the motion never goes through React state.
 */
export interface SwaySignal {
  active: boolean;
  /** Sideways offset of the ground (the whole city block), metres. */
  groundX: number;
  /** Sideways offset of the tower's base, metres. */
  baseX: number;
  /** Sideways offset of the top relative to the base, metres. */
  topX: number;
  /** A failing tower's lean, radians. */
  lean: number;
  /** Height the bend is measured over, metres. */
  height: number;
  /** Seconds since the force was switched on (the quake cycle and damage marks keep time by it). */
  time: number;
}

export const createSway = (): SwaySignal => ({ active: false, groundX: 0, baseX: 0, topX: 0, lean: 0, height: 1, time: 0 });

/** Sideways offset, metres, of the part of the tower at height `y`. */
export function swayAt(s: SwaySignal, y: number): number {
  return s.baseX + s.topX * bendShape(y, s.height) + Math.tan(s.lean) * Math.max(0, y);
}
