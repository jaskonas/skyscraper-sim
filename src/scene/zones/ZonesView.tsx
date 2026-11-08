import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FIT_EMOJI, USE_LABEL } from '../../sim/catalog/zones';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import type { Design, Site } from '../../sim/types';
import { unitGeometry } from '../buildingGeometry';
import { lotCenter } from '../layout';
import { zoneBlocks, type ZoneBlock } from './zoneBlocks';

const OPACITY = 0.4;
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const colour = new THREE.Color();

/** A label texture: the use's emoji and name, and the fit emoji. Null where there is no 2D canvas (tests). */
function labelTexture(block: ZoneBlock): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = 'rgba(15, 20, 28, 0.82)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 120, 28);
  ctx.fill();
  ctx.fillStyle = block.color;
  ctx.fillRect(4, 4, 18, 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 64px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${USE_LABEL[block.use].icon} ${USE_LABEL[block.use].label} ${FIT_EMOJI[block.fit]}`, 40, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The 🏷️ Zones view: every floor of the see-through tower tinted in its zone's colour (one draw call),
 * with a floating label per zone. The zone picked in the sidebar glows brighter.
 */
export function ZonesView({ site, design, selected }: { site: Site; design: Design; selected: number | null }) {
  const [lx, lz] = lotCenter(site);
  const blocks = useMemo(() => zoneBlocks(design), [design]);
  const geometry = useMemo(() => unitGeometry(design.shape), [design.shape]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: OPACITY, depthWrite: false }), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = design.floors;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let i = 0;
    // Only dim the others when the picked zone is one of those drawn (it can be hidden on a short tower).
    const picked = blocks.some((b) => b.index === selected) ? selected : null;
    for (const b of blocks) {
      colour.set(b.color);
      if (b.index === picked) colour.lerp(new THREE.Color('#ffffff'), 0.35);
      else if (picked !== null) colour.multiplyScalar(0.55);
      for (const sl of b.slices) {
        p.set(0, sl.y + FLOOR_HEIGHT / 2, 0);
        q.setFromAxisAngle(up, sl.rotation);
        s.set(sl.width * 1.04, FLOOR_HEIGHT * 0.94, sl.depth * 1.04);
        mesh.setMatrixAt(i, m.compose(p, q, s));
        mesh.setColorAt(i, colour);
        i++;
      }
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blocks, selected]);

  const labels = useMemo(
    () =>
      blocks.map((b) => {
        const map = labelTexture(b);
        const widest = Math.max(...b.slices.map((sl) => Math.max(sl.width, sl.depth)));
        const w = Math.min(120, Math.max(24, design.floors * FLOOR_HEIGHT * 0.16));
        return { key: b.index, map, position: [widest / 2 + w / 2 + 4, b.labelY, 0] as [number, number, number], scale: [w, w / 4, 1] as [number, number, number] };
      }),
    [blocks, design.floors],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => labels.forEach((l) => l.map?.dispose()), [labels]);

  return (
    <group position={[lx, 0, lz]}>
      <instancedMesh name="zone-blocks" ref={meshRef} args={[geometry, material, count]} key={count} frustumCulled={false} renderOrder={2} castShadow={false} receiveShadow={false} />
      {labels.map(
        (l) =>
          l.map && (
            <sprite key={l.key} position={l.position} scale={l.scale} renderOrder={3}>
              <spriteMaterial map={l.map} depthTest={false} transparent />
            </sprite>
          ),
      )}
    </group>
  );
}
