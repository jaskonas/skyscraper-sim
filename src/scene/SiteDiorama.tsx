import type { Site } from '../sim/types';
import { DIORAMA, lotCenter, soilBands } from './layout';

export function SiteDiorama({ site }: { site: Site }) {
  const [lx, lz] = lotCenter(site);
  const bands = soilBands(site);
  return (
    <group name="diorama">
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[DIORAMA.width, 1, DIORAMA.depth]} />
        <meshStandardMaterial color={site.visuals.ground} />
      </mesh>
      <mesh position={[lx, 0.05, lz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[site.lot.width, site.lot.depth]} />
        <meshStandardMaterial color="#d6cfbf" />
      </mesh>
      {bands.map((b) => (
        <mesh key={b.name + b.top} position={[0, -1 - b.top - b.thickness / 2, 0]}>
          <boxGeometry args={[DIORAMA.width, b.thickness, DIORAMA.depth]} />
          <meshStandardMaterial color={b.color} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
