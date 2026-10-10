import { COEFFICIENTS } from '../catalog/coefficients';
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
import { USE_ORDER } from '../types';

export interface Massing {
  bodyHeight: number;
  heightM: number;
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

/** Normalized use shares (sum to 1) in stacking order. */
export function useShares(design: Design): Record<UseType, number> {
  const total = USE_ORDER.reduce((s, u) => s + Math.max(0, design.useMix[u]), 0);
  const out = { retail: 0, office: 0, hotel: 0, residential: 0 } as Record<UseType, number>;
  if (total <= 0) {
    out.office = 1;
    return out;
  }
  for (const u of USE_ORDER) out[u] = Math.max(0, design.useMix[u]) / total;
  return out;
}

/** Use of each floor, bottom to top. */
export function floorUses(design: Design): UseType[] {
  const shares = useShares(design);
  const uses: UseType[] = [];
  let cumulative = 0;
  for (let i = 0; i < design.floors; i++) {
    const t = (i + 0.5) / design.floors;
    let use: UseType = 'office';
    cumulative = 0;
    for (const u of USE_ORDER) {
      cumulative += shares[u];
      if (t <= cumulative + 1e-9) {
        use = u;
        break;
      }
    }
    uses.push(use);
  }
  return uses;
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
  const heightM = bodyHeight + crownHeight(design.crown, bodyHeight);
  const baseWidth = Math.min(width, depth);
  const unitWeight =
    W.materialKNPerM2[design.material] +
    W.facadeKNPerM2[design.facade] +
    (design.exposedStructure ? W.exposedStructureKNPerM2 : 0);
  const amenityKN = design.amenities.reduce((s, a) => s + W.amenityKN[a], 0);
  return {
    bodyHeight,
    heightM,
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
