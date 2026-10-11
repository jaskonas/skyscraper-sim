# Skyscraper Studio — Plan 2: Architectural Detail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Towers read as real architecture. That means:
- style-specific painted facades and 3D ornament relief;
- a 28-crown catalog with style defaults, shown in a picture gallery;
- player-chosen window patterns, spandrels and ornaments;
- a day/night toggle that lights windows, crowns and aircraft beacons.

**Architecture:**
- **Catalogs:** the new look catalogs (`crowns.ts`, `facades.ts`) live beside the existing ones in `src/sim/catalog/`. They are pure data, keyed by id lists in `ids.ts`.
- **Parts:** crowns and ornaments become lists of simple *parts* (unit shapes with position, scale, rotation and material). Pure functions build them: `crownParts`, `ornamentParts` and `bracingParts`, using shared placement helpers.
- **Rendering:** one `<PartsMesh>` draws any part list as a few instanced meshes.
- **Facades:** a pure tile layout is painted onto a canvas and repeated in real metres by a small `MeshStandardMaterial` shader patch, which also lights windows at night.
- **Sidebar:** galleries are generated from the same catalogs. Icons are drawn from each option's own parts.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, three 0.186, @react-three/fiber 9, Zustand 5, Vitest 5 + jsdom + Testing Library + @react-three/test-renderer 9. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-10-architectural-detail-design.md`, which extends `docs/superpowers/specs/2026-10-10-skyscraper-sim-design.md`.

**Branch:** work on `plan-2-architectural-detail`, cut from `master`.

**Provenance:** this plan was executed mechanically, task by task, on a fresh clone of `master`. After every task `tsc` was clean and the whole suite passed, with the counts given in each task. `vite build` succeeds at the end. Every headless screenshot of the 8 styles, by day and by night, was reviewed. Most number choices are deliberate rules of thumb, or sizes tuned against those screenshots. Do not "fix" them without looking at the result.

## Rulings (where this plan deliberately differs from the spec's wording)

- **`Part` lives in `src/sim/parts.ts`**, not `src/scene/parts/types.ts`. Crown stages and ornament templates are catalog data in `src/sim/`, and `src/sim/` must not import from `src/scene/`.
- **Only three crowns are custom** (`flying-buttresses`, `glass-shards`, `wind-turbines`). `open-frame`, `sky-bridge-arch` and `twin-antennas` were simple enough to describe as stages.
- **Ids are const arrays in `src/sim/catalog/ids.ts`**, and catalogs are `Record<Id, Def>`. Adding an id without an entry, or a custom crown without a builder, is a compile error. This is the spec's "derived from catalog keys" guarantee.
- **The spec's `facadeTexture.ts` is split** into `facadeTile.ts` (pure layout and painter, testable without a canvas) and `facadeTexture.ts` (canvas and three textures).
- **No `DetailsControl.tsx`:**
  - Window pattern, spandrel and amount are ordinary catalog params, drawn by `ParamControl` through a generic `widget: 'gallery'`.
  - Only the multi-select needs its own component, `OrnamentsControl.tsx`.
- **Ornament amount None** builds working parts at Low size and Low weight share (0.6). The spec table said 1, which would make None heavier than Low.
- **Bay-line ornaments are built in runs of ≤ 6 floors**, not per floor:
  - This keeps the worst case at about 5,800 instances, against a budget of 20,000.
  - Concrete fins are therefore vertical only.
  - The floor slab bands already give the horizontal lines.
- **A short tower with belt courses, ribbon bands or accent ties still gets one band**, halfway up, so the player's choice is visible.
- **Crowns gain a `landmark` flag.** "Distinctive landmark" briefs used to hard-code `spire`/`pointed`; showpiece crowns now count.
- **Budget and extreme tests use 150 floors**, because the Floors control maxes out at 150 (the spec said 170).
- **Neighbors get a painted window grid by day too.** It is the same material that makes them glow at night.

## Global Constraints

- `src/sim/` imports nothing from React, three, `src/state`, `src/ui` or `src/scene`.
- The catalog is the single source of truth.
  - Controls, galleries, validation, icons and normalization are generated from `src/sim/catalog/`.
  - Never hard-code an option list in UI code.
- Every design change goes through `applyActions` (store `dispatch`). One gallery click is one undo step.
- Analysis effects stay small and directionally honest, and every number lives in `src/sim/catalog/coefficients.ts`. Stone ornaments add ≈0.1 kN/m² each; each ornament type adds +2% facade cost; wind turbines give a 5% energy credit.
- Antennas (`officialHeight: false`) do not count toward `Analysis.heightM`. `Analysis.tipHeightM` includes them and is used for camera framing.
- Low-poly. Worst case (150 floors, 80 m plate, every ornament at High, exposed structure): ≤ 20,000 part instances, a handful of instanced meshes, and parts generation fast enough to redraw on every slider tick.
- `timeOfDay` is view state. It is not in the design, its history or the export, and it works in every phase.
- Use `npm`. No new dependencies.
- Commit after every task, ending the message with the two trailer lines shown in each commit step.

## Review Focus

1. **Dragging a slider on a 150-floor tower with every ornament.** Parts and the facade geometry are rebuilt on every tick, and the player expects the view to keep up. Pinned in Task 5 ("builds the worst-case tower fast enough…", < 50 ms; ≈3 ms measured). Reviewers should also drag Floors in the browser during Task 11.
2. **A browser or test environment without a 2D canvas.** The facade must fall back to plain colours, and night mode must not try to light windows that do not exist. Pinned in Task 8: the setup stub, plus "falls back to a plain colour…" in `FacadeMaterial.test.ts`. The Building tests render with no canvas.
3. **Old or hand-edited designs with unknown look ids** (a renamed crown, `"toString"`, duplicates). They must load with the style's own choices, never crash. Pinned in Task 2 ("falls back to the style's choice…").
4. **Extreme geometry** (5 floors; 150 floors with 0.6 taper, 120° twist, wedding-cake setbacks and a 15 m plate; every plan shape). Every crown and ornament must stay finite, attached to the tower, and visible. Pinned by the catalog-wide loops in Tasks 4 and 5 and the short-tower band fallback.
5. **A three.js upgrade renames a shader chunk** that the facade patch replaces. The tower would silently lose its facade. Pinned in Task 8 ("patches every shader hook it relies on…").

## File Structure

```
src/sim/catalog/ids.ts          id lists for crowns, window patterns, spandrels, ornaments
src/sim/catalog/crowns.ts       28 crowns: family, real example, height rule, stages or custom
src/sim/catalog/facades.ts      window patterns, spandrels, ornaments (placement rule + template + amounts)
src/sim/parts.ts                Part model + rotation/bounds/strut helpers (pure)
src/sim/facade.ts               activeOrnaments, amountLevel, facadeRecipe
src/scene/parts/placement.ts    corners, faces, perimeter points, setback levels, floor runs
src/scene/crowns/{types,stages,custom}.ts, src/scene/crownParts.ts
src/scene/ornaments.ts          ornamentParts, bracingParts
src/scene/parts/{geometries,materials}.ts, src/scene/parts/PartsMesh.tsx
src/scene/facadeTile.ts         tile layout + painter (pure)
src/scene/facadeTexture.ts      canvas textures, cached per look
src/scene/FacadeMaterial.ts     metre-UV + night-window shader patch
src/scene/nightWindows.ts       lit share/colour by use, shared hash (JS + GLSL)
src/scene/silhouette.ts         front-view SVG outlines from parts (gallery icons)
src/ui/sidebar/{icons.tsx,OptionGallery.tsx,OrnamentsControl.tsx}
```

---

### Task 1: Crown catalog, official height and crown effects

Replace the 5-value crown type with a 28-entry crown catalog. Each crown carries its family, a real example, its height rule, whether it counts toward official height, whether it is a landmark, and either declarative `stages` or `custom: true`. Analysis gains `tipHeightM` (antennas included) and a 5% energy credit for wind turbines. This task also adds the pure `Part` model, since crown stages are described with its shapes and materials.

**Files:**
- Create: `src/sim/catalog/ids.ts`
- Create: `src/sim/parts.ts`
- Create: `src/sim/parts.test.ts`
- Create: `src/sim/catalog/crowns.ts`
- Create: `src/sim/catalog/crowns.test.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/geometry.ts`
- Modify: `src/sim/analysis/massing.ts`
- Modify: `src/sim/analysis/index.ts`
- Modify: `src/sim/analysis/energy.ts`
- Modify: `src/sim/catalog/coefficients.ts`
- Modify: `src/sim/scoring.ts`
- Modify: `src/sim/catalog/parameters.ts`
- Modify: `src/ui/sidebar/Gauges.tsx`
- Modify: `src/scene/Scene.tsx`
- Modify: `src/scene/Building.test.tsx`

**Interfaces:**
- Consumes: Existing `Design`, `Analysis`, `crownHeight`, `computeMassing`, `analyzeEnergy`, `isLandmark`, `PARAMS`.
- Produces:
  - `src/sim/catalog/ids.ts`: `CROWN_IDS`, `CrownId`, `WINDOW_PATTERN_IDS`, `WindowPatternId`, `SPANDREL_IDS`, `SpandrelId`, `ORNAMENT_IDS`, `OrnamentId` (all ids are created now; later tasks fill the other catalogs).
  - `src/sim/parts.ts`: `Vec3`, `PartShape`, `PartMaterial`, `PART_MATERIALS`, `Part`, `rotateYXZ(v, r?)`, `partBounds(p)`, `strutPart(from, to, thickness, material)`, `placePart(p, yaw, dy?)`, `partIsFinite(p)`.
  - `src/sim/catalog/crowns.ts`: `CrownFamily`, `CROWN_FAMILIES`, `CrownHeightRule`, `CrownStage`, `CrownDef`, `CROWNS: Record<CrownId, CrownDef>`, `CustomCrownId` (= `'flying-buttresses' | 'glass-shards' | 'wind-turbines'`).
  - `Design.crown: CrownId`; `Analysis.tipHeightM: number`; `Massing.tipHeightM`.
  - `EnumParam.widget?: 'gallery'` (the crown param sets it; the sidebar ignores it until Task 10).

- [ ] **Step 1: Write the failing tests**

`src/sim/parts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { partBounds, placePart, rotateYXZ, strutPart, type Part } from './parts';

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe('parts', () => {
  it('rotates about Y so that +x turns toward -z', () => {
    close(rotateYXZ([1, 0, 0], [0, Math.PI / 2, 0]), [0, 0, -1]);
  });

  it('gives an upright box bounds of position ± scale / 2', () => {
    const p: Part = { shape: 'box', position: [1, 10, -2], scale: [2, 4, 6], material: 'body' };
    const b = partBounds(p);
    close(b.min, [0, 8, -5]);
    close(b.max, [2, 12, 1]);
  });

  it('makes a strut whose ends land on the requested points', () => {
    const from: [number, number, number] = [3, 0, 4];
    const to: [number, number, number] = [-1, 10, 2];
    const s = strutPart(from, to, 0.5, 'steel');
    const half = rotateYXZ([0, s.scale[1] / 2, 0], s.rotation);
    close([s.position[0] + half[0], s.position[1] + half[1], s.position[2] + half[2]], to);
    close([s.position[0] - half[0], s.position[1] - half[1], s.position[2] - half[2]], from);
  });

  it('placePart turns a group about the vertical axis and lifts it', () => {
    const s = strutPart([1, 0, 0], [1, 5, 0], 0.2, 'steel');
    const moved = placePart(s, Math.PI / 2, 100);
    close(moved.position, [0, 102.5, -1]);
    const top = rotateYXZ([0, moved.scale[1] / 2, 0], moved.rotation);
    close(top, [0, 2.5, 0]);
  });
});
```

`src/sim/catalog/crowns.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { analyze } from '../analysis';
import { crownHeight, FLOOR_HEIGHT } from '../geometry';
import { isLandmark } from '../scoring';
import { designFor } from '../testUtils';
import type { Design } from '../types';
import { CROWN_FAMILIES, CROWNS } from './crowns';
import { CROWN_IDS } from './ids';
import { PARAMS_BY_ID, type EnumParam } from './parameters';

describe('crown catalog', () => {
  it('has 28 crowns, each with a family, a real example and a blurb', () => {
    expect(CROWN_IDS).toHaveLength(28);
    const families = CROWN_FAMILIES.map((f) => f.id);
    for (const id of CROWN_IDS) {
      const c = CROWNS[id];
      expect(c.id).toBe(id);
      expect(families).toContain(c.family);
      expect(c.seenOn.length).toBeGreaterThan(3);
      expect(c.blurb.length).toBeGreaterThan(10);
    }
  });

  it('every crown is either built from stages that reach the tip, or custom', () => {
    for (const id of CROWN_IDS) {
      const c = CROWNS[id];
      if (c.custom) {
        expect(c.stages, id).toBeUndefined();
        continue;
      }
      expect(c.stages!.length, id).toBeGreaterThan(0);
      for (const s of c.stages!) {
        expect(s.y0, id).toBeGreaterThanOrEqual(0);
        expect(s.y1, id).toBeGreaterThan(s.y0);
        expect(s.y1, id).toBeLessThanOrEqual(1);
        expect(s.w, id).toBeGreaterThan(0);
      }
      expect(Math.max(...c.stages!.map((s) => s.y1)), id).toBe(1);
    }
  });

  it('turns each height rule into metres', () => {
    expect(crownHeight('flat', 200)).toBe(2);
    expect(crownHeight('stepped', 200)).toBe(3 * FLOOR_HEIGHT);
    expect(crownHeight('spire', 200)).toBeCloseTo(30);
  });

  it('offers every crown in the Crown control, drawn as a gallery', () => {
    const def = PARAMS_BY_ID.crown as EnumParam;
    expect(def.widget).toBe('gallery');
    expect(def.options.map((o) => o.value)).toEqual([...CROWN_IDS]);
  });
});

const run = (patch: Partial<Design>) => {
  const { site, design } = designFor('chicago', patch);
  return analyze(site, design);
};

describe('crown effects', () => {
  it('antennas reach higher but do not count toward official height', () => {
    const a = run({ floors: 100, crown: 'twin-antennas' });
    expect(a.heightM).toBe(400);
    expect(a.tipHeightM).toBeCloseTo(460);
    const s = run({ floors: 100, crown: 'spire' });
    expect(s.heightM).toBeCloseTo(460);
    expect(s.tipHeightM).toBe(s.heightM);
  });

  it('wind turbines cut energy use by about 5%', () => {
    const flat = run({ crown: 'flat' }).energy.euiKWhPerM2;
    const turbines = run({ crown: 'wind-turbines' }).energy.euiKWhPerM2;
    expect(turbines / flat).toBeCloseTo(0.95, 5);
  });

  it('showpiece crowns make a landmark; plain ones do not', () => {
    const { design } = designFor('chicago');
    expect(isLandmark({ ...design, crown: 'deco-arches' })).toBe(true);
    expect(isLandmark({ ...design, crown: 'flat' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/sim/parts.test.ts src/sim/catalog/crowns.test.ts`

Expected: FAIL — `Failed to resolve import "./parts"` and `"./crowns"` (the modules do not exist yet).

- [ ] **Step 3: Create `src/sim/catalog/ids.ts`**

```ts
/**
 * Ids for the expandable look catalogs. Add an id here, then its entry in the matching
 * catalog file — the compiler refuses to build until every id has an entry.
 */
export const CROWN_IDS = [
  'flat', 'cornice', 'concrete-cap', 'stepped', 'pointed', 'gothic-pinnacles', 'flying-buttresses',
  'deco-arches', 'mooring-mast', 'spire', 'split-pediment', 'lattice-mast', 'twin-antennas', 'gold-obelisk',
  'sloped', 'mansard', 'dome-lantern', 'clock-tower', 'star-spire', 'pagoda', 'ringed-pinnacle',
  'stepped-needle', 'sky-bridge-arch', 'open-frame', 'glass-dome', 'glass-shards', 'wind-turbines', 'roof-forest',
] as const;
export type CrownId = (typeof CROWN_IDS)[number];

export const WINDOW_PATTERN_IDS = ['flush-grid', 'chicago', 'arched', 'punched', 'exposed-frame', 'diamond'] as const;
export type WindowPatternId = (typeof WINDOW_PATTERN_IDS)[number];

export const SPANDREL_IDS = ['plain', 'chevron', 'stripes'] as const;
export type SpandrelId = (typeof SPANDREL_IDS)[number];

export const ORNAMENT_IDS = [
  'stone-ribs', 'ibeam-mullions', 'concrete-fins', 'belt-courses', 'setback-cornices', 'sunburst-bands',
  'ribbon-bands', 'pinnacles', 'deco-steps', 'gargoyles', 'urns', 'rusticated-base', 'arched-entry', 'accent-ties',
] as const;
export type OrnamentId = (typeof ORNAMENT_IDS)[number];
```

- [ ] **Step 4: Create `src/sim/parts.ts`**

```ts
/**
 * A part is one simple solid in a crown or ornament. Every unit shape fits the cube
 * [-0.5, 0.5]³, so `scale` is the part's size in metres and `position` its centre.
 * Rotation is Euler angles in Y-X-Z order (yaw first), so turning a whole group about
 * the vertical axis just adds to `rotation[1]`.
 */
export type Vec3 = [number, number, number];

export type PartShape =
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'pyramid'
  | 'sphere'
  | 'dome'
  | 'torus'
  | 'wedge'
  /** A slab of the tower's own plan shape (square, round or triangular). */
  | 'plan'
  /** A pointed cap of the tower's own plan shape (pyramid, cone or 3-sided pyramid). */
  | 'plan-cone';

export const PART_MATERIALS = [
  'body', 'accent', 'glass', 'stone', 'concrete', 'copper', 'gold', 'steel', 'foliage', 'ruby', 'light',
] as const;
export type PartMaterial = (typeof PART_MATERIALS)[number];

export interface Part {
  shape: PartShape;
  position: Vec3;
  scale: Vec3;
  rotation?: Vec3;
  material: PartMaterial;
  /** Glows at night. */
  glow?: boolean;
  /** 'spin': turns about its own z axis. 'blink': aircraft-warning light at night. */
  animate?: 'spin' | 'blink';
}

/** R = Ry(y) · Rx(x) · Rz(z), applied to v. */
export function rotateYXZ(v: Vec3, r: Vec3 = [0, 0, 0]): Vec3 {
  let [x, y, z] = v;
  const [rx, ry, rz] = r;
  // Rz
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  // Rx
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  // Ry
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  return [x, y, z];
}

/** Axis-aligned bounds of the part's unit cube after scale, rotation and translation. */
export function partBounds(p: Part): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const sx of [-0.5, 0.5])
    for (const sy of [-0.5, 0.5])
      for (const sz of [-0.5, 0.5]) {
        const c = rotateYXZ([sx * p.scale[0], sy * p.scale[1], sz * p.scale[2]], p.rotation);
        for (let i = 0; i < 3; i++) {
          min[i] = Math.min(min[i], c[i] + p.position[i]);
          max[i] = Math.max(max[i], c[i] + p.position[i]);
        }
      }
  return { min, max };
}

/** A thin box running from `from` to `to`. */
export function strutPart(from: Vec3, to: Vec3, thickness: number, material: PartMaterial): Part {
  const d: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(...d);
  const horizontal = Math.hypot(d[0], d[2]);
  const tilt = Math.atan2(horizontal, d[1]);
  const yaw = horizontal > 1e-9 ? Math.atan2(d[0], d[2]) : 0;
  return {
    shape: 'box',
    position: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2],
    scale: [thickness, length, thickness],
    rotation: [tilt, yaw, 0],
    material,
  };
}

/** Rotate a part about the vertical axis through the origin, then lift it by `dy`. */
export function placePart(p: Part, yaw: number, dy = 0): Part {
  const [x, y, z] = rotateYXZ(p.position, [0, yaw, 0]);
  const r = p.rotation ?? [0, 0, 0];
  return { ...p, position: [x, y + dy, z], rotation: [r[0], r[1] + yaw, r[2]] };
}

export function partIsFinite(p: Part): boolean {
  return [...p.position, ...p.scale, ...(p.rotation ?? [])].every(Number.isFinite);
}
```

- [ ] **Step 5: Create `src/sim/catalog/crowns.ts`**

