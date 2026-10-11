import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SPANDRELS, WINDOW_PATTERNS } from '../sim/catalog/facades';
import type { Site } from '../sim/types';
import { createFacadeMaterial, setFacadeNight } from './FacadeMaterial';
import { facadeTextures } from './facadeTexture';
import { generateNeighbors, mulberry32 } from './layout';

/** A plain grey window grid; each neighbour's own colour tints it. */
const NEIGHBOR_RECIPE = {
  pattern: WINDOW_PATTERNS.punched,
  spandrel: SPANDRELS.plain,
  windowRatio: 0.55,
  colors: { wall: '#ffffff', glass: '#7d8794', frame: '#c9c9c9', spandrel: '#ffffff', accent: '#e0e0e0' },
  roughness: 0.8,
  metalness: 0.1,
};

export function Neighbors({ site, night = false }: { site: Site; night?: boolean }) {
  const blocks = useMemo(() => generateNeighbors(site), [site]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const box = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const rand = mulberry32(blocks.length + 7);
    g.setAttribute('aFloor', new THREE.InstancedBufferAttribute(Float32Array.from(blocks, () => Math.floor(rand() * 89)), 1));
    g.setAttribute('aLit', new THREE.InstancedBufferAttribute(Float32Array.from(blocks, () => 0.25 + rand() * 0.2), 1));
    g.setAttribute('aLitColor', new THREE.InstancedBufferAttribute(new Float32Array(blocks.length * 3).fill(0.95), 3));
    return g;
  }, [blocks]);
  const material = useMemo(() => {
    const t = facadeTextures(NEIGHBOR_RECIPE);
    return createFacadeMaterial({
      map: t?.map ?? null,
      glowMap: t?.glowMap ?? null,
      tileWidth: t?.layout.widthM ?? 3.5,
      tileHeight: 4,
      roughness: 0.8,
      metalness: 0.1,
      color: '#ffffff',
    });
  }, []);
  useEffect(() => () => box.dispose(), [box]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => setFacadeNight(material, night), [material, night]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    blocks.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, b.height / 2, b.z), new THREE.Quaternion(), new THREE.Vector3(b.width, b.height, b.depth));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks]);
  return <instancedMesh key={site.id} name="neighbors" ref={ref} args={[box, material, blocks.length]} />;
}
