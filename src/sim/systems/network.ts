import { insidePlan } from '../../scene/structure/planMath';
import { floorUses } from '../analysis/massing';
import { CROWNS } from '../catalog/crowns';
import { FLOOR_HEIGHT, crownHeight, floorSlices, type FloorSlice } from '../geometry';
import { rotateYXZ, type Part, type PartMaterial, type Vec3 } from '../parts';
import type { Analysis, Design, Site } from '../types';
import { CITY_PRESSURE_FLOORS, systemFacts, zoneBoundaries, type SystemId } from './facts';

/**
 * The tower's building systems as networks to draw: lines that things flow along (pulses travel from the
 * first point to the last), the equipment on them, and elevator shafts. Building coordinates: the lot's
 * centre at the origin, y up from the street, the basement below 0.
 */

export type LineKind = 'feed' | 'riser' | 'branch' | 'source' | 'loop' | 'grey' | 'vent' | 'supply' | 'return';

export interface FlowLine {
  kind: LineKind;
  points: Vec3[];
  color: string;
  width: number;
  /** Pulses travelling along it at once; 0 for a line nothing flows along (a vent). */
  pulses: number;
  /** The floor a branch serves. */
  floor?: number;
}

export interface Shaft {
  x: number;
  z: number;
  y0: number;
  y1: number;
  /** Heights the car stops at, bottom first. */
  stops: number[];
  color: string;
  /** Runs past floors without stopping (a high-zone car or a sky-lobby shuttle). */
  express: boolean;
  /** Width of the shaft, metres (they share the core). */
  width: number;
}

export interface SystemNetwork {
  lines: FlowLine[];
  equipment: Part[];
  shafts: Shaft[];
}

export const SYSTEM_COLOR = {
  power: '#ffc83d',
  water: '#3da5ff',
  waste: '#8b5a2b',
  supply: '#45e0e6',
  return: '#ff8a3d',
  grey: '#9fb8c8',
} as const;

/** Elevator zones, bottom to top. */
export const ZONE_COLORS = ['#7bd88f', '#ffb347', '#c792ea'];

/** The basement plant room's floor level, metres. */
const BASEMENT_Y = -3;
/** Height of pipes and cables under each floor's ceiling, above that floor's level. */
const CEILING = 3.1;

const floorY = (f: number) => f * FLOOR_HEIGHT;

/** Pulse thinning by systems grade: efficient and green pumps and fans run more gently. */
const GRADE_EVERY: Record<Design['systemsGrade'], number> = { standard: 3, efficient: 4, green: 5 };

interface Ctx {
  site: Site;
  design: Design;
  slices: FloorSlice[];
  /** Side of the square core the risers run up, metres. */
  core: number;
  /** Street level in front of the lot. */
  street: Vec3;
  roofY: number;
  topY: number;
}

function context(site: Site, design: Design): Ctx {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const core = 0.3 * Math.min(top.width, top.depth);
  const roofY = design.floors * FLOOR_HEIGHT;
  return { site, design, slices, core, street: [0, -1.5, site.lot.depth / 2 + 3], roofY, topY: floorY(design.floors - 1) + CEILING };
}

/** A riser spot inside the core: angle in turns, so different systems' risers sit apart. */
function spot(c: Ctx, turn: number, r = 0.3): [number, number] {
  const a = turn * Math.PI * 2;
  return [Math.sin(a) * c.core * r, Math.cos(a) * c.core * r];
}

/** How far from the axis a floor's outline reaches at a heading (floor's own frame), metres, kept 0.6 m inside. */
function reach(s: FloorSlice, shape: Design['shape'], heading: number): number {
  let lo = 0;
  let hi = Math.max(s.width, s.depth);
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2;
    if (insidePlan(shape, s.width, s.depth, Math.sin(heading) * m, Math.cos(heading) * m, 0.6)) lo = m;
    else hi = m;
  }
  return lo;
}