```ts
import type { PartMaterial, PartShape } from '../parts';
import type { DetailLevel } from '../types';
import type { CrownId } from './ids';

export type CrownFamily = 'classic' | 'gothic-deco' | 'modern' | 'world' | 'eco';

export const CROWN_FAMILIES: { id: CrownFamily; label: string }[] = [
  { id: 'classic', label: 'Classic & Beaux-Arts' },
  { id: 'gothic-deco', label: 'Gothic & Deco' },
  { id: 'modern', label: 'Modern' },
  { id: 'world', label: 'Around the World' },
  { id: 'eco', label: 'Eco & Experimental' },
];

export type CrownHeightRule =
  | { kind: 'metres'; value: number }
  | { kind: 'floors'; value: number }
  /** Fraction of the tower body's height. */
  | { kind: 'fraction'; value: number };

/**
 * One piece of a crown, described in fractions so it fits any tower:
 * heights are fractions of the crown's height (0 = roof, 1 = tip);
 * widths are fractions of the top floor's width (w) and depth (d, defaults to w).
 */
export interface CrownStage {
  shape: PartShape;
  y0: number;
  y1: number;
  w: number;
  d?: number;
  /** Where copies go: one in the centre (default), one per plan corner, or a 3 × 3 grid. */
  at?: 'center' | 'corners' | 'grid';
  /** For corners and grid: how far out, as a fraction of the plate (1 = at the edge). */
  spread?: number;
  /** Shift as fractions of the top floor's width and depth. */
  offset?: readonly [number, number];
  /** Turn about the vertical axis, radians. */
  rotY?: number;
  material: PartMaterial;
  glow?: boolean;
  animate?: 'spin' | 'blink';
}

export interface CrownDef {
  id: CrownId;
  label: string;
  family: CrownFamily;
  /** A real building that has this kind of top. */
  seenOn: string;
  blurb: string;
  height: CrownHeightRule;
  /** False for antennas — official height rankings don't count them. */
  officialHeight: boolean;
  /** Counts as an eye-catching top for "landmark" briefs. */
  landmark: boolean;
  /** Makes electricity (wind turbines). */
  generatesPower?: true;
  /** Built from stages unless `custom` — then scene/crowns must provide a builder. */
  stages?: readonly CrownStage[];
  custom?: true;
  minDetailLevel: DetailLevel;
}

const S = 'standard' as const;

const CROWN_DATA = {
  cornice: {
    id: 'cornice', label: 'Heavy cornice', family: 'classic', seenOn: 'Reliance Building, Chicago',
    blurb: 'A deep stone ledge that "caps" the tower like the top of a classical column.',
    height: { kind: 'metres', value: 2 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.4, w: 1, material: 'body' },
      { shape: 'plan', y0: 0.4, y1: 1, w: 1.08, material: 'accent' },
    ],
  },
  mansard: {
    id: 'mansard', label: 'Mansard roof', family: 'classic', seenOn: 'The Plaza Hotel, New York',
    blurb: 'A steep copper roof with a flat top, borrowed from 1800s Paris.',
    height: { kind: 'floors', value: 2 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.15, w: 1.02, material: 'stone' },
      { shape: 'plan', y0: 0.15, y1: 0.75, w: 0.9, material: 'copper' },
      { shape: 'plan', y0: 0.75, y1: 1, w: 0.7, material: 'copper' },
    ],
  },
  'dome-lantern': {
    id: 'dome-lantern', label: 'Dome and lantern', family: 'classic', seenOn: 'Singer Building, New York',
    blurb: 'A copper dome topped by a little glass "lantern" — like a cathedral on a tower.',
    height: { kind: 'fraction', value: 0.08 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.25, w: 0.7, material: 'stone' },
      { shape: 'cylinder', y0: 0.25, y1: 0.35, w: 0.55, material: 'stone' },
      { shape: 'dome', y0: 0.35, y1: 0.75, w: 0.55, material: 'copper' },
      { shape: 'cylinder', y0: 0.75, y1: 0.9, w: 0.12, material: 'light', glow: true },
      { shape: 'cone', y0: 0.9, y1: 1, w: 0.12, material: 'copper' },
    ],
  },
  'clock-tower': {
    id: 'clock-tower', label: 'Clock tower and cupola', family: 'classic', seenOn: 'Metropolitan Life Tower, New York',
    blurb: 'A giant clock on every side and a golden cupola, modelled on a bell tower in Venice.',
    height: { kind: 'fraction', value: 0.1 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.45, w: 0.45, material: 'stone' },
      { shape: 'box', y0: 0.28, y1: 0.38, w: 0.47, material: 'light', glow: true },
      { shape: 'plan', y0: 0.45, y1: 0.6, w: 0.38, material: 'stone' },
      { shape: 'dome', y0: 0.6, y1: 0.8, w: 0.3, material: 'gold' },
      { shape: 'cone', y0: 0.8, y1: 1, w: 0.06, material: 'gold' },
    ],
  },
  'gothic-pinnacles': {
    id: 'gothic-pinnacles', label: 'Gothic pinnacles', family: 'gothic-deco', seenOn: 'Woolworth Building, New York',
    blurb: 'A copper roof ringed by stone spikes, like a cathedral — the "Cathedral of Commerce".',
    height: { kind: 'fraction', value: 0.1 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.15, w: 0.9, material: 'stone' },
      { shape: 'plan-cone', y0: 0.15, y1: 1, w: 0.75, material: 'copper' },
      { shape: 'cone', y0: 0, y1: 0.55, w: 0.08, at: 'corners', spread: 0.95, material: 'stone' },
    ],
  },
  'flying-buttresses': {
    id: 'flying-buttresses', label: 'Flying buttresses', family: 'gothic-deco', seenOn: 'Tribune Tower, Chicago',
    blurb: 'Stone arms leap from the corners to hold up a central lantern — copied from French cathedrals.',
    height: { kind: 'fraction', value: 0.06 }, officialHeight: true, landmark: true, minDetailLevel: S,
    custom: true,
  },
  'deco-arches': {
    id: 'deco-arches', label: 'Deco arches and needle', family: 'gothic-deco', seenOn: 'Chrysler Building, New York',
    blurb: 'Shiny stacked arches with sunburst windows and a needle on top — pure 1930s glamour.',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.08, w: 0.8, material: 'body' },
      { shape: 'dome', y0: 0.08, y1: 0.24, w: 0.78, material: 'steel', glow: true },
      { shape: 'plan', y0: 0.24, y1: 0.3, w: 0.58, material: 'body' },
      { shape: 'dome', y0: 0.3, y1: 0.44, w: 0.56, material: 'steel', glow: true },
      { shape: 'plan', y0: 0.44, y1: 0.48, w: 0.38, material: 'body' },
      { shape: 'dome', y0: 0.48, y1: 0.6, w: 0.36, material: 'steel', glow: true },
      { shape: 'cone', y0: 0.6, y1: 1, w: 0.07, material: 'steel' },
    ],
  },
  'mooring-mast': {
    id: 'mooring-mast', label: 'Mooring mast', family: 'gothic-deco', seenOn: 'Empire State Building, New York',
    blurb: 'A glass-and-steel mast first meant for tying up airships. It never worked — too windy!',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.25, w: 0.6, material: 'body' },
      { shape: 'cylinder', y0: 0.25, y1: 0.45, w: 0.35, material: 'light', glow: true },
      { shape: 'dome', y0: 0.45, y1: 0.55, w: 0.35, material: 'accent' },
      { shape: 'cylinder', y0: 0.55, y1: 1, w: 0.03, material: 'steel', animate: 'blink' },
    ],
  },
  spire: {
    id: 'spire', label: 'Spire', family: 'gothic-deco', seenOn: 'One World Trade Center, New York',
    blurb: 'A tall needle on top — adds a lot of height.',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.15, w: 0.4, material: 'accent' },
      { shape: 'cone', y0: 0.15, y1: 1, w: 0.16, material: 'steel', animate: 'blink' },
    ],
  },
  stepped: {
    id: 'stepped', label: 'Stepped', family: 'gothic-deco', seenOn: 'Bank of Manhattan Trust, New York',
    blurb: 'Small blocks stacked like a ziggurat.',
    height: { kind: 'floors', value: 3 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 1 / 3, w: 0.75, material: 'accent' },
      { shape: 'plan', y0: 1 / 3, y1: 2 / 3, w: 0.55, material: 'accent' },
      { shape: 'plan', y0: 2 / 3, y1: 1, w: 0.35, material: 'accent' },
    ],
  },
  flat: {
    id: 'flat', label: 'Flat roof', family: 'modern', seenOn: 'Seagram Building, New York',
    blurb: 'A simple flat top with the machinery hidden behind a low wall. Good for a helipad or pool.',
    height: { kind: 'metres', value: 2 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.5, w: 0.96, material: 'accent' },
      { shape: 'box', y0: 0.5, y1: 1, w: 0.25, d: 0.2, offset: [-0.2, 0.1], material: 'steel' },
      { shape: 'box', y0: 0.5, y1: 0.9, w: 0.15, d: 0.3, offset: [0.22, -0.15], material: 'steel' },
    ],
  },
  'concrete-cap': {
    id: 'concrete-cap', label: 'Concrete cap', family: 'modern', seenOn: 'Barbican towers, London',
    blurb: 'A chunky overhanging concrete top — bold and blocky, the Brutalist way.',
    height: { kind: 'floors', value: 1 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.3, w: 0.8, material: 'concrete' },
      { shape: 'plan', y0: 0.3, y1: 1, w: 1.12, material: 'concrete' },
    ],
  },
  pointed: {
    id: 'pointed', label: 'Pointed pyramid', family: 'modern', seenOn: 'Transamerica Pyramid, San Francisco',
    blurb: 'A pyramid-like cap that sheds wind and snow.',
    height: { kind: 'fraction', value: 0.08 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [{ shape: 'plan-cone', y0: 0, y1: 1, w: 1, material: 'accent' }],
  },
  sloped: {
    id: 'sloped', label: 'Sloped', family: 'modern', seenOn: 'Citigroup Center, New York',
    blurb: 'A slanted top, like a ramp to the sky. Citigroup\'s was meant to hold solar panels.',
    height: { kind: 'fraction', value: 0.05 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [{ shape: 'wedge', y0: 0, y1: 1, w: 1, material: 'accent' }],
  },
  'split-pediment': {
    id: 'split-pediment', label: 'Split pediment', family: 'modern', seenOn: '550 Madison (AT&T Building), New York',
    blurb: 'A giant triangle with a notch, like the top of an old grandfather clock — a Postmodern joke.',
    height: { kind: 'floors', value: 2 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.4, w: 1, material: 'body' },
      { shape: 'wedge', y0: 0.4, y1: 1, w: 0.44, d: 0.9, offset: [-0.28, 0], rotY: Math.PI, material: 'accent' },
      { shape: 'wedge', y0: 0.4, y1: 1, w: 0.44, d: 0.9, offset: [0.28, 0], material: 'accent' },
    ],
  },
  'lattice-mast': {
    id: 'lattice-mast', label: 'Lattice mast', family: 'modern', seenOn: "Lloyd's Building, London",
    blurb: 'An open steel frame with a mast — High-Tech towers show off their engineering.',
    height: { kind: 'fraction', value: 0.1 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'box', y0: 0, y1: 0.08, w: 0.5, material: 'steel' },
      { shape: 'cylinder', y0: 0.08, y1: 0.85, w: 0.03, at: 'corners', spread: 0.35, material: 'accent' },
      { shape: 'box', y0: 0.45, y1: 0.48, w: 0.36, material: 'accent' },
      { shape: 'box', y0: 0.82, y1: 0.85, w: 0.36, material: 'accent' },
      { shape: 'cylinder', y0: 0.08, y1: 1, w: 0.05, material: 'steel', animate: 'blink' },
    ],
  },
  'twin-antennas': {
    id: 'twin-antennas', label: 'Twin antennas', family: 'modern', seenOn: 'Willis Tower, Chicago',
    blurb: 'Broadcast antennas. They make the tower look taller, but official height rankings don\'t count them!',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: false, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'box', y0: 0, y1: 0.05, w: 0.3, material: 'steel' },
      { shape: 'cylinder', y0: 0.05, y1: 1, w: 0.03, offset: [-0.2, 0.1], material: 'steel', animate: 'blink' },
      { shape: 'cylinder', y0: 0.05, y1: 0.85, w: 0.03, offset: [0.2, -0.1], material: 'steel', animate: 'blink' },
    ],
  },
  'gold-obelisk': {
    id: 'gold-obelisk', label: 'Gold obelisk lantern', family: 'modern', seenOn: 'Bank of America Plaza, Atlanta',
    blurb: 'An open golden pyramid-topped frame that glows at night.',
    height: { kind: 'fraction', value: 0.08 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.2, w: 0.5, material: 'body' },
      { shape: 'box', y0: 0.2, y1: 0.85, w: 0.3, material: 'gold', glow: true },
      { shape: 'pyramid', y0: 0.85, y1: 1, w: 0.3, material: 'gold', glow: true },
    ],
  },
  'star-spire': {
    id: 'star-spire', label: 'Star spire', family: 'world', seenOn: 'Moscow State University ("Seven Sisters")',
    blurb: 'Stacked towers and a golden spire topped with a red star — the Soviet wedding-cake style.',
    height: { kind: 'fraction', value: 0.18 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.15, w: 0.5, material: 'body' },
      { shape: 'plan', y0: 0.15, y1: 0.3, w: 0.35, material: 'body' },
      { shape: 'cone', y0: 0.3, y1: 0.92, w: 0.12, material: 'gold' },
      { shape: 'sphere', y0: 0.92, y1: 1, w: 0.06, material: 'ruby', glow: true },
    ],
  },
  pagoda: {
    id: 'pagoda', label: 'Pagoda tiers', family: 'world', seenOn: 'Jin Mao Tower, Shanghai / Taipei 101',
    blurb: 'Flared roofs stacked like a pagoda — eight is a lucky number, so Jin Mao has eight-part rhythms.',
    height: { kind: 'fraction', value: 0.1 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.2, w: 0.8, material: 'body' },
      { shape: 'plan-cone', y0: 0.2, y1: 0.3, w: 1.05, material: 'accent' },
      { shape: 'plan', y0: 0.3, y1: 0.48, w: 0.62, material: 'body' },
      { shape: 'plan-cone', y0: 0.48, y1: 0.58, w: 0.85, material: 'accent' },
      { shape: 'plan', y0: 0.58, y1: 0.74, w: 0.45, material: 'body' },
      { shape: 'plan-cone', y0: 0.74, y1: 0.84, w: 0.65, material: 'accent' },
      { shape: 'cone', y0: 0.84, y1: 1, w: 0.05, material: 'gold' },
    ],
  },
  'ringed-pinnacle': {
    id: 'ringed-pinnacle', label: 'Ringed pinnacle', family: 'world', seenOn: 'Petronas Towers, Kuala Lumpur',
    blurb: 'Stainless-steel rings and a slender point, inspired by Islamic geometry.',
    height: { kind: 'fraction', value: 0.15 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'cylinder', y0: 0, y1: 0.3, w: 0.45, material: 'steel' },
      { shape: 'torus', y0: 0.3, y1: 0.34, w: 0.5, material: 'steel' },
      { shape: 'cylinder', y0: 0.34, y1: 0.55, w: 0.3, material: 'steel' },
      { shape: 'torus', y0: 0.55, y1: 0.58, w: 0.36, material: 'steel' },
      { shape: 'cylinder', y0: 0.58, y1: 0.7, w: 0.18, material: 'steel' },
      { shape: 'sphere', y0: 0.7, y1: 0.76, w: 0.16, material: 'steel' },
      { shape: 'cylinder', y0: 0.76, y1: 1, w: 0.03, material: 'steel', animate: 'blink' },
    ],
  },
  'stepped-needle': {
    id: 'stepped-needle', label: 'Stepped needle', family: 'world', seenOn: 'Burj Khalifa, Dubai',
    blurb: 'The tower steps in and in until it becomes a needle — the tallest building on Earth.',
    height: { kind: 'fraction', value: 0.2 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.2, w: 0.6, material: 'glass' },
      { shape: 'plan', y0: 0.2, y1: 0.38, w: 0.42, material: 'glass' },
      { shape: 'plan', y0: 0.38, y1: 0.52, w: 0.28, material: 'glass' },
      { shape: 'cylinder', y0: 0.52, y1: 1, w: 0.08, material: 'steel', animate: 'blink' },
    ],
  },
  'sky-bridge-arch': {
    id: 'sky-bridge-arch', label: 'Sky-bridge arch', family: 'world', seenOn: 'Kingdom Centre, Riyadh',
    blurb: 'Two prongs joined by a glass bridge high up, leaving a huge opening the wind blows through.',
    height: { kind: 'floors', value: 4 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'box', y0: 0, y1: 1, w: 0.3, d: 0.9, offset: [-0.35, 0], material: 'body' },
      { shape: 'box', y0: 0, y1: 1, w: 0.3, d: 0.9, offset: [0.35, 0], material: 'body' },
      { shape: 'box', y0: 0.7, y1: 0.8, w: 0.42, d: 0.5, material: 'glass', glow: true },
    ],
  },
  'open-frame': {
    id: 'open-frame', label: 'Open frame ("bottle opener")', family: 'eco', seenOn: 'Shanghai World Financial Center',
    blurb: 'A hole through the top lets wind pass straight through, so the tower sways less.',
    height: { kind: 'floors', value: 3 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [
      { shape: 'box', y0: 0, y1: 1, w: 0.22, d: 1, offset: [-0.39, 0], material: 'body' },
      { shape: 'box', y0: 0, y1: 1, w: 0.22, d: 1, offset: [0.39, 0], material: 'body' },
      { shape: 'box', y0: 0.85, y1: 1, w: 1, d: 1, material: 'body' },
    ],
  },
  'glass-dome': {
    id: 'glass-dome', label: 'Glass bullet dome', family: 'eco', seenOn: '30 St Mary Axe ("The Gherkin"), London',
    blurb: 'A rounded glass cap with a restaurant inside and 360° views.',
    height: { kind: 'fraction', value: 0.04 }, officialHeight: true, landmark: true, minDetailLevel: S,
    stages: [{ shape: 'dome', y0: 0, y1: 1, w: 1, material: 'glass', glow: true }],
  },
  'glass-shards': {
    id: 'glass-shards', label: 'Glass shards', family: 'eco', seenOn: 'The Shard, London',
    blurb: 'Leaning glass panes that never quite meet, so the top looks unfinished on purpose.',
    height: { kind: 'fraction', value: 0.06 }, officialHeight: true, landmark: true, minDetailLevel: S,
    custom: true,
  },
  'wind-turbines': {
    id: 'wind-turbines', label: 'Wind turbines', family: 'eco', seenOn: 'Strata SE1, London',
    blurb: 'Three turbines in the roof make a little electricity — about 5% of what the building uses.',
    height: { kind: 'floors', value: 2 }, officialHeight: true, landmark: true, generatesPower: true, minDetailLevel: S,
    custom: true,
  },
  'roof-forest': {
    id: 'roof-forest', label: 'Roof forest', family: 'eco', seenOn: 'Bosco Verticale, Milan',
    blurb: 'Real trees on the roof shade it, clean the air and give birds a home.',
    height: { kind: 'floors', value: 1 }, officialHeight: true, landmark: false, minDetailLevel: S,
    stages: [
      { shape: 'plan', y0: 0, y1: 0.3, w: 0.95, material: 'concrete' },
      { shape: 'cone', y0: 0.3, y1: 1, w: 0.18, at: 'grid', spread: 0.7, material: 'foliage' },
    ],
  },
} as const satisfies Record<CrownId, CrownDef>;

export const CROWNS: Record<CrownId, CrownDef> = CROWN_DATA;

/** Crowns marked `custom: true`; scene/crowns must give each one a builder. */
export type CustomCrownId = {
  [K in CrownId]: (typeof CROWN_DATA)[K] extends { custom: true } ? K : never;
}[CrownId];
```

- [ ] **Step 6: Edit `src/sim/types.ts`**

Replace:

```ts
export type DetailLevel = 'standard' | 'advanced';
```
with:

```ts
import type { CrownId } from './catalog/ids';

export type { CrownId } from './catalog/ids';
export type DetailLevel = 'standard' | 'advanced';
```

Delete:

```ts
export type CrownType = 'flat' | 'spire' | 'stepped' | 'pointed' | 'sloped';
```

Replace:

```ts
  crown: CrownType;
```
with:

```ts
  crown: CrownId;
```

Replace:

```ts
export interface Analysis {
  heightM: number;
```
with:

```ts
export interface Analysis {
  /** Official height: roof plus crown, but not antennas. */
  heightM: number;
  /** To the very tip, antennas included. */
  tipHeightM: number;
```

- [ ] **Step 7: Edit `src/sim/geometry.ts`**

Replace:

```ts
import type { CrownType, Design, PlanShape, Setbacks } from './types';
```
with:

```ts
import { CROWNS } from './catalog/crowns';
import type { CrownId, Design, PlanShape, Setbacks } from './types';
```

Replace:

```ts
export function crownHeight(crown: CrownType, bodyHeight: number): number {
  switch (crown) {
    case 'spire':
      return 0.15 * bodyHeight;
    case 'pointed':
      return 0.08 * bodyHeight;
    case 'stepped':
      return 3 * FLOOR_HEIGHT;
    case 'sloped':
      return 0.05 * bodyHeight;
    default:
      return 2;
  }
}
```
with:

```ts
export function crownHeight(crown: CrownId, bodyHeight: number): number {
  const rule = CROWNS[crown].height;
  switch (rule.kind) {
    case 'metres':
      return rule.value;
    case 'floors':
      return rule.value * FLOOR_HEIGHT;
    case 'fraction':
      return rule.value * bodyHeight;
  }
}
```

- [ ] **Step 8: Edit `src/sim/analysis/massing.ts`**

Replace:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
```
with:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import { CROWNS } from '../catalog/crowns';
```

Replace:

```ts
  bodyHeight: number;
  heightM: number;
```
with:

```ts
  bodyHeight: number;
  /** Official height (antennas excluded). */
  heightM: number;
  /** To the very tip, antennas included. */
  tipHeightM: number;
```

Replace:

```ts
  const heightM = bodyHeight + crownHeight(design.crown, bodyHeight);
```
with:

```ts
  const tipHeightM = bodyHeight + crownHeight(design.crown, bodyHeight);
  const heightM = CROWNS[design.crown].officialHeight ? tipHeightM : bodyHeight;
```

Replace:

```ts
    bodyHeight,
    heightM,
```
with:

```ts
    bodyHeight,
    heightM,
    tipHeightM,
```

- [ ] **Step 9: Edit `src/sim/analysis/index.ts`**

Replace:

```ts
    heightM: m.heightM,
```
with:

```ts
    heightM: m.heightM,
    tipHeightM: m.tipHeightM,
```

- [ ] **Step 10: Edit `src/sim/analysis/energy.ts`**

Replace:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
```
with:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import { CROWNS } from '../catalog/crowns';
```

Replace:

```ts
    C.gradeFactor[design.systemsGrade];
```
with:

```ts
    C.gradeFactor[design.systemsGrade] *
    (CROWNS[design.crown].generatesPower ? C.windTurbineFactor : 1);
```

- [ ] **Step 11: Edit `src/sim/catalog/coefficients.ts`**

Replace:

```ts
    dollarsPerKWh: 0.15,
```
with:

```ts
    dollarsPerKWh: 0.15,
    /** Rooftop wind turbines cover about 5% of a tower's electricity (Strata SE1 manages ~8%). */
    windTurbineFactor: 0.95,
```

- [ ] **Step 12: Edit `src/sim/scoring.ts`**

Replace:

```ts
import { COEFFICIENTS } from './catalog/coefficients';
```
with:

```ts
import { COEFFICIENTS } from './catalog/coefficients';
import { CROWNS } from './catalog/crowns';
```

Replace:

```ts
    design.crown === 'spire' ||
    design.crown === 'pointed' ||
```
with:

```ts
    CROWNS[design.crown].landmark ||
```

Replace:

```ts
detail: 'Try a twist, taper, spire, pointed crown, wedding-cake setbacks, or exposed structure.',
```
with:

```ts
detail: 'Try a twist, taper, a showpiece crown, wedding-cake setbacks, or exposed structure.',
```

- [ ] **Step 13: Edit `src/sim/catalog/parameters.ts`**

Replace:

```ts
import { maxPlateDepth, maxPlateWidth } from '../design';
```
with:

```ts
import { maxPlateDepth, maxPlateWidth } from '../design';
import { CROWNS } from './crowns';
import { CROWN_IDS } from './ids';
```

Replace:

```ts
export interface EnumParam extends ParamBase {
  kind: 'enum';
  options: EnumOption[];
}
```
with:

```ts
export interface EnumParam extends ParamBase {
  kind: 'enum';
  options: EnumOption[];
  /** Draw as a picture gallery instead of a dropdown. */
  widget?: 'gallery';
}
```

Replace:

```ts
  {
    id: 'crown', group: 'form', kind: 'enum', label: 'Crown', minDetailLevel: 'standard',
    explain: 'The top of the tower. Mostly about looks — but it adds height.',
    options: [
      { value: 'flat', label: 'Flat roof', explain: 'Simple; good for a helipad or pool.' },
      { value: 'spire', label: 'Spire', explain: 'A tall needle on top — adds a lot of height.' },
      { value: 'pointed', label: 'Pointed', explain: 'A pyramid-like cap.' },
      { value: 'stepped', label: 'Stepped', explain: 'Small boxes stacked like a ziggurat.' },
      { value: 'sloped', label: 'Sloped', explain: 'A slanted top, like a ramp to the sky.' },
    ],
  },
```
with:

```ts
  {
    id: 'crown', group: 'form', kind: 'enum', label: 'Crown', minDetailLevel: 'standard', widget: 'gallery',
    explain: 'The top of the tower. Mostly about looks — but it adds height, and each style has a favourite.',
    options: CROWN_IDS.map((id) => ({ value: id, label: CROWNS[id].label, explain: `Seen on ${CROWNS[id].seenOn}. ${CROWNS[id].blurb}` })),
  },
```

- [ ] **Step 14: Edit `src/ui/sidebar/Gauges.tsx`**

Replace:

```tsx
{Math.round(analysis.heightM)} m tall ·
```
with:

```tsx
{Math.round(analysis.heightM)} m tall
        {analysis.tipHeightM > analysis.heightM + 0.5 ? ` (+${Math.round(analysis.tipHeightM - analysis.heightM)} m antennas)` : ''} ·
```

- [ ] **Step 15: Edit `src/scene/Scene.tsx`**

Replace:

```tsx
cameraFrame(site, analysis.heightM)
```
with:

```tsx
cameraFrame(site, analysis.tipHeightM)
```

- [ ] **Step 16: Edit `src/scene/Building.test.tsx`**

Replace:

```tsx
import type { CrownType, PlanShape } from '../sim/types';
```
with:

```tsx
import type { CrownId, PlanShape } from '../sim/types';
```

Replace:

```tsx
const crowns: CrownType[]
```
with:

```tsx
const crowns: CrownId[]
```

- [ ] **Step 17: Run the tests and type-check**

Run: `npx vitest run src/sim/parts.test.ts src/sim/catalog/crowns.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  18 passed (18)`, `Tests  123 passed (123)`.

- [ ] **Step 18: Commit**

```bash
git add src/sim/catalog/ids.ts src/sim/parts.ts src/sim/parts.test.ts src/sim/catalog/crowns.ts src/sim/catalog/crowns.test.ts src/sim/types.ts src/sim/geometry.ts src/sim/analysis/massing.ts src/sim/analysis/index.ts src/sim/analysis/energy.ts src/sim/catalog/coefficients.ts src/sim/scoring.ts src/sim/catalog/parameters.ts src/ui/sidebar/Gauges.tsx src/scene/Scene.tsx src/scene/Building.test.tsx
git commit -m "feat: 28-crown catalog with official height, landmark and turbine effects

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 2: Facade catalog: windows, spandrels, ornaments and style defaults

Add the facade catalog (6 window patterns, 3 spandrels, 14 ornaments), three new `Design` fields (`windowPattern`, `spandrel`, `ornaments`), each style's defaults for them (spec §3.2), normalization of unknown ids, `activeOrnaments`/`facadeRecipe`, the small cost and weight effects, `add_ornament`/`remove_ornament` actions, and the Details parameter group.

**Files:**
- Create: `src/sim/catalog/facades.ts`
- Create: `src/sim/facade.ts`
- Create: `src/sim/catalog/facades.test.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/catalog/styles.ts`
- Modify: `src/sim/design.ts`
- Modify: `src/sim/catalog/coefficients.ts`
- Modify: `src/sim/analysis/massing.ts`
- Modify: `src/sim/analysis/cost.ts`
- Modify: `src/sim/actions.ts`
- Modify: `src/sim/catalog/parameters.ts`

**Interfaces:**
- Consumes: Task 1: `CrownId`, `OrnamentId`, `SpandrelId`, `WindowPatternId`, `Part`, `partIsFinite`, `CROWNS`.
- Produces:
  - `src/sim/catalog/facades.ts`: `PaneDef`, `WindowPatternDef`, `WINDOW_PATTERNS`, `SpandrelDef`, `SPANDRELS`, `OrnamentGroup`, `ORNAMENT_GROUPS`, `PlacementRule`, `AmountRule`, `OrnamentDef`, `ORNAMENTS`.
  - `src/sim/facade.ts`: `activeOrnaments(design): OrnamentDef[]`, `amountLevel(design): 'low' | 'high'`, `FacadeColors`, `FacadeRecipe`, `facadeRecipe(design): FacadeRecipe`.
  - `Design.windowPattern`, `Design.spandrel`, `Design.ornaments: OrnamentId[]`; `StyleSettings` includes them.
  - `DesignAction` gains `{ type: 'add_ornament' | 'remove_ornament'; id: OrnamentId }`.
  - `ParamGroupId` gains `'details'`; params `windowPattern`, `spandrel` (both `widget: 'gallery'`) and `ornament` (amount).
  - Coefficients: `weight.stoneOrnamentKNPerM2`, `weight.ornamentAmountWeight`, `cost.perOrnamentFactor`.

- [ ] **Step 1: Write the failing tests**

`src/sim/catalog/facades.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyActions } from '../actions';
import { analyze } from '../analysis';
import { applyStylePreset, defaultDesign, isStyleModified, normalizeDesign } from '../design';
import { activeOrnaments } from '../facade';
import { partIsFinite } from '../parts';
import { SITES } from '../sites';
import { designFor } from '../testUtils';
import type { Design } from '../types';
import { ORNAMENT_GROUPS, ORNAMENTS, SPANDRELS, WINDOW_PATTERNS } from './facades';
import { ORNAMENT_IDS, SPANDREL_IDS, WINDOW_PATTERN_IDS } from './ids';
import { PARAMS_BY_ID, type EnumParam } from './parameters';
import { STYLE_PRESETS } from './styles';

