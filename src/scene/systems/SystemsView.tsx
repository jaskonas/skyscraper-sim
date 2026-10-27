import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import type { SystemId } from '../../sim/systems/facts';
import { systemNetwork } from '../../sim/systems/network';
import type { Analysis, Design, Site } from '../../sim/types';
import { lotCenter } from '../layout';
import { PartsMesh } from '../parts/PartsMesh';
import { carHeight, carTrip, lengthOf, pointAlong, pulseLayout, segmentsOf } from './flow';

/** Most glowing pulses on screen at once. */
export const PULSE_CAP = 400;
/** How fast pulses travel along the lines, metres a second (for reading, not real speed). */
const PULSE_SPEED = 8;

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitSphere = new THREE.SphereGeometry(0.5, 8, 6);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const v = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const colour = new THREE.Color();

/**
 * A building system running inside the tower: its pipes, cables or ducts as bright lines, glowing pulses
 * flowing along them, its equipment, and (for elevators) cars riding their shafts.
 */
export function SystemsView({ site, design, analysis, system }: { site: Site; design: Design; analysis: Analysis; system: SystemId }) {
  const [lx, lz] = lotCenter(site);
  const net = useMemo(() => systemNetwork(site, design, analysis, system), [site, design, analysis, system]);
  const segments = useMemo(() => segmentsOf(net.lines), [net]);
  const pulses = useMemo(() => pulseLayout(net.lines, PULSE_CAP), [net]);
  const lengths = useMemo(() => net.lines.map((l) => lengthOf(l.points)), [net]);
  const trips = useMemo(() => net.shafts.map((sh, i) => carTrip(sh.stops, sh.express, i)), [net]);
  // Lines are drawn thicker on taller towers, so they still read when the whole tower is in view.
  const thick = Math.max(1, (design.floors * FLOOR_HEIGHT) / 80);
  const lineRef = useRef<THREE.InstancedMesh>(null);
  const pulseRef = useRef<THREE.InstancedMesh>(null);
  const carRef = useRef<THREE.InstancedMesh>(null);
  const shaftRef = useRef<THREE.InstancedMesh>(null);
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const pulseMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const carMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: '#222222' }), []);
  const shaftMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }), []);
  useLayoutEffect(() => {
    const mesh = lineRef.current;
    if (!mesh) return;
    segments.forEach((sg, i) => {
      const a = new THREE.Vector3(...sg.a);
      const b = new THREE.Vector3(...sg.b);
      const d = b.clone().sub(a);
      const len = Math.max(d.length(), 0.01);
      q.setFromUnitVectors(up, d.normalize());
      m.compose(a.add(b).multiplyScalar(0.5), q, s.set(sg.width * thick, len, sg.width * thick));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, colour.set(sg.color));
    });
    mesh.count = segments.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [segments, thick]);
  useLayoutEffect(() => {
    const mesh = pulseRef.current;
    if (!mesh) return;
    pulses.forEach((p, i) => mesh.setColorAt(i, colour.set(net.lines[p.line].color).lerp(new THREE.Color('#ffffff'), 0.5)));
    mesh.count = pulses.length;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [pulses, net]);
  useLayoutEffect(() => {
    const shafts = shaftRef.current;
    const cars = carRef.current;
    net.shafts.forEach((sh, i) => {
      const h = sh.y1 - sh.y0 + FLOOR_HEIGHT;
      m.compose(v.set(sh.x, sh.y0 + h / 2, sh.z), q.identity(), s.set(sh.width, h, sh.width));
      shafts?.setMatrixAt(i, m);
      shafts?.setColorAt(i, colour.set(sh.color));
      cars?.setColorAt(i, colour.set(sh.color));
    });
    for (const mesh of [shafts, cars]) {
      if (!mesh) continue;
      mesh.count = net.shafts.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [net]);
  const clock = useRef(0);
  useFrame((_, dt) => {
    clock.current += dt;
    const t = clock.current;
    const pm = pulseRef.current;
    if (pm && pulses.length) {
      pulses.forEach((p, i) => {
        const L = Math.max(lengths[p.line], 0.01);
        const u = (p.offset + (t * PULSE_SPEED) / L) % 1;
        const [x, y, z] = pointAlong(net.lines[p.line].points, u);
        const r = Math.max(0.35, net.lines[p.line].width * 2.2) * thick;
        m.compose(v.set(x, y, z), q.identity(), s.set(r, r, r));
        pm.setMatrixAt(i, m);
      });
      pm.instanceMatrix.needsUpdate = true;
      pm.frustumCulled = false;
    }
    const cm = carRef.current;
    if (cm && net.shafts.length) {
      net.shafts.forEach((sh, i) => {
        m.compose(v.set(sh.x, carHeight(trips[i], t + i * 1.7) + 1.4 * thick, sh.z), q.identity(), s.set(sh.width * 0.95, 2.6 * thick, sh.width * 0.95));
        cm.setMatrixAt(i, m);
      });
      cm.instanceMatrix.needsUpdate = true;
      cm.frustumCulled = false;
    }
  });
  const capacity = (n: number) => Math.max(1, n);
  return (
    <group name="systems-view" position={[lx, 0, lz]}>
      <instancedMesh key={`l${segments.length}`} name="system-lines" ref={lineRef} args={[unitBox, lineMat, capacity(segments.length)]} />
      <instancedMesh key={`p${pulses.length}`} name="system-pulses" ref={pulseRef} args={[unitSphere, pulseMat, capacity(pulses.length)]} />
      {net.shafts.length > 0 && (
        <>
          <instancedMesh key={`s${net.shafts.length}`} name="system-shafts" ref={shaftRef} args={[unitBox, shaftMat, net.shafts.length]} />
          <instancedMesh key={`c${net.shafts.length}`} name="system-cars" ref={carRef} args={[unitBox, carMat, net.shafts.length]} />
        </>
      )}
      <PartsMesh name="system-equipment" parts={net.equipment} palette={design.palette} plan={design.shape} night={false} />
    </group>
  );
}
