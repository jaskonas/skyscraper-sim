import { ORNAMENTS } from '../../sim/catalog/facades';
import { floorUses } from '../../sim/analysis/massing';
import { activeOrnaments, amountLevel, facadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT, floorSlices, type FloorSlice } from '../../sim/geometry';
import { partBounds, type Part, type PartMaterial, type Vec3 } from '../../sim/parts';
import type { Design, UseType } from '../../sim/types';
import { crownParts } from '../crownParts';
import { NIGHT_LIGHTS, windowLit } from '../nightWindows';
import { ornamentParts } from '../ornaments';
import { alongFace, floorRuns, planCorners, planFaces, setbackLevels, type Face } from '../parts/placement';
import { placeAtAnchor, toLocalPart, worldAnchor, type SectionFrame, type WorldAnchor } from './frame';
import { wallBay } from './wallBay';

export type DetailView = 'facade' | 'corner' | 'base';

export const DETAIL_VIEWS: { id: DetailView; label: string }[] = [
  { id: 'facade', label: 'Facade' },
  { id: 'corner', label: 'Corner' },
  { id: 'base', label: 'Base' },
];

/** One window in the close-up, with whether it is lit at night (matching the main tower). */
export interface DetailWindow {
  pane: Part;
  room: Part;
  floor: number;
  bay: number;
  lit: boolean;
  color: string;
}

/** Where the close-up's camera looks from, before the player drags. */
export interface DetailFocus {
  target: Vec3;
  distance: number;
  yaw: number;
  pitch: number;
}

export interface DetailModel {
  parts: Part[];
  windows: DetailWindow[];
  focus: DetailFocus;
  caption: string;
}

const USE_NAMES: Record<UseType, string> = { retail: 'Shops', office: 'Offices', hotel: 'Hotel', residential: 'Homes' };

/** One floor's stretch of wall in the section: which floor, which wall, which bays. */
interface WallRun {
  slice: FloorSlice;
  face: Face;
  /** Bay cells on the main tower's tile grid: cell j covers j·bay to (j+1)·bay along the wall. */
  cells: number[];
  /** Extra plain wall from the last cell edge to the corner, metres (corner view). */
  pier?: { from: number; to: number };
  /** A wall too short for one full bay gets a single narrower bay centred at `s` instead. */
  narrow?: { s: number; width: number };
}

const mod = (x: number, y: number) => x - y * Math.floor(x / y);

function frontFace(design: Design, slice: FloorSlice): Face {
  return planFaces(design.shape, slice.width, slice.depth).reduce((best, f) => (f.z > best.z ? f : best));
}

/** Up to `n` cells centred on the middle of a wall, never running past its ends. */
function centredCells(face: Face, bay: number, n: number): number[] {
  const fit = Math.max(1, Math.min(n, Math.floor(face.length / bay)));
  const first = -Math.floor(fit / 2);
  return Array.from({ length: fit }, (_, k) => first + k);
}

/** The bay index the main tower's facade shader uses for this cell, so night lights match. */
function shaderBay(design: Design, slice: FloorSlice, face: Face, cell: number, bay: number): number {
  if (design.shape !== 'circle') return cell;
  const a = alongFace(design.shape, slice.width, slice.depth, face, (cell + 0.5) * bay);
  return Math.floor((mod(a.yaw, Math.PI * 2) * (slice.width / 2)) / bay);
}

const box = (position: Vec3, scale: Vec3, material: PartMaterial): Part => ({ shape: 'box', position, scale, material });

/** Turns a band around the whole floor (a 'plan' part) into a strip along each bay of a run. */
function bandStrips(band: Part, run: WallRun, design: Design, bay: number, frame: SectionFrame): Part[] {
  const out = Math.max(0.1, (band.scale[0] - run.slice.width) / 2);
  return run.cells.map((cell) => {
    const a = worldAnchor(run.slice, alongFace(design.shape, run.slice.width, run.slice.depth, run.face, (cell + 0.5) * bay));
    const strip = box([0, band.position[1] - run.slice.y, out / 2], [bay, band.scale[1], out], band.material);
    return toLocalPart(placeAtAnchor(strip, a), frame);
  });
}

