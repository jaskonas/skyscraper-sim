import * as THREE from 'three';
import { WINDOW_HASH_GLSL } from './nightWindows';

export interface FacadeMaterialOptions {
  map: THREE.Texture | null;
  glowMap: THREE.Texture | null;
  /** Metres covered by one tile across and up. */
  tileWidth: number;
  tileHeight: number;
  roughness: number;
  metalness: number;
  /** Plain colour used when there is no texture (tests, or a canvas-less browser). */
  color: string;
}

export interface FacadeUniforms {
  uNight: { value: number };
  uTileSize: { value: THREE.Vector2 };
  uGlowMap: { value: THREE.Texture | null };
}

const VERTEX_HEAD = /* glsl */ `
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
vec3 along = cross(vec3(0.0, 1.0, 0.0), normal);
float alongLen = length(along);
float u = alongLen > 0.5 ? dot(facadePos, along / alongLen) : 0.0;
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

/** A standard material wearing a facade tile. Turn the night lights on with `setFacadeNight`. */
export function createFacadeMaterial(o: FacadeMaterialOptions): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: o.map ? '#ffffff' : o.color,
    map: o.map,
    roughness: o.roughness,
    metalness: o.metalness,
    flatShading: true,
  });
  const uniforms: FacadeUniforms = {
    uNight: { value: 0 },
    uTileSize: { value: new THREE.Vector2(o.tileWidth, o.tileHeight) },
    uGlowMap: { value: o.glowMap },
  };
  material.userData.facadeUniforms = uniforms;
  material.onBeforeCompile = (shader) => patchFacadeShader(shader, uniforms);
  material.customProgramCacheKey = () => 'facade-v1';
  return material;
}

export function setFacadeNight(material: THREE.Material, night: boolean): void {
  const u = material.userData.facadeUniforms as FacadeUniforms | undefined;
  if (u) u.uNight.value = night && u.uGlowMap.value ? 1 : 0;
}
