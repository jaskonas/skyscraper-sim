import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Site } from '../sim/types';
import { generateNeighbors } from './layout';

export function Neighbors({ site }: { site: Site }) {
  const blocks = useMemo(() => generateNeighbors(site), [site]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
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
  return (
    <instancedMesh key={site.id} name="neighbors" ref={ref} args={[box, undefined, blocks.length]}>
      <meshStandardMaterial flatShading />
    </instancedMesh>
  );
}
