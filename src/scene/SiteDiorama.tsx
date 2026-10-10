import { Html } from '@react-three/drei';
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
        <group key={b.name + b.top}>
          <mesh position={[0, -1 - b.top - b.thickness / 2, 0]}>
            <boxGeometry args={[DIORAMA.width, b.thickness, DIORAMA.depth]} />
            <meshStandardMaterial color={b.color} transparent opacity={0.55} depthWrite={false} />
          </mesh>
          <Html position={[-DIORAMA.width / 2 + 4, -1 - b.top - b.thickness / 2, DIORAMA.depth / 2]} className="soil-label">
            {b.name}
          </Html>
        </group>
      ))}
      {site.bedrockDepth > bands.reduce((s, b) => s + b.thickness, 0) && (
        <Html position={[0, -1 - bands.reduce((s, b) => s + b.thickness, 0), DIORAMA.depth / 2]} className="soil-label">
          ↓ bedrock {site.bedrockDepth} m down
        </Html>
      )}
    </group>
  );
}
