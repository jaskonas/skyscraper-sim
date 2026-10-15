import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { groundOffset, quakeEnvelope, quakeLean, quakeMotion, quakeTop, windMotion, windTop, type WindMotion } from '../../sim/forces/motion';
import { FLOOR_HEIGHT, floorSlices, plateDims, type FloorSlice } from '../../sim/geometry';
import type { Analysis, Design, Site } from '../../sim/types';
import { unitGeometry } from '../buildingGeometry';
import { lotCenter } from '../layout';
import { swayAt, type SwaySignal } from './sway';

/** Moves its children (the city block, neighbours and foundation) with the ground while a quake shakes it. */
export function GroundShake({ sway, children }: { sway: SwaySignal; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.x = sway.active ? sway.groundX : 0;
  });
  return (
    <group name="ground" ref={ref}>
      {children}
    </group>
  );
}

/** Floors marked red while a force acts: `bands` glow and pulse, `cracks` flash during strong shaking. */
export interface ForceMarks {
  bands: number[];
  cracks: number[];
}

const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

/** Which floors to mark, from the assessment: lower third if it would fail, top floors if seasick, cracks if damaged. */
export function forceMarks(force: 'wind' | 'quake', site: Site, design: Design, analysis: Analysis): ForceMarks {
  const n = design.floors;
  const lower = range(0, Math.max(1, Math.floor(n / 3)));
  if (force === 'wind') {
    const m = windMotion(site, design, analysis);
    const bands = [...(m.strength === 'fail' ? lower : []), ...(m.comfort === 'fail' ? range(Math.max(0, n - 3), n) : [])];
    return { bands: [...new Set(bands)], cracks: [] };
  }
  const { outcome } = analysis.seismic;
  if (outcome === 'fails') return { bands: lower, cracks: [] };
  if (outcome === 'damaged') return { bands: [], cracks: range(0, 6).map((k) => Math.floor(((k + 0.5) / 6) * n)) };
  return { bands: [], cracks: [] };
}

/** The drawn sway of the top never exceeds this share of the tower's height. */
export const MAX_DRAWN_SWAY = 0.15;
const STREAKS = 40;
const unit = new THREE.Matrix4();
const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const v = new THREE.Vector3();
const s = new THREE.Vector3();

/** White streaks drifting past on the wind, bending round the tower, with eddies swirling in its wake. */
function WindStreaks({ design, motion, sway }: { design: Design; motion: WindMotion; sway: SwaySignal }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { width, depth } = plateDims(design);
  const height = design.floors * FLOOR_HEIGHT;
  const r = Math.max(width, depth) / 2 + 6;
  const eddies = Math.round(24 * Math.min(1.5, motion.eddyStrength));
  const total = STREAKS + eddies;
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = sway.time;
    for (let i = 0; i < STREAKS; i++) {
      const y = height * 1.3 * ((i + 0.5) / STREAKS);
      const z0 = (((i * 37) % STREAKS) / STREAKS - 0.5) * 4 * r;
      const x = ((t * 40 + i * 53) % 320) - 160;
      // Pushed aside near the tower (below the roof), as the air flows round it.
      const push = y < height && Math.abs(z0) < r ? (r - Math.abs(z0)) * Math.exp(-((x / r) ** 2)) : 0;
      const z = z0 + Math.sign(z0 || 1) * push;
      mesh.setMatrixAt(i, unit.compose(v.set(x, y, z), q.identity(), s.set(14, 0.8, 0.8)));
    }
    const size = 3 + 6 * motion.eddyStrength;
    for (let k = 0; k < eddies; k++) {
      const cx = r + 8 + (k % 3) * 14;
      const cz = (k % 2 === 0 ? 1 : -1) * r * 0.5;
      const cy = height * ((k + 0.5) / eddies);
      const a = t * 2 * motion.eddyStrength + k;
      q.setFromAxisAngle(up, -a);
      mesh.setMatrixAt(STREAKS + k, unit.compose(v.set(cx + size * Math.cos(a), cy, cz + size * Math.sin(a)), q, s.set(0.8, 0.8, 5)));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh key={total} name="wind-streaks" ref={ref} args={[geometry, undefined, total]} frustumCulled={false}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.7} depthWrite={false} />
    </instancedMesh>
  );
}

