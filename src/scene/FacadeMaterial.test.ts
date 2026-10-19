import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { unitGeometry } from './buildingGeometry';
import { createFacadeMaterial, facadeAcross, facadeUniforms, patchFacadeShader, setFacadeDetail, setFacadeNight, setFacadeSky, type FacadeUniforms } from './FacadeMaterial';

const options = { map: null, glowMap: null, tileWidth: 3, tileHeight: 3.4, roughness: 0.5, metalness: 0.2, color: '#808080', round: false };

describe('facade material', () => {
  it('patches every shader hook it relies on in this version of three', () => {
    const shader = {
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      uniforms: {} as Record<string, unknown>,
    };
    const uniforms: FacadeUniforms = facadeUniforms(null);
    uniforms.uTileSize.value.set(3, 3.4);
    patchFacadeShader(shader, uniforms);
    expect(shader.vertexShader).toContain('vFacadeUv = vec2(');
    expect(shader.vertexShader).toContain('attribute float aFloor;');
    expect(shader.fragmentShader).toContain('texture2D( map, vFacadeUv )');
    expect(shader.fragmentShader).toContain('windowHash( floor( vFacadeUv.x )');
    expect(shader.fragmentShader).toContain('mod(bay, 101.0)');
    expect(shader.vertexShader).toContain('uRound > 0.5');
    expect(shader.fragmentShader).not.toContain('texture2D( map, vMapUv )');
    expect(shader.uniforms.uNight).toBe(uniforms.uNight);
  });

  it('adds rooms behind the glass, recessed windows, sky reflections and louvred plant floors', () => {
    const shader = {
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      uniforms: {} as Record<string, unknown>,
    };
    patchFacadeShader(shader, facadeUniforms(null));
    expect(shader.vertexShader).toContain('attribute vec3 aRoomTint;');
    expect(shader.vertexShader).toContain('attribute float aMech;');
    expect(shader.vertexShader).toContain('vFacadeWorld =');
    // Rooms: a ray traced into a box behind each pane.
    expect(shader.fragmentShader).toContain('roomBlinds(');
    expect(shader.fragmentShader).toContain('ROOM_DEPTH');
    // Recess: the glass mask looked up again, shifted by the view direction.
    expect(shader.fragmentShader).toContain('GLASS_RECESS');
    // Reflections and the sun glint go into the emitted light.
    expect(shader.fragmentShader).toContain('totalEmissiveRadiance += facadeRefl');
    expect(shader.fragmentShader).toContain('uSunDir');
    // Plant floors.
    expect(shader.fragmentShader).toContain('vMech > 0.5');
    // Fine stripes fade to their average once they are smaller than a pixel, so they don't shimmer.
    expect(shader.fragmentShader).toContain('fwidth(');
    // The reveal's wall colour is only read when there is a texture (a canvas-less browser has none).
    expect(shader.fragmentShader).toMatch(/#ifdef USE_MAP\s+diffuseColor\.rgb = texture2D\( map, vFacadeUv \+ shift \)/);
    expect(shader.uniforms.uDetail).toBeDefined();
  });

  it('turns the detail on and off and follows the sky without rebuilding the material', () => {
    const m = createFacadeMaterial(options);
    const u = m.userData.facadeUniforms as FacadeUniforms;
    // Off unless asked for: neighbouring buildings share this material and stay simple.
    expect(u.uDetail.value).toBe(0);
    setFacadeDetail(m, true);
    expect(u.uDetail.value).toBe(1);
    setFacadeDetail(m, false);
    expect(u.uDetail.value).toBe(0);
    setFacadeSky(m, '#123456', [0, 1, 0]);
    expect('#' + u.uSkyColor.value.getHexString()).toBe('#123456');
    expect(u.uSunDir.value.toArray()).toEqual([0, 1, 0]);
    expect(m.customProgramCacheKey()).toBe('facade-v3');
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

  it('runs the facade across every wall of every plan shape (not stuck at one column)', () => {
    for (const shape of ['square', 'rectangle', 'circle', 'triangle'] as const) {
      const g = unitGeometry(shape);
      const pos = g.getAttribute('position');
      const nor = g.getAttribute('normal');
      const uv = g.getAttribute('uv');
      const scale: [number, number, number] = [40, 3.4, 40];
      const byWall = new Map<string, number[]>();
      for (let i = 0; i < pos.count; i++) {
        const n: [number, number, number] = [nor.getX(i), nor.getY(i), nor.getZ(i)];
        if (Math.abs(n[1]) > 0.5) continue; // roof and floor faces
        const u = facadeAcross([pos.getX(i), pos.getY(i), pos.getZ(i)], n, uv.getX(i), scale, shape === 'circle');
        const key = shape === 'circle' ? 'drum' : n.map((v) => v.toFixed(2)).join(',');
        byWall.set(key, [...(byWall.get(key) ?? []), u]);
      }
      for (const [wall, us] of byWall) {
        const span = Math.max(...us) - Math.min(...us);
        expect(span, `${shape} ${wall}`).toBeGreaterThan(shape === 'circle' ? 100 : 15);
      }
    }
  });
});
