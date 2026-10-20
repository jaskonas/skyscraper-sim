import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SHADOW_MAP_SIZE, shadowFrame } from './sunShadow';
import { SunLight } from './SunLight';

const sun = (r: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>) =>
  r.scene.findAll((n) => n.type === 'DirectionalLight')[0].instance as THREE.DirectionalLight;

describe('<SunLight />', () => {
  it('casts a 2048² shadow map fitted to what the camera is looking at', async () => {
    const r = await ReactThreeTestRenderer.create(<SunLight on intensity={1.8} color="#ffffff" />);
    await r.advanceFrames(1, 16);
    const light = sun(r);
    expect(light.castShadow).toBe(true);
    expect(SHADOW_MAP_SIZE).toBe(2048);
    expect(light.shadow.mapSize.x).toBe(2048);
    const camera = light.shadow.camera as THREE.OrthographicCamera;
    expect(camera.isOrthographicCamera).toBe(true);
    // The test renderer's camera sits 5 m from the origin: the tightest fit.
    expect(camera.right).toBe(shadowFrame([0, 0, 0], 5).halfSize);
    expect(camera.left).toBe(-camera.right);
    expect(camera.top).toBe(camera.right);
  });

  it('casts nothing when off', async () => {
    const r = await ReactThreeTestRenderer.create(<SunLight on={false} intensity={1.8} color="#ffffff" />);
    expect(sun(r).castShadow).toBe(false);
  });
});
