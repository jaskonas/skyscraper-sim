import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FLOOR_HEIGHT, crownHeight, floorSlices } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import {
  bodyInstances,
  bracingStruts,
  facadeColor,
  instanceMatrix,
  slabInstances,
  strutMatrix,
  unitGeometry,
  type BoxInstance,
} from './buildingGeometry';
import { lotCenter } from './layout';

function Instanced({ geometry, items, color, name }: { geometry: THREE.BufferGeometry; items: BoxInstance[]; color: string; name: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => mesh.setMatrixAt(i, instanceMatrix(it)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh key={items.length} name={name} ref={ref} args={[geometry, undefined, items.length]}>
      <meshStandardMaterial color={color} flatShading roughness={0.5} metalness={0.2} />
    </instancedMesh>
  );
}

/** Free a memoised geometry when it is replaced or unmounted; R3F does not dispose geometries passed as props. */
function useDisposable<T extends { dispose: () => void }>(resource: T): T {
  useEffect(() => () => resource.dispose(), [resource]);
  return resource;
}

function Bracing({ design, color }: { design: Design; color: string }) {
  const struts = useMemo(() => bracingStruts(design), [design]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const box = useDisposable(useMemo(() => new THREE.BoxGeometry(1, 1, 1), []));
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    struts.forEach((s, i) => mesh.setMatrixAt(i, strutMatrix(s, 0.8)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [struts]);
  if (struts.length === 0) return null;
  return (
    <instancedMesh key={struts.length} name="bracing" ref={ref} args={[box, undefined, struts.length]}>
      <meshStandardMaterial color={color} flatShading />
    </instancedMesh>
  );
}

function Crown({ design, geometry }: { design: Design; geometry: THREE.BufferGeometry }) {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const bodyHeight = design.floors * FLOOR_HEIGHT;
  const h = crownHeight(design.crown, bodyHeight);
  const color = design.palette.accent;
  const w = top.width;
  const d = top.depth;
  const segments = design.shape === 'circle' ? 24 : design.shape === 'triangle' ? 3 : 4;
  const wedge = useDisposable(useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(-w / 2, h);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  }, [w, d, h]));
  return (
    <group name="crown" position={[0, bodyHeight, 0]} rotation={[0, top.rotation, 0]}>
      {design.crown === 'flat' && (
        <mesh geometry={geometry} position={[0, h / 2, 0]} scale={[w * 0.9, h, d * 0.9]}>
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      )}
      {design.crown === 'spire' && (
        <>
          <mesh position={[0, 4, 0]} scale={[w * 0.4, 8, d * 0.4]}>
            <boxGeometry />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, h / 2 + 4, 0]}>
            <coneGeometry args={[Math.min(w, d) * 0.08, h, 8]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} flatShading />
          </mesh>
        </>
      )}
      {design.crown === 'pointed' && (
        <mesh position={[0, h / 2, 0]} rotation={[0, segments === 4 ? Math.PI / 4 : 0, 0]}>
          <coneGeometry args={[(segments === 4 ? Math.SQRT1_2 : 0.5) * Math.max(w, d), h, segments]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      )}
      {design.crown === 'stepped' &&
        [0.75, 0.55, 0.35].map((k, i) => (
          <mesh key={k} geometry={geometry} position={[0, FLOOR_HEIGHT * (i + 0.5), 0]} scale={[w * k, FLOOR_HEIGHT, d * k]}>
            <meshStandardMaterial color={color} flatShading />
          </mesh>
        ))}
      {design.crown === 'sloped' && (
        <mesh geometry={wedge}>
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      )}
    </group>
  );
}

function Amenities({ design, geometry }: { design: Design; geometry: THREE.BufferGeometry }) {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const roofY = design.floors * FLOOR_HEIGHT;
  const band = (fraction: number) => slices[Math.min(slices.length - 1, Math.floor(slices.length * fraction))];
  const deck = band(0.9);
  const garden = band(0.5);
  return (
    <group name="amenities">
      {design.amenities.includes('helipad') && (
        <mesh position={[0, roofY + 0.4, 0]}>
          <cylinderGeometry args={[Math.min(top.width, top.depth) * 0.35, Math.min(top.width, top.depth) * 0.35, 0.6, 24]} />
          <meshStandardMaterial color="#3b3f45" />
        </mesh>
      )}
      {design.amenities.includes('pool') && (
        <mesh position={[0, roofY + 0.5, 0]} rotation={[0, top.rotation, 0]} scale={[top.width * 0.5, 0.6, top.depth * 0.3]}>
          <boxGeometry />
          <meshStandardMaterial color="#3fa9f5" />
        </mesh>
      )}
      {design.amenities.includes('observation-deck') && (
        <mesh geometry={geometry} position={[0, deck.y + FLOOR_HEIGHT * 0.75, 0]} rotation={[0, deck.rotation, 0]} scale={[deck.width * 1.12, FLOOR_HEIGHT * 1.5, deck.depth * 1.12]}>
          <meshStandardMaterial color="#bfe9ff" transparent opacity={0.65} />
        </mesh>
      )}
      {design.amenities.includes('sky-garden') && (
        <mesh geometry={geometry} position={[0, garden.y + FLOOR_HEIGHT / 2, 0]} rotation={[0, garden.rotation, 0]} scale={[garden.width * 1.06, FLOOR_HEIGHT, garden.depth * 1.06]}>
          <meshStandardMaterial color="#4caf50" flatShading />
        </mesh>
      )}
    </group>
  );
}

export function Building({ site, design }: { site: Site; design: Design }) {
  const [lx, lz] = lotCenter(site);
  const geometry = useDisposable(useMemo(() => unitGeometry(design.shape), [design.shape]));
  const body = useMemo(() => bodyInstances(design), [design]);
  const slabs = useMemo(() => slabInstances(design), [design]);
  return (
    <group name="building" position={[lx, 0, lz]}>
      <Instanced name="body" geometry={geometry} items={body} color={facadeColor(design)} />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} />
      <Crown design={design} geometry={geometry} />
      <Amenities design={design} geometry={geometry} />
      <Bracing design={design} color={design.palette.accent} />
    </group>
  );
}
