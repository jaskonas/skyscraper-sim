import { plateDims } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import { lotCenter, soilDepthShown } from './layout';

const CONCRETE = '#b8b4ac';

/** Positions of piles or caissons on a grid under the footprint. */
export function shaftGrid(width: number, depth: number, spacing: number): [number, number][] {
  const out: [number, number][] = [];
  const nx = Math.max(1, Math.floor(width / spacing));
  const nz = Math.max(1, Math.floor(depth / spacing));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) out.push([(i + 0.5) * (width / nx) - width / 2, (j + 0.5) * (depth / nz) - depth / 2]);
  return out;
}

export function FoundationView({ site, design }: { site: Site; design: Design }) {
  const [lx, lz] = lotCenter(site);
  const { width, depth } = plateDims(design);
  const soil = site.foundation[design.foundation];
  const reach = Math.min(soil.depth, soilDepthShown(site));
  const slab = design.foundation === 'raft' ? reach : 3;
  const shafts =
    design.foundation === 'piles' ? shaftGrid(width, depth, 6) : design.foundation === 'caissons' ? shaftGrid(width, depth, 12) : [];
  const radius = design.foundation === 'caissons' ? 1.6 : 0.5;
  return (
    <group name="foundation" position={[lx, -1, lz]}>
      <mesh position={[0, -slab / 2, 0]}>
        <boxGeometry args={[width + 4, slab, depth + 4]} />
        <meshStandardMaterial color={CONCRETE} />
      </mesh>
      {shafts.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, -slab - (reach - slab) / 2, z]}>
          <cylinderGeometry args={[radius, radius, Math.max(1, reach - slab), 8]} />
          <meshStandardMaterial color={CONCRETE} />
        </mesh>
      ))}
    </group>
  );
}
