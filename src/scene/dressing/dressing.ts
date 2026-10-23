import { CROWNS } from '../../sim/catalog/crowns';
import { FLOOR_HEIGHT, floorSlices, type FloorSlice } from '../../sim/geometry';
import { partBounds, rotateYXZ, strutPart, type Part, type PartMaterial, type Vec3 } from '../../sim/parts';
import type { Design, Site } from '../../sim/types';
import { crownParts } from '../crownParts';
import { placeAtAnchor, worldAnchor } from '../detail/frame';
import { alongFace, perimeterPoints, planFaces, setbackLevels } from '../parts/placement';
import { insidePlan, ringPoints } from '../structure/planMath';

/** Old New York styles carry wooden water tanks on their roofs. */
const TANK_PATTERNS = ['chicago', 'arched', 'punched'];

const box = (position: Vec3, scale: Vec3, material: PartMaterial, rotation?: Vec3): Part => ({ shape: 'box', position, scale, material, rotation });
const cyl = (position: Vec3, scale: Vec3, material: PartMaterial): Part => ({ shape: 'cylinder', position, scale, material });

/** A point (x, z) in a floor's own frame, turned with the floor. */
const turned = (s: FloorSlice, x: number, z: number): [number, number] => {
  const [wx, , wz] = rotateYXZ([x, 0, z], [0, s.rotation, 0]);
  return [wx, wz];
};

/** Straight segments round the outside of a floor, `inset` metres in, at height y: a parapet, rail or railing. */
function ring(s: FloorSlice, design: Design, inset: number, y: number, height: number, thickness: number, material: PartMaterial): Part[] {
  // 48 sides round a circle, matching the round tower's own outline.
  const pts = ringPoints(design.shape, s.width, s.depth, inset, 48).map(([x, z]) => turned(s, x, z));
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return box([(p[0] + q[0]) / 2, y + height / 2, (p[1] + q[1]) / 2], [len, height, thickness], material, [0, -Math.atan2(q[1] - p[1], q[0] - p[0]), 0]);
  });
}

/** How far out from the middle you can go at angle `a` and stay `margin` inside the floor. */
function reach(design: Design, s: FloorSlice, a: number, margin: number): number {
  let r = 0;
  while (insidePlan(design.shape, s.width, s.depth, Math.sin(a) * (r + 0.5), Math.cos(a) * (r + 0.5), margin)) r += 0.5;
  return r;
}

/**
 * Height the roof kit (and the helipad and pool) stands at: the top of the crown's own roof slab, a
 * cornice or cap that covers the whole roof, or the bare roof when there is none.
 */
export function roofDeck(design: Design): number {
  const roof = design.floors * FLOOR_HEIGHT;
  return Math.max(roof, ...roofSlabs(design).map((p) => partBounds(p).max[1]));
}

/** The crown's slabs that cover the whole roof. */
function roofSlabs(design: Design): Part[] {
  const top = floorSlices(design).at(-1)!;
  return crownParts(design).filter((p) => p.shape === 'plan' && p.scale[0] >= 0.9 * top.width);
}

/** Whether the crown's roof slab overhangs the walls (a cornice or cap), so its edge already acts as a parapet. */
function deckHasEdge(design: Design): boolean {
  const top = floorSlices(design).at(-1)!;
  return roofSlabs(design).some((p) => p.scale[0] > top.width * 1.02);
}

/** The helipad's radius: a third of the roof's width, shrunk on a triangle to fit inside it. */
export function helipadRadius(design: Design): number {
  const top = floorSlices(design).at(-1)!;
  const r = Math.min(top.width, top.depth) * 0.35;
  return design.shape === 'triangle' ? Math.min(r, (0.85 * top.width) / (2 * Math.sqrt(3))) : r;
}

/**
 * Rooftop machinery on roofs the crown leaves open: two cooling towers, a plant room, a wooden water
 * tank (old New York styles), a window-cleaning crane on a rail round the edge, a blinking antenna (unless
 * the crown has masts), and a parapet with a coping. Machinery keeps to the corners, clear of a helipad or pool.
 */
