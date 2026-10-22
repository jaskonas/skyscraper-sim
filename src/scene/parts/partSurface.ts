import * as THREE from 'three';
import { LIBRARY, type LibraryId } from '../materials/library';
import { libraryTextures } from '../materials/libraryTextures';

export interface PartSurfaceUniforms {
  uPartDetail: { value: THREE.Texture };
  uPartNormal: { value: THREE.Texture };
  /** Repeats per metre, contrast, bump strength. */
  uPartSurface: { value: THREE.Vector3 };
}

/** Bump this when the part shader changes, so three compiles it afresh. */
export const PART_SURFACE_KEY = 'part-surface-v1';

/** Uniforms for parts made of a library material (call `setPartSurface` again when textures arrive). */
export function partSurfaceUniforms(id: LibraryId): PartSurfaceUniforms {
  const u: PartSurfaceUniforms = {
    uPartDetail: { value: libraryTextures(id).detail },
    uPartNormal: { value: libraryTextures(id).normal },
    uPartSurface: { value: new THREE.Vector3() },
  };
  setPartSurface(u, id);
  return u;
}

export function setPartSurface(u: PartSurfaceUniforms, id: LibraryId): void {
  const t = libraryTextures(id);
  const m = LIBRARY[id];
  u.uPartDetail.value = t.detail;
  u.uPartNormal.value = t.normal;
  u.uPartSurface.value.set(1 / m.sizeM, m.contrast, m.normalStrength);
}

const VERTEX_HEAD = /* glsl */ `
varying vec3 vPartPos;
varying vec3 vPartObjN;
varying vec3 vPartAxisX;
varying vec3 vPartAxisY;
varying vec3 vPartAxisZ;
`;

/**
 * Material coordinates in metres: the vertex in the part's own axes, scaled to its real size, plus a
 * shift from where the part stands so neighbouring parts don't repeat the same patch. The part's axes in
 * view space are passed on for the bumps.
 */
const VERTEX_POS = /* glsl */ `
#include <begin_vertex>
vec3 partScale = vec3(1.0);
vec3 partShift = vec3(0.0);
mat3 partRot = mat3(1.0);
#ifdef USE_INSTANCING
  partScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  partShift = instanceMatrix[3].xyz * 0.37;
  partRot = mat3(instanceMatrix);
#endif
vPartPos = position * partScale + partShift;
vPartObjN = normal;
vPartAxisX = normalize(normalMatrix * (partRot * vec3(1.0, 0.0, 0.0)));
vPartAxisY = normalize(normalMatrix * (partRot * vec3(0.0, 1.0, 0.0)));
vPartAxisZ = normalize(normalMatrix * (partRot * vec3(0.0, 0.0, 1.0)));
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform sampler2D uPartDetail;
uniform sampler2D uPartNormal;
uniform vec3 uPartSurface;
varying vec3 vPartPos;
varying vec3 vPartObjN;
varying vec3 vPartAxisX;
varying vec3 vPartAxisY;
varying vec3 vPartAxisZ;
float partDetail = 0.5;
vec2 partBump = vec2(0.0);
vec3 partT = vec3(1.0, 0.0, 0.0);
vec3 partB = vec3(0.0, 1.0, 0.0);
`;

/** Projects the material onto whichever of the part's own faces this point mostly faces. */
const FRAGMENT_MAP = /* glsl */ `
#include <map_fragment>
{
  vec3 pa = abs(vPartObjN);
  vec2 puv;
  if (pa.x >= pa.y && pa.x >= pa.z) { puv = vPartPos.zy; partT = vPartAxisZ; partB = vPartAxisY; }
  else if (pa.y >= pa.z) { puv = vPartPos.xz; partT = vPartAxisX; partB = vPartAxisZ; }
  else { puv = vPartPos.xy; partT = vPartAxisX; partB = vPartAxisY; }
  partDetail = texture2D( uPartDetail, puv * uPartSurface.x ).r;
  partBump = (texture2D( uPartNormal, puv * uPartSurface.x ).xy * 2.0 - 1.0) * uPartSurface.z;
  diffuseColor.rgb *= max(1.0 + (partDetail - 0.5) * 2.0 * uPartSurface.y, 0.0);
}
`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor *= 1.25 - 0.5 * partDetail;
`;

/** Tilts the part's own (possibly curved) normal by the material's bumps, keeping its overall shading. */
const FRAGMENT_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
normal = normalize(normal + partT * partBump.x + partB * partBump.y);
`;

export function patchPartShader(shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> }, uniforms: PartSurfaceUniforms): void {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`).replace('#include <begin_vertex>', VERTEX_POS);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
    .replace('#include <map_fragment>', FRAGMENT_MAP)
    .replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS)
    .replace('#include <normal_fragment_maps>', FRAGMENT_NORMAL);
}
