import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useCurrent } from '../state/hooks';
import { useGame } from '../state/store';
import { DetailInset } from '../ui/DetailInset';
import { ForceBanner, ForceButtons, ForceReadout } from '../ui/ForceControls';
import { SoilLegend } from '../ui/SoilLegend';
import { Building } from './Building';
import { ConstructionView } from './construction/ConstructionView';
import { FoundationView } from './FoundationView';
import { ForcesView, GroundShake } from './forces/ForcesView';
import { createSway } from './forces/sway';
import { useFrameNonce } from './frameNonce';
import { Landmark } from './Landmark';
import { lighting } from './lighting';
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

export { lighting };

export function Scene() {
  const { site, design, analysis } = useCurrent();
  const timeOfDay = useGame((s) => s.timeOfDay);
  const setTimeOfDay = useGame((s) => s.setTimeOfDay);
  const night = timeOfDay === 'night';
  const phase = useGame((s) => s.phase);
  const building = phase === 'building';
  const [nonce, reframe] = useFrameNonce(phase);
  const force = useGame((s) => s.force);
  // Forces wait while the tower is being built.
  const forceOn = force !== 'none' && !building ? force : null;
  const [sway] = useState(createSway);
  const light = lighting(site, night);
  const frame = cameraFrame(site, analysis.tipHeightM);
  return (
    <div className="scene">
      <Canvas key={site.id} camera={{ position: frame.position, fov: 45, near: 1, far: 6000 }}>
        <color attach="background" args={[light.sky]} />
        <fog attach="fog" args={[light.sky, 1400, 3600]} />
        <hemisphereLight args={[light.hemiSky, site.visuals.ground, light.hemi]} />
        <directionalLight position={[300, 600, 250]} intensity={light.sun} color={light.sunColor} />
        <GroundShake sway={sway}>
          <SiteDiorama site={site} />
          <Neighbors site={site} night={night} />
          {!building && <FoundationView site={site} design={design} />}
        </GroundShake>
        <Landmark kind={site.visuals.landmark} />
        {building ? (
          <ConstructionView site={site} design={design} analysis={analysis} night={night} />
        ) : (
          <Building
            site={site}
            design={design}
            night={night}
            sway={sway}
            hideTopFloors={forceOn === 'wind' && design.damping === 'tmd' ? 3 : 0}
          />
        )}
        {forceOn && <ForcesView site={site} design={design} analysis={analysis} force={forceOn} sway={sway} />}
        <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.62} minDistance={40} maxDistance={2500} />
        <CameraFramer frame={frame} nonce={nonce} />
      </Canvas>
      <DetailInset />
      <ForceBanner />
      <div className="scene-overlay">
        {forceOn ? <ForceReadout /> : <SoilLegend site={site} design={design} />}
        <button onClick={reframe}>Fit tower in view</button>
        <button aria-pressed={night} onClick={() => setTimeOfDay(night ? 'day' : 'night')}>
          {night ? '☀️ Day' : '🌙 Night'}
        </button>
        <ForceButtons />
      </div>
    </div>
  );
}
