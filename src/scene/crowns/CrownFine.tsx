import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState, type ComponentProps } from 'react';
import type { Part, Vec3 } from '../../sim/parts';
import { PartsMesh } from '../parts/PartsMesh';

/** The crown's small pieces (crockets, rivets, mullions) are drawn while the camera is within this many metres. */
export const CROWN_FINE_M = 300;
/** How often (in frames) the camera's distance is checked. */
const EVERY = 10;

/**
 * The crown's fine work, mounted only while the camera is close to `centre` (building coordinates, so the
 * lot offset is passed in). Far away the coarse parts alone carry the crown's outline.
 */
export function CrownFine({ parts, centre, offset, ...look }: { parts: Part[]; centre: Vec3; offset: [number, number] } & Omit<ComponentProps<typeof PartsMesh>, 'parts' | 'name'>) {
  const camera = useThree((s) => s.camera);
  const [near, setNear] = useState(false);
  const tick = useRef(0);
  useFrame(() => {
    if (tick.current++ % EVERY !== 0) return;
    const d = Math.hypot(camera.position.x - offset[0] - centre[0], camera.position.y - centre[1], camera.position.z - offset[1] - centre[2]);
    const next = d < CROWN_FINE_M;
    if (next !== near) setNear(next);
  });
  return near && parts.length > 0 ? <PartsMesh name="crown-fine" parts={parts} {...look} /> : null;
}
