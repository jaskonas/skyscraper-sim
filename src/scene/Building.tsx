import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FLOOR_HEIGHT, floorSlices } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import { facadeRecipe } from '../sim/facade';
import { bodyInstances, facadeColor, instanceMatrix, slabInstances, unitGeometry, type BoxInstance } from './buildingGeometry';
import { createFacadeMaterial, setFacadeLook, setFacadeNight } from './FacadeMaterial';
import { TILE_HEIGHT_M } from './facadeTile';
import { facadeTextures } from './facadeTexture';
import { nightWindowAttributes } from './nightWindows';
import { crownParts } from './crownParts';
import { lotCenter } from './layout';
import { bracingParts, ornamentParts } from './ornaments';
import { PartsMesh } from './parts/PartsMesh';
import { partBounds, type Part } from '../sim/parts';

function Instanced({ geometry, items, color, name, count }: { geometry: THREE.BufferGeometry; items: BoxInstance[]; color: string; name: string; count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => mesh.setMatrixAt(i, instanceMatrix(it)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.count = Math.min(items.length, count ?? items.length);
  }, [items, count]);
  return (
    <instancedMesh key={items.length} name={name} ref={ref} args={[geometry, undefined, items.length]}>
      <meshStandardMaterial color={color} flatShading roughness={0.5} metalness={0.2} />
    </instancedMesh>
  );
}

/** Free a memoised geometry when it is replaced or unmounted; R3F does not dispose geometries passed as props. */
function useDisposable<T extends { dispose: () => void }>(resource: T): T {
  useEffect(() => () => resource.dispose(), [resource]);
  return resource;
}

/**
 * The glazed part of every floor, wearing the painted facade tile; windows light up at night.
 * During construction only the lowest `floors` are drawn, and only floors below `litFloors` light up.
 */
function Body({ design, night, floors, litFloors }: { design: Design; night: boolean; floors?: number; litFloors?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => bodyInstances(design), [design]);
  const recipe = useMemo(() => facadeRecipe(design), [design]);
  const textures = useMemo(() => facadeTextures(recipe), [recipe]);
  const geometry = useDisposable(
    useMemo(() => {
      const g = unitGeometry(design.shape);
      const a = nightWindowAttributes(design);
      g.setAttribute('aFloor', new THREE.InstancedBufferAttribute(a.floor, 1));
      g.setAttribute('aLit', new THREE.InstancedBufferAttribute(a.lit, 1));
      g.setAttribute('aLitColor', new THREE.InstancedBufferAttribute(a.color, 3));
      return g;
    }, [design]),
  );
  const look = {
    tileWidth: textures?.layout.widthM ?? recipe.pattern.bayWidth,
    tileHeight: textures?.layout.heightM ?? TILE_HEIGHT_M,
    color: facadeColor(design),
    round: design.shape === 'circle',
  };
  // One material per texture and finish; everything else is updated in place so the shader is not recompiled.
  const material = useDisposable(
    useMemo(
      () => createFacadeMaterial({ ...look, map: textures?.map ?? null, glowMap: textures?.glowMap ?? null, roughness: recipe.roughness, metalness: recipe.metalness }),
      // `look` is deliberately left out: it is applied in place below on every render.
      [textures, recipe.roughness, recipe.metalness],
    ),
  );
  useLayoutEffect(() => {
    setFacadeLook(material, look);
    setFacadeNight(material, night);
  });
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => mesh.setMatrixAt(i, instanceMatrix(it)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.count = Math.min(items.length, floors ?? items.length);
  }, [items, geometry, floors]);
  useLayoutEffect(() => {
    const attr = geometry.getAttribute('aLit') as THREE.InstancedBufferAttribute;
    const base = nightWindowAttributes(design).lit;
    for (let i = 0; i < base.length; i++) attr.array[i] = litFloors === undefined || i < litFloors ? base[i] : 0;
    attr.needsUpdate = true;
  }, [geometry, design, litFloors]);
  return <instancedMesh key={items.length} name="body" ref={ref} args={[geometry, material, items.length]} />;
}

