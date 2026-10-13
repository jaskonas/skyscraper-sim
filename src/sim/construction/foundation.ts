import { plateDims } from '../geometry';
import type { Design, Site } from '../types';

/** Grid spacing under the footprint, metres. The scene's foundation view uses the same spacings. */
export const FOUNDATION_SPACING = { piles: 6, caissons: 12, isolators: 8 } as const;

/** How many grid cells of `spacing` fit under a width × depth footprint (at least one). */
export function gridCount(width: number, depth: number, spacing: number): number {
  return Math.max(1, Math.floor(width / spacing)) * Math.max(1, Math.floor(depth / spacing));
}

export interface FoundationPlan {
  /** Metres below ground the foundation reaches. */
  depth: number;
  /** Metres dug out before the foundation goes in: the raft's basement, or a shallow pit for the rest. */
  digDepth: number;
  /** Piles or caissons (0 for a mat or raft). */
  shafts: number;
  /** Base-isolation pads (0 when not chosen). */
  isolators: number;
  /** Soil layers the foundation passes into, top first. */
  layers: string[];
  reachesBedrock: boolean;
}

export function foundationPlan(site: Site, design: Design): FoundationPlan {
  const { width, depth } = plateDims(design);
  const soil = site.foundation[design.foundation];
  const layers: string[] = [];
  let top = 0;
  for (const layer of site.soil) {
    if (top < soil.depth) layers.push(layer.name);
    top += layer.thickness;
  }
  const shafts =
    design.foundation === 'piles'
      ? gridCount(width, depth, FOUNDATION_SPACING.piles)
      : design.foundation === 'caissons'
        ? gridCount(width, depth, FOUNDATION_SPACING.caissons)
        : 0;
  return {
    depth: soil.depth,
    digDepth: design.foundation === 'raft' ? soil.depth : 3,
    shafts,
    isolators: design.baseIsolation ? gridCount(width, depth, FOUNDATION_SPACING.isolators) : 0,
    layers,
    reachesBedrock: soil.depth >= site.bedrockDepth,
  };
}