/** A branch on floor `f` from a riser spot out toward the floor's edge at a heading, turned with the floor. */
function branchTo(c: Ctx, f: number, from: [number, number], heading: number, y: number): Vec3[] {
  const s = c.slices[f];
  const r = 0.85 * reach(s, c.design.shape, heading);
  const [ex, , ez] = rotateYXZ([Math.sin(heading) * r, 0, Math.cos(heading) * r], [0, s.rotation, 0]);
  return [
    [from[0], y, from[1]],
    [ex, y, ez],
  ];
}

const box = (position: Vec3, scale: Vec3, material: PartMaterial, extra: Partial<Part> = {}): Part => ({ shape: 'box', position, scale, material, ...extra });
const cyl = (position: Vec3, scale: Vec3, material: PartMaterial, extra: Partial<Part> = {}): Part => ({ shape: 'cylinder', position, scale, material, ...extra });

/** Pulses for a run `length` metres long: about one every 25 m, at least one. */
const pulsesFor = (length: number, scale = 1) => Math.max(1, Math.round((length / 25) * scale));

function power(c: Ctx, f: ReturnType<typeof systemFacts>): SystemNetwork {
  const { design } = c;
  const lines: FlowLine[] = [];
  const equipment: Part[] = [];
  const at = spot(c, 0.1);
  lines.push({ kind: 'feed', points: [c.street, [c.street[0], -1.5, 0], [at[0], BASEMENT_Y + 1, at[1]]], color: SYSTEM_COLOR.power, width: 0.35, pulses: 2 });
  equipment.push(box([at[0], BASEMENT_Y + 1, at[1] + 1.6], [2.4, 2, 1.6], 'steel'));
  // Backup generators beside the transformers.
  for (const dx of [-3, 3]) equipment.push(box([at[0] + dx, BASEMENT_Y + 0.9, at[1] - 2], [2.2, 1.8, 1.2], 'girder'));
  lines.push({ kind: 'riser', points: [[at[0], BASEMENT_Y + 1, at[1]], [at[0], c.topY, at[1]]], color: SYSTEM_COLOR.power, width: 0.3, pulses: pulsesFor(c.topY) });
  for (const p of f.plantFloors) equipment.push(box([at[0], floorY(p) + 1.4, at[1]], [1.8, 2.2, 1.8], 'light', { glow: true }));
  for (let fl = 0; fl < design.floors; fl++)
    lines.push({ kind: 'branch', floor: fl, points: branchTo(c, fl, at, Math.PI / 2, floorY(fl) + CEILING), color: SYSTEM_COLOR.power, width: 0.12, pulses: fl % 3 === 0 ? 1 : 0 });
  const crownH = crownHeight(design.crown, c.roofY);
  if (CROWNS[design.crown].generatesPower)
    lines.push({ kind: 'source', points: [[0, c.roofY + crownH * 0.6, 0], [at[0], c.roofY + 0.5, at[1]], [at[0], c.topY, at[1]]], color: SYSTEM_COLOR.power, width: 0.25, pulses: 2 });
  if (design.systemsGrade === 'green') {
    const [sx, sz] = spot(c, 0.6, 1.2);
    equipment.push(box([sx, c.roofY + 0.6, sz], [Math.min(6, c.core * 1.2), 0.15, Math.min(4, c.core)], 'glass', { rotation: [0.4, 0, 0] }));
    lines.push({ kind: 'source', points: [[sx, c.roofY + 0.6, sz], [at[0], c.roofY + 0.3, at[1]], [at[0], c.topY, at[1]]], color: SYSTEM_COLOR.power, width: 0.2, pulses: 2 });
  }
  return { lines, equipment, shafts: [] };
}

