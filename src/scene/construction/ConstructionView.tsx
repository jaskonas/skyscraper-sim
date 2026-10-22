import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { constructionState, type ConstructionState } from '../../sim/construction/stages';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import type { Analysis, Design, Site } from '../../sim/types';
import { setBuildProgress } from '../../state/buildProgress';
import { useGame } from '../../state/store';
import { Building } from '../Building';
import { FoundationView } from '../FoundationView';
import { lotCenter } from '../layout';
import { PartsMesh } from '../parts/PartsMesh';
import { structureParts, type StructurePart } from '../structure/structureParts';
import { constructionProps } from './props';
import { STAGE_SECONDS, stageFrame, visibleStructure } from './reveal';
import { surfacesFor } from '../materials/library';

/** Redraw the site this often while a stage plays (seconds); the counters update at the same pace. */
const STEP = 0.05;

interface SceneProps {
  site: Site;
  design: Design;
  parts: StructurePart[];
  state: ConstructionState;
  /** Seconds since the view opened; animates the crane and vehicles. */
  clock: number;
  night: boolean;
}

/** The building site at one moment: the finished tower so far, the bare structure above it, the ground and the props. */
export function ConstructionScene({ site, design, parts, state, clock, night }: SceneProps) {
  const [lx, lz] = lotCenter(site);
  const facadeDetail = useGame((s) => s.facadeDetail === 'high');
  const floors = Math.floor(state.facadeTop / FLOOR_HEIGHT + 1e-6);
  // Recomputed only when a height crosses a floor, not on every redraw.
  const key = [state.coreTop, state.frameTop, state.slabTop, state.facadeTop].map((h) => Math.floor(h / FLOOR_HEIGHT + 1e-6)).join('|');
  const damperUp = state.crown >= 0.3;
  // `key`, `isolators` and `damperUp` are everything in `state` that changes the result.
  const skeleton = useMemo(() => visibleStructure(parts, state), [parts, key, state.isolators, damperUp]);
  const props = constructionProps(design, state, clock);
  const look = { palette: design.palette, plan: design.shape, night, surfaces: surfacesFor(design), detail: facadeDetail };
  return (
    <>
      <Building
        site={site}
        design={design}
        night={night}
        facadeDetail={facadeDetail}
        reveal={{ floors, crown: Math.round(state.crown * 20) / 20, litFloors: state.litFloors, lights: state.litFloors > 0 }}
      />
      <FoundationView site={site} design={design} dig={Math.round(state.dig * 40) / 40} built={Math.round(state.foundation * 40) / 40} />
      <group position={[lx, 0, lz]}>
        <PartsMesh name="skeleton" parts={skeleton} {...look} />
        <PartsMesh name="site-props" parts={props} {...look} />
      </group>
    </>
  );
}

/** Eases the camera to each stage's framing over about a second; stops if the player starts orbiting. */
function StageCamera({ site, design, analysis, stage }: { site: Site; design: Design; analysis: Analysis; stage: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const ease = useRef<{ from: THREE.Vector3; fromTarget: THREE.Vector3; to: THREE.Vector3; toTarget: THREE.Vector3; t: number } | null>(null);
  useEffect(() => {
    const f = stageFrame(site, design, analysis, stage);
    ease.current = {
      from: camera.position.clone(),
      fromTarget: controls ? controls.target.clone() : new THREE.Vector3(...f.target),
      to: new THREE.Vector3(...f.position),
      toTarget: new THREE.Vector3(...f.target),
      t: 0,
    };
    // Only on a new stage: the design (and so its analysis) is locked while building.
  }, [stage, camera, controls]);
  useEffect(() => {
    if (!controls) return;
    const stop = () => (ease.current = null);
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);
  useFrame((_, delta) => {
    const e = ease.current;
    if (!e) return;
    e.t = Math.min(1, e.t + Math.min(delta, 0.1));
    const k = e.t * e.t * (3 - 2 * e.t);
    camera.position.lerpVectors(e.from, e.to, k);
    if (controls) {
      controls.target.lerpVectors(e.fromTarget, e.toTarget, k);
      controls.update();
    } else camera.lookAt(e.toTarget);
    if (e.t >= 1) ease.current = null;
  });
  return null;
}

/**
 * Construction, played one stage at a time. Progress lives in a ref advanced every frame (outside React);
 * the site redraws and the sidebar's counters update about twenty times a second.
 */
export function ConstructionView({ site, design, analysis, night }: { site: Site; design: Design; analysis: Analysis; night: boolean }) {
  const stage = useGame((s) => s.buildStage);
  const parts = useMemo(() => structureParts(design), [design]);
  const t = useRef(useGame.getState().stageDone ? 1 : 0);
  const run = useRef(useGame.getState().stageRun);
  const clock = useRef(0);
  const lastDraw = useRef(-Infinity);
  const [snap, setSnap] = useState(() => ({ state: constructionState(design, analysis, stage, t.current), clock: 0 }));

  useFrame((_, delta) => {
    const g = useGame.getState();
    if (g.phase !== 'building') return;
    // A long gap (a hidden tab, a slow frame) counts as at most a tenth of a second.
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    if (g.stageRun !== run.current) {
      // A new stage, or a replay: start from the beginning.
      run.current = g.stageRun;
      t.current = g.stageDone ? 1 : 0;
    }
    if (!g.stageDone) {
      t.current = Math.min(1, t.current + dt / STAGE_SECONDS[g.buildStage]);
      if (t.current >= 1) g.finishStage();
      else if (clock.current - lastDraw.current >= STEP) setBuildProgress(t.current);
    }
    if (clock.current - lastDraw.current >= STEP) {
      lastDraw.current = clock.current;
      setSnap({ state: constructionState(design, analysis, g.buildStage, t.current), clock: clock.current });
    }
  });

  return (
    <>
      <ConstructionScene site={site} design={design} parts={parts} state={snap.state} clock={snap.clock} night={night} />
      <StageCamera site={site} design={design} analysis={analysis} stage={stage} />
    </>
  );
}
