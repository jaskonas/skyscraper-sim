import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';
import { FLOOR_HEIGHT, floorSlices } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import { facadeRecipe } from '../sim/facade';
import { bodyInstances, facadeColor, instanceMatrix, slabInstances, unitGeometry, type BoxInstance } from './buildingGeometry';
import { createFacadeMaterial, setFacadeDetail, setFacadeFloors, setFacadeLook, setFacadeNight, setFacadeSky, setFacadeSurfaces } from './FacadeMaterial';
import { lighting } from './lighting';
import { TILE_HEIGHT_M } from './facadeTile';
import { facadeTextures } from './facadeTexture';
import { nightWindowAttributes } from './nightWindows';
import { balconyParts } from './balconies';
import { crownParts } from './crownParts';
import { dressingParts, helipadRadius, roofDeck } from './dressing/dressing';
import { swayAt, type SwaySignal } from './forces/sway';
import { lotCenter } from './layout';
import { bracingParts, ornamentParts } from './ornaments';
import { PartsMesh } from './parts/PartsMesh';
import { selectShadowsOn, useGame } from '../state/store';
import { sunDirection } from './sunShadow';
import { facadeWall, surfacesFor } from './materials/library';
import { useLibraryVersion } from './materials/libraryTextures';
import { partBounds, type Part } from '../sim/parts';

const swayMatrix = new THREE.Matrix4();

/** While the tower sways, re-sets each floor's matrix every frame; once more when it stops, to put it back. */
function useSwayedInstances(ref: RefObject<THREE.InstancedMesh | null>, items: BoxInstance[], sway?: SwaySignal) {
  const swaying = useRef(false);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || !sway || (!sway.active && !swaying.current)) return;
    swaying.current = sway.active;
    items.forEach((it, i) => {
      swayMatrix.copy(instanceMatrix(it));
      if (sway.active) swayMatrix.elements[12] += swayAt(sway, it.position[1]);
      mesh.setMatrixAt(i, swayMatrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
}

/** Moves its children sideways with the sway at height `y` (for one-off meshes such as amenities). */
function SwayFollow({ y, sway, children }: { y: number; sway?: SwaySignal; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current && sway) ref.current.position.x = sway.active ? swayAt(sway, y) : 0;
  });
  return <group ref={ref}>{children}</group>;
}

