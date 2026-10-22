import * as THREE from 'three';
import { FACADE_DETAIL_GLSL } from './facadeDetail';
import { LIBRARY, type LibraryId } from './materials/library';
import { NEUTRAL_DETAIL, NEUTRAL_NORMAL, libraryTextures } from './materials/libraryTextures';
import { WEATHER_GLSL } from './materials/weathering';
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
  /** 1: recessed windows, reflections, glass variety, louvred plant floors. 0: the plain painted tile. */
  uDetail: { value: number };
  uSkyColor: { value: THREE.Color };
  /** Direction toward the sun, world space, normalised. */
  uSunDir: { value: THREE.Vector3 };
  /** The wall's and the trim's material textures (see materials/library). */
  uWallDetail: { value: THREE.Texture };
  uWallNormal: { value: THREE.Texture };
  uTrimDetail: { value: THREE.Texture };
  uTrimNormal: { value: THREE.Texture };
  /** Per material: repeats per metre, contrast, bump strength. */
  uWallSurface: { value: THREE.Vector3 };
  uTrimSurface: { value: THREE.Vector3 };
  /** The tower's floor count, for fading the top floors. */
  uFloors: { value: number };
  /** 1 once the wall's textures have arrived: weathering waits for them, so a page without them looks as before. */
  uSurfacesReady: { value: number };
}

