/// <reference types="vite/client" />
import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { LIBRARY_IDS, type LibraryId } from './library';

function neutral(rgba: [number, number, number, number]): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array(rgba), 1, 1);
  t.needsUpdate = true;
  return t;
}

/** Mid-grey: multiplies the colour by exactly 1. */
export const NEUTRAL_DETAIL = neutral([128, 128, 128, 255]);
/** Straight out of the surface: no bumps. */
export const NEUTRAL_NORMAL = neutral([128, 128, 255, 255]);

type Pair = { detail: THREE.Texture; normal: THREE.Texture };
let loaded = new Map<LibraryId, Partial<Pair>>();
let started = false;
let version = 0;
const listeners = new Set<() => void>();

/** A material's textures: the real ones once loaded, until then neutral stand-ins that leave today's look. */
export function libraryTextures(id: LibraryId): Pair {
  const got = loaded.get(id);
  return { detail: got?.detail ?? NEUTRAL_DETAIL, normal: got?.normal ?? NEUTRAL_NORMAL };
}

const defaultLoad = (url: string) => new THREE.TextureLoader().loadAsync(url);

/**
 * Starts fetching every material's textures (once). Each one swaps in as it arrives; one that fails
 * keeps its stand-in, so a missing file only means a plainer surface.
 */
export function startLibraryLoad(load: (url: string) => Promise<THREE.Texture> = defaultLoad): void {
  if (started) return;
  started = true;
  const base = import.meta.env.BASE_URL ?? '/';
  for (const id of LIBRARY_IDS)
    for (const kind of ['detail', 'normal'] as const)
      load(`${base}textures/${id}/${kind}.jpg`)
        .then((tex) => {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.colorSpace = THREE.NoColorSpace;
          tex.anisotropy = 4;
          tex.needsUpdate = true;
          loaded.set(id, { ...loaded.get(id), [kind]: tex });
          version++;
          listeners.forEach((l) => l());
        })
        .catch(() => {});
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Changes whenever a texture arrives, so components that use the library re-render. */
export function useLibraryVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}

export function resetLibraryForTests(): void {
  loaded = new Map();
  started = false;
}
