import { useThree } from '@react-three/fiber';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DevCameraHook, type DevCamera } from './DevCameraHook';

let camera: THREE.Camera | null = null;
function Grab() {
  camera = useThree((s) => s.camera);
  return null;
}

describe('<DevCameraHook />', () => {
  it('lets a screenshot script point the camera, in development only, and cleans up after itself', async () => {
    const w = window as unknown as { __devCamera?: DevCamera };
    const r = await ReactThreeTestRenderer.create(
      <>
        <DevCameraHook />
        <Grab />
      </>,
    );
    expect(w.__devCamera).toBeDefined();
    w.__devCamera!.look([10, 20, 30], [0, 0, 0]);
    expect(camera!.position.toArray()).toEqual([10, 20, 30]);
    await r.unmount();
    expect(w.__devCamera).toBeUndefined();
  });
});