/** Fresh uniforms for one facade material. */
export function facadeUniforms(glowMap: THREE.Texture | null): FacadeUniforms {
  return {
    uNight: { value: 0 },
    uTileSize: { value: new THREE.Vector2() },
    uGlowMap: { value: glowMap },
    uRound: { value: 0 },
    uDetail: { value: 0 },
    uSkyColor: { value: new THREE.Color('#bcd4e6') },
    uSunDir: { value: new THREE.Vector3(300, 600, 250).normalize() },
    uWallDetail: { value: NEUTRAL_DETAIL },
    uWallNormal: { value: NEUTRAL_NORMAL },
    uTrimDetail: { value: NEUTRAL_DETAIL },
    uTrimNormal: { value: NEUTRAL_NORMAL },
    // Contrast and bump strength 0: no material until one is chosen.
    uWallSurface: { value: new THREE.Vector3(0.5, 0, 0) },
    uTrimSurface: { value: new THREE.Vector3(0.5, 0, 0) },
    uFloors: { value: 1 },
    uSurfacesReady: { value: 0 },
  };
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
attribute float aMech;
uniform vec2 uTileSize;
varying vec2 vFacadeUv;
varying float vFloor;
varying float vLit;
varying vec3 vLitColor;
varying float vMech;
varying vec3 vFacadeWorld;
varying vec3 vFacadeNormal;
`;

/**
 * Facade UVs in metres: across = distance along the wall, up = height from the bottom of the instance.
 * Scale comes from the instance matrix, so a tapered floor keeps full-size window bays. Also passes the
 * world position and wall normal on, for the recess and reflections.
 */
const VERTEX_UV = /* glsl */ `
#include <begin_vertex>
vec3 facadeScale = vec3(1.0);
mat4 facadeModel = modelMatrix;
#ifdef USE_INSTANCING
  facadeScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  facadeModel = modelMatrix * instanceMatrix;
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
vMech = aMech;
vFacadeWorld = (facadeModel * vec4(transformed, 1.0)).xyz;
vFacadeNormal = normalize(mat3(facadeModel) * normal);
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uNight;
uniform float uDetail;
uniform vec2 uTileSize;
uniform vec3 uSkyColor;
uniform vec3 uSunDir;
uniform sampler2D uGlowMap;
uniform sampler2D uWallDetail;
uniform sampler2D uWallNormal;
uniform sampler2D uTrimDetail;
uniform sampler2D uTrimNormal;
uniform vec3 uWallSurface;
uniform vec3 uTrimSurface;
uniform float uFloors;
uniform float uSurfacesReady;
varying vec2 vFacadeUv;
varying float vFloor;
varying float vLit;
varying vec3 vLitColor;
varying float vMech;
varying vec3 vFacadeWorld;
varying vec3 vFacadeNormal;
${WINDOW_HASH_GLSL}
${FACADE_DETAIL_GLSL}
${WEATHER_GLSL}
const float GLASS_RECESS = 0.3;
// What you see through the glass by day: a dark interior, much dimmer than the sky outside.
const vec3 GLASS_INTERIOR = vec3(0.10, 0.12, 0.15);

/** Hard stripes (0 or 1, a duty share of each period dark) that fade to their average once finer than a pixel. */
float stripes(float x, float duty) {
  float w = fwidth(x);
  return mix(step(duty, fract(x)), 1.0 - duty, clamp(w * 2.0 - 0.5, 0.0, 1.0));
}
// Set while shading the surface and used again for the night glow and the reflections.
float facadeGlass = 0.0;
float facadeGlowShade = 1.0;
vec3 facadeRefl = vec3(0.0);
// The wall or trim material at this point: its detail (0.5 = average), bump normal (tangent space) and
// whether it applies (0 on glass, roofs and in Simple).
float facadeSurfaceDetail = 0.5;
vec3 facadeSurfaceNormal = vec3(0.0, 0.0, 1.0);
float facadeSurfaceMix = 0.0;

/** Share (0..1) of four lookups around this point of glass that land on wall: how close the frame is. */
float facadeReveal(vec2 uv, vec2 shift) {
  // Not called "step": that would hide the built-in.
  vec2 d = 0.25 / uTileSize;
  float wall = 0.0;
  wall += 1.0 - step(0.5, texture2D( uGlowMap, uv + shift * 1.8 ).r);
  wall += 1.0 - step(0.5, texture2D( uGlowMap, uv + vec2(d.x, 0.0) ).r);
  wall += 1.0 - step(0.5, texture2D( uGlowMap, uv - vec2(d.x, 0.0) ).r);
  wall += 1.0 - step(0.5, texture2D( uGlowMap, uv + vec2(0.0, d.y) ).r);
  return wall * 0.25;
}
`;

const FRAGMENT_MAP = /* glsl */ `
#ifdef USE_MAP
  diffuseColor *= texture2D( map, vFacadeUv );
#endif
facadeGlass = texture2D( uGlowMap, vFacadeUv ).r;
if (uDetail > 0.5 && abs(vFacadeNormal.y) < 0.5) {
  vec3 N = normalize(vFacadeNormal);
  vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N));
  vec3 V = normalize(vFacadeWorld - cameraPosition);
  vec3 ray = vec3(dot(V, T), V.y, dot(V, N));
  float bay = floor(vFacadeUv.x);
  float floorIndex = floor(vFloor + 0.5) + floor(vFacadeUv.y);
  // Materials are laid out in metres: along the wall, and by world height so brick courses run on
  // through floor lines. Both are sampled here, outside any per-pixel branch, so their mipmaps stay right.
  vec2 matUv = vec2(vFacadeUv.x * uTileSize.x, vFacadeWorld.y);
  float region = texture2D( uGlowMap, vFacadeUv ).g;
  float trimShare = step(0.25, region) * step(region, 0.75);
  vec3 surface = mix(uWallSurface, uTrimSurface, trimShare);
  float wallD = texture2D( uWallDetail, matUv * uWallSurface.x ).r;
  float trimD = texture2D( uTrimDetail, matUv * uTrimSurface.x ).r;
  vec3 wallN = texture2D( uWallNormal, matUv * uWallSurface.x ).xyz * 2.0 - 1.0;
  vec3 trimN = texture2D( uTrimNormal, matUv * uTrimSurface.x ).xyz * 2.0 - 1.0;
  float surfD = mix(wallD, trimD, trimShare);
  vec3 surfN = mix(wallN, trimN, trimShare);
  // Glass a little way above: dirt washes down from the sill below it, in uneven streaks.
  float glassAbove = texture2D( uGlowMap, vFacadeUv + vec2(0.0, WEATHER_STREAK_REACH / uTileSize.y) ).r;
  if (vMech > 0.5) {
    // A plant floor: louvres in place of windows, and nothing behind them to light up.
    float slat = stripes(vFacadeUv.y * uTileSize.y * 2.5, 0.45);
    diffuseColor.rgb *= mix(0.55, 1.05, slat);
    facadeGlass = 0.0;
  } else if (facadeGlass > 0.5) {
    // The glass sits back from the wall: look the mask up again where the view ray meets the glass.
    vec2 shift = (ray.xy / max(-ray.z, 0.15)) * GLASS_RECESS / uTileSize;
    if (texture2D( uGlowMap, vFacadeUv + shift ).r < 0.5) {
      // The inside face of the opening (its reveal), in the wall's colour.
#ifdef USE_MAP
      diffuseColor.rgb = texture2D( map, vFacadeUv + shift ).rgb * 0.7;
#else
      diffuseColor.rgb *= 0.7;
#endif
      facadeGlass = 0.0;
    } else {
      float fresnel = pow(1.0 - clamp(-ray.z, 0.0, 1.0), 3.0);
      float mirror = (0.08 + 0.5 * fresnel) * (1.0 - 0.75 * uNight);
      vec3 sky = mix(uSkyColor, vec3(1.0), 0.15 * (1.0 - clamp(reflect(V, N).y, 0.0, 1.0)));
      vec3 glass = mix(GLASS_INTERIOR, diffuseColor.rgb, 0.45) * (1.0 + paneTint(bay, floorIndex));
      float blinds = roomBlinds(bay, floorIndex);
      if (blinds > 0.0 && fract(vFacadeUv.y) > 1.0 - blinds) {
        glass = vec3(0.86, 0.85, 0.8) * (0.85 + 0.15 * stripes(vFacadeUv.y * uTileSize.y * 12.0, 0.5));
        facadeGlowShade = 0.8;
      }
      if (roomDark(bay, floorIndex) > 0.5) glass *= 0.4;
      glass *= 1.0 - 0.45 * facadeReveal(vFacadeUv, shift);
      diffuseColor.rgb = glass * (1.0 - mirror);
      float glint = pow(max(dot(reflect(V, N), normalize(uSunDir)), 0.0), 220.0) * (1.0 - uNight);
      facadeRefl = sky * mirror * 0.7 + vec3(glint);
    }
  }
  if (facadeGlass < 0.5 && vMech < 0.5) {
    // Wall, trim or the reveal of an opening: the palette colour, lightened and darkened by the material.
    diffuseColor.rgb *= max(1.0 + (surfD - 0.5) * 2.0 * surface.y, 0.0);
    float tone = 0.65 * weatherNoise(matUv / WEATHER_TINT_SCALE) + 0.35 * weatherNoise(matUv / WEATHER_TINT_SCALE * 3.1);
    float streak = step(0.5, glassAbove) * smoothstep(0.35, 0.75, weatherNoise(vec2(matUv.x * 3.0, floorIndex)));
    float floorShare = (floorIndex + 1.0) / max(uFloors, 1.0);
    diffuseColor.rgb *= mix(1.0, weatherShade(vFacadeWorld.y, floorShare, streak, tone), uSurfacesReady);
    facadeSurfaceDetail = surfD;
    facadeSurfaceNormal = normalize(vec3(surfN.xy * surface.z, max(surfN.z, 0.2)));
    facadeSurfaceMix = 1.0;
  }
}
`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
// Mortar and pits are rougher than the faces around them.
roughnessFactor *= mix(1.0, 1.25 - 0.5 * facadeSurfaceDetail, facadeSurfaceMix);
`;