export function roofParts(site: Site, design: Design): Part[] {
  if (!CROWNS[design.crown].openRoof) return [];
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  // On top of a cornice or cap, if the crown has one.
  const y = roofDeck(design);
  const min = Math.min(top.width, top.depth);
  const clear = Math.max(design.amenities.includes('helipad') ? helipadRadius(design) : 0, design.amenities.includes('pool') ? min * 0.35 : 0);
  /** Keeps parts whose inner side stays clear of a helipad or pool. */
  const clearOf = (ps: Part[]) => ps.filter((p) => Math.hypot(p.position[0], p.position[2]) - Math.min(p.scale[0], p.scale[2]) / 2 >= clear);
  const parts: Part[] = [];
  /** A spot at angle `a` (degrees) for something `size` across, or null if it can't clear the helipad. */
  const spot = (deg: number, size: number): [number, number] | null => {
    const a = (deg * Math.PI) / 180;
    const r = reach(design, top, a, size / 2 + 1.5) * 0.85;
    if (r - size / 2 < clear + 0.5) return null;
    return turned(top, Math.sin(a) * r, Math.cos(a) * r);
  };
  const tower = Math.max(2, min * 0.12);
  const towers: [number, number][] = [];
  for (const deg of [45, 135]) {
    const at = spot(deg, tower);
    if (!at) continue;
    towers.push(at);
    parts.push(cyl([at[0], y + 2, at[1]], [tower, 4, tower], 'concrete'));
    // The fan shroud on top, a four-bladed fan turning in it, and louvred intakes round the sides.
    parts.push({ shape: 'torus', position: [at[0], y + 4.15, at[1]], scale: [tower * 0.95, 0.3, tower * 0.95], material: 'concrete' });
    for (let k = 0; k < 4; k++)
      parts.push({ shape: 'box', position: [at[0], y + 4.2, at[1]], scale: [tower * 0.8, 0.15, 0.06], rotation: [-Math.PI / 2, 0, (k * Math.PI) / 4], material: 'steel', animate: 'spin', fine: true });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      parts.push({ shape: 'box', position: [at[0] + Math.sin(a) * (tower / 2 + 0.03), y + 1, at[1] + Math.cos(a) * (tower / 2 + 0.03)], scale: [tower * 0.5, 1.2, 0.06], rotation: [0, a, 0], material: 'steel', fine: true });
    }
  }
  const room = Math.max(3, min * 0.16);
  const plant = spot(225, room * 1.4);
  if (plant) {
    // A chiller housing with ribbed panels, and a duct across to the nearer cooling tower.
    parts.push(box([plant[0], y + 1.75, plant[1]], [room, 3.5, room], 'steel', [0, top.rotation, 0]));
    for (let k = 0; k < 6; k++) {
      const along = (k / 5 - 0.5) * room * 0.85;
      const [rx, rz] = turned(top, along, room / 2 + 0.04);
      parts.push({ ...box([plant[0] + rx, y + 1.75, plant[1] + rz], [0.12, 3.2, 0.08], 'steel', [0, top.rotation, 0]), fine: true });
    }
    const near = towers.reduce<[number, number] | null>((best, t) => (!best || Math.hypot(t[0] - plant[0], t[1] - plant[1]) < Math.hypot(best[0] - plant[0], best[1] - plant[1]) ? t : best), null);
    if (near) parts.push(...clearOf([strutPart([plant[0], y + 2.6, plant[1]], [near[0], y + 2.6, near[1]], 0.8, 'steel')]));
  }
  // Two exhaust fans and a satellite dish.
  for (const deg of [90, 270]) {
    const at = spot(deg, 1.6);
    if (!at) continue;
    parts.push(cyl([at[0], y + 0.6, at[1]], [1.2, 1.2, 1.2], 'steel'));
    parts.push({ shape: 'cone', position: [at[0], y + 1.45, at[1]], scale: [1.5, 0.5, 1.5], material: 'steel' });
  }
  const dish = spot(20, 3);
  if (dish) {
    parts.push(cyl([dish[0], y + 0.6, dish[1]], [0.3, 1.2, 0.3], 'steel'));
    parts.push({ shape: 'dome', position: [dish[0], y + 1.6, dish[1]], scale: [2.4, 0.9, 2.4], rotation: [-0.6, 0, 0], material: 'steel' });
  }
  if (site.id === 'new-york' && TANK_PATTERNS.includes(design.windowPattern)) {
    const tank = spot(315, 4);
    if (tank) {
      parts.push(cyl([tank[0], y + 5, tank[1]], [4, 4, 4], 'wood'));
      parts.push({ shape: 'cone', position: [tank[0], y + 7.6, tank[1]], scale: [4.2, 1.2, 4.2], material: 'wood' });
      for (const [dx, dz] of [[1.4, 1.4], [-1.4, 1.4], [-1.4, -1.4], [1.4, -1.4]]) parts.push(cyl([tank[0] + dx, y + 1.5, tank[1] + dz], [0.25, 3, 0.25], 'steel'));
      // Its staves and the steel hoops that hold them.
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        parts.push({ shape: 'box', position: [tank[0] + Math.sin(a) * 2.02, y + 5, tank[1] + Math.cos(a) * 2.02], scale: [0.7, 3.9, 0.05], rotation: [0, a, 0], material: 'wood', fine: true });
      }
      for (const h of [3.5, 5, 6.5]) parts.push({ shape: 'torus', position: [tank[0], y + h, tank[1]], scale: [4.15, 0.12, 4.15], material: 'steel' });
    }
  }
  // The window-cleaning crane: a yellow gantry on a rail round the roof edge, its arm out over the side.
  // Left out where it would sit on the helipad (small or triangular roofs).
  parts.push(...clearOf(ring(top, design, 1.5, y, 0.2, 0.3, 'steel')));
  const r0 = reach(design, top, 0, 1.5);
  if (r0 - 1.25 >= clear) {
    const [gx, gz] = turned(top, 0, r0);
    const [ax, az] = turned(top, 0, r0 + 4);
    parts.push(box([gx, y + 1, gz], [3, 2, 2.5], 'gold', [0, top.rotation, 0]));
    parts.push(strutPart([gx, y + 2, gz], [ax, y + 3.5, az], 0.35, 'gold'));
    // The building maintenance unit's mast, and its cradle parked on the roof, hung from the jib on cables.
    parts.push(cyl([gx, y + 3, gz], [0.4, 2, 0.4], 'gold'));
    if (r0 - 3.5 >= clear) {
      const [cx, cz] = turned(top, 0, r0 - 2.5);
      const [jx, jz] = turned(top, 0, r0 - 1.2);
      parts.push(box([cx, y + 0.4, cz], [2.4, 0.8, 0.7], 'gold', [0, top.rotation, 0]));
      for (const side of [-0.9, 0.9]) {
        const [ox, oz] = turned(top, side, 0);
        parts.push({ ...strutPart([cx + ox, y + 0.8, cz + oz], [jx + ox, y + 2.4, jz + oz], 0.05, 'steel'), shape: 'cylinder', fine: true });
      }
    }
  }
  // An antenna with an aircraft light, unless the crown already has masts.
  if (design.crown !== 'twin-antennas' && design.crown !== 'lattice-mast') {
    const mast = spot(180, 2);
    if (mast) {
      parts.push(cyl([mast[0], y + 6, mast[1]], [0.4, 12, 0.4], 'steel'));
      parts.push({ shape: 'sphere', position: [mast[0], y + 12.3, mast[1]], scale: [0.6, 0.6, 0.6], material: 'ruby', glow: true, animate: 'blink' });
    }
  }
  // Parapet and coping round the edge — unless a cornice or cap already forms the roof's edge.
  if (!deckHasEdge(design)) {
    parts.push(...clearOf(ring(top, design, 0.2, y, 1.1, 0.4, 'stone')));
    parts.push(...clearOf(ring(top, design, 0.2, y + 1.1, 0.15, 0.6, 'stone')));
    // Lightning rods along the coping, every 6 m or so.
    for (const a of perimeterPoints(design.shape, top.width - 0.4, top.depth - 0.4, 6)) {
      const [rx, rz] = turned(top, a.x, a.z);
      parts.push({ shape: 'cylinder', position: [rx, y + 1.25 + 0.7, rz], scale: [0.06, 1.4, 0.06], material: 'steel', fine: true });
    }
  }
  return parts;
}

