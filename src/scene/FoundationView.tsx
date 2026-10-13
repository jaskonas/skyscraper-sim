import { FOUNDATION_SPACING } from '../sim/construction/foundation';
import { plateDims } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import { lotCenter, soilDepthShown } from './layout';

const CONCRETE = '#b8b4ac';
const PIT = '#3b3127';
/** While building piles or caissons, this share of the foundation stage drives the shafts; the cap is poured after. */
const SHAFT_SHARE = 0.7;

/** Positions of piles or caissons on a grid under the footprint. */
export function shaftGrid(width: number, depth: number, spacing: number): [number, number][] {
  const out: [number, number][] = [];
  const nx = Math.max(1, Math.floor(width / spacing));
  const nz = Math.max(1, Math.floor(depth / spacing));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) out.push([(i + 0.5) * (width / nx) - width / 2, (j + 0.5) * (depth / nz) - depth / 2]);
  return out;
}

/**
 * The foundation under the lot, seen through the soil cutaway. During construction `dig` (0..1) opens the
 * hole and `built` (0..1) builds the foundation into it: shafts driven a few at a time, then the slab poured.
 */
export function FoundationView({ site, design, dig = 1, built = 1 }: { site: Site; design: Design; dig?: number; built?: number }) {
  const [lx, lz] = lotCenter(site);
  const { width, depth } = plateDims(design);
  const soil = site.foundation[design.foundation];
  const reach = Math.min(soil.depth, soilDepthShown(site));
  const slab = design.foundation === 'raft' ? reach : 3;
  const shafts =
    design.foundation === 'piles'
      ? shaftGrid(width, depth, FOUNDATION_SPACING.piles)
      : design.foundation === 'caissons'
        ? shaftGrid(width, depth, FOUNDATION_SPACING.caissons)
        : [];
  const radius = design.foundation === 'caissons' ? 1.6 : 0.5;
  const shaftLength = Math.max(1, reach - slab);
  // How far along the shafts and the slab are.
  const shaftProgress = shafts.length ? Math.min(1, built / SHAFT_SHARE) : 1;
  const slabProgress = shafts.length ? Math.max(0, (built - SHAFT_SHARE) / (1 - SHAFT_SHARE)) : built;
  const driven = shaftProgress * shafts.length;
  const slabHeight = slab * Math.min(1, slabProgress);
  const hole = built < 1 ? slab * dig - slabHeight : 0;
  return (
    <group name="foundation" position={[lx, -1, lz]}>
      {hole > 0.01 && (
        <mesh name="pit" position={[0, -slab * dig + slabHeight + hole / 2, 0]}>
          <boxGeometry args={[width + 6, hole, depth + 6]} />
          <meshStandardMaterial color={PIT} />
        </mesh>
      )}
      {slabHeight > 0.01 && (
        <mesh name="foundation-slab" position={[0, -slab + slabHeight / 2, 0]}>
          <boxGeometry args={[width + 4, slabHeight, depth + 4]} />
          <meshStandardMaterial color={CONCRETE} />
        </mesh>
      )}
      {shafts.slice(0, Math.ceil(driven)).map(([x, z], i) => {
        // The last shaft is part-way down; the rest are driven to full depth.
        const length = shaftLength * Math.min(1, driven - i);
        return (
          <mesh key={`${x},${z}`} name="shaft" position={[x, -slab - length / 2, z]}>
            <cylinderGeometry args={[radius, radius, length, 8]} />
            <meshStandardMaterial color={CONCRETE} />
          </mesh>
        );
      })}
    </group>
  );
}