interface Built {
  parts: Part[];
  windows: DetailWindow[];
  width: number;
  height: number;
}

/**
 * Walls, windows, vertical ornaments and nearby ornaments for a set of wall runs.
 * `reachAbove` is how far above the section an ornament may stand and still be shown (corners: pinnacles).
 */
function buildRuns(design: Design, runs: WallRun[], frame: SectionFrame, reachAbove = 1, extraPool: Part[] = []): Built {
  const recipe = facadeRecipe(design);
  const bay = recipe.pattern.bayWidth;
  const wallMaterial: PartMaterial = recipe.colors.wall === design.palette.glass ? 'glass' : 'body';
  const uses = floorUses(design);
  const parts: Part[] = [];
  const windows: DetailWindow[] = [];
  const level = amountLevel(design);
  const vertical = activeOrnaments(design).filter((o) => o.placement === 'bay-lines');

  for (const run of runs) {
    const { slice, face } = run;
    const anchorAt = (s: number): WorldAnchor => worldAnchor(slice, alongFace(design.shape, slice.width, slice.depth, face, s));
    const lobby = slice.index === 0 ? Math.max(design.windowRatio, 0.8) : design.windowRatio;
    const use = uses[slice.index] ?? 'office';
    const bays = run.narrow
      ? [{ cell: run.narrow.s >= 0 ? 0 : -1, s: run.narrow.s, width: run.narrow.width }]
      : run.cells.map((cell) => ({ cell, s: (cell + 0.5) * bay, width: bay }));
    for (const { cell, s, width } of bays) {
      const a = anchorAt(s);
      const pieces = wallBay(recipe, width, wallMaterial, lobby);
      for (const p of pieces.parts) parts.push(toLocalPart(placeAtAnchor(p, a), frame));
      const shaderCell = shaderBay(design, slice, face, cell, bay);
      for (const u of pieces.panes) {
        windows.push({
          pane: toLocalPart(placeAtAnchor(u.pane, a), frame),
          room: toLocalPart(placeAtAnchor(u.room, a), frame),
          floor: slice.index,
          bay: shaderCell,
          lit: windowLit(shaderCell, slice.index, NIGHT_LIGHTS[use].lit),
          color: NIGHT_LIGHTS[use].color,
        });
      }
    }
    if (run.pier) {
      const len = Math.abs(run.pier.to - run.pier.from);
      if (len > 0.05) {
        const a = anchorAt((run.pier.from + run.pier.to) / 2);
        parts.push(toLocalPart(placeAtAnchor(box([0, FLOOR_HEIGHT / 2, -0.15], [len, FLOOR_HEIGHT, 0.3], wallMaterial), a), frame));
      }
    }
    // Ribs, mullions and fins: on the section's own bay edges, one piece per floor.
    for (const o of vertical) {
      const every = o.amount[level].every ?? 1;
      const size = o.amount[level].size;
      const edges = run.cells.length ? [...run.cells, run.cells[run.cells.length - 1] + 1] : [];
      for (const edge of edges) {
        if (mod(edge, every) !== 0) continue;
        const a = anchorAt(edge * bay);
        for (const t of o.template) {
          const piece: Part = {
            ...t,
            position: [t.position[0] * size, FLOOR_HEIGHT / 2, t.position[2] * size],
            scale: [t.scale[0] * size, t.scale[1] * FLOOR_HEIGHT, t.scale[2] * size],
          };
          parts.push(toLocalPart(placeAtAnchor(piece, a), frame));
        }
      }
    }
  }

  // Everything else comes from the main tower's own placement, cut down to what is in view.
  const local = parts.map(partBounds);
  const minX = Math.min(...local.map((b) => b.min[0])) - 1;
  const maxX = Math.max(...local.map((b) => b.max[0])) + 1;
  const height = Math.max(...local.map((b) => b.max[1]));
  const pool = [...ornamentParts(design, (o) => o.placement !== 'bay-lines'), ...extraPool];
  for (const p of pool) {
    if (p.shape === 'plan') {
      const run = runs.find((r) => p.position[1] >= r.slice.y - 0.5 && p.position[1] <= r.slice.y + FLOOR_HEIGHT + 0.5);
      if (run) parts.push(...bandStrips(p, run, design, bay, frame));
      continue;
    }
    const lp = toLocalPart(p, frame);
    const c = lp.position;
    const b = partBounds(lp);
    if (c[0] >= minX && c[0] <= maxX && c[2] >= -4 && c[2] <= 6 && b.min[1] >= -0.5 && b.max[1] <= height + reachAbove) parts.push(lp);
  }
  return { parts, windows, width: maxX - minX - 2, height };
}

