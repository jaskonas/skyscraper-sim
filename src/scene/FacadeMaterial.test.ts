import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createFacadeMaterial, patchFacadeShader, setFacadeNight, type FacadeUniforms } from './FacadeMaterial';

const options = { map: null, glowMap: null, tileWidth: 3, tileHeight: 3.4, roughness: 0.5, metalness: 0.2, color: '#808080' };

describe('facade material', () => {
  it('patches every shader hook it relies on in this version of three', () => {
    const shader = {
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      uniforms: {} as Record<string, unknown>,
    };
    const uniforms: FacadeUniforms = { uNight: { value: 0 }, uTileSize: { value: new THREE.Vector2(3, 3.4) }, uGlowMap: { value: null } };
    patchFacadeShader(shader, uniforms);
    expect(shader.vertexShader).toContain('vFacadeUv = vec2(');
    expect(shader.vertexShader).toContain('attribute float aFloor;');
    expect(shader.fragmentShader).toContain('texture2D( map, vFacadeUv )');
    expect(shader.fragmentShader).toContain('windowHash( floor( vFacadeUv.x )');
    expect(shader.fragmentShader).toContain('mod(bay, 101.0)');
    expect(shader.fragmentShader).not.toContain('texture2D( map, vMapUv )');
    expect(shader.uniforms.uNight).toBe(uniforms.uNight);
  });

  it('falls back to a plain colour without a texture, and only lights up with a glow map', () => {
    const plain = createFacadeMaterial(options);
    expect('#' + plain.color.getHexString()).toBe('#808080');
    setFacadeNight(plain, true);
    expect(plain.userData.facadeUniforms.uNight.value).toBe(0);
    const lit = createFacadeMaterial({ ...options, map: new THREE.Texture(), glowMap: new THREE.Texture() });
    setFacadeNight(lit, true);
    expect(lit.userData.facadeUniforms.uNight.value).toBe(1);
    setFacadeNight(lit, false);
    expect(lit.userData.facadeUniforms.uNight.value).toBe(0);
  });
});