function Instanced({ geometry, items, color, name, count, sway }: { geometry: THREE.BufferGeometry; items: BoxInstance[]; color: string; name: string; count?: number; sway?: SwaySignal }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useSwayedInstances(ref, items, sway);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => mesh.setMatrixAt(i, instanceMatrix(it)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.count = Math.min(items.length, count ?? items.length);
  }, [items, count]);
  return (
    <instancedMesh key={items.length} name={name} ref={ref} args={[geometry, undefined, items.length]} castShadow receiveShadow>
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
function Body({
  design,
  night,
  floors,
  litFloors,
  sway,
  detail,
  sky,
}: {
  design: Design;
  night: boolean;
  floors?: number;
  litFloors?: number;
  sway?: SwaySignal;
  /** Recessed windows, reflections, glass variety and louvred plant floors. */
  detail: boolean;
  /** The sky colour the glass reflects. */
  sky: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => bodyInstances(design), [design]);
  useSwayedInstances(ref, items, sway);
  const recipe = useMemo(() => facadeRecipe(design), [design]);
  const textures = useMemo(() => facadeTextures(recipe), [recipe]);
  const geometry = useDisposable(
    useMemo(() => {
      const g = unitGeometry(design.shape);
      const a = nightWindowAttributes(design);
      g.setAttribute('aFloor', new THREE.InstancedBufferAttribute(a.floor, 1));
      g.setAttribute('aLit', new THREE.InstancedBufferAttribute(a.lit, 1));
      g.setAttribute('aLitColor', new THREE.InstancedBufferAttribute(a.color, 3));
      g.setAttribute('aMech', new THREE.InstancedBufferAttribute(a.mech, 1));
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
  // The glass glints in the same sun the light comes from (it moves when shadows are on).
  const sunDir = sunDirection(useGame(selectShadowsOn));
  const surfaces = surfacesFor(design);
  // Re-render when material textures arrive, so they are swapped in.
  useLibraryVersion();
  useLayoutEffect(() => {
    setFacadeLook(material, look);
    setFacadeNight(material, night);
    setFacadeDetail(material, detail);
    setFacadeSky(material, sky, sunDir);
    setFacadeSurfaces(material, facadeWall(design), surfaces.trim);
    setFacadeFloors(material, design.floors);
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
  return <instancedMesh key={items.length} name="body" ref={ref} args={[geometry, material, items.length]} castShadow receiveShadow />;
}

function Amenities({ design, geometry, sway }: { design: Design; geometry: THREE.BufferGeometry; sway?: SwaySignal }) {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  // On top of a cornice or cap, if the crown has one.
  const roofY = roofDeck(design);
  const pad = helipadRadius(design);
  const band = (fraction: number) => slices[Math.min(slices.length - 1, Math.floor(slices.length * fraction))];
  const deck = band(0.9);
  const garden = band(0.5);
  return (
    <group name="amenities">
      {design.amenities.includes('helipad') && (
        <SwayFollow y={roofY} sway={sway}>
          <mesh position={[0, roofY + 0.4, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[pad, pad, 0.6, 24]} />
            <meshStandardMaterial color="#3b3f45" />
          </mesh>
        </SwayFollow>
      )}
      {design.amenities.includes('pool') && (
        <SwayFollow y={roofY} sway={sway}>
          <mesh position={[0, roofY + 0.5, 0]} rotation={[0, top.rotation, 0]} scale={[top.width * 0.5, 0.6, top.depth * 0.3]} castShadow receiveShadow>
            <boxGeometry />
            <meshStandardMaterial color="#3fa9f5" />
          </mesh>
        </SwayFollow>
      )}
      {design.amenities.includes('observation-deck') && (
        <SwayFollow y={deck.y + FLOOR_HEIGHT * 0.75} sway={sway}>
          <mesh geometry={geometry} position={[0, deck.y + FLOOR_HEIGHT * 0.75, 0]} rotation={[0, deck.rotation, 0]} scale={[deck.width * 1.12, FLOOR_HEIGHT * 1.5, deck.depth * 1.12]} receiveShadow>
            <meshStandardMaterial color="#bfe9ff" transparent opacity={0.65} />
          </mesh>
        </SwayFollow>
      )}
      {design.amenities.includes('sky-garden') && (
        <SwayFollow y={garden.y + FLOOR_HEIGHT / 2} sway={sway}>
          <mesh geometry={geometry} position={[0, garden.y + FLOOR_HEIGHT / 2, 0]} rotation={[0, garden.rotation, 0]} scale={[garden.width * 1.06, FLOOR_HEIGHT, garden.depth * 1.06]} castShadow receiveShadow>
            <meshStandardMaterial color="#4caf50" flatShading />
          </mesh>
        </SwayFollow>
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

export function Building({
  site,
  design,
  night = false,
  reveal,
  sway,
  hideTopFloors = 0,
  facadeDetail = true,
}: {
  site: Site;
  design: Design;
  night?: boolean;
  reveal?: BuildingReveal;
  /** While a force acts on the tower, it bends with this signal every frame. */
  sway?: SwaySignal;
  /** Leave out this many top floors (the see-through damper view draws them instead). */
  hideTopFloors?: number;
  /** Recessed windows, reflections and glass variety (on unless turned off). */
  facadeDetail?: boolean;
}) {
  const [lx, lz] = lotCenter(site);
  const geometry = useDisposable(useMemo(() => unitGeometry(design.shape), [design.shape]));
  const slabs = useMemo(() => slabInstances(design), [design]);
  const crown = useMemo(() => crownParts(design), [design]);
  const ornaments = useMemo(() => ornamentParts(design), [design]);
  const bracing = useMemo(() => bracingParts(design), [design]);
  const balconies = useMemo(() => balconyParts(design), [design]);
  const dressing = useMemo(() => dressingParts(site, design), [site, design]);
  const share = reveal ? reveal.crown : 1;
  const top = useMemo(() => {
    if (share >= 1) return { crown, ornaments, dressing };
    const shown = new Set(upTo([...ornaments, ...crown, ...dressing], share));
    return {
      crown: crown.filter((p) => shown.has(p)),
      ornaments: ornaments.filter((p) => shown.has(p)),
      dressing: dressing.filter((p) => shown.has(p)),
    };
  }, [ornaments, crown, dressing, share]);
  const look = { palette: design.palette, plan: design.shape, night, sway };
  const floors = Math.min(reveal?.floors ?? design.floors, design.floors - hideTopFloors);
  // During construction, balconies only on the floors finished so far.
  const shownBalconies = useMemo(
    () => (floors >= design.floors ? balconies : balconies.filter((p) => p.position[1] < floors * FLOOR_HEIGHT)),
    [balconies, floors, design.floors],
  );
  return (
    <group name="building" position={[lx, 0, lz]}>
      <Body
        design={design}
        night={night || !!reveal?.lights}
        floors={floors}
        litFloors={reveal?.litFloors}
        sway={sway}
        detail={facadeDetail}
        sky={lighting(site, night).sky}
      />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} count={floors} sway={sway} />
      <PartsMesh name="crown" parts={top.crown} {...look} />
      <PartsMesh name="ornaments" parts={top.ornaments} {...look} />
      <PartsMesh name="balconies" parts={shownBalconies} {...look} />
      <PartsMesh name="dressing" parts={top.dressing} {...look} />
      {/* While building, exposed bracing is part of the bare structure instead. */}
      <PartsMesh name="bracing" parts={reveal ? [] : bracing} {...look} />
      {share > 0.5 && <Amenities design={design} geometry={geometry} sway={sway} />}
    </group>
  );
}