function water(c: Ctx, f: ReturnType<typeof systemFacts>): SystemNetwork {
  const { design } = c;
  const every = GRADE_EVERY[design.systemsGrade];
  const scale = 3 / every;
  const lines: FlowLine[] = [];
  const equipment: Part[] = [];
  const up = spot(c, 0.35);
  const down = spot(c, 0.5);
  const city = spot(c, 0.65);
  const lowTop = Math.min(CITY_PRESSURE_FLOORS, design.floors - 1);
  // The city main: in from the street and straight up the bottom floors on its own pressure.
  lines.push({ kind: 'feed', points: [c.street, [c.street[0], -1.5, 0], [city[0], BASEMENT_Y + 0.5, city[1]]], color: SYSTEM_COLOR.water, width: 0.35, pulses: 2 });
  lines.push({ kind: 'riser', points: [[city[0], BASEMENT_Y + 0.5, city[1]], [city[0], floorY(lowTop) + CEILING, city[1]]], color: SYSTEM_COLOR.water, width: 0.25, pulses: 1 });
  // Pumps lift to each tank; each tank feeds the floors below it down to the next tank.
  const tanks = [...f.plantFloors.map((p) => floorY(p) + 2), c.roofY + 1.2];
  const pumps = [BASEMENT_Y + 0.5, ...f.plantFloors.map((p) => floorY(p) + 0.8)];
  equipment.push(cyl([up[0], BASEMENT_Y + 0.5, up[1] + 1.2], [1, 1, 1], 'accent'));
  for (let i = 0; i < tanks.length; i++) {
    lines.push({ kind: 'riser', points: [[up[0], pumps[i], up[1]], [up[0], tanks[i], up[1]]], color: SYSTEM_COLOR.water, width: 0.28, pulses: pulsesFor(tanks[i] - pumps[i], scale) });
    equipment.push(cyl([down[0], tanks[i], down[1]], [Math.max(1.6, c.core * 0.35), 2, Math.max(1.6, c.core * 0.35)], 'steel'));
    if (i < f.plantFloors.length) equipment.push(cyl([up[0], pumps[i + 1], up[1] + 1.2], [1, 1, 1], 'accent'));
    const lowest = i === 0 ? lowTop + 1 : f.plantFloors[i - 1] + 1;
    const lowY = floorY(Math.min(lowest, design.floors - 1)) + CEILING;
    if (tanks[i] > lowY) lines.push({ kind: 'riser', points: [[down[0], tanks[i], down[1]], [down[0], lowY, down[1]]], color: SYSTEM_COLOR.water, width: 0.25, pulses: pulsesFor(tanks[i] - lowY, scale) });
  }
  for (let fl = 0; fl < design.floors; fl++) {
    const from = fl <= lowTop ? city : down;
    lines.push({ kind: 'branch', floor: fl, points: branchTo(c, fl, from, -Math.PI / 2, floorY(fl) + CEILING - 0.3), color: SYSTEM_COLOR.water, width: 0.12, pulses: fl % every === 0 ? 1 : 0 });
  }
  if (design.amenities.includes('pool')) {
    const r = Math.min(c.core * 1.2, Math.min(c.slices.at(-1)!.width, c.slices.at(-1)!.depth) * 0.3);
    const y = c.roofY + 0.4;
    lines.push({ kind: 'loop', points: [[r, y, r], [-r, y, r], [-r, y, -r], [r, y, -r], [r, y, r]], color: SYSTEM_COLOR.water, width: 0.2, pulses: 4 });
  }
  if (design.amenities.includes('sky-garden')) {
    const g = Math.min(design.floors - 1, Math.floor(design.floors * 0.5));
    lines.push({ kind: 'branch', floor: g, points: branchTo(c, g, down, 0, floorY(g) + CEILING - 0.6), color: SYSTEM_COLOR.water, width: 0.15, pulses: 2 });
  }
  if (design.systemsGrade === 'green') {
    const rain = spot(c, 0.85);
    equipment.push(cyl([rain[0], c.roofY + 1, rain[1]], [2, 2, 2], 'concrete'));
    lines.push({ kind: 'grey', points: [[rain[0], c.roofY + 1, rain[1]], [rain[0], floorY(0) + CEILING, rain[1]]], color: SYSTEM_COLOR.grey, width: 0.2, pulses: pulsesFor(c.roofY, 0.5) });
  }
  return { lines, equipment, shafts: [] };
}

