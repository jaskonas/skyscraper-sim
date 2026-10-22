import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { libraryTextures } from '../materials/libraryTextures';
import { PART_SURFACE_KEY, partSurfaceUniforms, patchPartShader } from './partSurface';

describe('part surfaces', () => {
  it('projects the material on the dominant axis in scaled object space, and bumps the normal', () => {
    const shader = {
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      uniforms: {} as Record<string, unknown>,
    };
    const u = partSurfaceUniforms('limestone');
    patchPartShader(shader, u);
    expect(shader.vertexShader).toContain('vPartPos =');
    expect(shader.vertexShader).toContain('vPartObjN');
    // The per-part shift comes from which instance it is, not where it stands: swaying parts keep their texture.
    expect(shader.vertexShader).toContain('gl_InstanceID');
    expect(shader.vertexShader).not.toContain('instanceMatrix[3]');
    expect(shader.fragmentShader).toContain('uPartDetail');
    expect(shader.fragmentShader).toMatch(/#include <normal_fragment_maps>[\s\S]*partBump/);
    expect(shader.fragmentShader).toMatch(/#include <roughnessmap_fragment>[\s\S]*roughnessFactor \*=/);
    expect(shader.uniforms.uPartDetail).toBe(u.uPartDetail);
    expect(PART_SURFACE_KEY).toBe('part-surface-v1');
  });

  it("uses the library material's textures and size", () => {
    const u = partSurfaceUniforms('limestone');
    expect(u.uPartDetail.value).toBe(libraryTextures('limestone').detail);
    expect(u.uPartSurface.value.x).toBeCloseTo(1 / 2, 6);
  });
});