describe('facade catalog', () => {
  it('every window pattern, spandrel and ornament has a label, a real example and a blurb', () => {
    const entries = [
      ...WINDOW_PATTERN_IDS.map((id) => WINDOW_PATTERNS[id]),
      ...SPANDREL_IDS.map((id) => SPANDRELS[id]),
      ...ORNAMENT_IDS.map((id) => ORNAMENTS[id]),
    ];
    for (const e of entries) {
      expect(e.label.length, e.id).toBeGreaterThan(2);
      expect(e.seenOn.length, e.id).toBeGreaterThan(3);
      expect(e.blurb.length, e.id).toBeGreaterThan(10);
    }
  });

  it('window panes sit inside the opening, in order', () => {
    for (const id of WINDOW_PATTERN_IDS) {
      const p = WINDOW_PATTERNS[id];
      expect(p.bayWidth, id).toBeGreaterThanOrEqual(3);
      expect(p.bayWidth, id).toBeLessThanOrEqual(4.5);
      let last = 0;
      for (const pane of p.panes) {
        expect(pane.x0, id).toBeGreaterThanOrEqual(last);
        expect(pane.x1, id).toBeGreaterThan(pane.x0);
        expect(pane.x1, id).toBeLessThanOrEqual(1);
        last = pane.x1;
      }
    }
  });

  it('every ornament has a valid group, finite template parts and grows from Low to High', () => {
    const groups = ORNAMENT_GROUPS.map((g) => g.id);
    for (const id of ORNAMENT_IDS) {
      const o = ORNAMENTS[id];
      expect(groups, id).toContain(o.group);
      expect(o.template.length, id).toBeGreaterThan(0);
      expect(o.template.every(partIsFinite), id).toBe(true);
      expect(o.amount.high.size, id).toBeGreaterThanOrEqual(o.amount.low.size * 0.8);
    }
  });

  it('offers windows and spandrels as galleries and the amount in the Details group', () => {
    expect((PARAMS_BY_ID.windowPattern as EnumParam).options.map((o) => o.value)).toEqual([...WINDOW_PATTERN_IDS]);
    expect((PARAMS_BY_ID.spandrel as EnumParam).options.map((o) => o.value)).toEqual([...SPANDREL_IDS]);
    expect((PARAMS_BY_ID.windowPattern as EnumParam).widget).toBe('gallery');
    expect(PARAMS_BY_ID.ornament.group).toBe('details');
  });
});

describe('style look defaults', () => {
  const expected: Record<string, Pick<Design, 'crown' | 'windowPattern' | 'spandrel' | 'ornaments' | 'ornament'>> = {
    'chicago-school': { crown: 'cornice', windowPattern: 'chicago', spandrel: 'plain', ornaments: ['belt-courses', 'setback-cornices', 'rusticated-base'], ornament: 'low' },
    'gothic-revival': { crown: 'gothic-pinnacles', windowPattern: 'arched', spandrel: 'plain', ornaments: ['stone-ribs', 'pinnacles', 'gargoyles', 'arched-entry'], ornament: 'high' },
    'art-deco': { crown: 'deco-arches', windowPattern: 'flush-grid', spandrel: 'chevron', ornaments: ['stone-ribs', 'sunburst-bands', 'deco-steps', 'gargoyles'], ornament: 'high' },
    international: { crown: 'flat', windowPattern: 'flush-grid', spandrel: 'plain', ornaments: ['ibeam-mullions'], ornament: 'none' },
    brutalist: { crown: 'concrete-cap', windowPattern: 'punched', spandrel: 'plain', ornaments: ['concrete-fins'], ornament: 'none' },
    postmodern: { crown: 'split-pediment', windowPattern: 'punched', spandrel: 'stripes', ornaments: ['belt-courses', 'arched-entry', 'urns'], ornament: 'low' },
    'high-tech': { crown: 'lattice-mast', windowPattern: 'exposed-frame', spandrel: 'plain', ornaments: ['accent-ties'], ornament: 'none' },
    'neo-futurist': { crown: 'open-frame', windowPattern: 'diamond', spandrel: 'plain', ornaments: ['ribbon-bands'], ornament: 'none' },
  };

  it.each(Object.entries(expected))('%s sets its crown, windows, spandrels and ornaments', (style, look) => {
    const s = STYLE_PRESETS[style as keyof typeof STYLE_PRESETS].settings;
    expect({ crown: s.crown, windowPattern: s.windowPattern, spandrel: s.spandrel, ornaments: s.ornaments, ornament: s.ornament }).toEqual(look);
  });

  it('counts a changed ornament list as modifying the style', () => {
    const d = applyStylePreset(defaultDesign(SITES.chicago), 'art-deco');
    expect(isStyleModified({ ...d, ornaments: [...d.ornaments, 'urns'] })).toBe(true);
    expect(isStyleModified({ ...d, windowPattern: 'punched' })).toBe(true);
  });
});

describe('normalizing look ids', () => {
  const site = SITES.chicago;
  const deco = applyStylePreset(defaultDesign(site), 'art-deco');

  it('falls back to the style\'s choice for ids that do not exist', () => {
    const broken = { ...deco, crown: 'toString', windowPattern: 'nope', spandrel: 'gone', ornaments: ['urns', 'urns', 'laser-eyes'] } as unknown as Design;
    const fixed = normalizeDesign(broken, site);
    expect(fixed.crown).toBe('deco-arches');
    expect(fixed.windowPattern).toBe('flush-grid');
    expect(fixed.spandrel).toBe('chevron');
    expect(fixed.ornaments).toEqual(['urns']);
  });

  it('returns the same object when every id is known', () => {
    expect(normalizeDesign(deco, site)).toBe(deco);
  });
});

