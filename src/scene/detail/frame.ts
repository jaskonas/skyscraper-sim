import type { FloorSlice } from '../../sim/geometry';
import { rotateYXZ, type Part, type Vec3 } from '../../sim/parts';
import type { Anchor } from '../parts/placement';

/**
 * The close-up's own coordinates: origin on the wall at the bottom of the section, +z pointing out of
 * the wall (toward the camera), +x along the wall, +y up. `yaw` is the wall's world yaw.
 */
export interface SectionFrame {
  origin: Vec3;
  yaw: number;
}

/** A spot on a floor's wall in building coordinates, facing out at world yaw `yaw`. */
export interface WorldAnchor {
  position: Vec3;
  yaw: number;
}

/** A floor-plan anchor (in the floor's own unturned frame) moved into building coordinates. */
export function worldAnchor(slice: FloorSlice, a: Anchor): WorldAnchor {
  const [x, , z] = rotateYXZ([a.x, 0, a.z], [0, slice.rotation, 0]);
  return { position: [x, slice.y, z], yaw: a.yaw + slice.rotation };
}

export function toLocalPoint(p: Vec3, f: SectionFrame): Vec3 {
  return rotateYXZ([p[0] - f.origin[0], p[1] - f.origin[1], p[2] - f.origin[2]], [0, -f.yaw, 0]);
}

/** A part in building coordinates, moved into the close-up's frame. */
export function toLocalPart(p: Part, f: SectionFrame): Part {
  const r = p.rotation ?? [0, 0, 0];
  return { ...p, position: toLocalPoint(p.position, f), rotation: [r[0], r[1] - f.yaw, r[2]] };
}

/** A part built in a bay's own frame (x along the wall, y up from the floor, z out) placed at an anchor. */
export function placeAtAnchor(p: Part, a: WorldAnchor): Part {
  const [x, y, z] = rotateYXZ(p.position, [0, a.yaw, 0]);
  const r = p.rotation ?? [0, 0, 0];
  return {
    ...p,
    position: [a.position[0] + x, a.position[1] + y, a.position[2] + z],
    rotation: [r[0], r[1] + a.yaw, r[2]],
  };
}
