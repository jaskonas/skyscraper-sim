import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useCurrent } from '../state/hooks';
import { Building } from './Building';
import { FoundationView } from './FoundationView';
import { Landmark } from './Landmark';
import { Neighbors } from './Neighbors';
import { SiteDiorama } from './SiteDiorama';
import { lotCenter } from './layout';

export function Scene() {
  const { site, design, analysis } = useCurrent();
  const [lx, lz] = lotCenter(site);
  const h = analysis.heightM;
  return (
    <Canvas key={site.id} camera={{ position: [lx + 280, Math.max(180, h * 0.75), lz + 340], fov: 45, near: 1, far: 6000 }}>
      <color attach="background" args={[site.visuals.sky]} />
      <fog attach="fog" args={[site.visuals.sky, 1200, 3200]} />
      <hemisphereLight args={['#ffffff', site.visuals.ground, 0.9]} />
      <directionalLight position={[300, 600, 250]} intensity={1.8} />
      <SiteDiorama site={site} />
      <Neighbors site={site} />
      <Landmark kind={site.visuals.landmark} />
      <Building site={site} design={design} />
      <FoundationView site={site} design={design} />
      <OrbitControls makeDefault target={[lx, Math.min(h * 0.35, 160), lz]} maxPolarAngle={Math.PI * 0.62} minDistance={40} maxDistance={2500} />
    </Canvas>
  );
}
