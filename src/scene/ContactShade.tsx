import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { floorSlices } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import { generateNeighbors, lotCenter } from './layout';
import { contactPatches } from './sunShadow';

const SIZE = 64;
/** Darkest the ground gets right at a wall (0 = black, 1 = untouched). */
const DARKEST = 0.55;

/** A soft rounded square, dark in the middle and fading out at the edge, for multiplying onto the ground. */
function shadeTexture(): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let j = 0; j < SIZE; j++)
    for (let i = 0; i < SIZE; i++) {
      const u = ((i + 0.5) / SIZE) * 2 - 1;
      const v = ((j + 0.5) / SIZE) * 2 - 1;
      const d = Math.pow(Math.pow(Math.abs(u), 4) + Math.pow(Math.abs(v), 4), 0.25);
      const t = Math.min(1, Math.max(0, (d - 0.55) / 0.45));
      const fade = 1 - t * t * (3 - 2 * t);
      const k = Math.round(255 * (1 - (1 - DARKEST) * fade));
      data.set([k, k, k, 255], (j * SIZE + i) * 4);
    }
  const tex = new THREE.DataTexture(data, SIZE, SIZE);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Soft darkening on the ground where the tower and each neighbour stand: the light a real street loses
 * close to a wall. One instanced plane, multiplied onto whatever is beneath.
 */
export function ContactShade({ site, design }: { site: Site; design: Design }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const patches = useMemo(() => {
    const [lx, lz] = lotCenter(site);
    const base = floorSlices(design)[0];
    const tower = base ? [{ x: lx, z: lz, width: base.width, depth: base.depth, rotation: base.rotation }] : [];
    return contactPatches([...tower, ...generateNeighbors(site)]);
  }, [site, design]);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: shadeTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.MultiplyBlending,
        premultipliedAlpha: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    patches.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotation);
      m.compose(new THREE.Vector3(p.x, 0.06, p.z), q, new THREE.Vector3(p.width, 1, p.depth));
      mesh.setMatrixAt(i, m);
    });
    mesh.count = patches.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [patches]);
  return <instancedMesh key={patches.length} name="contact-shade" ref={ref} args={[geometry, material, patches.length]} renderOrder={1} />;
}