/** The top three floors drawn as glass, with the tuned mass damper inside swinging against the sway. */
function DamperGhost({ design, sway }: { design: Design; sway: SwaySignal }) {
  const slices = floorSlices(design);
  const top = slices.slice(Math.max(0, slices.length - 3));
  const geometry = useMemo(() => unitGeometry(design.shape), [design.shape]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const floors = useRef<(THREE.Mesh | null)[]>([]);
  const block = useRef<THREE.Mesh>(null);
  const mean = useRef(0);
  const last = slices[slices.length - 1];
  const size = 0.25 * Math.min(last.width, last.depth);
  const blockY = top[Math.floor(top.length / 2)].y + FLOOR_HEIGHT / 2;
  useFrame((_, delta) => {
    top.forEach((sl, i) => {
      const m = floors.current[i];
      if (m) m.position.x = swayAt(sway, sl.y + FLOOR_HEIGHT / 2);
    });
    // The block swings against the back-and-forth part of the sway (the steady lean averaged out).
    mean.current += (sway.topX - mean.current) * Math.min(1, delta / 2);
    if (block.current) block.current.position.x = swayAt(sway, blockY) - 0.6 * (sway.topX - mean.current);
  });
  return (
    <group name="damper-ghost">
      {top.map((sl: FloorSlice, i) => (
        <mesh
          key={sl.index}
          ref={(m) => {
            floors.current[i] = m;
          }}
          geometry={geometry}
          position={[0, sl.y + FLOOR_HEIGHT * 0.425, 0]}
          rotation={[0, sl.rotation, 0]}
          scale={[sl.width, FLOOR_HEIGHT * 0.85, sl.depth]}
        >
          <meshStandardMaterial color={design.palette.glass} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={block} position={[0, blockY, 0]}>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color="#9aa3ab" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** Red bands that pulse round marked floors, and red cracks that flash on them during strong shaking. */
function DamageMarks({ design, marks, sway, quake }: { design: Design; marks: ForceMarks; sway: SwaySignal; quake: boolean }) {
  const slices = floorSlices(design);
  const bands = useRef<THREE.InstancedMesh>(null);
  const cracks = useRef<THREE.InstancedMesh>(null);
  const plan = useMemo(() => unitGeometry(design.shape), [design.shape]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => plan.dispose(), [plan]);
  useEffect(() => () => box.dispose(), [box]);
  const bandMat = useRef<THREE.MeshBasicMaterial>(null);
  const crackMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const t = sway.time;
    const strong = quake ? quakeEnvelope(t) : 1;
    if (bandMat.current) bandMat.current.opacity = (0.25 + 0.2 * Math.sin(t * 6)) * (quake ? Math.min(1, strong * 2) : 1);
    if (crackMat.current) crackMat.current.opacity = strong > 0.6 && Math.sin(t * 20) > 0 ? 0.95 : 0;
    marks.bands.forEach((f, i) => {
      const sl = slices[f];
      q.setFromAxisAngle(up, sl.rotation);
      bands.current?.setMatrixAt(i, unit.compose(v.set(swayAt(sway, sl.y + 2), sl.y + 2, 0), q, s.set(sl.width * 1.04, FLOOR_HEIGHT * 0.9, sl.depth * 1.04)));
    });
    marks.cracks.forEach((f, i) => {
      const sl = slices[f];
      q.setFromAxisAngle(up, sl.rotation);
      const offset = new THREE.Vector3(0, 0, sl.depth / 2 + 0.3).applyQuaternion(q);
      cracks.current?.setMatrixAt(i, unit.compose(v.set(swayAt(sway, sl.y + 2) + offset.x, sl.y + 2, offset.z), q, s.set(sl.width * 0.6, 0.35, 0.2)));
    });
    if (bands.current) bands.current.instanceMatrix.needsUpdate = true;
    if (cracks.current) cracks.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="damage-marks">
      {marks.bands.length > 0 && (
        <instancedMesh key={`b${marks.bands.length}`} name="damage-bands" ref={bands} args={[plan, undefined, marks.bands.length]} frustumCulled={false}>
          <meshBasicMaterial ref={bandMat} color="#ff2d2d" transparent opacity={0.3} depthWrite={false} />
        </instancedMesh>
      )}
      {marks.cracks.length > 0 && (
        <instancedMesh key={`c${marks.cracks.length}`} name="cracks" ref={cracks} args={[box, undefined, marks.cracks.length]} frustumCulled={false}>
          <meshBasicMaterial ref={crackMat} color="#ff2d2d" transparent opacity={0} />
        </instancedMesh>
      )}
    </group>
  );
}

/**
 * Wind or an earthquake acting on the tower. Keeps the force's clock and writes the sway signal each frame
 * (the tower and the ground read it), and draws the streaks, see-through damper and damage marks.
 */
export function ForcesView({
  site,
  design,
  analysis,
  force,
  sway,
}: {
  site: Site;
  design: Design;
  analysis: Analysis;
  force: 'wind' | 'quake';
  sway: SwaySignal;
}) {
  const [lx, lz] = lotCenter(site);
  const wind = useMemo(() => windMotion(site, design, analysis), [site, design, analysis]);
  const quake = useMemo(() => quakeMotion(site, design, analysis), [site, design, analysis]);
  const marks = useMemo(() => forceMarks(force, site, design, analysis), [force, site, design, analysis]);
  // The clock restarts whenever a different force is switched on.
  useEffect(() => {
    sway.time = 0;
    return () => {
      sway.active = false;
      sway.groundX = sway.baseX = sway.topX = sway.lean = 0;
    };
  }, [force, sway]);
  useFrame((_, delta) => {
    const t = (sway.time += Math.min(delta, 0.1));
    sway.active = true;
    sway.height = design.floors * FLOOR_HEIGHT;
    // However far off the scale a failing design is, the drawing stays readable.
    const cap = MAX_DRAWN_SWAY * sway.height;
    const capped = (x: number) => Math.max(-cap, Math.min(cap, x));
    if (force === 'wind') {
      sway.groundX = 0;
      sway.baseX = 0;
      sway.topX = capped(windTop(wind, t));
      sway.lean = 0;
    } else {
      sway.groundX = groundOffset(t, quake.groundM);
      sway.baseX = sway.groundX * quake.baseShare;
      sway.topX = capped(quakeTop(quake, t));
      sway.lean = quakeLean(quake, t);
    }
  });
  return (
    <group name="forces" position={[lx, 0, lz]}>
      {force === 'wind' && <WindStreaks design={design} motion={wind} sway={sway} />}
      {force === 'wind' && design.damping === 'tmd' && <DamperGhost design={design} sway={sway} />}
      <DamageMarks design={design} marks={marks} sway={sway} quake={force === 'quake'} />
    </group>
  );
}
