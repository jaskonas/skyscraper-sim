import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SHADOW_MAP_SIZE, shadowFrame, snapToTexel, sunDirection, type Vec3 } from './sunShadow';

const origin = new THREE.Vector3();

/**
 * The sun. When `on`, it casts one shadow map whose camera is fitted every frame around what the player is
 * looking at (the orbit target), sized by how far away the camera is.
 */
export function SunLight({ on, intensity, color }: { on: boolean; intensity: number; color: string }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  useLayoutEffect(() => {
    const light = ref.current;
    if (!light) return;
    light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    // Depth bias is a share of the shadow camera's 3 km depth: keep it to a few centimetres, or small ledges lose their shadows.
    light.shadow.bias = -0.00002;
  }, []);
  useFrame(({ camera }) => {
    const light = ref.current;
    if (!light) return;
    const t = controls?.target ?? origin;
    const f = shadowFrame([t.x, t.y, t.z], camera.position.distanceTo(t), sunDirection(on));
    // Snapping is along the shadow sun's axes; with shadows off there is nothing to keep steady.
    const snapped = on ? snapToTexel(f.target, f.halfSize) : f.target;
    const shift = [snapped[0] - f.target[0], snapped[1] - f.target[1], snapped[2] - f.target[2]];
    light.position.set(...(f.position.map((v, i) => v + shift[i]) as Vec3));
    light.target.position.set(...snapped);
    light.target.updateMatrixWorld();
    if (!on) return;
    const cam = light.shadow.camera;
    if (cam.right !== f.halfSize) {
      cam.left = -f.halfSize;
      cam.right = f.halfSize;
      cam.top = f.halfSize;
      cam.bottom = -f.halfSize;
      cam.near = f.near;
      cam.far = f.far;
      cam.updateProjectionMatrix();
      light.shadow.normalBias = 0.6 * ((2 * f.halfSize) / SHADOW_MAP_SIZE);
    }
  });
  return <directionalLight ref={ref} castShadow={on} intensity={intensity} color={color} position={sunDirection(on)} />;
}