function waste(c: Ctx, f: ReturnType<typeof systemFacts>): SystemNetwork {
  const { design } = c;
  const lines: FlowLine[] = [];
  const equipment: Part[] = [];
  const topY = floorY(design.floors - 1) + 0.6;
  for (let k = 0; k < f.stacks; k++) {
    const at = spot(c, 0.2 + k / f.stacks, 0.42);
    // Falls straight down, stepping sideways a little every 30 floors to slow the fall.
    const pts: Vec3[] = [[at[0], topY, at[1]]];
    let jog = 0;
    for (let fl = design.floors - 1; fl > 0; fl--) {
      if (fl % 30 !== 0) continue;
      const y = floorY(fl);
      pts.push([at[0] + jog, y, at[1]]);
      jog = jog ? 0 : 0.6;
      pts.push([at[0] + jog, y - 0.4, at[1]]);
    }
    pts.push([at[0] + jog, BASEMENT_Y, at[1]], [c.street[0], BASEMENT_Y, c.street[2]]);
    lines.push({ kind: 'riser', points: pts, color: SYSTEM_COLOR.waste, width: 0.3, pulses: pulsesFor(topY, 1.2) });
    lines.push({ kind: 'vent', points: [[at[0] + 0.5, floorY(0), at[1]], [at[0] + 0.5, c.roofY + 1.2, at[1]]], color: SYSTEM_COLOR.waste, width: 0.08, pulses: 0 });
  }
  // Every floor drains in from its edge to the nearest stack.
  const first = spot(c, 0.2, 0.42);
  for (let fl = 0; fl < design.floors; fl++) {
    const [a, b] = branchTo(c, fl, first, Math.PI, floorY(fl) + 0.4);
    lines.push({ kind: 'branch', floor: fl, points: [b, a], color: SYSTEM_COLOR.waste, width: 0.12, pulses: fl % 4 === 0 ? 1 : 0 });
  }
  if (design.systemsGrade === 'green') {
    const g = spot(c, 0.7, 0.2);
    equipment.push(box([g[0], BASEMENT_Y + 0.9, g[1] - 2.5], [3, 1.8, 2], 'concrete'));
    lines.push({ kind: 'grey', points: [[g[0], BASEMENT_Y + 0.9, g[1]], [g[0], c.topY, g[1]]], color: SYSTEM_COLOR.grey, width: 0.2, pulses: pulsesFor(c.topY, 0.5) });
  }
  if (floorUses(design).includes('retail')) equipment.push(box([first[0] + 2, BASEMENT_Y + 0.5, first[1]], [1.4, 1, 1.4], 'steel'));
  return { lines, equipment, shafts: [] };
}

function elevators(c: Ctx, f: ReturnType<typeof systemFacts>): SystemNetwork {
  const { design } = c;
  const n = design.elevators;
  const cols = Math.ceil(Math.sqrt(n));
  const pitch = (c.core * 0.9) / cols;
  const place = (i: number): [number, number] => [(-(cols - 1) / 2 + (i % cols)) * pitch, (-(cols - 1) / 2 + Math.floor(i / cols)) * pitch];
  const stopsFor = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => floorY(a + k));
  const last = design.floors - 1;
  const bounds = zoneBoundaries(design);
  const shafts: Shaft[] = [];
  const add = (stops: number[], zone: number, express: boolean) => {
    const [x, z] = place(shafts.length);
    shafts.push({ x, z, y0: 0, y1: stops[stops.length - 1], stops, color: ZONE_COLORS[zone % ZONE_COLORS.length], express, width: pitch * 0.8 });
  };
  if (design.zoning === 'single') for (let i = 0; i < n; i++) add(stopsFor(0, last), 0, false);
  else if (design.zoning === 'two-zone') {
    const split = bounds[0];
    const low = Math.round(n / 2);
    for (let i = 0; i < low; i++) add(stopsFor(0, split - 1), 0, false);
    for (let i = low; i < n; i++) add([0, ...stopsFor(split, last)], 1, true);
  } else {
    const lobbies = f.skyLobbies;
    for (let i = 0; i < f.shuttles; i++) add([0, floorY(lobbies[i % lobbies.length])], (i % lobbies.length) + 1, true);
    const locals = n - f.shuttles;
    const starts = [0, ...lobbies];
    for (let i = 0; i < locals; i++) {
      const z = i % starts.length;
      const from = starts[z];
      const to = z + 1 < starts.length ? starts[z + 1] - 1 : last;
      add(stopsFor(from, to), z, false);
    }
  }
  // The machine room on the roof above the shafts.
  const equipment: Part[] = [box([0, c.roofY + 1.2, 0], [Math.max(2, c.core * 0.9), 2.4, Math.max(2, c.core * 0.9)], 'steel')];
  return { lines: [], equipment, shafts };
}

