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
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) mesh.material.forEach(fn);
    else fn(mesh.material);
  });
}

/** How often (in frames) the tower is checked for new parts to ghost once it is see-through. */
const CHECK_EVERY = 10;

/** What each ghosted material had before. Kept here, not in `userData`, which re-renders can replace. */
const saved = new WeakMap<THREE.Material, Saved>();
/** Meshes whose shadow was switched off while see-through, and whether they cast before. */
const casting = new WeakMap<THREE.Object3D, boolean>();

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
 * While `on`, every surface in the group is drawn faint and see-through. The tower is checked again every few
 * frames, and at once when `refresh` changes, so parts added later are caught too; turned off, each material
 * gets back exactly what it had.
 */
export function useGhost(group: RefObject<THREE.Object3D | null>, on: boolean, refresh?: unknown) {
  const ghosted = useRef(new Set<THREE.Material>());
  const shadowless = useRef(new Set<THREE.Object3D>());
  const tick = useRef(0);
  // Something changed (a new design): check the whole tower again on the next frame.
  useEffect(() => {
    tick.current = 0;
  }, [refresh]);
  useFrame(() => {
    const root = group.current;
    if (!root || !on) {
      tick.current = 0;
      return;
    }
    // The first frame does it all; after that, every few frames catches parts added since.
    if (tick.current++ % CHECK_EVERY !== 0) return;
    // A see-through tower casts no shadow, so the systems inside aren't left in the dark.
    root.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh || casting.has(o)) return;
      casting.set(o, o.castShadow);
      o.castShadow = false;
      shadowless.current.add(o);
    });
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
  const restoreAll = () => {
    for (const m of ghosted.current) restore(m);
    ghosted.current.clear();
    for (const o of shadowless.current) {
      o.castShadow = casting.get(o) ?? o.castShadow;
      casting.delete(o);
    }
    shadowless.current.clear();
  };
  useEffect(() => {
    if (!on) restoreAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => restoreAll, []);
}
