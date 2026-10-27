/// <reference types="vite/client" />
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

/** What the dev hook puts on `window` for scripted visual checks. */
export interface DevCamera {
  /** Points the camera from `position` at `target` (world metres). */
  look: (position: [number, number, number], target: [number, number, number]) => void;
  /** The renderer and scene, for inspecting them from a script. */
  three: () => { gl: unknown; scene: unknown; camera: unknown };
}

/**
 * Development only (stripped from the published build): exposes `window.__devCamera` so headless
 * screenshot scripts can frame exact views — the roof, the entrance — instead of steering the mouse.
 */
export function DevCameraHook() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __devCamera?: DevCamera };
    w.__devCamera = {
      look: (position, target) => {
        camera.position.set(...position);
        if (controls) {
          controls.target.set(...target);
          controls.update();
        } else camera.lookAt(...target);
      },
      three: () => ({ gl, scene, camera }),
    };
    return () => {
      delete w.__devCamera;
    };
  }, [camera, controls, gl, scene]);
  return null;
}
