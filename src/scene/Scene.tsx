import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Site } from '../sim/types';
import { useCurrent } from '../state/hooks';
import { useGame } from '../state/store';
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

/** Sky and light for day or night. Night is a simple dusk palette — no light simulation. */
export function lighting(site: Site, night: boolean) {
  return night
    ? { sky: '#0b1426', hemi: 0.4, hemiSky: '#6f85b5', sun: 0.35, sunColor: '#9fb4ff' }
    : { sky: site.visuals.sky, hemi: 0.9, hemiSky: '#ffffff', sun: 1.8, sunColor: '#ffffff' };
}

export function Scene() {
  const { site, design, analysis } = useCurrent();
  const [nonce, setNonce] = useState(0);
  const timeOfDay = useGame((s) => s.timeOfDay);
  const setTimeOfDay = useGame((s) => s.setTimeOfDay);
  const night = timeOfDay === 'night';
  const light = lighting(site, night);
  const frame = cameraFrame(site, analysis.tipHeightM);
  return (
    <div className="scene">
      <Canvas key={site.id} camera={{ position: frame.position, fov: 45, near: 1, far: 6000 }}>
        <color attach="background" args={[light.sky]} />
        <fog attach="fog" args={[light.sky, 1400, 3600]} />
        <hemisphereLight args={[light.hemiSky, site.visuals.ground, light.hemi]} />
        <directionalLight position={[300, 600, 250]} intensity={light.sun} color={light.sunColor} />
        <SiteDiorama site={site} />
        <Neighbors site={site} night={night} />
        <Landmark kind={site.visuals.landmark} />
        <Building site={site} design={design} night={night} />
        <FoundationView site={site} design={design} />
        <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.62} minDistance={40} maxDistance={2500} />
        <CameraFramer frame={frame} nonce={nonce} />
      </Canvas>
      <div className="scene-overlay">
        <SoilLegend site={site} design={design} />
        <button onClick={() => setNonce((n) => n + 1)}>Fit tower in view</button>
        <button aria-pressed={night} onClick={() => setTimeOfDay(night ? 'day' : 'night')}>
          {night ? '☀️ Day' : '🌙 Night'}
        </button>
      </div>
    </div>
  );
}