/** Width ÷ height of the close-up's canvas; the framing fits the section to it. */
export const DETAIL_ASPECT = 320 / 220;

function focusFor(width: number, height: number, centreX: number, yaw: number, pitch: number, targetY = height / 2): DetailFocus {
  const span = Math.max(width / DETAIL_ASPECT, height, 6);
  return { target: [centreX, targetY, 0], distance: (1.2 * span) / (2 * Math.tan((20 * Math.PI) / 180)), yaw, pitch };
}

function facadeView(design: Design): DetailModel {
  const slices = floorSlices(design);
  const run = floorRuns(design, 1000).reduce((best, r) => (r.length > best.length ? r : best));
  const mid = run[Math.floor(run.length / 2)];
  const start = Math.max(run[0].index, Math.min(mid.index - 1, run[run.length - 1].index - 3));
  const floors = slices.slice(start, Math.min(start + 4, run[run.length - 1].index + 1));
  const bay = facadeRecipe(design).pattern.bayWidth;
  const refFace = frontFace(design, floors[0]);
  const cells = centredCells(refFace, bay, 5);
  const centreS = ((cells[0] + cells[cells.length - 1] + 1) / 2) * bay;
  const origin = worldAnchor(floors[0], alongFace(design.shape, floors[0].width, floors[0].depth, refFace, centreS));
  const frame: SectionFrame = { origin: origin.position, yaw: origin.yaw };
  const runs = floors.map((slice) => ({ slice, face: frontFace(design, slice), cells }));
  const b = buildRuns(design, runs, frame);
  const recipe = facadeRecipe(design);
  const use = floorUses(design)[mid.index] ?? 'office';
  return {
    parts: b.parts,
    windows: b.windows,
    focus: focusFor(b.width, b.height, 0, 0.35, 0.05),
    caption: `Floor ${mid.index + 1} · ${USE_NAMES[use]} · ${recipe.pattern.label} · ${recipe.spandrel.label}`,
  };
}

/** Two bays on each wall that meets at the corner, plus the bit of wall up to the corner. */
function cornerRuns(design: Design, slice: FloorSlice, bay: number): WallRun[] {
  const corners = planCorners(design.shape, slice.width, slice.depth);
  const corner = corners.reduce((best, c) => (c.z + 0.5 * c.x > best.z + 0.5 * best.x ? c : best));
  if (design.shape === 'circle') {
    const r = slice.width / 2;
    const face: Face = { x: r * Math.sin(corner.yaw), z: (slice.depth / 2) * Math.cos(corner.yaw), yaw: corner.yaw, length: (Math.PI * slice.width) / 4 };
    return [{ slice, face, cells: centredCells(face, bay, 4) }];
  }
  const runs: WallRun[] = [];
  for (const face of planFaces(design.shape, slice.width, slice.depth)) {
    for (const sign of [1, -1]) {
      const end = alongFace(design.shape, slice.width, slice.depth, face, (sign * face.length) / 2);
      if (Math.hypot(end.x - corner.x, end.z - corner.z) > 1e-6) continue;
      const half = face.length / 2;
      const full = Math.floor(half / bay);
      if (full < 1) {
        runs.push({ slice, face, cells: [], narrow: { s: (sign * half) / 2, width: half } });
        continue;
      }
      const cells = sign > 0 ? [full - 2, full - 1].filter((c) => c >= -full) : [-full, -full + 1].filter((c) => c < full);
      runs.push({ slice, face, cells, pier: { from: sign * full * bay, to: sign * half } });
    }
  }
  return runs;
}

