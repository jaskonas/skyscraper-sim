import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';

/** How faint a ghosted surface is. */
export const GHOST_OPACITY = 0.06;

interface Saved {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

function eachMaterial(root: THREE.Object3D, fn: (m: THREE.Material) => void) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) for (const mat of ([] as THREE.Material[]).concat(mesh.material)) fn(mat);
  });
}

/** What each ghosted material had before. Kept here, not in `userData`, which re-renders can replace. */
const saved = new WeakMap<THREE.Material, Saved>();

function restore(m: THREE.Material) {
  const was = saved.get(m);
  if (!was) return;
  m.opacity = was.opacity;
  m.transparent = was.transparent;
  m.depthWrite = was.depthWrite;
  saved.delete(m);
  m.needsUpdate = true;
}

/**
 * While `on`, every surface in the group is drawn faint and see-through (checked every frame, so parts added
 * later are caught too); turned off, each material gets back exactly what it had.
 */
export function useGhost(group: RefObject<THREE.Object3D | null>, on: boolean) {
  const ghosted = useRef(new Set<THREE.Material>());
  useFrame(() => {
    const root = group.current;
    if (!root || !on) return;
    eachMaterial(root, (m) => {
      if (saved.has(m)) return;
      saved.set(m, { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite });
      m.opacity = Math.min(m.opacity, GHOST_OPACITY);
      m.transparent = true;
      m.depthWrite = false;
      m.needsUpdate = true;
      ghosted.current.add(m);
    });
  });
  useEffect(() => {
    if (on) return;
    for (const m of ghosted.current) restore(m);
    ghosted.current.clear();
  }, [on]);
  useEffect(
    () => () => {
      for (const m of ghosted.current) restore(m);
      ghosted.current.clear();
    },
    [],
  );
}