function Amenities({ design, geometry }: { design: Design; geometry: THREE.BufferGeometry }) {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const roofY = design.floors * FLOOR_HEIGHT;
  const band = (fraction: number) => slices[Math.min(slices.length - 1, Math.floor(slices.length * fraction))];
  const deck = band(0.9);
  const garden = band(0.5);
  return (
    <group name="amenities">
      {design.amenities.includes('helipad') && (
        <mesh position={[0, roofY + 0.4, 0]}>
          <cylinderGeometry args={[Math.min(top.width, top.depth) * 0.35, Math.min(top.width, top.depth) * 0.35, 0.6, 24]} />
          <meshStandardMaterial color="#3b3f45" />
        </mesh>
      )}
      {design.amenities.includes('pool') && (
        <mesh position={[0, roofY + 0.5, 0]} rotation={[0, top.rotation, 0]} scale={[top.width * 0.5, 0.6, top.depth * 0.3]}>
          <boxGeometry />
          <meshStandardMaterial color="#3fa9f5" />
        </mesh>
      )}
      {design.amenities.includes('observation-deck') && (
        <mesh geometry={geometry} position={[0, deck.y + FLOOR_HEIGHT * 0.75, 0]} rotation={[0, deck.rotation, 0]} scale={[deck.width * 1.12, FLOOR_HEIGHT * 1.5, deck.depth * 1.12]}>
          <meshStandardMaterial color="#bfe9ff" transparent opacity={0.65} />
        </mesh>
      )}
      {design.amenities.includes('sky-garden') && (
        <mesh geometry={geometry} position={[0, garden.y + FLOOR_HEIGHT / 2, 0]} rotation={[0, garden.rotation, 0]} scale={[garden.width * 1.06, FLOOR_HEIGHT, garden.depth * 1.06]}>
          <meshStandardMaterial color="#4caf50" flatShading />
        </mesh>
      )}
    </group>
  );
}

/** How much of the finished tower to show while it is being built. */
export interface BuildingReveal {
  /** Finished floors shown, from the ground up. */
  floors: number;
  /** 0..1: ornaments and crown appear from the bottom up; amenities from halfway. */
  crown: number;
  /** Floors whose windows can light up. */
  litFloors: number;
  /** Light the windows even by day (the opening stage). */
  lights: boolean;
}

/** Parts whose bottom is below `share` of the way up the whole set. */
function upTo(parts: Part[], share: number): Part[] {
  if (share >= 1) return parts;
  if (share <= 0 || parts.length === 0) return [];
  const bottoms = parts.map((p) => partBounds(p).min[1]);
  const top = Math.max(...parts.map((p) => partBounds(p).max[1]));
  return parts.filter((_, i) => bottoms[i] <= share * top);
}

export function Building({ site, design, night = false, reveal }: { site: Site; design: Design; night?: boolean; reveal?: BuildingReveal }) {
  const [lx, lz] = lotCenter(site);
  const geometry = useDisposable(useMemo(() => unitGeometry(design.shape), [design.shape]));
  const slabs = useMemo(() => slabInstances(design), [design]);
  const crown = useMemo(() => crownParts(design), [design]);
  const ornaments = useMemo(() => ornamentParts(design), [design]);
  const bracing = useMemo(() => bracingParts(design), [design]);
  const share = reveal ? reveal.crown : 1;
  const top = useMemo(() => {
    if (share >= 1) return { crown, ornaments };
    const shown = new Set(upTo([...ornaments, ...crown], share));
    return { crown: crown.filter((p) => shown.has(p)), ornaments: ornaments.filter((p) => shown.has(p)) };
  }, [ornaments, crown, share]);
  const look = { palette: design.palette, plan: design.shape, night };
  return (
    <group name="building" position={[lx, 0, lz]}>
      <Body design={design} night={night || !!reveal?.lights} floors={reveal?.floors} litFloors={reveal?.litFloors} />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} count={reveal?.floors} />
      <PartsMesh name="crown" parts={top.crown} {...look} />
      <PartsMesh name="ornaments" parts={top.ornaments} {...look} />
      {/* While building, exposed bracing is part of the bare structure instead. */}
      <PartsMesh name="bracing" parts={reveal ? [] : bracing} {...look} />
      {share > 0.5 && <Amenities design={design} geometry={geometry} />}
    </group>
  );
}