function cornerView(design: Design): DetailModel {
  const slices = floorSlices(design);
  const levels = setbackLevels(design);
  const step = levels.filter((l) => !l.isRoof).at(-1) ?? levels[levels.length - 1];
  const top = step.slice.index;
  const floors = slices.slice(Math.max(0, top - 1), Math.min(slices.length, top + 2));
  const bay = facadeRecipe(design).pattern.bayWidth;
  const levelCorners = planCorners(design.shape, step.slice.width, step.slice.depth);
  const corner = levelCorners.reduce((best, c) => (c.z + 0.5 * c.x > best.z + 0.5 * best.x ? c : best));
  const origin = worldAnchor(floors[0], corner);
  const frame: SectionFrame = { origin: [origin.position[0], floors[0].y, origin.position[2]], yaw: origin.yaw };
  const runs = floors.flatMap((slice) => cornerRuns(design, slice, bay));
  const b = buildRuns(design, runs, frame, 8, step.isRoof ? crownParts(design, 'rich') : []);
  const names = activeOrnaments(design)
    .filter((o) => ['setback-corners', 'setback-faces', 'roof-edge'].includes(o.placement))
    .map((o) => ORNAMENTS[o.id].label);
  const where = step.isRoof ? 'Roof corner' : `Setback at floor ${top + 1}`;
  return {
    parts: b.parts,
    windows: b.windows,
    focus: focusFor(Math.max(b.width, 12), b.height, 0, 0, 0.25),
    caption: `${where} · ${names.length ? names.join(', ') : 'no corner ornaments'}`,
  };
}

/** Three simple people, 1.7 m tall, so the size of everything is easy to feel. */
export function scalePeople(xs: number[], z: number): Part[] {
  return xs.flatMap((x) => [
    box([x, 0.65, z], [0.45, 1.3, 0.3], 'concrete'),
    { shape: 'sphere', position: [x, 1.5, z], scale: [0.4, 0.4, 0.4], material: 'concrete' } satisfies Part,
  ]);
}

function baseView(design: Design): DetailModel {
  const slices = floorSlices(design);
  const floors = slices.slice(0, Math.min(3, slices.length));
  const bay = facadeRecipe(design).pattern.bayWidth;
  const refFace = frontFace(design, floors[0]);
  const cells = centredCells(refFace, bay, 5);
  const centreS = ((cells[0] + cells[cells.length - 1] + 1) / 2) * bay;
  const origin = worldAnchor(floors[0], alongFace(design.shape, floors[0].width, floors[0].depth, refFace, centreS));
  const frame: SectionFrame = { origin: origin.position, yaw: origin.yaw };
  const runs = floors.map((slice) => ({ slice, face: frontFace(design, slice), cells }));
  const b = buildRuns(design, runs, frame);
  const half = b.width / 2;
  const parts = [
    ...b.parts,
    box([0, -0.1, 2.5], [b.width + 8, 0.2, 5], 'concrete'),
    ...scalePeople([-half * 0.6, half * 0.15, half * 0.7], 2.6),
  ];
  const names = activeOrnaments(design)
    .filter((o) => o.placement === 'base-floors' || o.placement === 'entry')
    .map((o) => ORNAMENTS[o.id].label);
  return {
    parts,
    windows: b.windows,
    focus: focusFor(b.width, b.height, 0, 0.3, 0.12, Math.min(b.height / 2, 5)),
    caption: `Ground floor · ${names.length ? names.join(', ') : 'no base ornaments'} · a person is about 1.7 m tall`,
  };
}

/** A close-up piece of the tower, built in true 3D at real size, for the detail window. */
export function detailModel(design: Design, view: DetailView): DetailModel {
  if (view === 'corner') return cornerView(design);
  if (view === 'base') return baseView(design);
  return facadeView(design);
}
