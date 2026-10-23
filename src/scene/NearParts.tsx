import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, type ComponentProps } from 'react';
import type { Part, Vec3 } from '../sim/parts';
import { PartsMesh } from './parts/PartsMesh';

/** Fine detail (crockets, bolts, grilles) is drawn while the camera is within this many metres of it. */
export const NEAR_M = 300;
/** It turns on this much inside the distance and off this much outside it, so it doesn't flicker at the edge. */
const MARGIN_M = 20;
/** How often (in frames) the camera's distance is checked. */
const EVERY = 10;

/**
 * Parts drawn only while the camera is near `centre` (building coordinates; the lot offset is passed in).
 * Far away, the coarse parts alone carry the shape.
 */
export function NearParts({
  name,
  parts,
  centre,
  offset,
  within = NEAR_M,
  ...look
}: { name: string; parts: Part[]; centre: Vec3; offset: [number, number]; within?: number } & Omit<ComponentProps<typeof PartsMesh>, 'parts' | 'name'>) {
  const camera = useThree((s) => s.camera);
  const [near, setNear] = useState(false);
  const tick = useRef(0);
  useFrame(() => {
    if (tick.current++ % EVERY !== 0) return;
    const d = Math.hypot(camera.position.x - offset[0] - centre[0], camera.position.y - centre[1], camera.position.z - offset[1] - centre[2]);
    const next = near ? d < within + MARGIN_M : d < within - MARGIN_M;
    if (next !== near) setNear(next);
  });
  return near && parts.length > 0 ? <PartsMesh name={name} parts={parts} {...look} /> : null;
}
