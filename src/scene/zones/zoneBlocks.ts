import { USE_LABEL, type Fit } from '../../sim/catalog/zones';
import { FLOOR_HEIGHT, floorSlices, type FloorSlice } from '../../sim/geometry';
import type { Design, UseType } from '../../sim/types';
import { stackFits } from '../../sim/zones/fit';

export interface ZoneBlock {
  /** The zone's index in the design's stack. */
  index: number;
  use: UseType;
  fit: Fit;
  color: string;
  slices: FloorSlice[];
  /** Height of the middle of the zone, metres. */
  labelY: number;
}

/** Each zone as the floors it covers, in its use's colour, bottom to top. */
export function zoneBlocks(design: Design): ZoneBlock[] {
  const slices = floorSlices(design);
  return stackFits(design).map((b) => ({
    index: b.index,
    use: b.use,
    fit: b.fit,
    color: USE_LABEL[b.use].color,
    slices: slices.slice(b.from, b.to + 1),
    labelY: ((b.from + b.to + 1) / 2) * FLOOR_HEIGHT,
  }));
}