/**
 * Terraces on every setback ledge: a glass railing round the edge, and (unless ornament amount is None)
 * hedges every 6 m and small trees every 12 m along the ledge.
 */
export function terraceParts(design: Design): Part[] {
  const slices = floorSlices(design);
  const parts: Part[] = [];
  for (const level of setbackLevels(design)) {
    if (level.isRoof) continue;
    const below = level.slice;
    const above = slices[below.index + 1];
    const y = below.y + FLOOR_HEIGHT;
    // The real gap between this floor's walls and the walls above (a triangle's is much less than half
    // the change in width).
    const aboveFaces = planFaces(design.shape, above.width, above.depth);
    const belowFaces = planFaces(design.shape, below.width, below.depth);
    const ledge = Math.min(...belowFaces.map((f, i) => Math.hypot(f.x, f.z) - Math.hypot(aboveFaces[i].x, aboveFaces[i].z)));
    parts.push(...ring(below, design, 0.3, y, 1.1, 0.06, 'glass'));
    if (design.ornament === 'none' || ledge < 1.2) continue;
    // Hedges and trees sized to fit between the railing and the wall above.
    const hedge = Math.min(0.7, ledge * 0.45);
    const crown = Math.min(1.6, ledge * 0.7);
    for (const face of belowFaces) {
      const n = Math.floor(face.length / 6);
      for (let k = 0; k < n; k++) {
        const s = (k - (n - 1) / 2) * 6;
        const a = worldAnchor(below, alongFace(design.shape, below.width, below.depth, face, s));
        // Half-way across the ledge, in the anchor's frame (z points out of the wall below).
        const z = -ledge / 2;
        parts.push(placeAtAnchor(box([0, 0.4, z], [1.4, 0.8, hedge], 'foliage'), { ...a, position: [a.position[0], y, a.position[2]] }));
        if (k % 2 === 0) {
          parts.push(placeAtAnchor(cyl([1.6, 0.9, z], [0.25, 1.8, 0.25], 'wood'), { ...a, position: [a.position[0], y, a.position[2]] }));
          parts.push(placeAtAnchor({ shape: 'sphere', position: [1.6, 1.6 + crown / 2, z], scale: [crown, crown, crown], material: 'foliage' }, { ...a, position: [a.position[0], y, a.position[2]] }));
        }
      }
    }
  }
  return parts;
}