function air(c: Ctx, f: ReturnType<typeof systemFacts>): SystemNetwork {
  const { design } = c;
  const every = GRADE_EVERY[design.systemsGrade];
  const scale = 3 / every;
  const lines: FlowLine[] = [];
  const equipment: Part[] = [];
  const sup = spot(c, 0.15, 0.4);
  const ret = spot(c, 0.4, 0.4);
  // Handlers on the plant floors, or in the basement and on the roof for a tower without any.
  const handlers = f.plantFloors.length ? f.plantFloors.map((p) => ({ floor: p, y: floorY(p) + 1.8 })) : [{ floor: 0, y: BASEMENT_Y + 1 }, { floor: design.floors - 1, y: c.roofY + 1.2 }];
  const nearest = (fl: number) => handlers.reduce((best, h) => (Math.abs(h.floor - fl) < Math.abs(best.floor - fl) ? h : best));
  for (const h of handlers) {
    equipment.push(box([sup[0], h.y, sup[1] - 1.5], [3, 2.2, 2], 'steel'));
    if (design.systemsGrade !== 'standard') equipment.push({ shape: 'torus', position: [sup[0] + 1.8, h.y, sup[1] - 1.5], scale: [1.6, 1.6, 0.4], rotation: [0, Math.PI / 2, 0], material: 'steel' });
    const served = Array.from({ length: design.floors }, (_, k) => k).filter((fl) => nearest(fl) === h);
    const lo = floorY(served[0]) + CEILING;
    const hi = floorY(served[served.length - 1]) + CEILING;
    // Supply runs out from the handler up and down; return comes back to it.
    for (const end of [hi, lo]) {
      if (Math.abs(end - h.y) < 1) continue;
      lines.push({ kind: 'supply', points: [[sup[0], h.y, sup[1]], [sup[0], end, sup[1]]], color: SYSTEM_COLOR.supply, width: 0.3, pulses: pulsesFor(Math.abs(end - h.y), scale) });
      lines.push({ kind: 'return', points: [[ret[0], end, ret[1]], [ret[0], h.y, ret[1]]], color: SYSTEM_COLOR.return, width: 0.3, pulses: pulsesFor(Math.abs(end - h.y), scale) });
    }
    // Chilled water down from the cooling towers on the roof.
    lines.push({ kind: 'feed', points: [[0, c.roofY + 1, 0], [sup[0] * 0.5, h.y, sup[1] * 0.5]], color: SYSTEM_COLOR.water, width: 0.2, pulses: pulsesFor(c.roofY - h.y + 1, scale * 0.5) });
  }
  for (let fl = 0; fl < design.floors; fl += 2) {
    lines.push({ kind: 'branch', floor: fl, points: branchTo(c, fl, sup, Math.PI / 4, floorY(fl) + CEILING + 0.2), color: SYSTEM_COLOR.supply, width: 0.15, pulses: fl % (2 * every) === 0 ? 1 : 0 });
    const [a, b] = branchTo(c, fl, ret, -Math.PI * 0.75, floorY(fl) + CEILING + 0.2);
    lines.push({ kind: 'branch', floor: fl, points: [b, a], color: SYSTEM_COLOR.return, width: 0.15, pulses: fl % (2 * every) === every ? 1 : 0 });
  }
  return { lines, equipment, shafts: [] };
}

/** The network for one system, following this tower's design. */
export function systemNetwork(site: Site, design: Design, analysis: Analysis, system: SystemId): SystemNetwork {
  const c = context(site, design);
  const f = systemFacts(design, analysis);
  switch (system) {
    case 'power':
      return power(c, f);
    case 'water':
      return water(c, f);
    case 'waste':
      return waste(c, f);
    case 'elevators':
      return elevators(c, f);
    case 'air':
      return air(c, f);
  }
}
