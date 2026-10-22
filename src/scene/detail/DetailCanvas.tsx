import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import * as THREE from 'three';
import type { Design, Site } from '../../sim/types';
import { PartsMesh, partMatrix } from '../parts/PartsMesh';
import { partGeometry } from '../parts/geometries';
import { selectShadowsOn, useGame } from '../../state/store';
import { lighting } from '../lighting';
import { surfacesFor } from '../materials/library';
import { useLibraryVersion } from '../materials/libraryTextures';
import { shadowFlags } from '../sunShadow';
import { cameraPose, dragBy, easeBack, type Drag } from './camera';
import { detailModel, type DetailFocus, type DetailView, type DetailWindow } from './detailModel';

/** Points the camera at the framed view plus the drag; asks for one new frame when it moves. */
function CameraRig({ focus, drag }: { focus: DetailFocus; drag: Drag }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const pose = cameraPose(focus, drag);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.far = focus.distance * 6;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, focus, drag]);
  return null;
}

/** Window glass and the rooms behind it; lit windows glow in their floor's colour at night. */
function Windows({ windows, night, glass }: { windows: DetailWindow[]; night: boolean; glass: string }) {
  const groups = useMemo(() => {
    const map = new Map<string, { lit: boolean; color: string; items: DetailWindow[] }>();
    for (const w of windows) {
      const lit = night && w.lit;
      const key = lit ? w.color : 'dark';
      if (!map.has(key)) map.set(key, { lit, color: w.color, items: [] });
      map.get(key)!.items.push(w);
    }
    return [...map.values()];
  }, [windows, night]);
  return (
    <group name="detail-windows">
      {groups.map((g) => (
        <WindowGroup key={(g.lit ? 'lit-' : '') + g.color} items={g.items} lit={g.lit} color={g.color} glass={glass} />
      ))}
    </group>
  );
}

function WindowGroup({ items, lit, color, glass }: { items: DetailWindow[]; lit: boolean; color: string; glass: string }) {
  const panes = useRef<THREE.InstancedMesh>(null);
  const rooms = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    items.forEach((w, i) => {
      panes.current?.setMatrixAt(i, partMatrix(w.pane, 0, m));
      rooms.current?.setMatrixAt(i, partMatrix(w.room, 0, m));
    });
    for (const mesh of [panes.current, rooms.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [items]);
  const box = partGeometry('box', 'square');
  return (
    <>
      <instancedMesh key={`p${items.length}`} ref={panes} args={[box, undefined, items.length]} {...shadowFlags({ transparent: !lit, opacity: lit ? 1 : 0.75 })}>
        <meshStandardMaterial
          color={lit ? color : glass}
          emissive={lit ? color : '#000000'}
          emissiveIntensity={lit ? 1.2 : 0}
          roughness={0.1}
          metalness={lit ? 0 : 0.5}
          transparent={!lit}
          opacity={lit ? 1 : 0.75}
        />
      </instancedMesh>
      <instancedMesh key={`r${items.length}`} ref={rooms} args={[box, undefined, items.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a2f36" emissive={lit ? color : '#000000'} emissiveIntensity={lit ? 0.25 : 0} roughness={0.9} />
      </instancedMesh>
    </>
  );
}

interface DetailProps {
  site: Site;
  design: Design;
  view: DetailView;
  night: boolean;
}

/** Toward the close-up's sun: front-left and high, like the main view's. The section's wall faces +z. */
const DETAIL_SUN = new THREE.Vector3(-35, 45, 50).normalize();

/** The close-up's sun, aimed at the framed section; its shadow camera just covers the section. */
function DetailSun({ focus, on, intensity, color }: { focus: DetailFocus; on: boolean; intensity: number; color: string }) {
  const ref = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    const light = ref.current;
    if (!light) return;
    const target = new THREE.Vector3(...focus.target);
    light.position.copy(target).addScaledVector(DETAIL_SUN, 80);
    light.target.position.copy(target);
    light.target.updateMatrixWorld();
    const half = Math.max(12, focus.distance * 0.8);
    const cam = light.shadow.camera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 1;
    cam.far = 200;
    cam.updateProjectionMatrix();
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.0002;
    light.shadow.normalBias = 0.02;
  }, [focus]);
  return <directionalLight ref={ref} castShadow={on} intensity={intensity} color={color} />;
}

/** Everything inside the close-up's canvas: lights, the section's parts, its windows and the camera. */
export function DetailScene({ site, design, view, night, drag }: DetailProps & { drag: Drag }) {
  const model = useMemo(() => detailModel(design, view), [design, view]);
  const shadows = useGame(selectShadowsOn) && !night;
  const detail = useGame((s) => s.facadeDetail === 'high');
  // Material textures swap in when they arrive; this canvas only draws on demand, so ask for a frame.
  const version = useLibraryVersion();
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [version, invalidate]);
  const light = lighting(site, night, shadows);
  return (
    <>
      <color attach="background" args={[light.sky]} />
      <hemisphereLight args={[light.hemiSky, site.visuals.ground, light.hemi]} />
      <DetailSun focus={model.focus} on={shadows} intensity={light.sun} color={light.sunColor} />
      <PartsMesh name="detail" parts={model.parts} palette={design.palette} plan={design.shape} night={night} surfaces={surfacesFor(design)} detail={detail} />
      <Windows windows={model.windows} night={night} glass={design.palette.glass} />
      <CameraRig focus={model.focus} drag={drag} />
    </>
  );
}

/**
 * The close-up: a small canvas that only draws when something changes (design, view, night, drag).
 * Drag to look around a little; it eases back to the framed view when let go.
 */
export function DetailCanvas(props: DetailProps) {
  const [drag, setDragState] = useState<Drag>({ yaw: 0, pitch: 0 });
  const dragRef = useRef(drag);
  const setDrag = (d: Drag) => {
    dragRef.current = d;
    setDragState(d);
  };
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const settle = useRef<number | null>(null);

  useEffect(() => () => {
    if (settle.current !== null) cancelAnimationFrame(settle.current);
  }, []);

  const stopSettling = () => {
    if (settle.current !== null) cancelAnimationFrame(settle.current);
    settle.current = null;
  };
  const onPointerDown = (e: PointerEvent) => {
    stopSettling();
    dragging.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.x;
    const dy = e.clientY - dragging.current.y;
    dragging.current = { x: e.clientX, y: e.clientY };
    setDrag(dragBy(dragRef.current, dx, dy));
  };
  const onPointerUp = () => {
    dragging.current = null;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = easeBack(dragRef.current, dt);
      setDrag(next);
      settle.current = next.yaw === 0 && next.pitch === 0 ? null : requestAnimationFrame(step);
    };
    settle.current = requestAnimationFrame(step);
  };

  return (
    <div className="detail-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <Canvas frameloop="demand" shadows={{ type: THREE.PCFShadowMap }} camera={{ fov: 40, near: 0.1, far: 500 }} fallback={<p className="detail-fallback">Close-up needs 3D graphics.</p>}>
        <DetailScene {...props} drag={drag} />
      </Canvas>
    </div>
  );
}
