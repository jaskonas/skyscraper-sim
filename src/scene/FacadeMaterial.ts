import * as THREE from 'three';
import { WINDOW_HASH_GLSL } from './nightWindows';

export interface FacadeLook {
  /** Metres covered by one tile across and up. */
  tileWidth: number;
  tileHeight: number;
  /** Plain colour used when there is no texture (tests, or a canvas-less browser). */
  color: string;
  /** Round towers measure across the facade by arc length. */
  round: boolean;
}

export interface FacadeMaterialOptions extends FacadeLook {
  map: THREE.Texture | null;
  glowMap: THREE.Texture | null;
  roughness: number;
  metalness: number;
}

export interface FacadeUniforms {
  uNight: { value: number };
  uTileSize: { value: THREE.Vector2 };
  uGlowMap: { value: THREE.Texture | null };
  uRound: { value: number };
}

/**
 * Metres across the facade at a vertex of a unit plan solid scaled by `scale` — the JS twin of the
 * shader. Flat walls measure along the wall's own direction; a round drum uses its uv (0..1 around)
 * times the circumference, so there is no seam and no wall collapses to a single column.
 */
export function facadeAcross(
  position: [number, number, number],
  normal: [number, number, number],
  uvX: number,
  scale: [number, number, number],
  round: boolean,
): number {
  if (round) return uvX * Math.PI * scale[0];
  const along = [normal[2], 0, -normal[0]]; // cross(up, normal)
  const len = Math.hypot(along[0], along[2]);
  if (len <= 0.5) return 0;
  return (position[0] * scale[0] * along[0] + position[2] * scale[2] * along[2]) / len;
}

const VERTEX_HEAD = /* glsl */ `
uniform float uRound;
attribute float aFloor;
attribute float aLit;
attribute vec3 aLitColor;
uniform vec2 uTileSize;
varying vec2 vFacadeUv;
varying float vFloor;
varying float vLit;
varying vec3 vLitColor;
`;

/**
 * Facade UVs in metres: across = distance along the wall, up = height from the bottom of the instance.
 * Scale comes from the instance matrix, so a tapered floor keeps full-size window bays.
 */
const VERTEX_UV = /* glsl */ `
#include <begin_vertex>
vec3 facadeScale = vec3(1.0);
#ifdef USE_INSTANCING
  facadeScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#endif
vec3 facadePos = position * facadeScale;
float u;
if (uRound > 0.5) {
  u = uv.x * 3.14159265 * facadeScale.x;
} else {
  vec3 along = cross(vec3(0.0, 1.0, 0.0), normal);
  float alongLen = length(along);
  u = alongLen > 0.5 ? dot(facadePos, along / alongLen) : 0.0;
}
vFacadeUv = vec2(u / uTileSize.x, (facadePos.y + 0.5 * facadeScale.y) / uTileSize.y);
vFloor = aFloor;
vLit = aLit;
vLitColor = aLitColor;
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uNight;
uniform sampler2D uGlowMap;
varying vec2 vFacadeUv;
varying float vFloor;
varying float vLit;
varying vec3 vLitColor;
${WINDOW_HASH_GLSL}
`;

const FRAGMENT_MAP = /* glsl */ `
#ifdef USE_MAP
  diffuseColor *= texture2D( map, vFacadeUv );
#endif
`;

const FRAGMENT_GLOW = /* glsl */ `
#include <emissivemap_fragment>
if (uNight > 0.0) {
  float glass = texture2D( uGlowMap, vFacadeUv ).r;
  // vFloor is the same at every vertex but interpolation can wobble it, so round it.
  float on = step( windowHash( floor( vFacadeUv.x ), floor( vFloor + 0.5 ) + floor( vFacadeUv.y ) ), vLit );
  totalEmissiveRadiance += uNight * glass * on * vLitColor * 1.3;
}
`;

/** Rewrites a standard material's shaders so the facade tile repeats in metres and windows light up at night. */
export function patchFacadeShader(shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> }, uniforms: FacadeUniforms): void {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
    .replace('#include <begin_vertex>', VERTEX_UV);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
    .replace('#include <map_fragment>', FRAGMENT_MAP)
    .replace('#include <emissivemap_fragment>', FRAGMENT_GLOW);
}

/**
 * A standard material wearing a facade tile. Create it once per texture and finish, then update it in
 * place with `setFacadeLook` and `setFacadeNight` — recreating it on every slider tick would make
 * three recompile the shader each time.
 */
export function createFacadeMaterial(o: FacadeMaterialOptions): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: o.map,
    roughness: o.roughness,
    metalness: o.metalness,
    flatShading: true,
  });
  const uniforms: FacadeUniforms = {
    uNight: { value: 0 },
    uTileSize: { value: new THREE.Vector2() },
    uGlowMap: { value: o.glowMap },
    uRound: { value: 0 },
  };
  material.userData.facadeUniforms = uniforms;
  material.onBeforeCompile = (shader) => patchFacadeShader(shader, uniforms);
  material.customProgramCacheKey = () => 'facade-v2';
  setFacadeLook(material, o);
  return material;
}

export function setFacadeLook(material: THREE.MeshStandardMaterial, look: FacadeLook): void {
  const u = material.userData.facadeUniforms as FacadeUniforms;
  material.color.set(material.map ? '#ffffff' : look.color);
  u.uTileSize.value.set(look.tileWidth, look.tileHeight);
  u.uRound.value = look.round ? 1 : 0;
}

export function setFacadeNight(material: THREE.Material, night: boolean): void {
  const u = material.userData.facadeUniforms as FacadeUniforms | undefined;
  if (u) u.uNight.value = night && u.uGlowMap.value ? 1 : 0;
}
