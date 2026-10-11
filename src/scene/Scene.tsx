import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useCurrent } from '../state/hooks';
import { SoilLegend } from '../ui/SoilLegend';
import { Building } from './Building';
import { FoundationView } from './FoundationView';
import { Landmark } from './Landmark';
import { Neighbors } from './Neighbors';
import { SiteDiorama } from './SiteDiorama';
import { cameraFrame, type CameraFrame } from './layout';

/** Moves the camera to `frame` when the controls first exist and whenever `nonce` changes — never on design edits. */
function CameraFramer({ frame, nonce }: { frame: CameraFrame; nonce: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const latest = useRef(frame);
  latest.current = frame;
  useEffect(() => {
    const f = latest.current;
    camera.position.set(...f.position);
    if (controls) {
      controls.target.set(...f.target);
      controls.update();
    } else {
      camera.lookAt(...f.target);
    }
  }, [camera, controls, nonce]);
  return null;
}

export function Scene() {
  const { site, design, analysis } = useCurrent();
  const [nonce, setNonce] = useState(0);
  const frame = cameraFrame(site, analysis.tipHeightM);
  return (
    <div className="scene">
      <Canvas key={site.id} camera={{ position: frame.position, fov: 45, near: 1, far: 6000 }}>
        <color attach="background" args={[site.visuals.sky]} />
        <fog attach="fog" args={[site.visuals.sky, 1400, 3600]} />
        <hemisphereLight args={['#ffffff', site.visuals.ground, 0.9]} />
        <directionalLight position={[300, 600, 250]} intensity={1.8} />
        <SiteDiorama site={site} />
        <Neighbors site={site} />
        <Landmark kind={site.visuals.landmark} />
        <Building site={site} design={design} />
        <FoundationView site={site} design={design} />
        <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.62} minDistance={40} maxDistance={2500} />
        <CameraFramer frame={frame} nonce={nonce} />
      </Canvas>
      <div className="scene-overlay">
        <SoilLegend site={site} design={design} />
        <button onClick={() => setNonce((n) => n + 1)}>Fit tower in view</button>
      </div>
    </div>
  );
}
