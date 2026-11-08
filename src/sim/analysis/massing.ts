import { COEFFICIENTS } from '../catalog/coefficients';
import { CROWNS } from '../catalog/crowns';
import { activeOrnaments } from '../facade';
import {
  FLOOR_HEIGHT,
  crownHeight,
  floorSlices,
  plateDims,
  shapeAreaFactor,
  shapePerimeter,
  sliceArea,
} from '../geometry';
import type { Design, UseType } from '../types';
import { bandFloors, normalizeStack } from '../stack';

export interface Massing {
  bodyHeight: number;
  /** Official height (antennas excluded). */
  heightM: number;
  /** To the very tip, antennas included. */
  tipHeightM: number;
  gfa: number;
  footprint: number;
  /** Total wall area, m². */
  facadeArea: number;
  /** Sum of floor widths × storey height — what the wind pushes on, m². */
  frontalArea: number;
  baseWidth: number;
  slenderness: number;
  weightKN: number;
  /** kN per m² of floor including facade. */
  unitWeight: number;
  /** m² of floor per use. */
  areaByUse: Record<UseType, number>;
  /** Use of the top floor. */
  topUse: UseType;
}

/** Normalized use shares (sum to 1), totalled over the zones. */
export function useShares(design: Design): Record<UseType, number> {
  const out = { retail: 0, office: 0, hotel: 0, residential: 0 } as Record<UseType, number>;
  for (const b of normalizeStack(design.stack)) out[b.use] += b.share / 100;
  return out;
}

/** Use of each floor, bottom to top. */
export function floorUses(design: Design): UseType[] {
  return bandFloors(design.stack, design.floors).flatMap((b) => Array.from({ length: b.to - b.from + 1 }, () => b.use));
}

export function computeMassing(design: Design): Massing {
  const W = COEFFICIENTS.weight;
  const slices = floorSlices(design);
  const uses = floorUses(design);
  const areaByUse = { retail: 0, office: 0, hotel: 0, residential: 0 } as Record<UseType, number>;
  let gfa = 0;
  let facadeArea = 0;
  let frontalArea = 0;
  slices.forEach((s, i) => {
    const a = sliceArea(design.shape, s);
    gfa += a;
    areaByUse[uses[i]] += a;
    facadeArea += shapePerimeter(design.shape, s.width, s.depth) * FLOOR_HEIGHT;
    frontalArea += Math.max(s.width, s.depth) * FLOOR_HEIGHT;
  });
  const { width, depth } = plateDims(design);
  const footprint = width * depth * shapeAreaFactor(design.shape);
  const bodyHeight = design.floors * FLOOR_HEIGHT;
  const tipHeightM = bodyHeight + crownHeight(design.crown, bodyHeight);
  const heightM = CROWNS[design.crown].officialHeight ? tipHeightM : bodyHeight;
  const baseWidth = Math.min(width, depth);
  const unitWeight =
    W.materialKNPerM2[design.material] +
    W.facadeKNPerM2[design.facade] +
    (design.exposedStructure ? W.exposedStructureKNPerM2 : 0) +
    activeOrnaments(design).filter((o) => o.stone).length * W.stoneOrnamentKNPerM2 * W.ornamentAmountWeight[design.ornament];
  const amenityKN = design.amenities.reduce((s, a) => s + W.amenityKN[a], 0);
  return {
    bodyHeight,
    heightM,
    tipHeightM,
    gfa,
    footprint,
    facadeArea,
    frontalArea,
    baseWidth,
    slenderness: bodyHeight / baseWidth,
    weightKN: gfa * unitWeight + amenityKN,
    unitWeight,
    areaByUse,
    topUse: uses[uses.length - 1] ?? 'office',
  };
}
