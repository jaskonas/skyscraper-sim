import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { partBounds, type Part } from '../../sim/parts';
import type { Palette, PlanShape } from '../../sim/types';
import { swayAt, type SwaySignal } from '../forces/sway';
import { partGeometry } from './geometries';
import { glowColor, materialLook } from './materials';

export interface PartGroup {
  key: string;
  sample: Part;
  parts: Part[];
}

/** Parts that can share one instanced mesh: same shape, material, glow and animation. */
export function groupParts(parts: Part[]): PartGroup[] {
  const groups = new Map<string, PartGroup>();
  for (const p of parts) {
    const key = `${p.shape}|${p.material}|${p.glow ? 'glow' : ''}|${p.animate ?? ''}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, sample: p, parts: [] }));
    g.parts.push(p);
  }
  return [...groups.values()];
}

const euler = new THREE.Euler();
const quat = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const mat = new THREE.Matrix4();

export function partMatrix(p: Part, extraZ = 0, out = new THREE.Matrix4()): THREE.Matrix4 {
  const r = p.rotation ?? [0, 0, 0];
  euler.set(r[0], r[1], r[2] + extraZ, 'YXZ');
  quat.setFromEuler(euler);
  return out.compose(pos.set(...p.position), quat, scl.set(...p.scale));
}

function Group({ group, palette, plan, night, sway }: { group: PartGroup; palette: Palette; plan: PlanShape; night: boolean; sway?: SwaySignal }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const swaying = useRef(false);
  const { sample, parts } = group;
  const look = materialLook(sample.material, palette);
  const lit = night && !!sample.glow;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    parts.forEach((p, i) => mesh.setMatrixAt(i, partMatrix(p, 0, mat)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [parts]);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    const spin = sample.animate === 'spin';
    const swayOn = !!sway?.active;
    // Runs while spinning or swaying, and once more after the sway stops to put every part back.
    if (!mesh || (!spin && !swayOn && !swaying.current)) return;
    swaying.current = swayOn;
    const t = spin ? clock.getElapsedTime() * 1.5 : 0;
    parts.forEach((p, i) => {
      partMatrix(p, t, mat);
      if (swayOn) mat.elements[12] += swayAt(sway!, p.position[1]);
      mesh.setMatrixAt(i, mat);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      key={parts.length}
      ref={ref}
      name={`parts:${group.key}`}
      args={[partGeometry(sample.shape, plan), undefined, parts.length]}
    >
      <meshStandardMaterial
        color={look.color}
        roughness={look.roughness}
        metalness={look.metalness}
        emissive={lit ? glowColor(sample.material, palette) : '#000000'}
        emissiveIntensity={lit ? 1.4 : 0}
        flatShading
      />
    </instancedMesh>
  );
}

/** Red aircraft-warning lights on top of masts and spires, blinking about once a second at night. */
function AircraftLights({ parts, sway }: { parts: Part[]; sway?: SwaySignal }) {
  const group = useRef<THREE.Group>(null);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff2020', emissive: '#ff2020' }), []);
  const sphere = useMemo(() => new THREE.SphereGeometry(0.6, 8, 6), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => sphere.dispose(), [sphere]);
  const tops = useMemo(
    () =>
      parts.map((p) => {
        const b = partBounds(p);
        return [p.position[0], b.max[1] + 0.6, p.position[2]] as [number, number, number];
      }),
    [parts],
  );
  useFrame(({ clock }) => {
    material.emissiveIntensity = Math.sin(clock.getElapsedTime() * Math.PI * 2) > 0 ? 3 : 0.2;
    group.current?.children.forEach((c, i) => (c.position.x = tops[i][0] + (sway?.active ? swayAt(sway, tops[i][1]) : 0)));
  });
  return (
    <group name="aircraft-lights" ref={group}>
      {tops.map((t, i) => (
        <mesh key={i} position={t} geometry={sphere} material={material} />
      ))}
    </group>
  );
}

/** Draws any list of parts with one instanced mesh per (shape, material) group. */
export function PartsMesh({
  parts,
  palette,
  plan,
  night = false,
  name,
  sway,
}: {
  parts: Part[];
  palette: Palette;
  plan: PlanShape;
  night?: boolean;
  name: string;
  /** Parts follow the tower's bend at their own height while a force acts on it. */
  sway?: SwaySignal;
}) {
  const groups = useMemo(() => groupParts(parts), [parts]);
  const blinkers = useMemo(() => parts.filter((p) => p.animate === 'blink'), [parts]);
  return (
    <group name={name}>
      {groups.map((g) => (
        <Group key={g.key} group={g} palette={palette} plan={plan} night={night} sway={sway} />
      ))}
      {night && blinkers.length > 0 && <AircraftLights parts={blinkers} sway={sway} />}
    </group>
  );
}
