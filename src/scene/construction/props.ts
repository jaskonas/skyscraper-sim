import type { ConstructionState, VehicleId } from '../../sim/construction/stages';
import { FLOOR_HEIGHT, floorSlices, plateDims } from '../../sim/geometry';
import { placePart, rotateYXZ, strutPart, type Part, type PartMaterial, type Vec3 } from '../../sim/parts';
import type { Design } from '../../sim/types';

const box = (position: Vec3, scale: Vec3, material: PartMaterial, rotation?: Vec3): Part => ({ shape: 'box', position, scale, material, rotation });
/** A wheel or drum: a cylinder lying across the vehicle (along z). */
const wheel = (x: number, r: number, width: number): Part => ({ shape: 'cylinder', position: [x, r, 0], scale: [2 * r, width, 2 * r], rotation: [Math.PI / 2, 0, 0], material: 'interior' });

const move = (parts: Part[], dx: number, dz: number, yaw = 0): Part[] =>
  parts.map((p) => {
    const q = placePart(p, yaw);
    return { ...q, position: [q.position[0] + dx, q.position[1], q.position[2] + dz] };
  });

/**
 * One site vehicle in its own frame: facing +x, centred on x = 0 and z = 0, wheels on the ground.
 * `clock` (seconds) animates moving parts: the excavator's arm, the mixer's drum, the pile rig's hammer.
 */
export function vehicleParts(id: VehicleId, clock: number): Part[] {
  const cab = (x: number): Part => box([x, 1.9, 0], [2.2, 2.6, 2.5], 'ruby');
  const axles = (xs: number[]) => xs.map((x) => wheel(x, 0.55, 2.5));
  switch (id) {
    case 'dump-truck':
      return [cab(3.2), box([-0.8, 2.1, 0], [5.6, 1.8, 2.5], 'gold'), box([0.4, 0.9, 0], [8, 0.4, 2.2], 'interior'), ...axles([3.2, -0.6, -2.6])];
    case 'mixer': {
      const spin = clock * 2;
      return [
        cab(3.2),
        box([0.4, 0.9, 0], [8, 0.4, 2.2], 'interior'),
        { shape: 'cylinder', position: [-0.8, 2.6, 0], scale: [2.4, 5.2, 2.4], rotation: [spin, 0, Math.PI / 2 - 0.25], material: 'steel' },
        ...axles([3.2, -0.6, -2.6]),
      ];
    }
    case 'flatbed':
      return [
        cab(4.2),
        box([-0.4, 1.2, 0], [8.4, 0.4, 2.5], 'interior'),
        box([-0.4, 1.7, -0.6], [7.6, 0.6, 0.5], 'girder'),
        box([-0.4, 1.7, 0.6], [7.6, 0.6, 0.5], 'girder'),
        box([-0.4, 2.3, 0], [7.6, 0.6, 0.5], 'girder'),
        ...axles([4.2, -2.4, -3.6]),
      ];
    case 'excavator': {
      // The arm dips and lifts about every three seconds.
      const dip = 0.35 * Math.sin(clock * 2);
      const shoulder: Vec3 = [1.2, 2.6, 0];
      const elbow: Vec3 = [1.2 + 4.2 * Math.cos(0.7 + dip), 2.6 + 4.2 * Math.sin(0.7 + dip), 0];
      const bucket: Vec3 = [elbow[0] + 2.2, Math.max(0.6, elbow[1] - 3.2 - 1.5 * dip), 0];
      return [
        box([0, 0.5, 0], [4.6, 1, 3], 'interior'),
        box([-0.4, 1.8, 0], [3.6, 1.6, 2.6], 'gold'),
        box([0.9, 2.9, 0.7], [1.2, 1.2, 1], 'interior'),
        strutPart(shoulder, elbow, 0.6, 'gold'),
        strutPart(elbow, bucket, 0.45, 'gold'),
        box([bucket[0], bucket[1], 0], [1.2, 1, 1.2], 'interior'),
      ];
    }
    case 'pile-rig': {
      // The hammer rises slowly and drops.
      const lift = (clock * 0.5) % 1;
      return [
        box([0, 0.5, 0], [5, 1, 3.2], 'interior'),
        box([-0.6, 1.9, 0], [3.4, 1.8, 2.6], 'gold'),
        box([2, 13, 0], [0.8, 24, 0.8], 'gold'),
        box([2.6, 4 + lift * 16, 0], [1.2, 2.5, 1.2], 'interior'),
        strutPart([-1.5, 2.8, 0], [2, 18, 0], 0.3, 'gold'),
      ];
    }
  }
}

/** The tower crane, standing beside the core with its jib at height `top`; `slew` turns the jib (radians). */
export function craneParts(design: Design, top: number, slew: number): Part[] {
  const slices = floorSlices(design);
  const slice = slices[Math.min(slices.length - 1, Math.max(0, Math.floor(top / FLOOR_HEIGHT) - 1))];
  const core = 0.3 * Math.min(slice.width, slice.depth);
  const [mx, , mz] = rotateYXZ([core / 2 + 1.6, 0, 0], [0, slice.rotation, 0]);
  const { width, depth } = plateDims(design);
  const reach = Math.min(60, Math.max(25, 0.9 * Math.max(width, depth)));
  const jib: Part[] = [
    box([reach / 2, 1, 0], [reach, 1.2, 1.2], 'gold'),
    box([-0.15 * reach, 1, 0], [0.3 * reach, 1.2, 1.2], 'gold'),
    box([-0.3 * reach + 1.5, 0.2, 0], [3, 2.5, 2.5], 'concrete'),
    box([0, -1.2, 1.4], [2.4, 2.4, 2.4], 'steel'),
    { shape: 'pyramid', position: [0, 4, 0], scale: [2, 5, 2], material: 'gold' },
    strutPart([0.7 * reach, 0.4, 0], [0.7 * reach, -12, 0], 0.12, 'girder'),
    box([0.7 * reach, -12.6, 0], [1, 1.2, 1], 'interior'),
  ];
  return [
    box([mx, top / 2, mz], [1.8, top, 1.8], 'gold'),
    ...move(jib, mx, mz, slew).map((p) => ({ ...p, position: [p.position[0], p.position[1] + top, p.position[2]] as Vec3 })),
  ];
}

/**
 * The crane and the vehicles on site at this moment, in building coordinates. Trucks park and edge
 * back and forth in front of the tower; the excavator digs at the front of the pit; the pile rig works
 * across the footprint.
 */
export function constructionProps(design: Design, state: ConstructionState, clock: number): Part[] {
  const { width, depth } = plateDims(design);
  const parts: Part[] = [];
  if (state.crane.up && state.crane.top > 0) parts.push(...craneParts(design, state.crane.top, 0.6 * Math.sin(clock * 0.25)));
  state.vehicles.forEach((id, i) => {
    const local = vehicleParts(id, clock + i);
    if (id === 'excavator') parts.push(...move(local, -width / 4, depth / 2 + 5, Math.PI / 2));
    else if (id === 'pile-rig') parts.push(...move(local, (Math.sin(clock * 0.4) * width) / 3, depth / 2 - 4, Math.PI / 2));
    else parts.push(...move(local, -12 + i * 13 + 2.5 * Math.sin(clock * 0.5 + i), depth / 2 + 8));
  });
  return parts;
}