/**
 * At the front door: a canopy with a fascia and a lit edge, a revolving door (a glass drum with four
 * leaves), the lit lobby behind it, a stone plinth, steel bollards along the sidewalk, and (unless Ornament
 * amount is None) planters either side of the door and paving joints.
 */
export function entranceParts(design: Design): Part[] {
  const ground = floorSlices(design)[0];
  const front = planFaces(design.shape, ground.width, ground.depth).reduce((best, f) => (f.z > best.z ? f : best));
  const at = (s: number) => worldAnchor(ground, alongFace(design.shape, ground.width, ground.depth, front, s));
  const width = Math.min(10, front.length * 0.4);
  const decorative = design.ornament !== 'none';
  const parts: Part[] = [
    placeAtAnchor(box([0, 3.75, 1.5], [width, 0.3, 3], 'steel'), at(0)),
    placeAtAnchor(box([0, 3.75, 3.02], [width, 0.5, 0.1], 'steel'), at(0)),
    placeAtAnchor(cyl([0, 1.3, 1.4], [2.6, 2.6, 2.6], 'glass'), at(0)),
    placeAtAnchor(cyl([0, 2.7, 1.4], [2.7, 0.2, 2.7], 'steel'), at(0)),
    placeAtAnchor({ shape: 'box', position: [0, 1.6, 0.04], scale: [width * 0.9, 3, 0.05], material: 'pane', glow: true, glowColor: '#ffe2a8' }, at(0)),
    placeAtAnchor(box([0, 0.15, 0.6], [Math.min(front.length * 0.9, 30), 0.3, 1.2], 'stone'), at(0)),
  ];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    parts.push(placeAtAnchor({ shape: 'box', position: [Math.sin(a) * 0.6, 1.3, 1.4 + Math.cos(a) * 0.6], scale: [0.04, 2.3, 1.2], rotation: [0, a, 0], material: 'glass', fine: true }, at(0)));
  }
  if (decorative) {
    parts.push(placeAtAnchor({ shape: 'box', position: [0, 3.55, 3.02], scale: [width, 0.08, 0.08], material: 'light', glow: true }, at(0)));
    for (const side of [-1, 1]) {
      const s = side * (width / 2 + 1.5);
      parts.push(placeAtAnchor(box([0, 0.35, 2], [1.6, 0.7, 1], 'concrete'), at(s)));
      parts.push(placeAtAnchor({ shape: 'sphere', position: [0, 1.1, 2], scale: [1.5, 1, 0.9], material: 'foliage' }, at(s)));
    }
    for (let k = -3; k <= 3; k++) parts.push(placeAtAnchor({ ...box([0, 0.01, 4.5], [0.06, 0.02, 6], 'concrete'), fine: true }, at(k * 2)));
  }
  const span = Math.min(front.length * 0.35, 16);
  for (let s = -span; s <= span + 1e-9; s += 2.5) parts.push(placeAtAnchor(cyl([0, 0.5, 6], [0.3, 1, 0.3], 'steel'), at(s)));
  return parts;
}

/** All the dressing on a tower: roof, terraces and entrance. Building coordinates. */
export function dressingParts(site: Site, design: Design): Part[] {
  return [...roofParts(site, design), ...terraceParts(design), ...entranceParts(design)];
}