describe('ornament amount and effects', () => {
  it('amount None keeps working parts and drops decoration', () => {
    const { design } = designFor('chicago', { ornaments: ['stone-ribs', 'gargoyles', 'concrete-fins', 'urns'], ornament: 'none' });
    expect(activeOrnaments(design).map((o) => o.id)).toEqual(['stone-ribs', 'concrete-fins']);
    expect(activeOrnaments({ ...design, ornament: 'low' })).toHaveLength(4);
  });

  it('stone ornaments make the tower heavier and earthquakes harder', () => {
    const plain = designFor('tokyo', { floors: 40, ornaments: [], ornament: 'high' });
    const carved = designFor('tokyo', { floors: 40, ornaments: ['stone-ribs', 'gargoyles', 'pinnacles', 'urns'], ornament: 'high' });
    const a = analyze(plain.site, plain.design);
    const b = analyze(carved.site, carved.design);
    expect(b.weightKN).toBeGreaterThan(a.weightKN);
    expect(b.weightKN / a.weightKN).toBeLessThan(1.06);
    expect(b.seismic.ratio).toBeGreaterThan(a.seismic.ratio);
  });

  it('each ornament type adds a little facade cost', () => {
    const none = designFor('chicago', { ornaments: [], ornament: 'low' });
    const two = designFor('chicago', { ornaments: ['sunburst-bands', 'ribbon-bands'], ornament: 'low' });
    const ratio = analyze(two.site, two.design).cost.facade / analyze(none.site, none.design).cost.facade;
    expect(ratio).toBeCloseTo(1.04, 5);
  });

  it('adds and removes ornaments as undoable actions, and refuses unknown ones', () => {
    const { site, design } = designFor('chicago', { ornaments: [] });
    const added = applyActions(design, [{ type: 'add_ornament', id: 'urns' }], site, 'design');
    expect(added.design.ornaments).toEqual(['urns']);
    const removed = applyActions(added.design, [{ type: 'remove_ornament', id: 'urns' }], site, 'design');
    expect(removed.design.ornaments).toEqual([]);
    const bad = applyActions(design, [{ type: 'add_ornament', id: 'laser-eyes' as never }], site, 'design');
    expect(bad.rejected).toHaveLength(1);
    const locked = applyActions(design, [{ type: 'add_ornament', id: 'urns' }], site, 'complete');
    expect(locked.applied).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/sim/catalog/facades.test.ts`

Expected: FAIL — `Failed to resolve import "./facades"`.

- [ ] **Step 3: Create `src/sim/catalog/facades.ts`**

```ts
import type { Part } from '../parts';
import type { DetailLevel } from '../types';
import type { OrnamentId, SpandrelId, WindowPatternId } from './ids';

const S = 'standard' as const;

/* ---------- Window patterns (painted) ---------- */

/** One glass pane, as fractions of the window opening's width. */
export interface PaneDef {
  x0: number;
  x1: number;
}

export interface WindowPatternDef {
  id: WindowPatternId;
  label: string;
  seenOn: string;
  blurb: string;
  /** Width of one repeating bay, metres. */
  bayWidth: number;
  panes: readonly PaneDef[];
  /** Frame / mullion thickness as a fraction of the bay width. */
  frame: number;
  /** Pointed arch on top of each pane. */
  arch?: boolean;
  /** Diagonal glazing bars. */
  diagonals?: boolean;
  /** The wall between windows is glass too (curtain wall). */
  glassWall?: boolean;
  minDetailLevel: DetailLevel;
}

export const WINDOW_PATTERNS: Record<WindowPatternId, WindowPatternDef> = {
  'flush-grid': {
    id: 'flush-grid', label: 'Flush glass grid', seenOn: 'Seagram Building, New York',
    blurb: 'One big pane per bay with thin dark mullions — a smooth glass skin.',
    bayWidth: 3, panes: [{ x0: 0, x1: 1 }], frame: 0.03, glassWall: true, minDetailLevel: S,
  },
  chicago: {
    id: 'chicago', label: 'Chicago windows', seenOn: 'Reliance Building, Chicago',
    blurb: 'A wide fixed pane between two narrow windows that open — invented for steel-frame towers.',
    bayWidth: 4.5, panes: [{ x0: 0, x1: 0.2 }, { x0: 0.24, x1: 0.76 }, { x0: 0.8, x1: 1 }], frame: 0.04, minDetailLevel: S,
  },
  arched: {
    id: 'arched', label: 'Tall arched windows', seenOn: 'Woolworth Building, New York',
    blurb: 'Narrow windows with pointed tops, like a cathedral.',
    bayWidth: 3, panes: [{ x0: 0.15, x1: 0.85 }], frame: 0.05, arch: true, minDetailLevel: S,
  },
  punched: {
    id: 'punched', label: 'Punched windows', seenOn: 'Barbican towers, London',
    blurb: 'Small holes in a solid wall — strong, private and good at keeping heat in.',
    bayWidth: 3.5, panes: [{ x0: 0.1, x1: 0.9 }], frame: 0.04, minDetailLevel: S,
  },
  'exposed-frame': {
    id: 'exposed-frame', label: 'Exposed frame', seenOn: 'HSBC Building, Hong Kong',
    blurb: 'Each pane sits inside a chunky frame that shows how the wall is put together.',
    bayWidth: 4, panes: [{ x0: 0, x1: 1 }], frame: 0.1, minDetailLevel: S,
  },
  diamond: {
    id: 'diamond', label: 'Diamond facets', seenOn: 'Hearst Tower, New York',
    blurb: 'Glass split by diagonal bars into triangles and diamonds.',
    bayWidth: 4, panes: [{ x0: 0, x1: 1 }], frame: 0.03, diagonals: true, glassWall: true, minDetailLevel: S,
  },
};

/* ---------- Spandrels (painted) ---------- */

export interface SpandrelDef {
  id: SpandrelId;
  label: string;
  seenOn: string;
  blurb: string;
  motif: 'none' | 'chevron' | 'stripes';
  minDetailLevel: DetailLevel;
}

export const SPANDRELS: Record<SpandrelId, SpandrelDef> = {
  plain: {
    id: 'plain', label: 'Plain', seenOn: 'Most towers',
    blurb: 'A simple band between one floor\'s windows and the next.', motif: 'none', minDetailLevel: S,
  },
  chevron: {
    id: 'chevron', label: 'Deco chevrons', seenOn: 'Chrysler Building, New York',
    blurb: 'Zig-zag metal panels between the windows — a 1930s signature.', motif: 'chevron', minDetailLevel: S,
  },
  stripes: {
    id: 'stripes', label: 'Colour stripes', seenOn: 'Portland Building, Portland',
    blurb: 'Bold two-colour bands — Postmodern architects loved a bit of fun.', motif: 'stripes', minDetailLevel: S,
  },
};

/* ---------- Ornaments (3D relief) ---------- */

export type OrnamentGroup = 'vertical' | 'horizontal' | 'corners' | 'base' | 'structure';

export const ORNAMENT_GROUPS: { id: OrnamentGroup; label: string }[] = [
  { id: 'vertical', label: 'Vertical' },
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'corners', label: 'Corners & setbacks' },
  { id: 'base', label: 'Base' },
  { id: 'structure', label: 'Structure' },
];

/**
 * Where an ornament goes (each rule is shared by many ornaments):
 * - bay-lines: on the wall at every bay, either full height between setbacks or once per floor
 * - floor-rings: a band around the whole floor every few floors
 * - setback-corners: at the corners where the tower steps in, and at the roof
 * - setback-faces: centred on each face just above each step
 * - roof-edge: spaced along the roof and setback edges
 * - base-floors: wrapped around the lowest floors
 * - entry: the middle of the front face at ground level
 */
export type PlacementRule =
  | 'bay-lines'
  | 'floor-rings'
  | 'setback-corners'
  | 'setback-faces'
  | 'roof-edge'
  | 'base-floors'
  | 'entry';

/** How much of an ornament to place at an amount setting. */
export interface AmountRule {
  /** Size multiplier for the template. */
  size: number;
  /** bay-lines: every Nth bay. floor-rings: every Nth floor. */
  every?: number;
  /** setback-faces / roof-edge / entry: copies per face. */
  count?: number;
  /** setback-corners / setback-faces: only the top step, or every step. */
  levels?: 'top' | 'all';
  /** setback-corners: also put copies in the middle of each face. */
  midFaces?: boolean;
  /** base-floors: how many floors. */
  floors?: number;
}

export interface OrnamentDef {
  id: OrnamentId;
  label: string;
  group: OrnamentGroup;
  seenOn: string;
  blurb: string;
  placement: PlacementRule;
  /**
   * Geometry at one anchor, in metres, in a local frame where +x runs along the wall, +y is up and
   * +z points out of the wall. For bay-lines, a y-scale of 1 means "stretch to the run of floors".
   * A part with shape 'plan' is a band around the whole floor instead: its y-scale is the band's
   * thickness and its z-scale how far it sticks out.
   */
  template: readonly Part[];
  amount: { low: AmountRule; high: AmountRule };
  /** Pure decoration — removed when Ornament amount is None. */
  decorative: boolean;
  /** Carved stone or terracotta — adds weight. */
  stone: boolean;
  minDetailLevel: DetailLevel;
}

export const ORNAMENTS: Record<OrnamentId, OrnamentDef> = {
  'stone-ribs': {
    id: 'stone-ribs', label: 'Stone ribs', group: 'vertical', seenOn: 'Woolworth Building, New York',
    blurb: 'Tall stone piers between the windows make the tower look even taller.',
    placement: 'bay-lines',
    template: [{ shape: 'box', position: [0, 0, 0.3], scale: [0.5, 1, 0.6], material: 'stone' }],
    amount: { low: { size: 1, every: 2 }, high: { size: 1.4, every: 1 } },
    decorative: false, stone: true, minDetailLevel: S,
  },
  'ibeam-mullions': {
    id: 'ibeam-mullions', label: 'I-beam mullions', group: 'vertical', seenOn: 'Seagram Building, New York',
    blurb: 'Slim bronze I-beams on the glass. Fun fact: Mies added them to show the steel hidden inside!',
    placement: 'bay-lines',
    template: [
      { shape: 'box', position: [0, 0, 0.15], scale: [0.08, 1, 0.3], material: 'accent' },
      { shape: 'box', position: [0, 0, 0.3], scale: [0.25, 1, 0.05], material: 'accent' },
    ],
    amount: { low: { size: 1, every: 2 }, high: { size: 1, every: 1 } },
    decorative: false, stone: false, minDetailLevel: S,
  },
  'concrete-fins': {
    id: 'concrete-fins', label: 'Concrete fins', group: 'vertical', seenOn: 'Barbican towers, London',
    blurb: 'Deep concrete fins shade the windows from the sun and give the wall a bold, ribbed look.',
    placement: 'bay-lines',
    template: [{ shape: 'box', position: [0, 0, 0.6], scale: [0.6, 1, 1.2], material: 'concrete' }],
    amount: { low: { size: 1, every: 1 }, high: { size: 1.5, every: 1 } },
    decorative: false, stone: false, minDetailLevel: S,
  },
  'belt-courses': {
    id: 'belt-courses', label: 'Belt courses', group: 'horizontal', seenOn: 'Flatiron Building, New York',
    blurb: 'Stone bands that wrap the tower every few floors, like belts.',
    placement: 'floor-rings',
    template: [{ shape: 'plan', position: [0, 0, 0], scale: [1, 0.6, 0.35], material: 'stone' }],
    amount: { low: { size: 1, every: 10 }, high: { size: 1.3, every: 5 } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'setback-cornices': {
    id: 'setback-cornices', label: 'Setback cornices', group: 'horizontal', seenOn: 'Empire State Building, New York',
    blurb: 'A projecting stone ledge at every step and at the roof.',
    placement: 'setback-faces',
    template: [
      { shape: 'plan', position: [0, 0, 0], scale: [1, 0.8, 0.8], material: 'stone' },
      { shape: 'plan', position: [0, 0.7, 0], scale: [1, 0.3, 1.1], material: 'stone' },
    ],
    amount: { low: { size: 1, count: 1, levels: 'all' }, high: { size: 1.4, count: 2, levels: 'all' } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'sunburst-bands': {
    id: 'sunburst-bands', label: 'Sunburst bands', group: 'horizontal', seenOn: 'Chrysler Building, New York',
    blurb: 'Fans of rays, like a rising sun — an Art Deco favourite.',
    placement: 'setback-faces',
    template: [
      { shape: 'wedge', position: [-1.2, 1, 0.2], scale: [0.5, 2, 0.4], rotation: [0, 0, 0.6], material: 'accent' },
      { shape: 'wedge', position: [0, 1.2, 0.2], scale: [0.5, 2.4, 0.4], material: 'accent' },
      { shape: 'wedge', position: [1.2, 1, 0.2], scale: [0.5, 2, 0.4], rotation: [0, 0, -0.6], material: 'accent' },
    ],
    amount: { low: { size: 1, count: 1, levels: 'all' }, high: { size: 1.3, count: 3, levels: 'all' } },
    decorative: true, stone: false, minDetailLevel: S,
  },
  'ribbon-bands': {
    id: 'ribbon-bands', label: 'Ribbon bands', group: 'horizontal', seenOn: 'Shanghai Tower',
    blurb: 'Thin sunshades at every floor that follow the tower\'s curve and twist.',
    placement: 'floor-rings',
    template: [{ shape: 'plan', position: [0, 0, 0], scale: [1, 0.25, 0.6], material: 'accent' }],
    amount: { low: { size: 1, every: 1 }, high: { size: 1.6, every: 1 } },
    decorative: false, stone: false, minDetailLevel: S,
  },
  pinnacles: {
    id: 'pinnacles', label: 'Pinnacles', group: 'corners', seenOn: 'Woolworth Building, New York',
    blurb: 'Pointed stone spikes on the corners, straight from Gothic cathedrals.',
    placement: 'setback-corners',
    template: [
      { shape: 'box', position: [0, 1, 0], scale: [1.2, 2, 1.2], material: 'stone' },
      { shape: 'pyramid', position: [0, 3.5, 0], scale: [1.2, 3, 1.2], material: 'stone' },
    ],
    amount: { low: { size: 1, levels: 'all' }, high: { size: 1.4, levels: 'all', midFaces: true } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'deco-steps': {
    id: 'deco-steps', label: 'Deco step ornaments', group: 'corners', seenOn: 'Empire State Building, New York',
    blurb: 'Little stacked blocks at the corners that echo the tower\'s own setbacks.',
    placement: 'setback-corners',
    template: [
      { shape: 'box', position: [0, 0.6, 0], scale: [2, 1.2, 2], material: 'stone' },
      { shape: 'box', position: [0, 1.6, 0], scale: [1.4, 0.8, 1.4], material: 'stone' },
      { shape: 'box', position: [0, 2.3, 0], scale: [0.8, 0.6, 0.8], material: 'accent' },
    ],
    amount: { low: { size: 0.8, levels: 'top' }, high: { size: 1.2, levels: 'all' } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  gargoyles: {
    id: 'gargoyles', label: 'Gargoyles', group: 'corners', seenOn: 'Chrysler Building, New York',
    blurb: 'Steel eagle heads stare out from the corners — Chrysler\'s are copies of its car hood ornaments.',
    placement: 'setback-corners',
    template: [
      { shape: 'box', position: [0, 0, 1], scale: [0.8, 0.8, 2], material: 'steel' },
      { shape: 'wedge', position: [-0.8, 0.2, 0.8], scale: [1, 0.4, 1.4], rotation: [0, 0, 0.3], material: 'steel' },
      { shape: 'wedge', position: [0.8, 0.2, 0.8], scale: [1, 0.4, 1.4], rotation: [0, Math.PI, 0.3], material: 'steel' },
      { shape: 'cone', position: [0, 0, 2.3], scale: [0.4, 0.8, 0.4], rotation: [Math.PI / 2, 0, 0], material: 'gold' },
    ],
    amount: { low: { size: 1, levels: 'top' }, high: { size: 1.3, levels: 'all' } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  urns: {
    id: 'urns', label: 'Urns and finials', group: 'corners', seenOn: 'Woolworth Building, New York',
    blurb: 'Carved vases and balls lined up along the roof edge.',
    placement: 'roof-edge',
    template: [
      { shape: 'cylinder', position: [0, 0.3, 0], scale: [0.6, 0.6, 0.6], material: 'stone' },
      { shape: 'sphere', position: [0, 1, 0], scale: [0.9, 0.9, 0.9], material: 'stone' },
    ],
    amount: { low: { size: 1, count: 3, levels: 'top' }, high: { size: 1.2, count: 6, levels: 'all' } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'rusticated-base': {
    id: 'rusticated-base', label: 'Rusticated stone base', group: 'base', seenOn: 'Chicago Board of Trade',
    blurb: 'Big rough stone blocks with deep gaps make the base look strong enough to carry everything above.',
    placement: 'base-floors',
    template: [{ shape: 'plan', position: [0, 0, 0], scale: [1, 0.8, 0.3], material: 'stone' }],
    amount: { low: { size: 1, floors: 2 }, high: { size: 1.3, floors: 3 } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'arched-entry': {
    id: 'arched-entry', label: 'Arched entry', group: 'base', seenOn: 'Woolworth Building, New York',
    blurb: 'A grand arched doorway welcomes people in.',
    placement: 'entry',
    template: [
      { shape: 'box', position: [-2.4, 2.5, 0.5], scale: [0.8, 5, 1], material: 'stone' },
      { shape: 'box', position: [2.4, 2.5, 0.5], scale: [0.8, 5, 1], material: 'stone' },
      { shape: 'torus', position: [0, 5, 0.5], scale: [5.6, 1, 5.6], rotation: [Math.PI / 2, 0, 0], material: 'stone' },
    ],
    amount: { low: { size: 1, count: 1 }, high: { size: 1.1, count: 3 } },
    decorative: true, stone: true, minDetailLevel: S,
  },
  'accent-ties': {
    id: 'accent-ties', label: 'Accent ties', group: 'structure', seenOn: 'Centre Pompidou, Paris',
    blurb: 'Brightly painted straps that show where the structure ties the tower together.',
    placement: 'floor-rings',
    template: [{ shape: 'plan', position: [0, 0, 0], scale: [1, 0.5, 0.8], material: 'accent' }],
    amount: { low: { size: 1, every: 10 }, high: { size: 1.5, every: 10 } },
    decorative: false, stone: false, minDetailLevel: S,
  },
};
```

- [ ] **Step 4: Create `src/sim/facade.ts`**

```ts
import { ORNAMENTS, SPANDRELS, WINDOW_PATTERNS, type OrnamentDef, type SpandrelDef, type WindowPatternDef } from './catalog/facades';
import type { Design, FacadeType } from './types';

/** The chosen ornaments that actually get built: amount None drops the purely decorative ones. */
export function activeOrnaments(design: Design): OrnamentDef[] {
  return design.ornaments.map((id) => ORNAMENTS[id]).filter((o) => design.ornament !== 'none' || !o.decorative);
}

/** None keeps working parts at the Low size. */
export function amountLevel(design: Design): 'low' | 'high' {
  return design.ornament === 'high' ? 'high' : 'low';
}

export interface FacadeColors {
  wall: string;
  glass: string;
  frame: string;
  spandrel: string;
  accent: string;
}

export interface FacadeRecipe {
  pattern: WindowPatternDef;
  spandrel: SpandrelDef;
  windowRatio: number;
  colors: FacadeColors;
  /** Surface finish of the wall material. */
  roughness: number;
  metalness: number;
}

const FINISH: Record<FacadeType, { roughness: number; metalness: number }> = {
  glass: { roughness: 0.15, metalness: 0.5 },
  metal: { roughness: 0.35, metalness: 0.6 },
  precast: { roughness: 0.9, metalness: 0 },
  masonry: { roughness: 0.85, metalness: 0 },
};

/** Everything the painted facade tile needs, from style choices and settings. */
export function facadeRecipe(design: Design): FacadeRecipe {
  const pattern = WINDOW_PATTERNS[design.windowPattern];
  const { body, accent, glass } = design.palette;
  const wall = pattern.glassWall || design.facade === 'glass' ? glass : body;
  return {
    pattern,
    spandrel: SPANDRELS[design.spandrel],
    windowRatio: design.windowRatio,
    colors: { wall, glass, frame: accent, spandrel: wall, accent },
    ...FINISH[design.facade],
  };
}
```

- [ ] **Step 5: Edit `src/sim/types.ts`**

Replace:

```ts
import type { CrownId } from './catalog/ids';

export type { CrownId } from './catalog/ids';
```
with:

```ts
import type { CrownId, OrnamentId, SpandrelId, WindowPatternId } from './catalog/ids';

export type { CrownId, OrnamentId, SpandrelId, WindowPatternId } from './catalog/ids';
```

Replace:

```ts
  palette: Palette;
  ornament: Ornament;
}
```
with:

```ts
  palette: Palette;
  /** Ornament amount: how densely the chosen ornaments are placed. */
  ornament: Ornament;
  windowPattern: WindowPatternId;
  spandrel: SpandrelId;
  /** Chosen relief ornaments. */
  ornaments: OrnamentId[];
}
```

- [ ] **Step 6: Give each style preset its look defaults in `src/sim/catalog/styles.ts`**

Replace the `StyleSettings` type with:

```ts
export type StyleSettings = Pick<
  Design,
  | 'shape' | 'setbacks' | 'taper' | 'twist' | 'crown' | 'facade' | 'windowRatio' | 'exposedStructure' | 'palette'
  | 'ornament' | 'windowPattern' | 'spandrel' | 'ornaments'
>;
```

Then replace each preset's `settings` block. Crowns change for Chicago School, Gothic Revival, Art Deco, Brutalist, Postmodern, High-Tech and Neo-Futurist, and every preset gains the last line:

`chicago-school`:

```ts
    settings: {
      shape: 'square', setbacks: 'none', taper: 0, twist: 0, crown: 'cornice', facade: 'masonry', windowRatio: 0.5,
      exposedStructure: false, ornament: 'low', palette: { body: '#a0522d', accent: '#e8dcc8', glass: '#7fa7c0' },
      windowPattern: 'chicago', spandrel: 'plain', ornaments: ['belt-courses', 'setback-cornices', 'rusticated-base'],
    },
```

`gothic-revival`:

```ts
    settings: {
      shape: 'square', setbacks: 'few', taper: 0, twist: 0, crown: 'gothic-pinnacles', facade: 'masonry', windowRatio: 0.35,
      exposedStructure: false, ornament: 'high', palette: { body: '#e6e0d2', accent: '#b9a77d', glass: '#6f8ea3' },
      windowPattern: 'arched', spandrel: 'plain', ornaments: ['stone-ribs', 'pinnacles', 'gargoyles', 'arched-entry'],
    },
```

`art-deco`:

```ts
    settings: {
      shape: 'square', setbacks: 'wedding-cake', taper: 0, twist: 0, crown: 'deco-arches', facade: 'masonry', windowRatio: 0.4,
      exposedStructure: false, ornament: 'high', palette: { body: '#d8cbb0', accent: '#c9a227', glass: '#5f7f94' },
      windowPattern: 'flush-grid', spandrel: 'chevron', ornaments: ['stone-ribs', 'sunburst-bands', 'deco-steps', 'gargoyles'],
    },
```

`international`:

```ts
    settings: {
      shape: 'rectangle', setbacks: 'none', taper: 0, twist: 0, crown: 'flat', facade: 'glass', windowRatio: 0.9,
      exposedStructure: false, ornament: 'none', palette: { body: '#2f3a40', accent: '#1f2a30', glass: '#4d6f80' },
      windowPattern: 'flush-grid', spandrel: 'plain', ornaments: ['ibeam-mullions'],
    },
```

`brutalist`:

```ts
    settings: {
      shape: 'square', setbacks: 'few', taper: 0, twist: 0, crown: 'concrete-cap', facade: 'precast', windowRatio: 0.3,
      exposedStructure: false, ornament: 'none', palette: { body: '#9c9a94', accent: '#77756f', glass: '#4a5a63' },
      windowPattern: 'punched', spandrel: 'plain', ornaments: ['concrete-fins'],
    },
```

`postmodern`:

```ts
    settings: {
      shape: 'square', setbacks: 'few', taper: 0, twist: 0, crown: 'split-pediment', facade: 'masonry', windowRatio: 0.45,
      exposedStructure: false, ornament: 'low', palette: { body: '#c7a68a', accent: '#7a4b3a', glass: '#5c7484' },
      windowPattern: 'punched', spandrel: 'stripes', ornaments: ['belt-courses', 'arched-entry', 'urns'],
    },
```

`high-tech`:

```ts
    settings: {
      shape: 'square', setbacks: 'none', taper: 0, twist: 0, crown: 'lattice-mast', facade: 'metal', windowRatio: 0.7,
      exposedStructure: true, ornament: 'none', palette: { body: '#c0c6cc', accent: '#d33f2f', glass: '#6b8797' },
      windowPattern: 'exposed-frame', spandrel: 'plain', ornaments: ['accent-ties'],
    },
```

`neo-futurist`:

```ts
    settings: {
      shape: 'circle', setbacks: 'none', taper: 0.3, twist: 120, crown: 'open-frame', facade: 'glass', windowRatio: 0.85,
      exposedStructure: false, ornament: 'none', palette: { body: '#a9c6d6', accent: '#e0e6ea', glass: '#7fa9c2' },
      windowPattern: 'diamond', spandrel: 'plain', ornaments: ['ribbon-bands'],
    },
```

- [ ] **Step 7: Edit `src/sim/design.ts`**

Replace:

```ts
import { STYLE_PRESETS, type StyleSettings } from './catalog/styles';
```
with:

```ts
import { CROWNS } from './catalog/crowns';
import { ORNAMENTS, SPANDRELS, WINDOW_PATTERNS } from './catalog/facades';
import { STYLE_PRESETS, type StyleSettings } from './catalog/styles';
```

Replace:

```ts
/** Clamp anything that depends on the site (plate size) or is otherwise out of range. */
export function normalizeDesign(design: Design, site: Site): Design {
  const plateWidth = Math.min(design.plateWidth, maxPlateWidth(site, design));
  const plateDepth = Math.min(design.plateDepth, maxPlateDepth(site));
  if (plateWidth === design.plateWidth && plateDepth === design.plateDepth) return design;
  return { ...design, plateWidth, plateDepth };
}
```
with:

```ts
/**
 * Clamp anything that depends on the site (plate size) or is otherwise out of range, and replace
 * look ids that no longer exist (an old export, a renamed option) with the style's own choice.
 * Returns the same object when nothing changes.
 */
export function normalizeDesign(design: Design, site: Site): Design {
  const preset = STYLE_PRESETS[design.style].settings;
  const patch: Partial<Design> = {};
  const plateWidth = Math.min(design.plateWidth, maxPlateWidth(site, design));
  const plateDepth = Math.min(design.plateDepth, maxPlateDepth(site));
  if (plateWidth !== design.plateWidth) patch.plateWidth = plateWidth;
  if (plateDepth !== design.plateDepth) patch.plateDepth = plateDepth;
  if (!Object.hasOwn(CROWNS, design.crown)) patch.crown = preset.crown;
  if (!Object.hasOwn(WINDOW_PATTERNS, design.windowPattern)) patch.windowPattern = preset.windowPattern;
  if (!Object.hasOwn(SPANDRELS, design.spandrel)) patch.spandrel = preset.spandrel;
  const ornaments = [...new Set((design.ornaments ?? []).filter((o) => Object.hasOwn(ORNAMENTS, o)))];
  if (ornaments.length !== design.ornaments?.length) patch.ornaments = ornaments;
  return Object.keys(patch).length === 0 ? design : { ...design, ...patch };
}
```

Replace:

```ts
    ornament: 'none',
  };
```
with:

```ts
    ornament: 'none',
    windowPattern: 'flush-grid',
    spandrel: 'plain',
    ornaments: [],
  };
```

- [ ] **Step 8: Edit `src/sim/catalog/coefficients.ts`**

Replace:

```ts
    /** Amenities are concentrated weight near the top, kN.
```
with:

```ts
    /** Carved stone ornaments add weight per m² of floor, per ornament type, at amount High. */
    stoneOrnamentKNPerM2: 0.1,
    /** Share of that weight at each amount (None keeps only working parts, at the Low size). */
    ornamentAmountWeight: { none: 0.6, low: 0.6, high: 1 },
    /** Amenities are concentrated weight near the top, kN.
```

Replace:

```ts
    ornamentFactor: { none: 1, low: 1.05, high: 1.15 },
```
with:

```ts
    ornamentFactor: { none: 1, low: 1.05, high: 1.15 },
    /** Each ornament type built adds this share to facade cost. */
    perOrnamentFactor: 0.02,
```

- [ ] **Step 9: Edit `src/sim/analysis/massing.ts`**

Replace:

```ts
import { CROWNS } from '../catalog/crowns';
```
with:

```ts
import { CROWNS } from '../catalog/crowns';
import { activeOrnaments } from '../facade';
```

Replace:

```ts
    (design.exposedStructure ? W.exposedStructureKNPerM2 : 0);
```
with:

```ts
    (design.exposedStructure ? W.exposedStructureKNPerM2 : 0) +
    activeOrnaments(design).filter((o) => o.stone).length * W.stoneOrnamentKNPerM2 * W.ornamentAmountWeight[design.ornament];
```

- [ ] **Step 10: Edit `src/sim/analysis/cost.ts`**

Replace:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
```
with:

```ts
import { COEFFICIENTS } from '../catalog/coefficients';
import { activeOrnaments } from '../facade';
```

Replace:

```ts
  const facade = m.facadeArea * wallRate * C.ornamentFactor[design.ornament];
```
with:

```ts
  const facade =
    m.facadeArea *
    wallRate *
    C.ornamentFactor[design.ornament] *
    (1 + C.perOrnamentFactor * activeOrnaments(design).length);
```

- [ ] **Step 11: Edit `src/sim/actions.ts`**

Replace:

```ts
import { AMENITIES } from './catalog/amenities';
```
with:

```ts
import { AMENITIES } from './catalog/amenities';
import { ORNAMENTS } from './catalog/facades';
```

Replace:

```ts
import type { AmenityId, Design, Site, StyleId, UseType } from './types';
```
with:

```ts
import type { AmenityId, Design, OrnamentId, Site, StyleId, UseType } from './types';
```

Replace:

```ts
  | { type: 'remove_amenity'; id: AmenityId }
```
with:

```ts
  | { type: 'remove_amenity'; id: AmenityId }
  | { type: 'add_ornament'; id: OrnamentId }
  | { type: 'remove_ornament'; id: OrnamentId }
```

Replace:

```ts
      return AMENITIES[action.id] ? { ok: true } : { ok: false, reason: `There is no "${action.id}" amenity.` };
```
with:

```ts
      return AMENITIES[action.id] ? { ok: true } : { ok: false, reason: `There is no "${action.id}" amenity.` };
    case 'add_ornament':
    case 'remove_ornament':
      return ORNAMENTS[action.id] ? { ok: true } : { ok: false, reason: `There is no "${action.id}" ornament.` };
```

Replace:

```ts
    case 'remove_amenity':
      return { ...design, amenities: design.amenities.filter((a) => a !== action.id) };
```
with:

```ts
    case 'remove_amenity':
      return { ...design, amenities: design.amenities.filter((a) => a !== action.id) };
    case 'add_ornament':
      return design.ornaments.includes(action.id) ? design : { ...design, ornaments: [...design.ornaments, action.id] };
    case 'remove_ornament':
      return { ...design, ornaments: design.ornaments.filter((o) => o !== action.id) };
```

- [ ] **Step 12: Edit `src/sim/catalog/parameters.ts`**

Replace:

```ts
import { CROWNS } from './crowns';
import { CROWN_IDS } from './ids';
```
with:

```ts
import { CROWNS } from './crowns';
import { SPANDRELS, WINDOW_PATTERNS } from './facades';
import { CROWN_IDS, SPANDREL_IDS, WINDOW_PATTERN_IDS } from './ids';
```

Replace:

```ts
export type ParamGroupId = 'form' | 'structure' | 'foundation' | 'facade' | 'elevators' | 'systems';
```
with:

```ts
export type ParamGroupId = 'form' | 'details' | 'structure' | 'foundation' | 'facade' | 'elevators' | 'systems';
```

Replace:

```ts
  { id: 'form', label: 'Shape' },
```
with:

```ts
  { id: 'form', label: 'Shape' },
  { id: 'details', label: 'Details' },
```

Replace:

```ts
  | 'foundation' | 'facade' | 'windowRatio' | 'elevators' | 'zoning' | 'systemsGrade';
```
with:

```ts
  | 'foundation' | 'facade' | 'windowRatio' | 'elevators' | 'zoning' | 'systemsGrade'
  | 'windowPattern' | 'spandrel' | 'ornament';
```

Replace:

```ts
  {
    id: 'system', group: 'structure',
```
with:

```ts
  {
    id: 'windowPattern', group: 'details', kind: 'enum', label: 'Windows', minDetailLevel: 'standard', widget: 'gallery',
    explain: 'The shape and grouping of the windows. It changes the look — window area (in Facade) changes the energy.',
    options: WINDOW_PATTERN_IDS.map((id) => ({ value: id, label: WINDOW_PATTERNS[id].label, explain: `Seen on ${WINDOW_PATTERNS[id].seenOn}. ${WINDOW_PATTERNS[id].blurb}` })),
  },
  {
    id: 'spandrel', group: 'details', kind: 'enum', label: 'Spandrels', minDetailLevel: 'standard', widget: 'gallery',
    explain: 'The panels between one floor\'s windows and the next.',
    options: SPANDREL_IDS.map((id) => ({ value: id, label: SPANDRELS[id].label, explain: `Seen on ${SPANDRELS[id].seenOn}. ${SPANDRELS[id].blurb}` })),
  },
  {
    id: 'ornament', group: 'details', kind: 'enum', label: 'Ornament amount', minDetailLevel: 'standard',
    explain: 'How much decoration to build. More ornament costs more, and carved stone adds weight. None keeps working parts like mullions and fins.',
    options: [
      { value: 'none', label: 'None', explain: 'Only working parts — mullions, fins, ribs and ties.' },
      { value: 'low', label: 'Low', explain: 'A light touch.' },
      { value: 'high', label: 'High', explain: 'Lavish: bigger and more of everything you picked.' },
    ],
  },
  {
    id: 'system', group: 'structure',
```

- [ ] **Step 13: Run the tests and type-check**

Run: `npx vitest run src/sim/catalog/facades.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  19 passed (19)`, `Tests  142 passed (142)`.

- [ ] **Step 14: Commit**

```bash
git add src/sim/catalog/facades.ts src/sim/facade.ts src/sim/catalog/facades.test.ts src/sim/types.ts src/sim/catalog/styles.ts src/sim/design.ts src/sim/catalog/coefficients.ts src/sim/analysis/massing.ts src/sim/analysis/cost.ts src/sim/actions.ts src/sim/catalog/parameters.ts
git commit -m "feat: facade catalog, ornament choices and style look defaults

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 3: Placement helpers

Shared, pure helpers that find where things go on a floor plan, for any shape: corners, faces, evenly spaced perimeter points, setback levels, runs of floors between setbacks, and base floors. Crowns, ornaments and bracing all build on these.

**Files:**
- Create: `src/scene/parts/placement.ts`
- Create: `src/scene/parts/placement.test.ts`

**Interfaces:**
- Consumes: `floorSlices`, `setbackScale`, `FLOOR_HEIGHT`, `FloorSlice` from `src/sim/geometry.ts`.
- Produces:
  - `src/scene/parts/placement.ts`: `Anchor { x, z, yaw }`, `Face extends Anchor { length }`, `planCorners(shape, w, d)`, `planFaces(shape, w, d)`, `perimeterPoints(shape, w, d, spacing)`, `pointsAlongFaces(shape, w, d, perFace)`, `SetbackLevel { slice, isRoof }`, `setbackLevels(design)`, `floorRuns(design, maxFloors)`, `baseFloors(design, count)`, `floorTop(slice)`.
  - Convention: `yaw` turns local +z to point straight out of the wall (world direction `(sin yaw, cos yaw)`); local +x then runs along the wall.

- [ ] **Step 1: Write the failing tests**

`src/scene/parts/placement.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { designFor } from '../../sim/testUtils';
import type { PlanShape } from '../../sim/types';
import { floorRuns, perimeterPoints, planCorners, planFaces, setbackLevels } from './placement';

const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];

describe('placement', () => {
  it('puts four corners on a square, three on a triangle', () => {
    expect(planCorners('square', 40, 40)).toHaveLength(4);
    expect(planCorners('triangle', 40, 40)).toHaveLength(3);
    const c = planCorners('rectangle', 40, 20)[0];
    expect([c.x, c.z]).toEqual([20, 10]);
  });

  it('every face points outward, away from the centre', () => {
    for (const shape of SHAPES)
      for (const f of planFaces(shape, 40, 30)) {
        const out = Math.sin(f.yaw) * f.x + Math.cos(f.yaw) * f.z;
        expect(out, shape).toBeGreaterThan(0);
      }
  });

  it('spaces perimeter points roughly evenly around every shape', () => {
    for (const shape of SHAPES) {
      const pts = perimeterPoints(shape, 40, 40, 4);
      expect(pts.length, shape).toBeGreaterThan(20);
      expect(pts.length, shape).toBeLessThan(45);
      for (const p of pts) expect(Math.hypot(p.x, p.z), shape).toBeLessThanOrEqual(20 * Math.SQRT2 + 1e-9);
    }
  });

  it('finds one level per setback step plus the roof', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake' });
    const levels = setbackLevels(design);
    expect(levels).toHaveLength(5);
    expect(levels.at(-1)!.isRoof).toBe(true);
    for (const l of levels.slice(0, -1)) expect(l.isRoof).toBe(false);
    expect(setbackLevels({ ...design, setbacks: 'none' })).toHaveLength(1);
  });

  it('splits floors into runs that stop at setbacks and never exceed the chunk size', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'few' });
    const runs = floorRuns(design, 6);
    expect(runs.flat()).toHaveLength(50);
    for (const r of runs) expect(r.length).toBeLessThanOrEqual(6);
    const stepFloors = setbackLevels(design).map((l) => l.slice.index);
    for (const i of stepFloors) expect(runs.some((r) => r.at(-1)!.index === i)).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/parts/placement.test.ts`

Expected: FAIL — `Failed to resolve import "./placement"`.

- [ ] **Step 3: Create `src/scene/parts/placement.ts`**

```ts
import { FLOOR_HEIGHT, floorSlices, setbackScale, type FloorSlice } from '../../sim/geometry';
import type { Design, PlanShape } from '../../sim/types';

/**
 * A spot on the outside of one floor plan, in the floor's own (unrotated) frame.
 * `yaw` turns local +z to point straight out of the wall there.
 */
export interface Anchor {
  x: number;
  z: number;
  yaw: number;
}

export interface Face extends Anchor {
  /** Length of the wall, metres. */
  length: number;
}

const outwardYaw = (nx: number, nz: number) => Math.atan2(nx, nz);

/** Corners of the plan, going around. A round plan uses four points at 45°. */
export function planCorners(shape: PlanShape, width: number, depth: number): Anchor[] {
  const hw = width / 2;
  const hd = depth / 2;
  if (shape === 'circle') {
    return [45, 135, 225, 315].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return { x: hw * Math.sin(a), z: hd * Math.cos(a), yaw: a };
    });
  }
  if (shape === 'triangle') {
    // Matches the 3-sided CylinderGeometry used for triangular floors: x = r·sinθ, z = r·cosθ.
    return [0, 120, 240].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return { x: (width / Math.sqrt(3)) * Math.sin(a), z: (depth / Math.sqrt(3)) * Math.cos(a), yaw: a };
    });
  }
  return [
    { x: hw, z: hd, yaw: outwardYaw(1, 1) },
    { x: hw, z: -hd, yaw: outwardYaw(1, -1) },
    { x: -hw, z: -hd, yaw: outwardYaw(-1, -1) },
    { x: -hw, z: hd, yaw: outwardYaw(-1, 1) },
  ];
}

/** The straight walls of the plan (a round plan is treated as four quarter-walls). */
export function planFaces(shape: PlanShape, width: number, depth: number): Face[] {
  if (shape === 'circle') {
    return [0, 90, 180, 270].map((deg) => {
      const a = (deg * Math.PI) / 180;
      return { x: (width / 2) * Math.sin(a), z: (depth / 2) * Math.cos(a), yaw: a, length: (Math.PI * width) / 4 };
    });
  }
  const c = planCorners(shape, width, depth);
  return c.map((p, i) => {
    const q = c[(i + 1) % c.length];
    const mx = (p.x + q.x) / 2;
    const mz = (p.z + q.z) / 2;
    let nx = q.z - p.z;
    let nz = -(q.x - p.x);
    if (nx * mx + nz * mz < 0) [nx, nz] = [-nx, -nz];
    return { x: mx, z: mz, yaw: outwardYaw(nx, nz), length: Math.hypot(q.x - p.x, q.z - p.z) };
  });
}

/** Points spaced about `spacing` apart around the outside of the plan. */
export function perimeterPoints(shape: PlanShape, width: number, depth: number, spacing: number): Anchor[] {
  if (shape === 'circle') {
    const n = Math.max(4, Math.round((Math.PI * width) / spacing));
    return Array.from({ length: n }, (_, i) => {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      return { x: (width / 2) * Math.sin(a), z: (depth / 2) * Math.cos(a), yaw: a };
    });
  }
  return pointsAlongFaces(shape, width, depth, (f) => Math.max(1, Math.round(f.length / spacing)));
}

/** `perFace(face)` evenly spaced points along each straight wall, never on a corner. */
export function pointsAlongFaces(shape: PlanShape, width: number, depth: number, perFace: (f: Face) => number): Anchor[] {
  const out: Anchor[] = [];
  for (const f of planFaces(shape, width, depth)) {
    const n = perFace(f);
    const ax = Math.cos(f.yaw); // local +x along the wall
    const az = -Math.sin(f.yaw);
    for (let k = 0; k < n; k++) {
      const s = ((k + 0.5) / n - 0.5) * f.length;
      out.push({ x: f.x + ax * s, z: f.z + az * s, yaw: f.yaw });
    }
  }
  return out;
}

export interface SetbackLevel {
  /** The last floor before the tower steps in (or the roof floor). */
  slice: FloorSlice;
  isRoof: boolean;
}

/** Floors just below each setback step, then the roof. */
export function setbackLevels(design: Design): SetbackLevel[] {
  const slices = floorSlices(design);
  const n = slices.length;
  const t = (i: number) => (n > 1 ? i / (n - 1) : 0);
  const levels: SetbackLevel[] = [];
  for (let i = 0; i < n - 1; i++) {
    if (setbackScale(design.setbacks, t(i + 1)) < setbackScale(design.setbacks, t(i)) - 1e-9) {
      levels.push({ slice: slices[i], isRoof: false });
    }
  }
  levels.push({ slice: slices[n - 1], isRoof: true });
  return levels;
}

/** Runs of floors between setbacks, split into chunks of at most `maxFloors` floors. */
export function floorRuns(design: Design, maxFloors: number): FloorSlice[][] {
  const slices = floorSlices(design);
  const breaks = new Set(setbackLevels(design).map((l) => l.slice.index));
  const runs: FloorSlice[][] = [];
  let current: FloorSlice[] = [];
  for (const s of slices) {
    current.push(s);
    if (breaks.has(s.index) || current.length >= maxFloors) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

/** The lowest `count` floors. */
export function baseFloors(design: Design, count: number): FloorSlice[] {
  return floorSlices(design).slice(0, Math.max(0, count));
}

/** Top of a floor (where a ledge or band sits). */
export const floorTop = (s: FloorSlice) => s.y + FLOOR_HEIGHT;
```

- [ ] **Step 4: Run the tests and type-check**

Run: `npx vitest run src/scene/parts/placement.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  20 passed (20)`, `Tests  147 passed (147)`.

- [ ] **Step 5: Commit**

```bash
git add src/scene/parts/placement.ts src/scene/parts/placement.test.ts
git commit -m "feat: shape-aware placement helpers for crowns and ornaments

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 4: Crown builders

Turn each crown into parts: a generic stage builder for the 25 declarative crowns, and three custom builders (Tribune Tower flying buttresses, The Shard's glass shards, Strata SE1's spinning turbines). The catalog-wide test checks every crown on every plan shape at both extremes: finite, attached to the roof, and reaching the height the analysis uses (within 5%).

**Files:**
- Create: `src/scene/crowns/types.ts`
- Create: `src/scene/crowns/stages.ts`
- Create: `src/scene/crowns/custom.ts`
- Create: `src/scene/crownParts.ts`
- Create: `src/scene/crownParts.test.ts`

**Interfaces:**
- Consumes: Task 1: `CROWNS`, `CrownStage`, `CustomCrownId`, `Part`, `placePart`, `strutPart`, `partBounds`, `partIsFinite`, `crownHeight`. Task 3: `planCorners`, `planFaces`.
- Produces:
  - `src/scene/crowns/types.ts`: `CrownContext { shape, W, D, H }`, `CrownBuilder = (ctx) => Part[]`.
  - `src/scene/crowns/stages.ts`: `buildStages(stages, ctx): Part[]`.
  - `src/scene/crowns/custom.ts`: `CUSTOM_CROWN_BUILDERS: Record<CustomCrownId, CrownBuilder>`. Leaving one out is a compile error.
  - `src/scene/crownParts.ts`: `crownParts(design): Part[]`, in building coordinates (y = 0 at ground), turned with the top floor.

- [ ] **Step 1: Write the failing tests**

`src/scene/crownParts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CROWN_IDS } from '../sim/catalog/ids';
import { FLOOR_HEIGHT, crownHeight, floorSlices } from '../sim/geometry';
import { partBounds, partIsFinite } from '../sim/parts';
import { designFor } from '../sim/testUtils';
import type { Design, PlanShape } from '../sim/types';
import { crownParts } from './crownParts';

const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
const EXTREMES: Partial<Design>[] = [
  { floors: 5, twist: 0, taper: 0 },
  { floors: 150, twist: 120, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15 },
];

describe('crownParts', () => {
  it.each([...CROWN_IDS])('%s: finite, attached to the roof, and reaches the catalog height on every shape', (crown) => {
    for (const shape of SHAPES)
      for (const extreme of EXTREMES) {
        const { design } = designFor('shanghai', { ...extreme, shape, crown });
        const parts = crownParts(design);
        const label = `${crown} ${shape} ${extreme.floors}`;
        expect(parts.length, label).toBeGreaterThan(0);
        expect(parts.every(partIsFinite), label).toBe(true);
        const body = design.floors * FLOOR_HEIGHT;
        const H = crownHeight(crown, body);
        const top = floorSlices(design).at(-1)!;
        const reach = Math.hypot(top.width, top.depth) * 0.6 + 1;
        let tip = -Infinity;
        for (const p of parts) {
          const b = partBounds(p);
          tip = Math.max(tip, b.max[1]);
          expect(b.min[1], label).toBeGreaterThanOrEqual(body - 0.5);
          expect(Math.hypot(p.position[0], p.position[2]), label).toBeLessThanOrEqual(reach);
        }
        expect(Math.abs(tip - (body + H)), label).toBeLessThanOrEqual(Math.max(0.05 * H, 0.5));
      }
  });

  it('turns the crown with a twisted top floor', () => {
    const { design } = designFor('chicago', { crown: 'twin-antennas', twist: 90 });
    const straight = crownParts({ ...design, twist: 0 });
    const twisted = crownParts(design);
    expect(twisted[1].position[0]).not.toBeCloseTo(straight[1].position[0]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/crownParts.test.ts`

Expected: FAIL — `Failed to resolve import "./crownParts"`.

- [ ] **Step 3: Create `src/scene/crowns/types.ts`**

```ts
import type { Part } from '../../sim/parts';
import type { PlanShape } from '../../sim/types';

/** Size of the roof a crown sits on, and how tall the crown is. */
export interface CrownContext {
  shape: PlanShape;
  /** Top floor width and depth, metres. */
  W: number;
  D: number;
  /** Crown height, metres. */
  H: number;
}

/** Builds a crown in its own frame: y = 0 at the roof, centred on the tower. */
export type CrownBuilder = (ctx: CrownContext) => Part[];
```

- [ ] **Step 4: Create `src/scene/crowns/stages.ts`**

```ts
import type { CrownStage } from '../../sim/catalog/crowns';
import type { Part } from '../../sim/parts';
import { planCorners } from '../parts/placement';
import type { CrownContext } from './types';

/** Turns declarative stages into parts. */
export function buildStages(stages: readonly CrownStage[], ctx: CrownContext): Part[] {
  const { W, D, H } = ctx;
  const parts: Part[] = [];
  for (const s of stages) {
    const w = s.w * W;
    const d = (s.d ?? s.w) * D;
    const h = (s.y1 - s.y0) * H;
    const y = ((s.y0 + s.y1) / 2) * H;
    const [ox, oz] = s.offset ?? [0, 0];
    const spread = s.spread ?? 1;
    let spots: [number, number][];
    if (s.at === 'corners') {
      spots = planCorners(ctx.shape, W * spread, D * spread).map((c) => [c.x, c.z]);
    } else if (s.at === 'grid') {
      spots = [];
      for (const gx of [-1, 0, 1]) for (const gz of [-1, 0, 1]) spots.push([(gx * W * spread) / 3, (gz * D * spread) / 3]);
    } else {
      spots = [[0, 0]];
    }
    for (const [x, z] of spots) {
      const part: Part = {
        shape: s.shape,
        position: [x + ox * W, y, z + oz * D],
        scale: [w, h, d],
        material: s.material,
      };
      if (s.rotY) part.rotation = [0, s.rotY, 0];
      if (s.glow) part.glow = true;
      if (s.animate) part.animate = s.animate;
      parts.push(part);
    }
  }
  return parts;
}
```

- [ ] **Step 5: Create `src/scene/crowns/custom.ts`**

```ts
import type { CustomCrownId } from '../../sim/catalog/crowns';
import { strutPart, type Part } from '../../sim/parts';
import { planCorners, planFaces } from '../parts/placement';
import type { CrownBuilder } from './types';

/** Tribune Tower: a central lantern held up by stone arms leaping from corner pinnacles. */
const flyingButtresses: CrownBuilder = ({ shape, W, D, H }) => {
  const r = Math.min(W, D);
  const parts: Part[] = [
    { shape: 'cylinder', position: [0, 0.4 * H, 0], scale: [0.45 * r, 0.8 * H, 0.45 * r], material: 'stone' },
    { shape: 'cone', position: [0, 0.9 * H, 0], scale: [0.45 * r, 0.2 * H, 0.45 * r], material: 'copper' },
    { shape: 'cylinder', position: [0, 0.65 * H, 0], scale: [0.46 * r, 0.12 * H, 0.46 * r], material: 'light', glow: true },
  ];
  for (const c of planCorners(shape, W * 0.9, D * 0.9)) {
    parts.push({ shape: 'cone', position: [c.x, 0.3 * H, c.z], scale: [0.1 * r, 0.6 * H, 0.1 * r], material: 'stone' });
    parts.push(strutPart([c.x, 0.45 * H, c.z], [c.x * 0.25, 0.7 * H, c.z * 0.25], 0.04 * r, 'stone'));
  }
  return parts;
};

/** The Shard: tall glass panes leaning inward that never quite meet. */
const glassShards: CrownBuilder = ({ shape, W, D, H }) => {
  const tilt = 0.12;
  const thickness = 0.5;
  const tops = [1, 0.85, 0.75, 0.9];
  return planFaces(shape, W * 0.9, D * 0.9).map((f, i) => {
    const top = tops[i % tops.length] * H;
    const h = top / Math.cos(tilt);
    const y = top - 0.5 * (h * Math.cos(tilt) + thickness * Math.sin(tilt));
    return {
      shape: 'box',
      position: [f.x, y, f.z],
      scale: [f.length * 0.55, h, thickness],
      rotation: [-tilt, f.yaw, 0],
      material: 'glass',
      glow: true,
    } satisfies Part;
  });
};

/** Strata SE1: three spinning turbines set into an open frame on the roof. */
const windTurbines: CrownBuilder = ({ W, D, H }) => {
  const parts: Part[] = [
    { shape: 'plan', position: [0, 0.125 * H, 0], scale: [0.95 * W, 0.25 * H, 0.95 * D], material: 'body' },
    { shape: 'box', position: [0, 0.95 * H, 0], scale: [0.95 * W, 0.1 * H, 0.3 * D], material: 'steel' },
  ];
  for (const x of [-0.475, -0.155, 0.155, 0.475]) {
    parts.push({ shape: 'box', position: [x * W, 0.6 * H, 0], scale: [0.04 * W, 0.7 * H, 0.3 * D], material: 'steel' });
  }
  const diameter = Math.min(0.28 * W, 0.6 * H);
  for (const x of [-0.31, 0, 0.31]) {
    const hub: [number, number, number] = [x * W, 0.6 * H, 0];
    parts.push({ shape: 'cylinder', position: hub, scale: [0.12 * diameter, 0.3, 0.12 * diameter], rotation: [Math.PI / 2, 0, 0], material: 'steel' });
    for (const a of [0, Math.PI / 2]) {
      parts.push({ shape: 'box', position: hub, scale: [0.08 * diameter, diameter, 0.1], rotation: [0, 0, a], material: 'steel', animate: 'spin' });
    }
  }
  return parts;
};

/** Every crown marked `custom: true` in the catalog must appear here — the compiler checks. */
export const CUSTOM_CROWN_BUILDERS: Record<CustomCrownId, CrownBuilder> = {
  'flying-buttresses': flyingButtresses,
  'glass-shards': glassShards,
  'wind-turbines': windTurbines,
};
```

- [ ] **Step 6: Create `src/scene/crownParts.ts`**

```ts
import { CROWNS, type CustomCrownId } from '../sim/catalog/crowns';
import { FLOOR_HEIGHT, crownHeight, floorSlices } from '../sim/geometry';
import { placePart, type Part } from '../sim/parts';
import type { Design } from '../sim/types';
import { CUSTOM_CROWN_BUILDERS } from './crowns/custom';
import { buildStages } from './crowns/stages';
import type { CrownContext } from './crowns/types';

/** The crown's parts in building coordinates, turned with the top floor. */
export function crownParts(design: Design): Part[] {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const bodyHeight = design.floors * FLOOR_HEIGHT;
  const def = CROWNS[design.crown];
  const ctx: CrownContext = { shape: design.shape, W: top.width, D: top.depth, H: crownHeight(design.crown, bodyHeight) };
  const local = def.custom ? CUSTOM_CROWN_BUILDERS[design.crown as CustomCrownId](ctx) : buildStages(def.stages ?? [], ctx);
  return local.map((p) => placePart(p, top.rotation, bodyHeight));
}
```

- [ ] **Step 7: Run the tests and type-check**

Run: `npx vitest run src/scene/crownParts.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  21 passed (21)`, `Tests  176 passed (176)`.

- [ ] **Step 8: Commit**

```bash
git add src/scene/crowns/types.ts src/scene/crowns/stages.ts src/scene/crowns/custom.ts src/scene/crownParts.ts src/scene/crownParts.test.ts
git commit -m "feat: crown builders from stages plus three custom crowns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 5: Ornament placement and shape-aware bracing

Place every active ornament by its placement rule and amount, and rebuild exposed bracing on the plan's real corners. That fixes the deferred minor where braces used a bounding box on round and triangular towers. Bay-line ornaments are built in runs of at most 6 floors so they follow taper and twist while staying inside the instance budget.

**Files:**
- Create: `src/scene/ornaments.ts`
- Create: `src/scene/ornaments.test.ts`

**Interfaces:**
- Consumes: Task 2: `ORNAMENTS`, `WINDOW_PATTERNS`, `AmountRule`, `OrnamentDef`, `activeOrnaments`, `amountLevel`. Task 3: placement helpers. Task 1: `placePart`, `rotateYXZ`, `strutPart`. Task 4: `crownParts` (budget test only).
- Produces:
  - `src/scene/ornaments.ts`: `ornamentParts(design): Part[]`, `bracingParts(design): Part[]` (both in building coordinates).
  - Template convention: +x along the wall, +y up, +z out of the wall; a `plan`-shaped template part becomes a band around the whole floor.

- [ ] **Step 1: Write the failing tests**

`src/scene/ornaments.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ORNAMENTS } from '../sim/catalog/facades';
import { ORNAMENT_IDS } from '../sim/catalog/ids';
import { FLOOR_HEIGHT, floorSlices } from '../sim/geometry';
import { partBounds, partIsFinite } from '../sim/parts';
import { designFor } from '../sim/testUtils';
import type { Design, PlanShape } from '../sim/types';
import { crownParts } from './crownParts';
import { bracingParts, ornamentParts } from './ornaments';

const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
const EXTREMES: Partial<Design>[] = [
  { floors: 5, twist: 0, taper: 0, setbacks: 'none' },
  { floors: 150, twist: 120, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15 },
];

describe('ornamentParts', () => {
  it.each([...ORNAMENT_IDS])('%s: finite and stuck to the tower on every shape and amount', (id) => {
    for (const shape of SHAPES)
      for (const extreme of EXTREMES)
        for (const ornament of ['low', 'high'] as const) {
          const { design } = designFor('shanghai', { ...extreme, shape, ornaments: [id], ornament });
          const parts = ornamentParts(design);
          const label = `${id} ${shape} ${extreme.floors} ${ornament}`;
          expect(parts.length, label).toBeGreaterThan(0);
          expect(parts.every(partIsFinite), label).toBe(true);
          const slices = floorSlices(design);
          const reach = Math.hypot(slices[0].width, slices[0].depth) / 2 + 12;
          for (const p of parts) {
            const b = partBounds(p);
            expect(b.min[1], label).toBeGreaterThanOrEqual(-0.5);
            expect(b.max[1], label).toBeLessThanOrEqual(design.floors * FLOOR_HEIGHT + 15);
            expect(Math.hypot(p.position[0], p.position[2]), label).toBeLessThanOrEqual(reach);
          }
        }
  });

  it('amount None builds the working parts only', () => {
    const { design } = designFor('chicago', { ornaments: ['stone-ribs', 'gargoyles'], ornament: 'none' });
    const ribsOnly = ornamentParts({ ...design, ornaments: ['stone-ribs'] });
    expect(ornamentParts(design)).toEqual(ribsOnly);
    expect(ribsOnly.length).toBeGreaterThan(0);
  });

  it('High places more than Low', () => {
    for (const id of ORNAMENT_IDS) {
      const { design } = designFor('chicago', { floors: 60, setbacks: 'wedding-cake', ornaments: [id] });
      const low = ornamentParts({ ...design, ornament: 'low' });
      const high = ornamentParts({ ...design, ornament: 'high' });
      const volume = (ps: typeof low) => ps.reduce((s, p) => s + p.scale[0] * p.scale[1] * p.scale[2], 0);
      expect(volume(high), id).toBeGreaterThanOrEqual(volume(low));
    }
  });

  it('keeps a 150-floor tower with every ornament at High within the instance budget', () => {
    const { design } = designFor('shanghai', {
      floors: 150, plateWidth: 80, shape: 'square', setbacks: 'wedding-cake',
      ornaments: [...ORNAMENT_IDS], ornament: 'high', exposedStructure: true, crown: 'pagoda',
    });
    const total = ornamentParts(design).length + crownParts(design).length + bracingParts(design).length;
    expect(total).toBeLessThanOrEqual(20_000);
  });

  it('builds the worst-case tower fast enough to redraw while a slider is dragged', () => {
    const { design } = designFor('shanghai', {
      floors: 150, plateWidth: 80, shape: 'circle', twist: 120, taper: 0.3, setbacks: 'wedding-cake',
      ornaments: [...ORNAMENT_IDS], ornament: 'high',
    });
    ornamentParts(design);
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) ornamentParts({ ...design, floors: 150 - i });
    expect((performance.now() - t0) / 5).toBeLessThan(50);
  });

  it('every ornament in the catalog is placed by some rule', () => {
    for (const id of ORNAMENT_IDS) expect(ORNAMENTS[id].placement).toBeTruthy();
  });
});

describe('bracingParts', () => {
  it('adds X-braces only for exposed structure, two per wall per 10 floors', () => {
    const { design } = designFor('chicago', { floors: 30, shape: 'square' });
    expect(bracingParts(design)).toEqual([]);
    expect(bracingParts({ ...design, exposedStructure: true })).toHaveLength(3 * 4 * 2);
    expect(bracingParts({ ...design, shape: 'triangle', exposedStructure: true })).toHaveLength(3 * 3 * 2);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/ornaments.test.ts`

Expected: FAIL — `Failed to resolve import "./ornaments"`.

- [ ] **Step 3: Create `src/scene/ornaments.ts`**

```ts
import { WINDOW_PATTERNS, type AmountRule, type OrnamentDef } from '../sim/catalog/facades';
import { activeOrnaments, amountLevel } from '../sim/facade';
import { FLOOR_HEIGHT, floorSlices, type FloorSlice } from '../sim/geometry';
import { placePart, rotateYXZ, strutPart, type Part } from '../sim/parts';
import type { Design } from '../sim/types';
import {
  baseFloors,
  floorRuns,
  floorTop,
  perimeterPoints,
  planCorners,
  planFaces,
  pointsAlongFaces,
  setbackLevels,
  type Anchor,
} from './parts/placement';

/** Tall ornaments are built in runs of at most this many floors so they follow taper and twist. */
const RUN_FLOORS = 6;
/** Never more than this many bay lines around one floor, however big the plate. */
const MAX_BAYS = 48;

/** A template part moved to an anchor on a floor: scaled, turned to face out, then turned with the floor. */
function atAnchor(t: Part, a: Anchor, slice: FloorSlice, y: number, size: number, stretchY?: number): Part {
  const local: [number, number, number] = [t.position[0] * size, t.position[1] * size, t.position[2] * size];
  const [x, , z] = rotateYXZ(local, [0, a.yaw, 0]);
  const r = t.rotation ?? [0, 0, 0];
  const placed: Part = {
    ...t,
    position: [a.x + x, y + local[1], a.z + z],
    scale: [t.scale[0] * size, stretchY ?? t.scale[1] * size, t.scale[2] * size],
    rotation: [r[0], r[1] + a.yaw, r[2]],
  };
  return placePart(placed, slice.rotation);
}

/** A 'plan' template part becomes a band around the whole floor. */
function band(t: Part, slice: FloorSlice, y: number, size: number): Part {
  const out = 2 * t.scale[2] * size;
  return placePart(
    { ...t, position: [0, y + t.position[1] * size, 0], scale: [slice.width + out, t.scale[1] * size, slice.depth + out] },
    slice.rotation,
  );
}

/** Bands for the template's plan parts at a height, plus per-anchor copies of the rest. */
function stamp(o: OrnamentDef, slice: FloorSlice, y: number, size: number, anchors: Anchor[]): Part[] {
  const parts: Part[] = [];
  for (const t of o.template) {
    if (t.shape === 'plan') parts.push(band(t, slice, y, size));
    else for (const a of anchors) parts.push(atAnchor(t, a, slice, y, size));
  }
  return parts;
}

function levelsFor(design: Design, rule: AmountRule) {
  const all = setbackLevels(design);
  return rule.levels === 'all' ? all : all.slice(-1);
}

function place(o: OrnamentDef, design: Design, rule: AmountRule): Part[] {
  const size = rule.size;
  const parts: Part[] = [];
  switch (o.placement) {
    case 'bay-lines': {
      const bay = WINDOW_PATTERNS[design.windowPattern].bayWidth * (rule.every ?? 1);
      for (const run of floorRuns(design, RUN_FLOORS)) {
        const mid = run[Math.floor(run.length / 2)];
        const y0 = run[0].y;
        const height = run.length * FLOOR_HEIGHT;
        const perimeter = 2 * (mid.width + mid.depth);
        const anchors = perimeterPoints(design.shape, mid.width, mid.depth, Math.max(bay, perimeter / MAX_BAYS));
        for (const t of o.template)
          for (const a of anchors) parts.push(atAnchor(t, a, mid, y0 + height / 2, size, t.scale[1] * height));
      }
      break;
    }
    case 'floor-rings': {
      const every = rule.every ?? 1;
      const slices = floorSlices(design);
      let rings = slices.filter((s) => (s.index + 1) % every === 0 && s.index < design.floors - 1);
      // A short tower still gets one band, halfway up, so the choice is visible.
      if (rings.length === 0 && slices.length > 1) rings = [slices[Math.floor((slices.length - 1) / 2)]];
      for (const s of rings) parts.push(...stamp(o, s, floorTop(s), size, []));
      break;
    }
    case 'setback-corners':
      for (const { slice } of levelsFor(design, rule)) {
        const anchors = planCorners(design.shape, slice.width, slice.depth);
        if (rule.midFaces) anchors.push(...planFaces(design.shape, slice.width, slice.depth));
        parts.push(...stamp(o, slice, floorTop(slice), size, anchors));
      }
      break;
    case 'setback-faces':
      for (const { slice } of levelsFor(design, rule)) {
        const anchors = pointsAlongFaces(design.shape, slice.width, slice.depth, () => rule.count ?? 1);
        parts.push(...stamp(o, slice, slice.y + 0.3, size, anchors));
      }
      break;
    case 'roof-edge':
      for (const { slice } of levelsFor(design, rule)) {
        const inset = 0.8 * size;
        const anchors = pointsAlongFaces(design.shape, slice.width, slice.depth, () => rule.count ?? 1).map((a) => ({
          ...a,
          x: a.x - Math.sin(a.yaw) * inset,
          z: a.z - Math.cos(a.yaw) * inset,
        }));
        parts.push(...stamp(o, slice, floorTop(slice), size, anchors));
      }
      break;
    case 'base-floors':
      for (const s of baseFloors(design, rule.floors ?? 2)) {
        for (const course of [1, 3]) parts.push(...stamp(o, s, s.y + course, size, []));
      }
      break;
    case 'entry': {
      const ground = floorSlices(design)[0];
      const faces = planFaces(design.shape, ground.width, ground.depth);
      const front = faces.reduce((best, f) => (f.z > best.z ? f : best));
      const count = rule.count ?? 1;
      const spacing = 7 * size;
      const ax = Math.cos(front.yaw);
      const az = -Math.sin(front.yaw);
      const anchors = Array.from({ length: count }, (_, k) => {
        const s = (k - (count - 1) / 2) * spacing;
        return { x: front.x + ax * s, z: front.z + az * s, yaw: front.yaw };
      });
      parts.push(...stamp(o, ground, 0, size, anchors));
      break;
    }
  }
  return parts;
}

/** Every ornament the design builds, in building coordinates. */
export function ornamentParts(design: Design): Part[] {
  const level = amountLevel(design);
  return activeOrnaments(design).flatMap((o) => place(o, design, o.amount[level]));
}

const BRACE_FLOORS = 10;

/** X-braces on every wall of each 10-floor segment, following the floor's real shape. */
export function bracingParts(design: Design): Part[] {
  if (!design.exposedStructure) return [];
  const slices = floorSlices(design);
  const parts: Part[] = [];
  for (let start = 0; start < slices.length; start += BRACE_FLOORS) {
    const bottom = slices[start];
    const end = slices[Math.min(start + BRACE_FLOORS, slices.length) - 1];
    const mid = slices[Math.floor((start + end.index) / 2)];
    const y0 = bottom.y;
    const y1 = end.y + FLOOR_HEIGHT;
    const corners = planCorners(design.shape, bottom.width + 1.2, bottom.depth + 1.2);
    corners.forEach((p, i) => {
      const q = corners[(i + 1) % corners.length];
      parts.push(placePart(strutPart([p.x, y0, p.z], [q.x, y1, q.z], 0.8, 'accent'), mid.rotation));
      parts.push(placePart(strutPart([q.x, y0, q.z], [p.x, y1, p.z], 0.8, 'accent'), mid.rotation));
    });
  }
  return parts;
}
```

- [ ] **Step 4: Run the tests and type-check**

Run: `npx vitest run src/scene/ornaments.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  22 passed (22)`, `Tests  196 passed (196)`.

- [ ] **Step 5: Commit**

```bash
git add src/scene/ornaments.ts src/scene/ornaments.test.ts
git commit -m "feat: place ornaments by rule and amount; shape-aware bracing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 6: Parts renderer and Building integration

One renderer for all parts: shared unit geometries (each fills the unit cube, so `scale` is size in metres), material looks, and `<PartsMesh>`, which groups parts by shape, material, glow and animation into instanced meshes. It also spins turbine rotors and blinks aircraft-warning lights at night. `Building` swaps its old `Crown` and `Bracing` components for three `PartsMesh` groups and takes a `night` prop.

**Files:**
- Create: `src/scene/parts/geometries.ts`
- Create: `src/scene/parts/geometries.test.ts`
- Create: `src/scene/parts/materials.ts`
- Create: `src/scene/parts/PartsMesh.tsx`
- Replace: `src/scene/Building.test.tsx`
- Modify: `src/scene/Building.tsx`
- Modify: `src/scene/buildingGeometry.ts`
- Modify: `src/scene/buildingGeometry.test.ts`

**Interfaces:**
- Consumes: Tasks 4–5: `crownParts`, `ornamentParts`, `bracingParts`. Task 1: `Part`, `PartShape`, `PartMaterial`, `partBounds`. Existing `unitGeometry`.
- Produces:
  - `src/scene/parts/geometries.ts`: `partGeometry(shape, plan): THREE.BufferGeometry` (cached for the session).
  - `src/scene/parts/materials.ts`: `MaterialLook`, `materialLook(material, palette)`, `glowColor(material, palette)`.
  - `src/scene/parts/PartsMesh.tsx`: `PartGroup`, `groupParts(parts)`, `partMatrix(p, extraZ?, out?)`, `<PartsMesh parts palette plan night? name />`.
  - `<Building site design night? />`; groups named `crown`, `ornaments`, `bracing`.
  - Removed from `buildingGeometry.ts`: `Strut`, `bracingStruts`, `strutMatrix`.

- [ ] **Step 1: Write the failing tests**

`src/scene/parts/geometries.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { PartShape } from '../../sim/parts';
import { partGeometry } from './geometries';

const SHAPES: PartShape[] = ['box', 'cylinder', 'cone', 'pyramid', 'sphere', 'dome', 'torus', 'wedge', 'plan', 'plan-cone'];

describe('part geometries', () => {
  it('every shape fills the unit cube (so scale is size in metres)', () => {
    for (const shape of SHAPES) {
      const box = partGeometry(shape, 'square').boundingBox!;
      expect(box.min.y, shape).toBeCloseTo(-0.5, 2);
      expect(box.max.y, shape).toBeCloseTo(0.5, 2);
      expect(box.max.x - box.min.x, shape).toBeCloseTo(1, 1);
      expect(box.max.z - box.min.z, shape).toBeCloseTo(1, 1);
    }
  });

  it('caches geometries and keeps plan shapes apart', () => {
    expect(partGeometry('cone', 'square')).toBe(partGeometry('cone', 'circle'));
    expect(partGeometry('plan', 'square')).not.toBe(partGeometry('plan', 'circle'));
  });
});
```

`src/scene/Building.test.tsx`:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CROWN_IDS, ORNAMENT_IDS } from '../sim/catalog/ids';
import { designFor } from '../sim/testUtils';
import type { PlanShape } from '../sim/types';
import { Building } from './Building';
import { crownParts } from './crownParts';
import { ornamentParts } from './ornaments';

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

const instancedIn = (r: Renderer, groupName: string) =>
  r.scene
    .findAll((n) => n.props.name === groupName)[0]
    .findAll((n) => (n.instance as THREE.InstancedMesh).isInstancedMesh === true)
    .map((n) => n.instance as THREE.InstancedMesh);

const instanceTotal = (r: Renderer, groupName: string) => instancedIn(r, groupName).reduce((s, m) => s + m.count, 0);

describe('<Building />', () => {
  it('renders one body instance per floor', async () => {
    const { site, design } = designFor('chicago', { floors: 25 });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0];
    expect((body.instance as THREE.InstancedMesh).count).toBe(25);
  });

  it('renders every crown, with every ornament and amenity, without throwing', async () => {
    for (const crown of CROWN_IDS) {
      const { site, design } = designFor('tokyo', {
        crown, twist: 60, exposedStructure: true, ornaments: [...ORNAMENT_IDS], ornament: 'high',
        amenities: ['helipad', 'pool', 'observation-deck', 'sky-garden'],
      });
      const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
      expect(instanceTotal(r, 'crown'), crown).toBe(crownParts(design).length);
      expect(instanceTotal(r, 'ornaments'), crown).toBe(ornamentParts(design).length);
      await r.unmount();
    }
  });

  it('renders every plan shape', async () => {
    const shapes: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
    for (const shape of shapes) {
      const { site, design } = designFor('chicago', { shape, crown: 'pagoda', exposedStructure: true });
      const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
      expect(instanceTotal(r, 'bracing'), shape).toBeGreaterThan(0);
      await r.unmount();
    }
  });

  it("tiers of a crown follow a round tower's shape", async () => {
    const { site, design } = designFor('chicago', { shape: 'circle', crown: 'stepped' });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const meshes = instancedIn(r, 'crown');
    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry.type).toBe('CylinderGeometry');
  });

  it('lights aircraft-warning beacons on masts only at night', async () => {
    const { site, design } = designFor('chicago', { crown: 'spire' });
    const day = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    expect(day.scene.findAll((n) => n.props.name === 'aircraft-lights')).toHaveLength(0);
    const night = await ReactThreeTestRenderer.create(<Building site={site} design={design} night />);
    expect(night.scene.findAll((n) => n.props.name === 'aircraft-lights')).toHaveLength(1);
  });

  it('disposes the old shape geometry when the shape changes', async () => {
    const { site, design } = designFor('chicago', { shape: 'square', crown: 'sloped' });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    const old = body.geometry;
    let disposed = false;
    old.addEventListener('dispose', () => (disposed = true));
    await r.update(<Building site={site} design={{ ...design, shape: 'circle' }} />);
    expect(disposed).toBe(true);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/parts/geometries.test.ts src/scene/Building.test.tsx`

Expected: FAIL — `Failed to resolve import "./geometries"`, and the Building tests find no instanced meshes in the `crown` group.

- [ ] **Step 3: Create `src/scene/parts/geometries.ts`**

```ts
import * as THREE from 'three';
import type { PartShape } from '../../sim/parts';
import type { PlanShape } from '../../sim/types';
import { unitGeometry } from '../buildingGeometry';

function pyramid(): THREE.BufferGeometry {
  return new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
}

function dome(): THREE.BufferGeometry {
  // Hemisphere stretched to fill the unit cube: flat base at y = -0.5, top at y = 0.5.
  return new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 2, 1).translate(0, -0.5, 0);
}

function torus(): THREE.BufferGeometry {
  // A flat ring in the XZ plane, 1 across and 1 thick once scaled.
  return new THREE.TorusGeometry(0.4, 0.1, 8, 24).rotateX(Math.PI / 2).scale(1, 5, 1);
}

function wedge(): THREE.BufferGeometry {
  // A ramp: full height at -x, sloping down to nothing at +x.
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5);
  s.lineTo(0.5, -0.5);
  s.lineTo(-0.5, 0.5);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
}

function planCone(plan: PlanShape): THREE.BufferGeometry {
  if (plan === 'circle') return new THREE.ConeGeometry(0.5, 1, 24);
  if (plan === 'triangle') return new THREE.ConeGeometry(1 / Math.sqrt(3), 1, 3);
  return pyramid();
}

function make(shape: PartShape, plan: PlanShape): THREE.BufferGeometry {
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    case 'cone':
      return new THREE.ConeGeometry(0.5, 1, 12);
    case 'pyramid':
      return pyramid();
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 12, 8);
    case 'dome':
      return dome();
    case 'torus':
      return torus();
    case 'wedge':
      return wedge();
    case 'plan':
      return unitGeometry(plan);
    case 'plan-cone':
      return planCone(plan);
  }
}

const cache = new Map<string, THREE.BufferGeometry>();

/**
 * Shared unit geometry for a part shape. There are only a few dozen combinations, so they are
 * cached for the life of the page and never disposed.
 */
export function partGeometry(shape: PartShape, plan: PlanShape): THREE.BufferGeometry {
  const key = shape === 'plan' || shape === 'plan-cone' ? `${shape}:${plan}` : shape;
  let g = cache.get(key);
  if (!g) {
    g = make(shape, plan);
    g.computeBoundingBox();
    cache.set(key, g);
  }
  return g;
}
```

- [ ] **Step 4: Create `src/scene/parts/materials.ts`**

```ts
import type { PartMaterial } from '../../sim/parts';
import type { Palette } from '../../sim/types';

export interface MaterialLook {
  color: string;
  roughness: number;
  metalness: number;
}

/** Fixed colours for real materials; body, accent and glass come from the design's palette. */
export function materialLook(m: PartMaterial, palette: Palette): MaterialLook {
  switch (m) {
    case 'body':
      return { color: palette.body, roughness: 0.7, metalness: 0.1 };
    case 'accent':
      return { color: palette.accent, roughness: 0.5, metalness: 0.3 };
    case 'glass':
      return { color: palette.glass, roughness: 0.15, metalness: 0.5 };
    case 'stone':
      return { color: '#d9d2c3', roughness: 0.9, metalness: 0 };
    case 'concrete':
      return { color: '#9c9a94', roughness: 0.95, metalness: 0 };
    case 'copper':
      // Old copper turns green: this is the patina colour.
      return { color: '#5fa58f', roughness: 0.6, metalness: 0.3 };
    case 'gold':
      return { color: '#d4af37', roughness: 0.3, metalness: 0.8 };
    case 'steel':
      return { color: '#9aa3ab', roughness: 0.35, metalness: 0.7 };
    case 'foliage':
      return { color: '#3f8f3a', roughness: 0.9, metalness: 0 };
    case 'ruby':
      return { color: '#c2182b', roughness: 0.4, metalness: 0.2 };
    case 'light':
      return { color: '#fff3c4', roughness: 0.5, metalness: 0 };
  }
}

/** Colour a glowing part gives off at night. */
export function glowColor(m: PartMaterial, palette: Palette): string {
  if (m === 'ruby') return '#ff2a3d';
  if (m === 'gold' || m === 'light') return '#ffd98a';
  return palette.accent;
}
```

- [ ] **Step 5: Create `src/scene/parts/PartsMesh.tsx`**

```tsx
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { partBounds, type Part } from '../../sim/parts';
import type { Palette, PlanShape } from '../../sim/types';
import { partGeometry } from './geometries';
import { glowColor, materialLook } from './materials';

export interface PartGroup {
  key: string;
  sample: Part;
  parts: Part[];
}

/** Parts that can share one instanced mesh: same shape, material, glow and animation. */
export function groupParts(parts: Part[]): PartGroup[] {
  const groups = new Map<string, PartGroup>();
  for (const p of parts) {
    const key = `${p.shape}|${p.material}|${p.glow ? 'glow' : ''}|${p.animate ?? ''}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, sample: p, parts: [] }));
    g.parts.push(p);
  }
  return [...groups.values()];
}

const euler = new THREE.Euler();
const quat = new THREE.Quaternion();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
const mat = new THREE.Matrix4();

export function partMatrix(p: Part, extraZ = 0, out = new THREE.Matrix4()): THREE.Matrix4 {
  const r = p.rotation ?? [0, 0, 0];
  euler.set(r[0], r[1], r[2] + extraZ, 'YXZ');
  quat.setFromEuler(euler);
  return out.compose(pos.set(...p.position), quat, scl.set(...p.scale));
}

function Group({ group, palette, plan, night }: { group: PartGroup; palette: Palette; plan: PlanShape; night: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { sample, parts } = group;
  const look = materialLook(sample.material, palette);
  const lit = night && !!sample.glow;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    parts.forEach((p, i) => mesh.setMatrixAt(i, partMatrix(p, 0, mat)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [parts]);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh || sample.animate !== 'spin') return;
    const t = clock.getElapsedTime() * 1.5;
    parts.forEach((p, i) => mesh.setMatrixAt(i, partMatrix(p, t, mat)));
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      key={parts.length}
      ref={ref}
      name={`parts:${group.key}`}
      args={[partGeometry(sample.shape, plan), undefined, parts.length]}
    >
      <meshStandardMaterial
        color={look.color}
        roughness={look.roughness}
        metalness={look.metalness}
        emissive={lit ? glowColor(sample.material, palette) : '#000000'}
        emissiveIntensity={lit ? 1.4 : 0}
        flatShading
      />
    </instancedMesh>
  );
}

/** Red aircraft-warning lights on top of masts and spires, blinking about once a second at night. */
function AircraftLights({ parts }: { parts: Part[] }) {
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff2020', emissive: '#ff2020' }), []);
  const sphere = useMemo(() => new THREE.SphereGeometry(0.6, 8, 6), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => sphere.dispose(), [sphere]);
  const tops = useMemo(
    () =>
      parts.map((p) => {
        const b = partBounds(p);
        return [p.position[0], b.max[1] + 0.6, p.position[2]] as [number, number, number];
      }),
    [parts],
  );
  useFrame(({ clock }) => {
    material.emissiveIntensity = Math.sin(clock.getElapsedTime() * Math.PI * 2) > 0 ? 3 : 0.2;
  });
  return (
    <group name="aircraft-lights">
      {tops.map((t, i) => (
        <mesh key={i} position={t} geometry={sphere} material={material} />
      ))}
    </group>
  );
}

/** Draws any list of parts with one instanced mesh per (shape, material) group. */
export function PartsMesh({
  parts,
  palette,
  plan,
  night = false,
  name,
}: {
  parts: Part[];
  palette: Palette;
  plan: PlanShape;
  night?: boolean;
  name: string;
}) {
  const groups = useMemo(() => groupParts(parts), [parts]);
  const blinkers = useMemo(() => parts.filter((p) => p.animate === 'blink'), [parts]);
  return (
    <group name={name}>
      {groups.map((g) => (
        <Group key={g.key} group={g} palette={palette} plan={plan} night={night} />
      ))}
      {night && blinkers.length > 0 && <AircraftLights parts={blinkers} />}
    </group>
  );
}
```

- [ ] **Step 6: Replace `src/scene/Building.tsx` with**

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FLOOR_HEIGHT, floorSlices } from '../sim/geometry';
import type { Design, Site } from '../sim/types';
import { bodyInstances, facadeColor, instanceMatrix, slabInstances, unitGeometry, type BoxInstance } from './buildingGeometry';
import { crownParts } from './crownParts';
import { lotCenter } from './layout';
import { bracingParts, ornamentParts } from './ornaments';
import { PartsMesh } from './parts/PartsMesh';

function Instanced({ geometry, items, color, name }: { geometry: THREE.BufferGeometry; items: BoxInstance[]; color: string; name: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => mesh.setMatrixAt(i, instanceMatrix(it)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh key={items.length} name={name} ref={ref} args={[geometry, undefined, items.length]}>
      <meshStandardMaterial color={color} flatShading roughness={0.5} metalness={0.2} />
    </instancedMesh>
  );
}

/** Free a memoised geometry when it is replaced or unmounted; R3F does not dispose geometries passed as props. */
function useDisposable<T extends { dispose: () => void }>(resource: T): T {
  useEffect(() => () => resource.dispose(), [resource]);
  return resource;
}

function Amenities({ design, geometry }: { design: Design; geometry: THREE.BufferGeometry }) {
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const roofY = design.floors * FLOOR_HEIGHT;
  const band = (fraction: number) => slices[Math.min(slices.length - 1, Math.floor(slices.length * fraction))];
  const deck = band(0.9);
  const garden = band(0.5);
  return (
    <group name="amenities">
      {design.amenities.includes('helipad') && (
        <mesh position={[0, roofY + 0.4, 0]}>
          <cylinderGeometry args={[Math.min(top.width, top.depth) * 0.35, Math.min(top.width, top.depth) * 0.35, 0.6, 24]} />
          <meshStandardMaterial color="#3b3f45" />
        </mesh>
      )}
      {design.amenities.includes('pool') && (
        <mesh position={[0, roofY + 0.5, 0]} rotation={[0, top.rotation, 0]} scale={[top.width * 0.5, 0.6, top.depth * 0.3]}>
          <boxGeometry />
          <meshStandardMaterial color="#3fa9f5" />
        </mesh>
      )}
      {design.amenities.includes('observation-deck') && (
        <mesh geometry={geometry} position={[0, deck.y + FLOOR_HEIGHT * 0.75, 0]} rotation={[0, deck.rotation, 0]} scale={[deck.width * 1.12, FLOOR_HEIGHT * 1.5, deck.depth * 1.12]}>
          <meshStandardMaterial color="#bfe9ff" transparent opacity={0.65} />
        </mesh>
      )}
      {design.amenities.includes('sky-garden') && (
        <mesh geometry={geometry} position={[0, garden.y + FLOOR_HEIGHT / 2, 0]} rotation={[0, garden.rotation, 0]} scale={[garden.width * 1.06, FLOOR_HEIGHT, garden.depth * 1.06]}>
          <meshStandardMaterial color="#4caf50" flatShading />
        </mesh>
      )}
    </group>
  );
}

export function Building({ site, design, night = false }: { site: Site; design: Design; night?: boolean }) {
  const [lx, lz] = lotCenter(site);
  const geometry = useDisposable(useMemo(() => unitGeometry(design.shape), [design.shape]));
  const body = useMemo(() => bodyInstances(design), [design]);
  const slabs = useMemo(() => slabInstances(design), [design]);
  const crown = useMemo(() => crownParts(design), [design]);
  const ornaments = useMemo(() => ornamentParts(design), [design]);
  const bracing = useMemo(() => bracingParts(design), [design]);
  const look = { palette: design.palette, plan: design.shape, night };
  return (
    <group name="building" position={[lx, 0, lz]}>
      <Instanced name="body" geometry={geometry} items={body} color={facadeColor(design)} />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} />
      <PartsMesh name="crown" parts={crown} {...look} />
      <PartsMesh name="ornaments" parts={ornaments} {...look} />
      <PartsMesh name="bracing" parts={bracing} {...look} />
      <Amenities design={design} geometry={geometry} />
    </group>
  );
}
```

- [ ] **Step 7: Edit `src/scene/buildingGeometry.ts`**

Delete everything from the line starting `export interface Strut {` up to (not including) the line starting `export function instanceMatrix(`.

- [ ] **Step 8: Edit `src/scene/buildingGeometry.test.ts`**

Replace:

```ts
import { bodyInstances, bracingStruts, facadeColor, slabInstances } from './buildingGeometry';
```
with:

```ts
import { bodyInstances, facadeColor, slabInstances } from './buildingGeometry';
```

Delete everything from the line starting `it('adds X-bracing only for exposed structure'` up to (not including) the line starting `it('glass towers use the glass colour'`.

- [ ] **Step 9: Run the tests and type-check**

Run: `npx vitest run src/scene/parts/geometries.test.ts src/scene/Building.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  23 passed (23)`, `Tests  199 passed (199)`.

- [ ] **Step 10: Commit**

```bash
git add src/scene/parts/geometries.ts src/scene/parts/geometries.test.ts src/scene/parts/materials.ts src/scene/parts/PartsMesh.tsx src/scene/Building.test.tsx src/scene/Building.tsx src/scene/buildingGeometry.ts src/scene/buildingGeometry.test.ts
git commit -m "feat: instanced parts renderer; Building draws crowns, ornaments and bracing from parts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 7: Painted facade tile

A pure description of one bay of facade (wall, spandrel decoration, panes, frames) laid out from the recipe, plus a painter that draws it onto any 2D canvas, either in colour or as a black-and-white night-glow mask. No canvas is needed to test it.

**Files:**
- Create: `src/scene/facadeTile.ts`
- Create: `src/scene/facadeTile.test.ts`

**Interfaces:**
- Consumes: Task 2: `facadeRecipe`, `FacadeRecipe`, `FacadeColors`.
- Produces:
  - `src/scene/facadeTile.ts`: `TilePaint`, `TileShape`, `TileLayout { widthM, heightM, shapes }`, `TILE_HEIGHT_M` (3.4), `openingFor(windowRatio)`, `tileLayout(recipe)`, `glassShare(layout)`, `TileCanvas`, `paintTile(ctx, layout, colors, px, py, mode)`.

- [ ] **Step 1: Write the failing tests**

`src/scene/facadeTile.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SPANDREL_IDS, WINDOW_PATTERN_IDS } from '../sim/catalog/ids';
import { facadeRecipe } from '../sim/facade';
import { designFor } from '../sim/testUtils';
import { glassShare, paintTile, tileLayout, type TileCanvas } from './facadeTile';

function recorder() {
  const calls: string[] = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: (...a: number[]) => calls.push(`fillRect ${ctx.fillStyle} ${a.map((v) => v.toFixed(1)).join(',')}`),
    beginPath: () => calls.push('beginPath'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    closePath: () => calls.push('closePath'),
    fill: () => calls.push(`fill ${ctx.fillStyle}`),
    stroke: () => calls.push(`stroke ${ctx.strokeStyle}`),
  };
  return { ctx: ctx as unknown as TileCanvas, calls };
}

describe('facade tile', () => {
  it('lays out every window pattern with every spandrel, inside the tile', () => {
    for (const windowPattern of WINDOW_PATTERN_IDS)
      for (const spandrel of SPANDREL_IDS) {
        const { design } = designFor('chicago', { windowPattern, spandrel });
        const layout = tileLayout(facadeRecipe(design));
        expect(layout.widthM).toBeGreaterThanOrEqual(3);
        for (const s of layout.shapes) {
          const pts = s.kind === 'rect' ? [[s.x, s.y], [s.x + s.w, s.y + s.h]] : s.points;
          for (const [x, y] of pts) {
            expect(x, windowPattern).toBeGreaterThanOrEqual(-1e-9);
            expect(x, windowPattern).toBeLessThanOrEqual(1 + 1e-9);
            expect(y, windowPattern).toBeGreaterThanOrEqual(-1e-9);
            expect(y, windowPattern).toBeLessThanOrEqual(1 + 1e-9);
          }
        }
      }
  });

  it('more window area means more glass in the tile', () => {
    const { design } = designFor('chicago', { windowPattern: 'punched' });
    const share = (windowRatio: number) => glassShare(tileLayout(facadeRecipe({ ...design, windowRatio })));
    expect(share(0.3)).toBeLessThan(share(0.6));
    expect(share(0.6)).toBeLessThan(share(0.9));
    expect(share(0.6)).toBeGreaterThan(0.4);
  });

  it('Chicago windows have three panes; arched windows get a pointed head', () => {
    const { design } = designFor('chicago');
    const panes = (d: typeof design) => tileLayout(facadeRecipe(d)).shapes.filter((s) => s.kind === 'rect' && s.fill === 'glass');
    expect(panes({ ...design, windowPattern: 'chicago' })).toHaveLength(3);
    const arched = tileLayout(facadeRecipe({ ...design, windowPattern: 'arched' }));
    expect(arched.shapes.some((s) => s.kind === 'poly' && s.fill === 'glass')).toBe(true);
  });

  it('paints the facade in recipe colours and the glow map in black and white', () => {
    const { design } = designFor('chicago', { windowPattern: 'chicago', spandrel: 'stripes' });
    const recipe = facadeRecipe(design);
    const layout = tileLayout(recipe);
    const color = recorder();
    paintTile(color.ctx, layout, recipe.colors, 64, 48, 'color');
    expect(color.calls[0]).toContain(`fillRect ${recipe.colors.wall} 0.0,0.0,64.0,48.0`);
    expect(color.calls.some((c) => c.includes(recipe.colors.glass))).toBe(true);
    const glow = recorder();
    paintTile(glow.ctx, layout, recipe.colors, 64, 48, 'glow');
    const fills = new Set(glow.calls.filter((c) => c.startsWith('fill')).map((c) => c.split(' ')[1]));
    expect([...fills].sort()).toEqual(['#000000', '#ffffff']);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/facadeTile.test.ts`

Expected: FAIL — `Failed to resolve import "./facadeTile"`.

- [ ] **Step 3: Create `src/scene/facadeTile.ts`**

```ts
import type { FacadeColors, FacadeRecipe } from '../sim/facade';

/** Which recipe colour a shape is painted with. */
export type TilePaint = keyof FacadeColors;

/** Tile coordinates are fractions: x 0..1 across one bay, y 0..1 from the bottom of the floor up. */
export type TileShape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: TilePaint; glow?: boolean }
  | { kind: 'poly'; points: [number, number][]; fill: TilePaint; glow?: boolean }
  | { kind: 'line'; points: [number, number][]; stroke: TilePaint; width: number };

export interface TileLayout {
  /** Size of one tile in metres. */
  widthM: number;
  heightM: number;
  shapes: TileShape[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Height of the glazed part of a floor (the slab band takes the rest). */
export const TILE_HEIGHT_M = 3.4;

/** The window opening for a window-area share: wide and tall enough that glass ≈ that share of the tile. */
export function openingFor(windowRatio: number): { x: number; y: number; w: number; h: number } {
  const h = clamp(Math.sqrt(windowRatio) * 1.05, 0.3, 0.92);
  const w = clamp(windowRatio / h, 0.2, 0.98);
  return { x: (1 - w) / 2, y: (1 - h) * 0.6, w, h };
}

/** Lays out one bay of facade: wall, spandrel decoration, panes, frames. Pure — no canvas. */
export function tileLayout(recipe: FacadeRecipe): TileLayout {
  const { pattern, spandrel, windowRatio } = recipe;
  const shapes: TileShape[] = [{ kind: 'rect', x: 0, y: 0, w: 1, h: 1, fill: 'wall' }];
  const o = openingFor(windowRatio);

  if (spandrel.motif === 'stripes') {
    shapes.push({ kind: 'rect', x: 0, y: o.y * 0.2, w: 1, h: o.y * 0.25, fill: 'accent' });
    shapes.push({ kind: 'rect', x: 0, y: o.y * 0.6, w: 1, h: o.y * 0.25, fill: 'spandrel' });
  } else if (spandrel.motif === 'chevron') {
    const top = o.y * 0.85;
    const points: [number, number][] = [];
    for (let i = 0; i <= 8; i++) points.push([i / 8, i % 2 === 0 ? top * 0.25 : top]);
    shapes.push({ kind: 'line', points, stroke: 'accent', width: 0.05 });
  }

  const archH = pattern.arch ? o.h * 0.22 : 0;
  for (const pane of pattern.panes) {
    const x = o.x + pane.x0 * o.w;
    const w = (pane.x1 - pane.x0) * o.w;
    shapes.push({ kind: 'rect', x, y: o.y, w, h: o.h - archH, fill: 'glass', glow: true });
    if (archH > 0) {
      const base = o.y + o.h - archH;
      shapes.push({ kind: 'poly', points: [[x, base], [x + w / 2, o.y + o.h], [x + w, base]], fill: 'glass', glow: true });
    }
    const f = pattern.frame;
    const frame: [number, number][] = [[x, o.y], [x + w, o.y], [x + w, o.y + o.h - archH], [x, o.y + o.h - archH], [x, o.y]];
    shapes.push({ kind: 'line', points: frame, stroke: 'frame', width: f });
  }
  if (pattern.diagonals) {
    shapes.push({ kind: 'line', points: [[o.x, o.y], [o.x + o.w, o.y + o.h]], stroke: 'frame', width: pattern.frame });
    shapes.push({ kind: 'line', points: [[o.x, o.y + o.h], [o.x + o.w, o.y]], stroke: 'frame', width: pattern.frame });
  }
  return { widthM: pattern.bayWidth, heightM: TILE_HEIGHT_M, shapes };
}

/** Fraction of the tile that is glass. */
export function glassShare(layout: TileLayout): number {
  return layout.shapes.reduce((s, sh) => {
    if (sh.kind === 'rect' && sh.fill === 'glass') return s + sh.w * sh.h;
    if (sh.kind === 'poly' && sh.fill === 'glass') {
      const [a, b, c] = sh.points;
      return s + Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    }
    return s;
  }, 0);
}

/** The bits of CanvasRenderingContext2D the painter uses (so tests can record calls). */
export type TileCanvas = Pick<
  CanvasRenderingContext2D,
  'fillStyle' | 'strokeStyle' | 'lineWidth' | 'fillRect' | 'beginPath' | 'moveTo' | 'lineTo' | 'closePath' | 'fill' | 'stroke'
>;

/**
 * Paints a layout onto a canvas `px` wide and `py` tall.
 * 'color' paints the facade; 'glow' paints window glass white on black, for night lights.
 */
export function paintTile(ctx: TileCanvas, layout: TileLayout, colors: FacadeColors, px: number, py: number, mode: 'color' | 'glow'): void {
  const X = (x: number) => x * px;
  const Y = (y: number) => (1 - y) * py; // canvas y runs downward
  const paint = (fill: TilePaint, glow?: boolean) => (mode === 'color' ? colors[fill] : glow ? '#ffffff' : '#000000');
  for (const s of layout.shapes) {
    if (s.kind === 'rect') {
      ctx.fillStyle = paint(s.fill, s.glow);
      ctx.fillRect(X(s.x), Y(s.y + s.h), s.w * px, s.h * py);
    } else if (s.kind === 'poly') {
      ctx.fillStyle = paint(s.fill, s.glow);
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y))));
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = mode === 'color' ? colors[s.stroke] : '#000000';
      ctx.lineWidth = Math.max(1, s.width * px);
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y))));
      ctx.stroke();
    }
  }
}
```

- [ ] **Step 4: Run the tests and type-check**

Run: `npx vitest run src/scene/facadeTile.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  24 passed (24)`, `Tests  203 passed (203)`.

- [ ] **Step 5: Commit**

```bash
git add src/scene/facadeTile.ts src/scene/facadeTile.test.ts
git commit -m "feat: facade tile layout and painter

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 8: Facade material, night windows and neighbors

The tower body now wears the painted tile. A small shader patch on `MeshStandardMaterial` repeats it in real metres using each instance's scale, so tapered floors keep full-size bays. At night it lights windows, gated per window by a fixed hash against a lit share that depends on the floor's use. Neighbors get a plain window grid tinted by their colour, which glows at night too. In jsdom, which has no canvas, everything falls back to plain colours.

**Files:**
- Create: `src/scene/nightWindows.ts`
- Create: `src/scene/nightWindows.test.ts`
- Create: `src/scene/FacadeMaterial.ts`
- Create: `src/scene/FacadeMaterial.test.ts`
- Create: `src/scene/facadeTexture.ts`
- Replace: `src/test/setup.ts`
- Replace: `src/scene/Neighbors.tsx`
- Modify: `src/scene/Building.tsx`

**Interfaces:**
- Consumes: Task 7: `tileLayout`, `paintTile`, `TILE_HEIGHT_M`. Task 2: `facadeRecipe`. `floorUses` from `src/sim/analysis/massing.ts`. Task 6: `Building` with `night`.
- Produces:
  - `src/scene/nightWindows.ts`: `NIGHT_LIGHTS`, `windowHash(bay, floor)`, `windowLit(bay, floor, share)`, `WINDOW_HASH_GLSL`, `nightWindowAttributes(design)`.
  - `src/scene/FacadeMaterial.ts`: `FacadeMaterialOptions`, `FacadeUniforms`, `patchFacadeShader(shader, uniforms)`, `createFacadeMaterial(options)`, `setFacadeNight(material, night)`.
  - `src/scene/facadeTexture.ts`: `FacadeTextures`, `facadeTextures(recipe): FacadeTextures | null` (cached per look).
  - `<Neighbors site night? />`.
  - `src/test/setup.ts`: `HTMLCanvasElement.prototype.getContext` returns `null` in tests.

- [ ] **Step 1: Write the failing tests**

`src/scene/nightWindows.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import { NIGHT_LIGHTS, nightWindowAttributes, windowHash, windowLit } from './nightWindows';

describe('night windows', () => {
  it('always lights the same windows', () => {
    for (let bay = 0; bay < 20; bay++) expect(windowLit(bay, 7, 0.5)).toBe(windowLit(bay, 7, 0.5));
  });

  it('wraps big and negative window numbers the way the shader does', () => {
    expect(windowHash(-3, 7)).toBeCloseTo(windowHash(98, 7), 9);
    expect(windowHash(5, 7 + 89)).toBeCloseTo(windowHash(5, 7), 9);
  });

  it('lights about the share asked for', () => {
    for (const share of [0.4, 0.6, 0.9]) {
      let on = 0;
      for (let bay = 0; bay < 60; bay++) for (let floor = 0; floor < 60; floor++) if (windowLit(bay, floor, share)) on++;
      expect(on / 3600).toBeGreaterThan(share - 0.05);
      expect(on / 3600).toBeLessThan(share + 0.05);
    }
  });

  it("gives each floor its use's lit share and colour", () => {
    const { design } = designFor('chicago', { floors: 10, useMix: { retail: 10, office: 50, hotel: 0, residential: 40 } });
    const a = nightWindowAttributes(design);
    expect(Array.from(a.floor)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(a.lit[0]).toBeCloseTo(NIGHT_LIGHTS.retail.lit);
    expect(a.lit[3]).toBeCloseTo(NIGHT_LIGHTS.office.lit);
    expect(a.lit[9]).toBeCloseTo(NIGHT_LIGHTS.residential.lit);
    expect(a.color).toHaveLength(30);
  });
});
```

`src/scene/FacadeMaterial.test.ts`:

```ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createFacadeMaterial, patchFacadeShader, setFacadeNight, type FacadeUniforms } from './FacadeMaterial';

const options = { map: null, glowMap: null, tileWidth: 3, tileHeight: 3.4, roughness: 0.5, metalness: 0.2, color: '#808080' };

describe('facade material', () => {
  it('patches every shader hook it relies on in this version of three', () => {
    const shader = {
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      uniforms: {} as Record<string, unknown>,
    };
    const uniforms: FacadeUniforms = { uNight: { value: 0 }, uTileSize: { value: new THREE.Vector2(3, 3.4) }, uGlowMap: { value: null } };
    patchFacadeShader(shader, uniforms);
    expect(shader.vertexShader).toContain('vFacadeUv = vec2(');
    expect(shader.vertexShader).toContain('attribute float aFloor;');
    expect(shader.fragmentShader).toContain('texture2D( map, vFacadeUv )');
    expect(shader.fragmentShader).toContain('windowHash( floor( vFacadeUv.x )');
    expect(shader.fragmentShader).toContain('mod(bay, 101.0)');
    expect(shader.fragmentShader).not.toContain('texture2D( map, vMapUv )');
    expect(shader.uniforms.uNight).toBe(uniforms.uNight);
  });

  it('falls back to a plain colour without a texture, and only lights up with a glow map', () => {
    const plain = createFacadeMaterial(options);
    expect('#' + plain.color.getHexString()).toBe('#808080');
    setFacadeNight(plain, true);
    expect(plain.userData.facadeUniforms.uNight.value).toBe(0);
    const lit = createFacadeMaterial({ ...options, map: new THREE.Texture(), glowMap: new THREE.Texture() });
    setFacadeNight(lit, true);
    expect(lit.userData.facadeUniforms.uNight.value).toBe(1);
    setFacadeNight(lit, false);
    expect(lit.userData.facadeUniforms.uNight.value).toBe(0);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/nightWindows.test.ts src/scene/FacadeMaterial.test.ts`

Expected: FAIL — `Failed to resolve import "./nightWindows"` and `"./FacadeMaterial"`.

- [ ] **Step 3: Create `src/scene/nightWindows.ts`**

```ts
import { floorUses } from '../sim/analysis/massing';
import type { Design, UseType } from '../sim/types';

/** Share of windows lit at night, and their colour, by what the floor is used for. */
export const NIGHT_LIGHTS: Record<UseType, { lit: number; color: string }> = {
  office: { lit: 0.4, color: '#dfe8ff' },
  residential: { lit: 0.6, color: '#ffcf7a' },
  hotel: { lit: 0.6, color: '#ffd89a' },
  retail: { lit: 0.9, color: '#fff4d6' },
};

/** GLSL-style mod: always positive. */
const mod = (x: number, y: number) => x - y * Math.floor(x / y);

/**
 * Same hash the facade shader uses: a fixed pseudo-random number 0..1 for a window.
 * Inputs are wrapped to small numbers because GPU sine loses precision on big ones.
 */
export function windowHash(bay: number, floor: number): number {
  const v = Math.sin(mod(bay, 101) * 12.9898 + mod(floor, 89) * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Whether the window in this bay on this floor is lit, for a lit share 0..1. Never flickers. */
export function windowLit(bay: number, floor: number, share: number): boolean {
  return windowHash(bay, floor) < share;
}

/** GLSL twin of windowHash, used by the facade material. */
export const WINDOW_HASH_GLSL = /* glsl */ `
float windowHash(float bay, float floorIndex) {
  return fract(sin(mod(bay, 101.0) * 12.9898 + mod(floorIndex, 89.0) * 78.233) * 43758.5453);
}`;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Per-floor instance data for the facade shader: floor index, lit share and light colour. */
export function nightWindowAttributes(design: Design): { floor: Float32Array; lit: Float32Array; color: Float32Array } {
  const uses = floorUses(design);
  const floor = new Float32Array(uses.length);
  const lit = new Float32Array(uses.length);
  const color = new Float32Array(uses.length * 3);
  uses.forEach((u, i) => {
    floor[i] = i;
    lit[i] = NIGHT_LIGHTS[u].lit;
    color.set(rgb(NIGHT_LIGHTS[u].color), i * 3);
  });
  return { floor, lit, color };
}
```

- [ ] **Step 4: Create `src/scene/FacadeMaterial.ts`**

```ts
import * as THREE from 'three';
import { WINDOW_HASH_GLSL } from './nightWindows';

export interface FacadeMaterialOptions {
  map: THREE.Texture | null;
  glowMap: THREE.Texture | null;
  /** Metres covered by one tile across and up. */
  tileWidth: number;
  tileHeight: number;
  roughness: number;
  metalness: number;
  /** Plain colour used when there is no texture (tests, or a canvas-less browser). */
  color: string;
}

export interface FacadeUniforms {
  uNight: { value: number };
  uTileSize: { value: THREE.Vector2 };
  uGlowMap: { value: THREE.Texture | null };
}

const VERTEX_HEAD = /* glsl */ `
attribute float aFloor;
attribute float aLit;
attribute vec3 aLitColor;
uniform vec2 uTileSize;
varying vec2 vFacadeUv;
varying float vFloor;
varying float vLit;
varying vec3 vLitColor;
`;

/**
 * Facade UVs in metres: across = distance along the wall, up = height from the bottom of the instance.
 * Scale comes from the instance matrix, so a tapered floor keeps full-size window bays.
 */
const VERTEX_UV = /* glsl */ `
#include <begin_vertex>
vec3 facadeScale = vec3(1.0);
#ifdef USE_INSTANCING
  facadeScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#endif
vec3 facadePos = position * facadeScale;
vec3 along = cross(vec3(0.0, 1.0, 0.0), normal);
float alongLen = length(along);
float u = alongLen > 0.5 ? dot(facadePos, along / alongLen) : 0.0;
vFacadeUv = vec2(u / uTileSize.x, (facadePos.y + 0.5 * facadeScale.y) / uTileSize.y);
vFloor = aFloor;
vLit = aLit;
vLitColor = aLitColor;
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uNight;
uniform sampler2D uGlowMap;
varying vec2 vFacadeUv;
varying float vFloor;
varying float vLit;
varying vec3 vLitColor;
${WINDOW_HASH_GLSL}
`;

const FRAGMENT_MAP = /* glsl */ `
#ifdef USE_MAP
  diffuseColor *= texture2D( map, vFacadeUv );
#endif
`;

const FRAGMENT_GLOW = /* glsl */ `
#include <emissivemap_fragment>
if (uNight > 0.0) {
  float glass = texture2D( uGlowMap, vFacadeUv ).r;
  // vFloor is the same at every vertex but interpolation can wobble it, so round it.
  float on = step( windowHash( floor( vFacadeUv.x ), floor( vFloor + 0.5 ) + floor( vFacadeUv.y ) ), vLit );
  totalEmissiveRadiance += uNight * glass * on * vLitColor * 1.3;
}
`;

/** Rewrites a standard material's shaders so the facade tile repeats in metres and windows light up at night. */
export function patchFacadeShader(shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> }, uniforms: FacadeUniforms): void {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
    .replace('#include <begin_vertex>', VERTEX_UV);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${FRAGMENT_HEAD}`)
    .replace('#include <map_fragment>', FRAGMENT_MAP)
    .replace('#include <emissivemap_fragment>', FRAGMENT_GLOW);
}

/** A standard material wearing a facade tile. Turn the night lights on with `setFacadeNight`. */
export function createFacadeMaterial(o: FacadeMaterialOptions): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: o.map ? '#ffffff' : o.color,
    map: o.map,
    roughness: o.roughness,
    metalness: o.metalness,
    flatShading: true,
  });
  const uniforms: FacadeUniforms = {
    uNight: { value: 0 },
    uTileSize: { value: new THREE.Vector2(o.tileWidth, o.tileHeight) },
    uGlowMap: { value: o.glowMap },
  };
  material.userData.facadeUniforms = uniforms;
  material.onBeforeCompile = (shader) => patchFacadeShader(shader, uniforms);
  material.customProgramCacheKey = () => 'facade-v1';
  return material;
}

export function setFacadeNight(material: THREE.Material, night: boolean): void {
  const u = material.userData.facadeUniforms as FacadeUniforms | undefined;
  if (u) u.uNight.value = night && u.uGlowMap.value ? 1 : 0;
}
```

- [ ] **Step 5: Create `src/scene/facadeTexture.ts`**

```ts
import * as THREE from 'three';
import type { FacadeRecipe } from '../sim/facade';
import { paintTile, tileLayout, type TileLayout } from './facadeTile';

export interface FacadeTextures {
  layout: TileLayout;
  map: THREE.CanvasTexture;
  glowMap: THREE.CanvasTexture;
}

const PX = 128;
const cache = new Map<string, FacadeTextures | null>();

function canvasTexture(layout: TileLayout, recipe: FacadeRecipe, mode: 'color' | 'glow'): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = PX;
  canvas.height = Math.round((PX * layout.heightM) / layout.widthM);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paintTile(ctx, layout, recipe.colors, canvas.width, canvas.height, mode);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if (mode === 'color') tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The painted facade tile and its night-glow mask, made once per look and kept for the session
 * (there are only a few dozen looks). Returns null where canvas isn't available.
 */
export function facadeTextures(recipe: FacadeRecipe): FacadeTextures | null {
  const key = JSON.stringify([recipe.pattern.id, recipe.spandrel.id, recipe.windowRatio, recipe.colors]);
  if (cache.has(key)) return cache.get(key)!;
  const layout = tileLayout(recipe);
  const map = canvasTexture(layout, recipe, 'color');
  const glowMap = map && canvasTexture(layout, recipe, 'glow');
  const result = map && glowMap ? { layout, map, glowMap } : null;
  cache.set(key, result);
  return result;
}
```

- [ ] **Step 6: Replace `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no 2D canvas. Say so quietly (instead of logging "not implemented") so code falls back to plain colours.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;

afterEach(() => cleanup());
```

- [ ] **Step 7: Edit `src/scene/Building.tsx`**

Replace:

```tsx
import { bodyInstances, facadeColor, instanceMatrix, slabInstances, unitGeometry, type BoxInstance } from './buildingGeometry';
```
with:

```tsx
import { facadeRecipe } from '../sim/facade';
import { bodyInstances, facadeColor, instanceMatrix, slabInstances, unitGeometry, type BoxInstance } from './buildingGeometry';
import { createFacadeMaterial, setFacadeNight } from './FacadeMaterial';
import { TILE_HEIGHT_M } from './facadeTile';
import { facadeTextures } from './facadeTexture';
import { nightWindowAttributes } from './nightWindows';
```

Replace:

```tsx
  useEffect(() => () => resource.dispose(), [resource]);
  return resource;
}
```
with:

```tsx
  useEffect(() => () => resource.dispose(), [resource]);
  return resource;
}

/** The glazed part of every floor, wearing the painted facade tile; windows light up at night. */
function Body({ design, night }: { design: Design; night: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => bodyInstances(design), [design]);
  const recipe = useMemo(() => facadeRecipe(design), [design]);
  const textures = useMemo(() => facadeTextures(recipe), [recipe]);
  const geometry = useDisposable(
    useMemo(() => {
      const g = unitGeometry(design.shape);
      const a = nightWindowAttributes(design);
      g.setAttribute('aFloor', new THREE.InstancedBufferAttribute(a.floor, 1));
      g.setAttribute('aLit', new THREE.InstancedBufferAttribute(a.lit, 1));
      g.setAttribute('aLitColor', new THREE.InstancedBufferAttribute(a.color, 3));
      return g;
    }, [design]),
  );
  const material = useDisposable(
    useMemo(
      () =>
        createFacadeMaterial({
          map: textures?.map ?? null,
          glowMap: textures?.glowMap ?? null,
          tileWidth: textures?.layout.widthM ?? recipe.pattern.bayWidth,
          tileHeight: textures?.layout.heightM ?? TILE_HEIGHT_M,
          roughness: recipe.roughness,
          metalness: recipe.metalness,
          color: facadeColor(design),
        }),
      [textures, recipe, design],
    ),
  );
  useEffect(() => setFacadeNight(material, night), [material, night]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => mesh.setMatrixAt(i, instanceMatrix(it)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, geometry]);
  return <instancedMesh key={items.length} name="body" ref={ref} args={[geometry, material, items.length]} />;
}
```

Replace:

```tsx
  const geometry = useDisposable(useMemo(() => unitGeometry(design.shape), [design.shape]));
  const body = useMemo(() => bodyInstances(design), [design]);
  const slabs
```
with:

```tsx
  const geometry = useDisposable(useMemo(() => unitGeometry(design.shape), [design.shape]));
  const slabs
```

Replace:

```tsx
      <Instanced name="body" geometry={geometry} items={body} color={facadeColor(design)} />
```
with:

```tsx
      <Body design={design} night={night} />
```

- [ ] **Step 8: Replace `src/scene/Neighbors.tsx`**

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SPANDRELS, WINDOW_PATTERNS } from '../sim/catalog/facades';
import type { Site } from '../sim/types';
import { createFacadeMaterial, setFacadeNight } from './FacadeMaterial';
import { facadeTextures } from './facadeTexture';
import { generateNeighbors, mulberry32 } from './layout';

/** A plain grey window grid; each neighbour's own colour tints it. */
const NEIGHBOR_RECIPE = {
  pattern: WINDOW_PATTERNS.punched,
  spandrel: SPANDRELS.plain,
  windowRatio: 0.55,
  colors: { wall: '#ffffff', glass: '#7d8794', frame: '#c9c9c9', spandrel: '#ffffff', accent: '#e0e0e0' },
  roughness: 0.8,
  metalness: 0.1,
};

export function Neighbors({ site, night = false }: { site: Site; night?: boolean }) {
  const blocks = useMemo(() => generateNeighbors(site), [site]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const box = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const rand = mulberry32(blocks.length + 7);
    g.setAttribute('aFloor', new THREE.InstancedBufferAttribute(Float32Array.from(blocks, () => Math.floor(rand() * 89)), 1));
    g.setAttribute('aLit', new THREE.InstancedBufferAttribute(Float32Array.from(blocks, () => 0.25 + rand() * 0.2), 1));
    g.setAttribute('aLitColor', new THREE.InstancedBufferAttribute(new Float32Array(blocks.length * 3).fill(0.95), 3));
    return g;
  }, [blocks]);
  const material = useMemo(() => {
    const t = facadeTextures(NEIGHBOR_RECIPE);
    return createFacadeMaterial({
      map: t?.map ?? null,
      glowMap: t?.glowMap ?? null,
      tileWidth: t?.layout.widthM ?? 3.5,
      tileHeight: 4,
      roughness: 0.8,
      metalness: 0.1,
      color: '#ffffff',
    });
  }, []);
  useEffect(() => () => box.dispose(), [box]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => setFacadeNight(material, night), [material, night]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    blocks.forEach((b, i) => {
      m.compose(new THREE.Vector3(b.x, b.height / 2, b.z), new THREE.Quaternion(), new THREE.Vector3(b.width, b.height, b.depth));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new THREE.Color(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blocks]);
  return <instancedMesh key={site.id} name="neighbors" ref={ref} args={[box, material, blocks.length]} />;
}
```

- [ ] **Step 9: Run the tests and type-check**

Run: `npx vitest run src/scene/nightWindows.test.ts src/scene/FacadeMaterial.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  26 passed (26)`, `Tests  209 passed (209)`.

- [ ] **Step 10: Commit**

```bash
git add src/scene/nightWindows.ts src/scene/nightWindows.test.ts src/scene/FacadeMaterial.ts src/scene/FacadeMaterial.test.ts src/scene/facadeTexture.ts src/test/setup.ts src/scene/Neighbors.tsx src/scene/Building.tsx
git commit -m "feat: painted facades in metres with night window lights

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 9: Day/night toggle

`timeOfDay` is view state in the store. It is not part of the design or its history, and it works in every phase. The scene switches sky and lights and passes `night` to the tower and neighbors. A sun/moon button sits in the scene overlay.

**Files:**
- Create: `src/state/timeOfDay.test.ts`
- Create: `src/scene/Scene.test.ts`
- Modify: `src/state/store.ts`
- Modify: `src/scene/Scene.tsx`

**Interfaces:**
- Consumes: Tasks 6 and 8: `Building` and `Neighbors` `night` props.
- Produces:
  - Store: `TimeOfDay = 'day' | 'night'`, `timeOfDay`, `setTimeOfDay(t)`; `newProject()` resets to `'day'`.
  - `src/scene/Scene.tsx`: exported `lighting(site, night)` → `{ sky, hemi, hemiSky, sun, sunColor }`; toggle button labelled `🌙 Night` / `☀️ Day` with `aria-pressed`.

- [ ] **Step 1: Write the failing tests**

`src/state/timeOfDay.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from './store';

const state = () => useGame.getState();

describe('time of day', () => {
  beforeEach(() => {
    state().newProject();
    state().startProject('chicago', 'sandbox');
  });

  it('switches to night without touching the design history', () => {
    const history = state().history;
    state().setTimeOfDay('night');
    expect(state().timeOfDay).toBe('night');
    expect(state().history).toBe(history);
  });

  it('still works after the design is locked', () => {
    state().build();
    state().setTimeOfDay('night');
    expect(state().timeOfDay).toBe('night');
  });

  it('a new project starts in daylight', () => {
    state().setTimeOfDay('night');
    state().newProject();
    expect(state().timeOfDay).toBe('day');
  });
});
```

`src/scene/Scene.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SITES } from '../sim/sites';
import { lighting } from './Scene';

describe('scene lighting', () => {
  it('uses the city sky by day and a dark, dim sky at night', () => {
    const day = lighting(SITES.tokyo, false);
    const night = lighting(SITES.tokyo, true);
    expect(day.sky).toBe(SITES.tokyo.visuals.sky);
    expect(night.sky).not.toBe(day.sky);
    expect(night.sun).toBeLessThan(day.sun);
    expect(night.hemi).toBeLessThan(day.hemi);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/state/timeOfDay.test.ts src/scene/Scene.test.ts`

Expected: FAIL — `state().setTimeOfDay is not a function` and `lighting is not a function`.

- [ ] **Step 3: Edit `src/state/store.ts`**

Replace:

```ts
export type GameMode = 'challenge' | 'sandbox';
```
with:

```ts
export type GameMode = 'challenge' | 'sandbox';
export type TimeOfDay = 'day' | 'night';
```

Replace:

```ts
  detailLevel: DetailLevel;
  startProject:
```
with:

```ts
  detailLevel: DetailLevel;
  /** View only — not part of the design, its history, or the export. */
  timeOfDay: TimeOfDay;
  startProject:
```

Replace:

```ts
  newProject: () => void;
}
```
with:

```ts
  newProject: () => void;
  setTimeOfDay: (t: TimeOfDay) => void;
}
```

Replace:

```ts
  detailLevel: 'standard',
```
with:

```ts
  detailLevel: 'standard',
  timeOfDay: 'day',
```

Replace:

```ts
  newProject: () => set({ project: null, phase: 'design', history: [], historyIndex: -1, lastCoalesceKey: null }),
```
with:

```ts
  newProject: () =>
    set({ project: null, phase: 'design', history: [], historyIndex: -1, lastCoalesceKey: null, timeOfDay: 'day' }),

  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
```

- [ ] **Step 4: Edit `src/scene/Scene.tsx`**

Replace:

```tsx
import { useCurrent } from '../state/hooks';
```
with:

```tsx
import type { Site } from '../sim/types';
import { useCurrent } from '../state/hooks';
import { useGame } from '../state/store';
```

Replace:

```tsx
export function Scene() {
  const { site, design, analysis } = useCurrent();
  const [nonce, setNonce] = useState(0);
  const frame = cameraFrame(site, analysis.tipHeightM);
  return (
    <div className="scene">
      <Canvas key={site.id} camera={{ position: frame.position, fov: 45, near: 1, far: 6000 }}>
        <color attach="background" args={[site.visuals.sky]} />
        <fog attach="fog" args={[site.visuals.sky, 1400, 3600]} />
        <hemisphereLight args={['#ffffff', site.visuals.ground, 0.9]} />
        <directionalLight position={[300, 600, 250]} intensity={1.8} />
        <SiteDiorama site={site} />
        <Neighbors site={site} />
        <Landmark kind={site.visuals.landmark} />
        <Building site={site} design={design} />
```
with:

```tsx
/** Sky and light for day or night. Night is a simple dusk palette — no light simulation. */
export function lighting(site: Site, night: boolean) {
  return night
    ? { sky: '#0b1426', hemi: 0.4, hemiSky: '#6f85b5', sun: 0.35, sunColor: '#9fb4ff' }
    : { sky: site.visuals.sky, hemi: 0.9, hemiSky: '#ffffff', sun: 1.8, sunColor: '#ffffff' };
}

export function Scene() {
  const { site, design, analysis } = useCurrent();
  const [nonce, setNonce] = useState(0);
  const timeOfDay = useGame((s) => s.timeOfDay);
  const setTimeOfDay = useGame((s) => s.setTimeOfDay);
  const night = timeOfDay === 'night';
  const light = lighting(site, night);
  const frame = cameraFrame(site, analysis.tipHeightM);
  return (
    <div className="scene">
      <Canvas key={site.id} camera={{ position: frame.position, fov: 45, near: 1, far: 6000 }}>
        <color attach="background" args={[light.sky]} />
        <fog attach="fog" args={[light.sky, 1400, 3600]} />
        <hemisphereLight args={[light.hemiSky, site.visuals.ground, light.hemi]} />
        <directionalLight position={[300, 600, 250]} intensity={light.sun} color={light.sunColor} />
        <SiteDiorama site={site} />
        <Neighbors site={site} night={night} />
        <Landmark kind={site.visuals.landmark} />
        <Building site={site} design={design} night={night} />
```

Replace:

```tsx
        <button onClick={() => setNonce((n) => n + 1)}>Fit tower in view</button>
```
with:

```tsx
        <button onClick={() => setNonce((n) => n + 1)}>Fit tower in view</button>
        <button aria-pressed={night} onClick={() => setTimeOfDay(night ? 'day' : 'night')}>
          {night ? '☀️ Day' : '🌙 Night'}
        </button>
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run src/state/timeOfDay.test.ts src/scene/Scene.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  28 passed (28)`, `Tests  213 passed (213)`.

- [ ] **Step 6: Commit**

```bash
git add src/state/timeOfDay.test.ts src/scene/Scene.test.ts src/state/store.ts src/scene/Scene.tsx
git commit -m "feat: day/night toggle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 10: Crown gallery, Details panel and ornament picker

Front-view silhouettes are drawn automatically from each crown's or ornament's own parts, and window and spandrel icons from the tile layout. A generic `OptionGallery` renders any enum param marked `widget: 'gallery'`; crowns are shown in five families, and the current style's choice is starred. `OrnamentsControl` toggles ornaments by group and dims decorative ones while the amount is None.

**Files:**
- Create: `src/scene/silhouette.ts`
- Create: `src/scene/silhouette.test.ts`
- Create: `src/ui/sidebar/icons.tsx`
- Create: `src/ui/sidebar/OptionGallery.tsx`
- Create: `src/ui/sidebar/OrnamentsControl.tsx`
- Create: `src/ui/sidebar/Details.test.tsx`
- Modify: `src/ui/sidebar/ParamControl.tsx`
- Modify: `src/ui/sidebar/ControlGroups.tsx`
- Modify: `src/ui/styles.css`

**Interfaces:**
- Consumes: Task 4: `crownParts`. Task 5: `ornamentParts`. Task 3: `floorRuns`. Task 6: `materialLook`. Task 7: `tileLayout`. Task 2: catalogs, `facadeRecipe`, `add_ornament`/`remove_ornament`.
- Produces:
  - `src/scene/silhouette.ts`: `partOutline(p)`, `Silhouette { viewBox, size, paths }`, `silhouette(parts)`.
  - `src/ui/sidebar/icons.tsx`: `CrownIcon`, `OrnamentIcon`, `TileIcon`.
  - `src/ui/sidebar/OptionGallery.tsx`: `GallerySection`, `OptionGallery`.
  - `src/ui/sidebar/OrnamentsControl.tsx`: `OrnamentsControl`.
  - Accessible names: gallery groups are labelled by the param label (`Crown`, `Windows`, `Spandrels`) plus `Ornaments`; buttons by option label, with ` (style default)` appended for the starred choice.

- [ ] **Step 1: Write the failing tests**

`src/scene/silhouette.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CROWN_IDS } from '../sim/catalog/ids';
import { strutPart, type Part } from '../sim/parts';
import { designFor } from '../sim/testUtils';
import { crownParts } from './crownParts';
import { partOutline, silhouette } from './silhouette';

describe('silhouette', () => {
  it('outlines an upright box as its front rectangle', () => {
    const p: Part = { shape: 'box', position: [0, 5, 0], scale: [4, 10, 2], material: 'body' };
    const o = partOutline(p);
    expect(o).toHaveLength(4);
    expect(Math.min(...o.map((q) => q[1]))).toBeCloseTo(0);
    expect(Math.max(...o.map((q) => q[0]))).toBeCloseTo(2);
  });

  it('outlines a cone as a triangle and a tilted strut along its slope', () => {
    expect(partOutline({ shape: 'cone', position: [0, 0, 0], scale: [2, 4, 2], material: 'steel' })).toHaveLength(3);
    const strut = partOutline(strutPart([0, 0, 0], [10, 10, 0], 0.5, 'steel'));
    expect(Math.max(...strut.map((q) => q[0]))).toBeGreaterThan(9.5);
  });

  it('draws every crown as a non-empty, finite square icon', () => {
    for (const crown of CROWN_IDS) {
      const { design } = designFor('chicago', { crown, floors: 30 });
      const s = silhouette(crownParts(design));
      expect(s.paths.length, crown).toBeGreaterThan(0);
      expect(s.viewBox, crown).not.toMatch(/NaN|Infinity/);
      for (const p of s.paths) expect(p.d, crown).toMatch(/^M/);
    }
  });
});
```

`src/ui/sidebar/Details.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CROWN_IDS } from '../../sim/catalog/ids';
import { selectDesign, useGame } from '../../state/store';
import { Sidebar } from './Sidebar';

const design = () => selectDesign(useGame.getState())!;

describe('crown gallery and details', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
  });

  it('shows all 28 crowns in five families, with the style default starred', () => {
    render(<Sidebar />);
    const gallery = screen.getByRole('group', { name: 'Crown' });
    expect(within(gallery).getAllByRole('button')).toHaveLength(CROWN_IDS.length);
    expect(within(gallery).getByText('Around the World')).toBeInTheDocument();
    expect(within(gallery).getByRole('button', { name: 'Flat roof (style default)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('picking a crown changes the design, marks the style modified, and undoes in one step', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Pagoda tiers' }));
    expect(design().crown).toBe('pagoda');
    expect(screen.getByText(/International Style \(modified\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(design().crown).toBe('flat');
  });

  it('a style preset moves the star and the selection to its own crown', () => {
    render(<Sidebar />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Style' }), { target: { value: 'art-deco' } });
    const gallery = screen.getByRole('group', { name: 'Crown' });
    expect(within(gallery).getByRole('button', { name: 'Deco arches and needle (style default)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('window and spandrel galleries set the painted facade', () => {
    render(<Sidebar />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Windows' })).getByRole('button', { name: 'Chicago windows' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Spandrels' })).getByRole('button', { name: 'Deco chevrons' }));
    expect(design().windowPattern).toBe('chicago');
    expect(design().spandrel).toBe('chevron');
  });

  it('toggles ornaments on and off', () => {
    render(<Sidebar />);
    const ornaments = screen.getByRole('group', { name: 'Ornaments' });
    fireEvent.click(within(ornaments).getByRole('button', { name: 'Gargoyles' }));
    expect(design().ornaments).toContain('gargoyles');
    fireEvent.click(within(ornaments).getByRole('button', { name: 'Gargoyles' }));
    expect(design().ornaments).not.toContain('gargoyles');
    expect(within(ornaments).getByRole('button', { name: 'I-beam mullions (style default)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('dims decorative ornaments while the amount is None', () => {
    render(<Sidebar />);
    const ornaments = screen.getByRole('group', { name: 'Ornaments' });
    fireEvent.click(within(ornaments).getByRole('button', { name: 'Gargoyles' }));
    expect(within(ornaments).getByRole('button', { name: 'Gargoyles' })).toHaveClass('dimmed');
    fireEvent.change(screen.getByRole('combobox', { name: 'Ornament amount' }), { target: { value: 'high' } });
    expect(within(ornaments).getByRole('button', { name: 'Gargoyles' })).not.toHaveClass('dimmed');
  });

  it('notes antennas that do not count toward official height', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Twin antennas' }));
    expect(screen.getByText(/\+24 m antennas/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/silhouette.test.ts src/ui/sidebar/Details.test.tsx`

Expected: FAIL — `Failed to resolve import "./silhouette"`, and the sidebar test finds no group named `Crown`.

- [ ] **Step 3: Create `src/scene/silhouette.ts`**

```ts
import { rotateYXZ, type Part } from '../sim/parts';

type Pt = [number, number];

/** Outline of a unit shape in its own x-y plane (front view), before scale/rotation. */
function unitOutline(p: Part): [number, number, number][] {
  switch (p.shape) {
    case 'cone':
    case 'pyramid':
    case 'plan-cone':
      return [[-0.5, -0.5, 0], [0.5, -0.5, 0], [0, 0.5, 0]];
    case 'wedge':
      return [[-0.5, -0.5, 0], [0.5, -0.5, 0], [-0.5, 0.5, 0]];
    case 'sphere':
      return Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return [0.5 * Math.cos(a), 0.5 * Math.sin(a), 0];
      });
    case 'dome':
      return Array.from({ length: 9 }, (_, i) => {
        const a = (i / 8) * Math.PI;
        return [0.5 * Math.cos(a), -0.5 + Math.sin(a), 0];
      });
    default: {
      const c: [number, number, number][] = [];
      for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) c.push([x, y, z]);
      return c;
    }
  }
}

/** Convex hull (monotone chain), counter-clockwise. */
function hull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** The part as seen from the front: a polygon in world x (right) and y (up). */
export function partOutline(p: Part): Pt[] {
  const pts = unitOutline(p).map(([x, y, z]) => {
    const r = rotateYXZ([x * p.scale[0], y * p.scale[1], z * p.scale[2]], p.rotation);
    return [r[0] + p.position[0], r[1] + p.position[1]] as Pt;
  });
  return hull(pts);
}

export interface Silhouette {
  /** SVG viewBox "minX minY width height" in a y-down frame. */
  viewBox: string;
  /** Width (= height) of the view box, in metres. */
  size: number;
  /** One path per material, so icons can colour the tower and its detail differently. */
  paths: { material: Part['material']; d: string }[];
}

/** Front-view SVG paths for a set of parts, fitted to a square box with a little margin. */
export function silhouette(parts: Part[]): Silhouette {
  const outlines = parts.map((p) => ({ material: p.material, pts: partOutline(p) }));
  const all = outlines.flatMap((o) => o.pts);
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  const size = Math.max(maxX - minX, maxY - minY) * 1.08;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const byMaterial = new Map<Part['material'], string>();
  for (const o of outlines) {
    const d = o.pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x - cx).toFixed(2)} ${(cy - y).toFixed(2)}`).join('') + 'Z';
    byMaterial.set(o.material, (byMaterial.get(o.material) ?? '') + d);
  }
  return {
    size,
    viewBox: `${(-size / 2).toFixed(2)} ${(-size / 2).toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)}`,
    paths: [...byMaterial].map(([material, d]) => ({ material, d })),
  };
}
```

- [ ] **Step 4: Create `src/ui/sidebar/icons.tsx`**

```tsx
import { memo } from 'react';
import { defaultDesign } from '../../sim/design';
import { facadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import type { Part } from '../../sim/parts';
import { SITES } from '../../sim/sites';
import type { CrownId, Design, OrnamentId, Palette } from '../../sim/types';
import { crownParts } from '../../scene/crownParts';
import { tileLayout } from '../../scene/facadeTile';
import { ornamentParts } from '../../scene/ornaments';
import { floorRuns } from '../../scene/parts/placement';
import { materialLook } from '../../scene/parts/materials';
import { silhouette } from '../../scene/silhouette';

/** A small, fixed tower used to draw icons, so every icon is drawn at the same scale. */
function iconDesign(patch: Partial<Design>): Design {
  return { ...defaultDesign(SITES.chicago), shape: 'square', plateWidth: 30, floors: 20, setbacks: 'none', ...patch };
}

/** Tower floors drawn as grey blocks (one per run between setbacks) so the detail stands out. */
function bodyParts(d: Design, fromFloor = 0): Part[] {
  return floorRuns(d, 1000)
    .map((run) => run.filter((s) => s.index >= fromFloor))
    .filter((run) => run.length > 0)
    .map((run) => ({
      shape: 'box' as const,
      position: [0, run[0].y + (run.length * FLOOR_HEIGHT) / 2, 0] as [number, number, number],
      scale: [run[0].width, run.length * FLOOR_HEIGHT, run[0].depth] as [number, number, number],
      material: 'concrete' as const,
    }));
}

function PartsIcon({ parts, palette }: { parts: Part[]; palette: Palette }) {
  const s = silhouette(parts);
  return (
    <svg className="icon" viewBox={s.viewBox} aria-hidden="true">
      {s.paths.map((p) => (
        <path key={p.material} d={p.d} fill={materialLook(p.material, palette).color} stroke="#0006" strokeWidth={s.size * 0.008} />
      ))}
    </svg>
  );
}

export const CrownIcon = memo(function CrownIcon({ crown, palette }: { crown: CrownId; palette: Palette }) {
  const d = iconDesign({ crown });
  return <PartsIcon parts={[...bodyParts(d, d.floors - 4), ...crownParts(d)]} palette={palette} />;
});

export const OrnamentIcon = memo(function OrnamentIcon({ id, palette }: { id: OrnamentId; palette: Palette }) {
  const d = iconDesign({ floors: 14, plateWidth: 24, setbacks: 'few', ornaments: [id], ornament: 'high', crown: 'flat' });
  return <PartsIcon parts={[...bodyParts(d), ...ornamentParts(d)]} palette={palette} />;
});

/** One bay of painted facade, drawn as SVG. */
export const TileIcon = memo(function TileIcon({ design }: { design: Design }) {
  const recipe = facadeRecipe(design);
  const layout = tileLayout(recipe);
  const W = 100;
  const H = (100 * layout.heightM) / layout.widthM;
  const X = (x: number) => x * W;
  const Y = (y: number) => (1 - y) * H;
  const pts = (p: [number, number][]) => p.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  return (
    <svg className="icon" viewBox={`0 0 ${W} ${H.toFixed(1)}`} aria-hidden="true">
      {layout.shapes.map((s, i) =>
        s.kind === 'rect' ? (
          <rect key={i} x={X(s.x)} y={Y(s.y + s.h)} width={s.w * W} height={s.h * H} fill={recipe.colors[s.fill]} />
        ) : s.kind === 'poly' ? (
          <polygon key={i} points={pts(s.points)} fill={recipe.colors[s.fill]} />
        ) : (
          <polyline key={i} points={pts(s.points)} fill="none" stroke={recipe.colors[s.stroke]} strokeWidth={Math.max(1.5, s.width * W)} />
        ),
      )}
    </svg>
  );
});
```

- [ ] **Step 5: Create `src/ui/sidebar/OptionGallery.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { EnumParam } from '../../sim/catalog/parameters';

export interface GallerySection {
  label: string | null;
  values: string[];
}

/** A grid of picture buttons for an enum control, optionally in labelled sections. */
export function OptionGallery({
  def,
  value,
  sections,
  icon,
  defaultValue,
  onPick,
}: {
  def: EnumParam;
  value: string;
  sections: GallerySection[];
  icon: (value: string) => ReactNode;
  /** The current style's own choice — marked with a star. */
  defaultValue?: string;
  onPick: (value: string) => void;
}) {
  const byValue = new Map(def.options.map((o) => [o.value, o]));
  return (
    <div className="gallery" role="group" aria-label={def.label}>
      {sections.map((section) => (
        <div key={section.label ?? 'all'} className="gallery-section">
          {section.label && <div className="label">{section.label}</div>}
          <div className="gallery-grid">
            {section.values.map((v) => {
              const o = byValue.get(v)!;
              const isDefault = v === defaultValue;
              return (
                <button
                  key={v}
                  className="gallery-item"
                  aria-pressed={v === value}
                  aria-label={`${o.label}${isDefault ? ' (style default)' : ''}`}
                  title={`${o.label}${isDefault ? ' ★ style default' : ''}\n${o.explain}`}
                  onClick={() => onPick(v)}
                >
                  {icon(v)}
                  <span className="gallery-caption">
                    {isDefault && <span className="star">★ </span>}
                    {o.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/ui/sidebar/OrnamentsControl.tsx`**

```tsx
import { ORNAMENT_GROUPS, ORNAMENTS } from '../../sim/catalog/facades';
import { ORNAMENT_IDS } from '../../sim/catalog/ids';
import { STYLE_PRESETS } from '../../sim/catalog/styles';
import { useCurrent } from '../../state/hooks';
import { useGame } from '../../state/store';
import { OrnamentIcon } from './icons';

/** Pick any number of ornaments, grouped by where they go on the tower. */
export function OrnamentsControl() {
  const { design } = useCurrent();
  const dispatch = useGame((s) => s.dispatch);
  const styleDefaults = STYLE_PRESETS[design.style].settings.ornaments;
  return (
    <div className="gallery" role="group" aria-label="Ornaments">
      <div className="control-row">
        <span>Ornaments</span>
      </div>
      {ORNAMENT_GROUPS.map((g) => {
        const ids = ORNAMENT_IDS.filter((id) => ORNAMENTS[id].group === g.id);
        return (
          <div key={g.id} className="gallery-section">
            <div className="label">{g.label}</div>
            <div className="gallery-grid">
              {ids.map((id) => {
                const o = ORNAMENTS[id];
                const on = design.ornaments.includes(id);
                const isDefault = styleDefaults.includes(id);
                const off = on && design.ornament === 'none' && o.decorative;
                return (
                  <button
                    key={id}
                    className={`gallery-item${off ? ' dimmed' : ''}`}
                    aria-pressed={on}
                    aria-label={`${o.label}${isDefault ? ' (style default)' : ''}`}
                    title={`${o.label}${isDefault ? ' ★ style default' : ''}\nSeen on ${o.seenOn}. ${o.blurb}${off ? '\nHidden while Ornament amount is None.' : ''}`}
                    onClick={() => dispatch([on ? { type: 'remove_ornament', id } : { type: 'add_ornament', id }])}
                  >
                    <OrnamentIcon id={id} palette={design.palette} />
                    <span className="gallery-caption">
                      {isDefault && <span className="star">★ </span>}
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 7: Edit `src/ui/sidebar/ParamControl.tsx`**

Replace:

```tsx
import { paramMax, type ParamDef } from '../../sim/catalog/parameters';
```
with:

```tsx
import { CROWN_FAMILIES, CROWNS } from '../../sim/catalog/crowns';
import { CROWN_IDS } from '../../sim/catalog/ids';
import { paramMax, type EnumParam, type ParamDef } from '../../sim/catalog/parameters';
import { STYLE_PRESETS, type StyleSettings } from '../../sim/catalog/styles';
import type { CrownId, Design, SpandrelId, WindowPatternId } from '../../sim/types';
```

Replace:

```tsx
import { useGame } from '../../state/store';
```
with:

```tsx
import { useGame } from '../../state/store';
import { CrownIcon, TileIcon } from './icons';
import { OptionGallery, type GallerySection } from './OptionGallery';

/** Crowns are shown by family; other galleries are one section. */
function gallerySections(def: EnumParam): GallerySection[] {
  if (def.id === 'crown') {
    return CROWN_FAMILIES.map((f) => ({ label: f.label, values: CROWN_IDS.filter((id) => CROWNS[id].family === f.id) }));
  }
  return [{ label: null, values: def.options.map((o) => o.value) }];
}

function galleryIcon(id: ParamDef['id'], value: string, design: Design) {
  if (id === 'crown') return <CrownIcon crown={value as CrownId} palette={design.palette} />;
  if (id === 'windowPattern') return <TileIcon design={{ ...design, windowPattern: value as WindowPatternId }} />;
  if (id === 'spandrel') return <TileIcon design={{ ...design, spandrel: value as SpandrelId }} />;
  return null;
}
```

Replace:

```tsx
  } else if (def.kind === 'enum') {
    input = (
```
with:

```tsx
  } else if (def.kind === 'enum' && def.widget === 'gallery') {
    input = null;
  } else if (def.kind === 'enum') {
    input = (
```

Replace:

```tsx
          {selectedOption ? ` ${selectedOption.label}: ${selectedOption.explain}` : ''}
        </p>
      )}
    </div>
```
with:

```tsx
          {selectedOption ? ` ${selectedOption.label}: ${selectedOption.explain}` : ''}
        </p>
      )}
      {def.kind === 'enum' && def.widget === 'gallery' && (
        <>
          {selectedOption && <p className="gallery-selected">{selectedOption.label}</p>}
          <OptionGallery
            def={def}
            value={value as string}
            sections={gallerySections(def)}
            icon={(v) => galleryIcon(def.id, v, design)}
            defaultValue={STYLE_PRESETS[design.style].settings[def.id as keyof StyleSettings] as string | undefined}
            onPick={(v) => set(v)}
          />
        </>
      )}
    </div>
```

- [ ] **Step 8: Edit `src/ui/sidebar/ControlGroups.tsx`**

Replace:

```tsx
import { ParamControl } from './ParamControl';
```
with:

```tsx
import { OrnamentsControl } from './OrnamentsControl';
import { ParamControl } from './ParamControl';
```

Replace:

```tsx
              <ParamControl key={p.id} def={p} />
            ))}
        </details>
```
with:

```tsx
              <ParamControl key={p.id} def={p} />
            ))}
          {g.id === 'details' && <OrnamentsControl />}
        </details>
```

- [ ] **Step 9: Append to `src/ui/styles.css`**

```css
.gallery { margin-top: 4px; }
.gallery-section { margin-bottom: 6px; }
.gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 6px; }
.gallery-item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px; background: var(--bg); border: 1px solid var(--line); border-radius: 6px; font-size: 0.72em; line-height: 1.15; text-align: center; color: inherit; }
.gallery-item[aria-pressed='true'] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.gallery-item.dimmed { opacity: 0.5; }
.gallery-item .icon { width: 56px; height: 56px; }
.gallery-caption .star, .star { color: var(--accent); }
.gallery-selected { margin: 2px 0 4px; font-size: 0.85em; color: var(--accent); }
```

- [ ] **Step 10: Run the tests and type-check**

Run: `npx vitest run src/scene/silhouette.test.ts src/ui/sidebar/Details.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  30 passed (30)`, `Tests  223 passed (223)`.

- [ ] **Step 11: Commit**

```bash
git add src/scene/silhouette.ts src/scene/silhouette.test.ts src/ui/sidebar/icons.tsx src/ui/sidebar/OptionGallery.tsx src/ui/sidebar/OrnamentsControl.tsx src/ui/sidebar/Details.test.tsx src/ui/sidebar/ParamControl.tsx src/ui/sidebar/ControlGroups.tsx src/ui/styles.css
git commit -m "feat: crown gallery, window/spandrel galleries and ornament picker

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 11: README and visual check

Document how to add looks, then check every style by eye in a real browser, by day and by night, before finishing the branch.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Everything above.
- Produces:
  README section "Adding crowns, ornaments and window patterns".

- [ ] **Step 1: Append to `README.md`**

```markdown

## Adding crowns, ornaments and window patterns

Everything about how a tower looks is data:

- **Crowns:** add an id to `CROWN_IDS` in `src/sim/catalog/ids.ts`, then an entry in `src/sim/catalog/crowns.ts`. Most crowns are a list of `stages` (stacked shapes sized as fractions of the roof). A crown that needs real code sets `custom: true` and gets a builder in `src/scene/crowns/custom.ts`; the compiler insists.
- **Ornaments:** add an id to `ORNAMENT_IDS`, then an entry in `src/sim/catalog/facades.ts`: pick a placement rule (`bay-lines`, `floor-rings`, `setback-corners`, …) and a small template of parts.
- **Window patterns and spandrels:** add an id and a tile description in `facades.ts`.

The sidebar galleries, their icons, the clean-up of old saved designs and the catalog-wide tests all pick new entries up automatically.
```

- [ ] **Step 2: Check every style by eye**

Run `npm run dev`, open the link, and choose **Sandbox in Chicago**. Set Foundation to Caissons and Floors to about 45. For each of the 8 styles, pick it, press **Fit tower in view**, zoom toward the top, then toggle **🌙 Night** and back. Check:

- **Chicago School:** Chicago windows (wide pane between narrow ones), belt courses, a heavy cornice, and a rusticated base.
- **Gothic Revival** (with wedding-cake setbacks): stone ribs, arched windows, pinnacles at every step, a copper pyramid roof, and an arched entry.
- **Art Deco:** chevron spandrels, ribs, sunbursts and step ornaments at the setbacks, gargoyles, and stacked arches with a needle that glows gold at night.
- **International Style:** a flush glass grid, I-beam mullions, and a flat roof with machinery.
- **Brutalist:** punched windows, deep concrete fins, and an overhanging concrete cap.
- **Postmodern:** colour stripes, a split pediment, and urns and an arched entry.
- **High-Tech:** an exposed-frame grid, red accent ties, red X-bracing that follows the plan, and a lattice mast with a blinking red light at night.
- **Neo-Futurist:** a round twisted tower with diamond glass, ribbon bands following the twist, and an open-frame top.

Also check:
- **Night:** windows are lit in a fixed pattern that doesn't flicker or speckle, and moving the camera doesn't change which windows are lit. Neighbors glow too. Crown glows only on crowns marked glowing.
- **Galleries:** in the sidebar, the Crown gallery shows 5 families with silhouettes and a ★ on the style default. Windows and Spandrels show painted tiles. Ornaments toggle and dim while the amount is None.
- **Crown variety:** try the Wind turbines crown, whose rotors spin, and Twin antennas, where the gauge line reads "(+N m antennas)".
- **Slider speed:** drag Floors from 40 to 150 with every ornament on. The view should keep up.
- **Console:** the browser console shows no errors.

- [ ] **Step 3: Run the tests and type-check**

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  30 passed (30)`, `Tests  223 passed (223)`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: how to add crowns, ornaments and window patterns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