const FRAGMENT_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
if (facadeSurfaceMix > 0.0) {
  // The material's bumps tilt three's own normal (flat-shaded, so a round drum keeps its facets) along the
  // wall's axes: along the wall and up, in view space.
  vec3 sN = normalize(vFacadeNormal);
  vec3 sT = normalize((viewMatrix * vec4(normalize(cross(vec3(0.0, 1.0, 0.0), sN)), 0.0)).xyz);
  vec3 sB = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  normal = normalize(normal + sT * facadeSurfaceNormal.x + sB * facadeSurfaceNormal.y);
}
`;

const FRAGMENT_GLOW = /* glsl */ `
#include <emissivemap_fragment>
if (uNight > 0.0) {
  // vFloor is the same at every vertex but interpolation can wobble it, so round it.
  float on = step( windowHash( floor( vFacadeUv.x ), floor( vFloor + 0.5 ) + floor( vFacadeUv.y ) ), vLit );
  totalEmissiveRadiance += uNight * facadeGlass * on * vLitColor * 1.3 * mix(1.0, facadeGlowShade, uDetail);
}
totalEmissiveRadiance += facadeRefl;
`;

/** Rewrites a standard material's shaders so the facade tile repeats in metres, with recessed glass and reflections. */
export function patchFacadeShader(shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> }, uniforms: FacadeUniforms): void {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
    .replace('#include <begin_vertex>', VERTEX_UV);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
    .replace('#include <map_fragment>', FRAGMENT_MAP)
    .replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS)
    .replace('#include <normal_fragment_maps>', FRAGMENT_NORMAL)
    .replace('#include <emissivemap_fragment>', FRAGMENT_GLOW);
}

/**
 * A standard material wearing a facade tile. Create it once per texture and finish, then update it in
 * place with `setFacadeLook`, `setFacadeNight`, `setFacadeDetail` and `setFacadeSky` — recreating it on
 * every slider tick would make three recompile the shader each time.
 */
export function createFacadeMaterial(o: FacadeMaterialOptions): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: o.map,
    roughness: o.roughness,
    metalness: o.metalness,
    flatShading: true,
  });
  const uniforms = facadeUniforms(o.glowMap);
  material.userData.facadeUniforms = uniforms;
  material.onBeforeCompile = (shader) => patchFacadeShader(shader, uniforms);
  material.customProgramCacheKey = () => 'facade-v5';
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

/** Recessed windows, reflections and glass variety on (or the plain painted tile). */
export function setFacadeDetail(material: THREE.Material, on: boolean): void {
  const u = material.userData.facadeUniforms as FacadeUniforms | undefined;
  if (u) u.uDetail.value = on ? 1 : 0;
}

/** The sky the glass reflects and the sun it glints in. */
export function setFacadeSky(material: THREE.Material, sky: string, sunDir: [number, number, number]): void {
  const u = material.userData.facadeUniforms as FacadeUniforms | undefined;
  if (!u) return;
  u.uSkyColor.value.set(sky);
  u.uSunDir.value.set(...sunDir).normalize();
}

/** Which library materials the walls and the trim are made of. Call again when textures arrive. */
export function setFacadeSurfaces(material: THREE.Material, wall: LibraryId, trim: LibraryId): void {
  const u = material.userData.facadeUniforms as FacadeUniforms | undefined;
  if (!u) return;
  const w = libraryTextures(wall);
  const t = libraryTextures(trim);
  u.uWallDetail.value = w.detail;
  u.uWallNormal.value = w.normal;
  u.uTrimDetail.value = t.detail;
  u.uTrimNormal.value = t.normal;
  u.uWallSurface.value.set(1 / LIBRARY[wall].sizeM, LIBRARY[wall].contrast, LIBRARY[wall].normalStrength);
  u.uTrimSurface.value.set(1 / LIBRARY[trim].sizeM, LIBRARY[trim].contrast, LIBRARY[trim].normalStrength);
  u.uSurfacesReady.value = w.detail === NEUTRAL_DETAIL ? 0 : 1;
}

/** The tower's floor count (its top floors fade a little in the sun). */
export function setFacadeFloors(material: THREE.Material, floors: number): void {
  const u = material.userData.facadeUniforms as FacadeUniforms | undefined;
  if (u) u.uFloors.value = floors;
}
