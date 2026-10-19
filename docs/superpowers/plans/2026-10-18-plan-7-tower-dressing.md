# Skyscraper Studio — Plan 7: Tower Dressing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the tower gets the things real towers carry:
- **Open roofs:** two cooling towers, a plant room, a wooden water tank on old New York styles, a window-cleaning crane on a rail round the edge, an antenna with a blinking aircraft light, and a parapet with a coping.
- **Setback ledges:** they become terraces, with a glass railing plus hedges and small trees.
- **The front door:** a canopy, revolving doors, and steel bollards along the sidewalk.
- **Round towers:** smoother, with 48 sides.
- **A development-only camera hook** lets screenshot scripts frame exact views for checks.

**Architecture:**
- **Builders:** three pure part builders in `src/scene/dressing/dressing.ts` (`roofParts`, `terraceParts`, `entranceParts`, combined by `dressingParts(site, design)`). They place parts with the existing helpers (`planFaces`, `alongFace`, `worldAnchor`, `placeAtAnchor`, `ringPoints`, `insidePlan`) and draw through `PartsMesh`. So dressing sways with Plan 5's forces, and appears from the bottom up in Plan 4's crown stage, like the ornaments.
- **Catalog:** a crown says whether it leaves the roof open (`openRoof`).
- **Materials:** a new `wood` material.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, three 0.186, @react-three/fiber 9, Zustand 5, Vitest 5 + jsdom + Testing Library + @react-three/test-renderer 9. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-18-visual-detail-design.md` §4. Its choices were made autonomously and await the user's review.

**Branch:** work on `plan-7-tower-dressing`, cut from **`plan-6-facade-detail`**: Plan 6 is not merged yet, and Plan 7 builds on its `Building.tsx`. Once Plan 6 is merged, this branch rebases onto `master` cleanly. **Do not push.**

**Provenance:**
- This plan's code was written and run task by task on a throwaway branch.
- The plan was then replayed mechanically on a fresh checkout of `plan-6-facade-detail`. After every task, `tsc` was clean and the suite passed with the counts given.
- Headless Chrome screenshots, framed with the new camera hook, were reviewed:
  - a Chicago School roof in New York, by day and at night;
  - Art Deco wedding-cake terraces;
  - an International-style entrance;
  - a Neo-futurist round tower.
- There were no console errors.

## Rulings (where this plan differs from the spec's wording)

- **Which roofs get machinery.** Only crowns marked `openRoof` do: flat, cornice, concrete cap, twin antennas, lattice mast and wind turbines. Crowns that fill or cap the roof (spires, domes, pagodas, pyramids, mansards) get none, because real towers hide their plant inside such crowns. The spec said "on roofs without a tall crown"; this decides it crown by crown.
- **Machinery keeps to the corners,** at 45°, 135°, 225° and 315° from the middle, pulled 15% in from the edge. A piece that can't stay clear of a helipad or pool (0.35 × the roof's shorter side, the helipad's radius) is left out. Small triangular roofs with a helipad therefore lose some machinery.
- **Water tanks** go only on New York towers with old window patterns (`chicago`, `arched`, `punched`). The spec named Chicago School and Art Deco; Art Deco uses the flush glass grid, so it is the window pattern that decides.
- **No lobby interior.** No visible reception desk or lights: Plan 6's rooms already show through the ground-floor glass, and solid furniture would sit hidden inside the opaque body.
- **No bevelled slab edges.** It adds little at normal distances. Round towers do go to 48 sides.
- **Sidewalk planters and terrace paving are left out.** Bollards cover the street edge, and the existing slab band reads as paving.
- **Ornament amount None** removes the terrace hedges and trees, as decoration, but keeps railings, machinery, the parapet, the canopy, the doors and the bollards, as working parts.
- **Construction:** dressing appears with the crown and ornaments in the crown stage, bottom up, so the canopy and bollards appear early in that stage and the roof kit last.
- **The camera hook is development-only:** `window.__devCamera`, guarded by `import.meta.env.DEV`. It isn't in the spec; it was added so visual checks can frame the roof and entrance reliably, since mouse steering was hit-and-miss.

## Global Constraints

- `src/sim/` changes only in catalog data: `openRoof` on crowns.
- Dressing is view-only and doesn't change the analysis.
- Every dressing part is a `Part`, drawn through `PartsMesh`: instanced, swaying, and revealed during construction.
- **Speed:** `dressingParts` makes under 3,000 parts in under 10 ms for the worst case (150 floors, 80 m round, wedding-cake setbacks, flat roof), timed with `fastestMs`.
- Use `npm`. No new dependencies. Commit after every task with the trailer lines shown. **Never push.**

## Review Focus

1. **Amenities sharing the roof:** the helipad and pool stay clear of machinery on every plan shape. This is pinned for the helipad circle; check the pool rectangle by eye.
2. **Twisted towers:** roof kit and terrace railings turn with their floor's rotation. Check a 120° twist by eye.
3. **Tapered towers with thin ledges:** ledges under 1.2 m get only a railing, never planters hanging over the edge.
4. **Wind and earthquake:** the dressing sways with the tower through `PartsMesh`. Check that roof kit stays on the roof in a strong sway.
5. **Construction:** the roof kit must not float before the roof exists. It is revealed by height within the crown stage, after the facade reaches the top.

## File Structure

```
src/sim/catalog/crowns.ts         openRoof on six crowns
src/sim/parts.ts                  'wood' part material
src/scene/parts/materials.ts      wood colour
src/scene/dressing/dressing.ts    roofParts, terraceParts, entranceParts, dressingParts
src/scene/Building.tsx            draws dressing with the crown and ornaments
src/scene/buildingGeometry.ts     48-sided round towers
src/scene/DevCameraHook.tsx       window.__devCamera for scripted visual checks (dev only)
```

---

### Task 1: Roof machinery, terraces and the entrance

Three pure builders, each returning parts in building coordinates:

- **`roofParts(site, design)`:** cooling towers, a plant room, a water tank (old New York styles), a window-cleaning crane on its rail, an antenna with a blinking light, and a parapet with a coping. Only on `openRoof` crowns, and clear of a helipad or pool.
- **`terraceParts`:** a glass railing round every setback ledge, plus hedges every 6 m and trees every 12 m (unless the ledge is under 1.2 m or Ornament amount is None).
- **`entranceParts`:** a canopy, revolving doors and bollards at the front.

Crowns gain `openRoof`, and parts gain a `wood` material.

**Files:**
- Create: `src/scene/dressing/dressing.test.ts`
- Modify: `src/sim/catalog/crowns.ts`
- Modify: `src/sim/parts.ts`
- Modify: `src/scene/parts/materials.ts`
- Create: `src/scene/dressing/dressing.ts`

**Interfaces:**
- Consumes: `floorSlices`, `planFaces`, `alongFace`, `setbackLevels`, `worldAnchor`, `placeAtAnchor`, `ringPoints`, `insidePlan`, `strutPart`, `rotateYXZ`, `fastestMs` (Plan 6).
- Produces:
  - `CrownDef.openRoof?: true` (set on `flat`, `cornice`, `concrete-cap`, `twin-antennas`, `lattice-mast` and `wind-turbines`).
  - `PART_MATERIALS` gains `'wood'`.
  - `roofParts(site, design)`, `terraceParts(design)`, `entranceParts(design)` and `dressingParts(site, design)`.

- [ ] **Step 1: Write the failing tests**

`src/scene/dressing/dressing.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { CROWNS } from '../../sim/catalog/crowns';
import { CROWN_IDS } from '../../sim/catalog/ids';
import { FLOOR_HEIGHT, floorSlices, plateDims } from '../../sim/geometry';
import { partBounds, partIsFinite, type Part } from '../../sim/parts';
import { SITES } from '../../sim/sites';
import { designFor } from '../../sim/testUtils';
import type { Design, PlanShape } from '../../sim/types';
import { planFaces, setbackLevels } from '../parts/placement';
import { fastestMs } from '../../test/fastest';
import { dressingParts, entranceParts, roofParts, terraceParts } from './dressing';

const NY = SITES['new-york'];
const build = (patch: Partial<Design>) => designFor('new-york', { shape: 'square', plateWidth: 36, floors: 40, setbacks: 'none', taper: 0, twist: 0, crown: 'flat', amenities: [], ...patch }).design;
const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];

describe('roof machinery', () => {
  it('fits out open roofs only, never ones a crown covers', () => {
    for (const crown of CROWN_IDS) {
      const parts = roofParts(NY, build({ crown }));
      expect(parts.length > 0, crown).toBe(!!CROWNS[crown].openRoof);
    }
  });

  it('stands on the roof, inside the top floor, clear of a helipad and a pool', () => {
    for (const shape of SHAPES) {
      const design = build({ shape, amenities: ['helipad', 'pool'] });
      const top = floorSlices(design).at(-1)!;
      const roof = design.floors * FLOOR_HEIGHT;
      const r = Math.min(top.width, top.depth) * 0.35;
      for (const p of roofParts(NY, design)) {
        expect(partIsFinite(p), shape).toBe(true);
        const b = partBounds(p);
        expect(b.min[1], shape).toBeGreaterThanOrEqual(roof - 1e-6);
        expect(Math.hypot(p.position[0], p.position[2]), shape).toBeLessThan(Math.hypot(top.width, top.depth) / 2 + 0.5);
        // Machinery (not the parapet or the cleaning rail round the edge) keeps out of the helipad's circle.
        if (p.material !== 'stone' && p.scale[1] > 1.5 && !p.animate) expect(Math.hypot(p.position[0], p.position[2]), `${shape} ${p.shape}`).toBeGreaterThan(r);
      }
    }
  });

  it('includes cooling towers, a plant room, a window-cleaning crane, a parapet and a blinking antenna', () => {
    const parts = roofParts(NY, build({}));
    expect(parts.some((p) => p.shape === 'cylinder' && p.material === 'concrete')).toBe(true);
    expect(parts.some((p) => p.material === 'steel' && p.shape === 'box')).toBe(true);
    expect(parts.some((p) => p.material === 'gold')).toBe(true);
    expect(parts.filter((p) => p.material === 'stone').length).toBeGreaterThanOrEqual(4);
    expect(parts.some((p) => p.animate === 'blink')).toBe(true);
  });

  it('puts wooden water tanks on old New York styles', () => {
    const tank = (siteId: 'new-york' | 'tokyo') => {
      const { site, design } = designFor(siteId, { crown: 'flat', windowPattern: 'chicago', amenities: [] });
      return roofParts(site, design).some((p) => p.material === 'wood');
    };
    expect(tank('new-york')).toBe(true);
    expect(tank('tokyo')).toBe(false);
  });
});

describe('setback terraces', () => {
  it('plants every setback ledge, inside the ledge, with a railing at its edge', () => {
    for (const shape of SHAPES) {
      const design = build({ shape, setbacks: 'wedding-cake', ornament: 'high' });
      const parts = terraceParts(design);
      const levels = setbackLevels(design).filter((l) => !l.isRoof);
      expect(levels.length).toBeGreaterThan(0);
      for (const level of levels) {
        const y = level.slice.y + FLOOR_HEIGHT;
        const here = parts.filter((p) => Math.abs(partBounds(p).min[1] - y) < 0.01);
        expect(here.some((p) => p.material === 'foliage'), `${shape} @${y}`).toBe(true);
        expect(here.some((p) => p.material === 'glass'), `${shape} @${y}`).toBe(true);
        const above = floorSlices(design)[level.slice.index + 1];
        // The floor above's walls are this far from the middle at their closest (a triangle's are much closer than half its width).
        const inner = Math.min(...planFaces(design.shape, above.width, above.depth).map((f) => Math.hypot(f.x, f.z)));
        for (const p of here) {
          const d = Math.hypot(p.position[0], p.position[2]);
          // On the ledge: outside the floor above, inside the floor below.
          expect(d, `${shape}`).toBeLessThan(Math.hypot(level.slice.width, level.slice.depth) / 2 + 0.5);
          expect(d, `${shape}`).toBeGreaterThan(inner - 0.5);
        }
      }
      expect(parts.every(partIsFinite)).toBe(true);
    }
  });

  it('has no terraces without setbacks, and only railings when ornament amount is None', () => {
    expect(terraceParts(build({ setbacks: 'none' }))).toHaveLength(0);
    const bare = terraceParts(build({ setbacks: 'few', ornament: 'none' }));
    expect(bare.length).toBeGreaterThan(0);
    expect(bare.every((p) => p.material === 'glass')).toBe(true);
  });
});

describe('entrance', () => {
  it('gives the front a canopy, revolving doors and bollards along the sidewalk', () => {
    const design = build({ ornament: 'none' });
    const { depth } = plateDims(design);
    const parts = entranceParts(design);
    const front = parts.filter((p) => p.position[2] > depth / 2);
    expect(front.length).toBe(parts.length);
    expect(parts.some((p) => p.shape === 'cylinder' && p.material === 'glass')).toBe(true);
    expect(parts.filter((p) => p.material === 'steel' && p.scale[1] < 1.2).length).toBeGreaterThanOrEqual(4);
    for (const p of parts) expect(partBounds(p).min[1]).toBeGreaterThanOrEqual(-1e-6);
  });
});

describe('dressingParts', () => {
  it('is everything together, finite for every shape and extreme, and quick', () => {
    for (const shape of SHAPES)
      for (const extreme of [{ floors: 5 }, { floors: 150, taper: 0.6, twist: 120, setbacks: 'wedding-cake' as const, plateWidth: 15 }]) {
        const design = build({ shape, ...extreme, ornament: 'high' });
        const parts = dressingParts(NY, design);
        expect(parts.length).toBe(roofParts(NY, design).length + terraceParts(design).length + entranceParts(design).length);
        expect(parts.every(partIsFinite)).toBe(true);
      }
    const worst = designFor('shanghai', { floors: 150, plateWidth: 80, shape: 'circle', setbacks: 'wedding-cake', crown: 'flat', ornament: 'high' });
    let parts: Part[] = [];
    expect(fastestMs(5, () => (parts = dressingParts(worst.site, worst.design)))).toBeLessThan(10);
    expect(parts.length).toBeLessThan(3000);
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/dressing/dressing.test.ts`

Expected: FAIL — `Failed to resolve import "./dressing"`.

- [ ] **Step 3: Edit `src/sim/catalog/crowns.ts`**

Replace:

```ts
  generatesPower?: true;
  /** Built from stages unless `custom` — then scene/crowns must provide a builder. */
```

with:

```ts
  generatesPower?: true;
  /** The crown leaves the roof open, so rooftop machinery, a parapet and a cleaning crane go on it. */
  openRoof?: true;
  /** Built from stages unless `custom` — then scene/crowns must provide a builder. */
```

Replace:

```ts
  cornice: {
    id: 'cornice', label: 'Heavy cornice', family: 'classic', seenOn: 'Reliance Building, Chicago',
```

with:

```ts
  cornice: {
    openRoof: true,
    id: 'cornice', label: 'Heavy cornice', family: 'classic', seenOn: 'Reliance Building, Chicago',
```

Replace:

```ts
  flat: {
    id: 'flat', label: 'Flat roof', family: 'modern', seenOn: 'Seagram Building, New York',
```

with:

```ts
  flat: {
    openRoof: true,
    id: 'flat', label: 'Flat roof', family: 'modern', seenOn: 'Seagram Building, New York',
```

Replace:

```ts
  'concrete-cap': {
    id: 'concrete-cap', label: 'Concrete cap', family: 'modern', seenOn: 'Barbican towers, London',
```

with:

```ts
  'concrete-cap': {
    openRoof: true,
    id: 'concrete-cap', label: 'Concrete cap', family: 'modern', seenOn: 'Barbican towers, London',
```

Replace:

```ts
  'lattice-mast': {
    id: 'lattice-mast', label: 'Lattice mast', family: 'modern', seenOn: "Lloyd's Building, London",
```

with:

```ts
  'lattice-mast': {
    openRoof: true,
    id: 'lattice-mast', label: 'Lattice mast', family: 'modern', seenOn: "Lloyd's Building, London",
```

Replace:

```ts
  'twin-antennas': {
    id: 'twin-antennas', label: 'Twin antennas', family: 'modern', seenOn: 'Willis Tower, Chicago',
```

with:

```ts
  'twin-antennas': {
    openRoof: true,
    id: 'twin-antennas', label: 'Twin antennas', family: 'modern', seenOn: 'Willis Tower, Chicago',
```

Replace:

```ts
  'wind-turbines': {
    id: 'wind-turbines', label: 'Wind turbines', family: 'eco', seenOn: 'Strata SE1, London',
```

with:

```ts
  'wind-turbines': {
    openRoof: true,
    id: 'wind-turbines', label: 'Wind turbines', family: 'eco', seenOn: 'Strata SE1, London',
```

- [ ] **Step 4: Edit `src/sim/parts.ts`**

Replace:

```ts
export const PART_MATERIALS = [
  'body', 'accent', 'glass', 'stone', 'concrete', 'copper', 'gold', 'steel', 'foliage', 'ruby', 'light', 'interior', 'girder',
] as const;
```

with:

```ts
export const PART_MATERIALS = [
  'body', 'accent', 'glass', 'stone', 'concrete', 'copper', 'gold', 'steel', 'foliage', 'ruby', 'light', 'interior', 'girder', 'wood',
] as const;
```

- [ ] **Step 5: Edit `src/scene/parts/materials.ts`**

Replace:

```ts
      return { color: '#4f5860', roughness: 0.55, metalness: 0.6 };
    case 'interior':
```

with:

```ts
      return { color: '#4f5860', roughness: 0.55, metalness: 0.6 };
    case 'wood':
      // Rooftop water tanks and tree trunks.
      return { color: '#7a5233', roughness: 0.9, metalness: 0 };
    case 'interior':
```

- [ ] **Step 6: Create `src/scene/dressing/dressing.ts`**

```ts
import { CROWNS } from '../../sim/catalog/crowns';
import { FLOOR_HEIGHT, floorSlices, type FloorSlice } from '../../sim/geometry';
import { rotateYXZ, strutPart, type Part, type PartMaterial, type Vec3 } from '../../sim/parts';
import type { Design, Site } from '../../sim/types';
import { placeAtAnchor, worldAnchor } from '../detail/frame';
import { alongFace, planFaces, setbackLevels } from '../parts/placement';
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
  const pts = ringPoints(design.shape, s.width, s.depth, inset).map(([x, z]) => turned(s, x, z));
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
 * Rooftop machinery on roofs the crown leaves open: two cooling towers, a plant room, a wooden water
 * tank (old New York styles), a window-cleaning crane on a rail round the edge, a blinking antenna (unless
 * the crown has masts), and a parapet with a coping. Machinery keeps to the corners, clear of a helipad or pool.
 */
export function roofParts(site: Site, design: Design): Part[] {
  if (!CROWNS[design.crown].openRoof) return [];
  const slices = floorSlices(design);
  const top = slices[slices.length - 1];
  const y = design.floors * FLOOR_HEIGHT;
  const min = Math.min(top.width, top.depth);
  const clear = design.amenities.includes('helipad') || design.amenities.includes('pool') ? min * 0.35 : 0;
  const parts: Part[] = [];
  /** A spot at angle `a` (degrees) for something `size` across, or null if it can't clear the helipad. */
  const spot = (deg: number, size: number): [number, number] | null => {
    const a = (deg * Math.PI) / 180;
    const r = reach(design, top, a, size / 2 + 1.5) * 0.85;
    if (r - size / 2 < clear + 0.5) return null;
    return turned(top, Math.sin(a) * r, Math.cos(a) * r);
  };
  const tower = Math.max(2, min * 0.12);
  for (const deg of [45, 135]) {
    const at = spot(deg, tower);
    if (at) parts.push(cyl([at[0], y + 2, at[1]], [tower, 4, tower], 'concrete'));
  }
  const room = Math.max(3, min * 0.16);
  const plant = spot(225, room * 1.4);
  if (plant) parts.push(box([plant[0], y + 1.75, plant[1]], [room, 3.5, room], 'steel', [0, top.rotation, 0]));
  if (site.id === 'new-york' && TANK_PATTERNS.includes(design.windowPattern)) {
    const tank = spot(315, 4);
    if (tank) {
      parts.push(cyl([tank[0], y + 5, tank[1]], [4, 4, 4], 'wood'));
      parts.push({ shape: 'cone', position: [tank[0], y + 7.6, tank[1]], scale: [4.2, 1.2, 4.2], material: 'wood' });
      for (const [dx, dz] of [[1.4, 1.4], [-1.4, 1.4], [-1.4, -1.4], [1.4, -1.4]]) parts.push(cyl([tank[0] + dx, y + 1.5, tank[1] + dz], [0.25, 3, 0.25], 'steel'));
    }
  }
  // The window-cleaning crane: a yellow gantry on a rail round the roof edge, its arm out over the side.
  parts.push(...ring(top, design, 1.5, y, 0.2, 0.3, 'steel'));
  const a0 = 0;
  const r0 = reach(design, top, a0, 1.5);
  const [gx, gz] = turned(top, 0, r0);
  const [ax, az] = turned(top, 0, r0 + 4);
  parts.push(box([gx, y + 1, gz], [3, 2, 2.5], 'gold', [0, top.rotation, 0]));
  parts.push(strutPart([gx, y + 2, gz], [ax, y + 3.5, az], 0.35, 'gold'));
  // An antenna with an aircraft light, unless the crown already has masts.
  if (design.crown !== 'twin-antennas' && design.crown !== 'lattice-mast') {
    const mast = spot(180, 2);
    if (mast) {
      parts.push(cyl([mast[0], y + 6, mast[1]], [0.4, 12, 0.4], 'steel'));
      parts.push({ shape: 'sphere', position: [mast[0], y + 12.3, mast[1]], scale: [0.6, 0.6, 0.6], material: 'ruby', glow: true, animate: 'blink' });
    }
  }
  // Parapet and coping round the edge.
  parts.push(...ring(top, design, 0.2, y, 1.1, 0.4, 'stone'));
  parts.push(...ring(top, design, 0.2, y + 1.1, 0.15, 0.6, 'stone'));
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
    const ledge = Math.min(below.width - above.width, below.depth - above.depth) / 2;
    parts.push(...ring(below, design, 0.3, y, 1.1, 0.06, 'glass'));
    if (design.ornament === 'none' || ledge < 1.2) continue;
    for (const face of planFaces(design.shape, below.width, below.depth)) {
      const n = Math.floor(face.length / 6);
      for (let k = 0; k < n; k++) {
        const s = (k - (n - 1) / 2) * 6;
        const a = worldAnchor(below, alongFace(design.shape, below.width, below.depth, face, s));
        // Half-way across the ledge, in the anchor's frame (z points out of the wall below).
        const z = -ledge / 2;
        parts.push(placeAtAnchor(box([0, 0.4, z], [1.4, 0.8, 0.7], 'foliage'), { ...a, position: [a.position[0], y, a.position[2]] }));
        if (k % 2 === 0) {
          parts.push(placeAtAnchor(cyl([1.6, 0.9, z], [0.25, 1.8, 0.25], 'wood'), { ...a, position: [a.position[0], y, a.position[2]] }));
          parts.push(placeAtAnchor({ shape: 'sphere', position: [1.6, 2.4, z], scale: [1.6, 1.6, 1.6], material: 'foliage' }, { ...a, position: [a.position[0], y, a.position[2]] }));
        }
      }
    }
  }
  return parts;
}

/** At the front door: a canopy over the entrance, revolving doors, and steel bollards along the sidewalk. */
export function entranceParts(design: Design): Part[] {
  const ground = floorSlices(design)[0];
  const front = planFaces(design.shape, ground.width, ground.depth).reduce((best, f) => (f.z > best.z ? f : best));
  const at = (s: number) => worldAnchor(ground, alongFace(design.shape, ground.width, ground.depth, front, s));
  const width = Math.min(10, front.length * 0.4);
  const parts: Part[] = [
    placeAtAnchor(box([0, 3.75, 1.5], [width, 0.3, 3], 'steel'), at(0)),
    placeAtAnchor(cyl([0, 1.3, 1.4], [2.6, 2.6, 2.6], 'glass'), at(0)),
  ];
  const span = Math.min(front.length * 0.35, 16);
  for (let s = -span; s <= span + 1e-9; s += 2.5) parts.push(placeAtAnchor(cyl([0, 0.5, 6], [0.3, 1, 0.3], 'steel'), at(s)));
  return parts;
}

/** All the dressing on a tower: roof, terraces and entrance. Building coordinates. */
export function dressingParts(site: Site, design: Design): Part[] {
  return [...roofParts(site, design), ...terraceParts(design), ...entranceParts(design)];
}
```

- [ ] **Step 7: Run the tests and type-check**

Run: `npx vitest run src/scene/dressing/dressing.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  56 passed (56)`, `Tests  409 passed (409)`.

- [ ] **Step 8: Commit**

```bash
git add src/scene/dressing/dressing.test.ts src/sim/catalog/crowns.ts src/sim/parts.ts src/scene/parts/materials.ts src/scene/dressing/dressing.ts
git commit -m "feat: rooftop machinery, setback terraces and the entrance

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 2: Dressing on the tower; smoother round towers

`Building` draws `dressingParts(site, design)` as a `PartsMesh` named `dressing`, so it sways. During construction it is revealed with the crown and ornaments (one bottom-up set). Round towers go from 24 to 48 sides.

**Files:**
- Modify: `src/scene/Building.test.tsx`
- Modify: `src/scene/Building.tsx`
- Modify: `src/scene/buildingGeometry.ts`

**Interfaces:**
- Consumes: Task 1: `dressingParts`.
- Produces: a `PartsMesh` named `dressing` inside `Building`; `unitGeometry('circle')` with 48 radial segments.

- [ ] **Step 1: Write the failing tests**

In `src/scene/Building.test.tsx`:

Replace:

```tsx
import { Building } from './Building';
import { crownParts } from './crownParts';
```

with:

```tsx
import { Building } from './Building';
import { unitGeometry } from './buildingGeometry';
import { dressingParts } from './dressing/dressing';
import { crownParts } from './crownParts';
```

Replace:

```tsx
    expect(instanceTotal(half, 'balconies')).toBeLessThan(all.length);
  });
```

with:

```tsx
    expect(instanceTotal(half, 'balconies')).toBeLessThan(all.length);
  });

  it('dresses the tower: rooftop machinery, terraces and the entrance, added from the bottom up while building', async () => {
    const { site, design } = designFor('new-york', { floors: 30, crown: 'flat', setbacks: 'few', ornament: 'high' });
    const all = dressingParts(site, design);
    expect(all.length).toBeGreaterThan(20);
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    expect(instanceTotal(r, 'dressing')).toBe(all.length);
    await r.unmount();
    const none = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 30, crown: 0, litFloors: 0, lights: false }} />);
    expect(instanceTotal(none, 'dressing')).toBe(0);
    await none.unmount();
    const part = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 30, crown: 0.5, litFloors: 0, lights: false }} />);
    expect(instanceTotal(part, 'dressing')).toBeGreaterThan(0);
    expect(instanceTotal(part, 'dressing')).toBeLessThan(all.length);
  });

  it('draws round towers smoothly (48 sides)', () => {
    const g = unitGeometry('circle') as THREE.CylinderGeometry;
    expect(g.parameters.radialSegments).toBe(48);
  });
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/Building.test.tsx`

Expected: FAIL — no `dressing` group in the building; the round tower has 24 sides.

- [ ] **Step 3: Edit `src/scene/Building.tsx`**

Replace:

```tsx
import { crownParts } from './crownParts';
import { swayAt, type SwaySignal } from './forces/sway';
```

with:

```tsx
import { crownParts } from './crownParts';
import { dressingParts } from './dressing/dressing';
import { swayAt, type SwaySignal } from './forces/sway';
```

Replace:

```tsx
  const balconies = useMemo(() => balconyParts(design), [design]);
  const share = reveal ? reveal.crown : 1;
  const top = useMemo(() => {
    if (share >= 1) return { crown, ornaments };
    const shown = new Set(upTo([...ornaments, ...crown], share));
    return { crown: crown.filter((p) => shown.has(p)), ornaments: ornaments.filter((p) => shown.has(p)) };
  }, [ornaments, crown, share]);
  const look = { palette: design.palette, plan: design.shape, night, sway };
```

with:

```tsx
  const balconies = useMemo(() => balconyParts(design), [design]);
  const dressing = useMemo(() => dressingParts(site, design), [site, design]);
  const share = reveal ? reveal.crown : 1;
  const top = useMemo(() => {
    if (share >= 1) return { crown, ornaments, dressing };
    const shown = new Set(upTo([...ornaments, ...crown, ...dressing], share));
    return {
      crown: crown.filter((p) => shown.has(p)),
      ornaments: ornaments.filter((p) => shown.has(p)),
      dressing: dressing.filter((p) => shown.has(p)),
    };
  }, [ornaments, crown, dressing, share]);
  const look = { palette: design.palette, plan: design.shape, night, sway };
```

Replace:

```tsx
      <PartsMesh name="balconies" parts={shownBalconies} {...look} />
      {/* While building, exposed bracing is part of the bare structure instead. */}
```

with:

```tsx
      <PartsMesh name="balconies" parts={shownBalconies} {...look} />
      <PartsMesh name="dressing" parts={top.dressing} {...look} />
      {/* While building, exposed bracing is part of the bare structure instead. */}
```

- [ ] **Step 4: Edit `src/scene/buildingGeometry.ts`**

Replace:

```ts
    case 'circle':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 24);
    case 'triangle': {
```

with:

```ts
    case 'circle':
      // 48 sides: smooth enough that a round tower's outline doesn't show facets up close.
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 48);
    case 'triangle': {
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run src/scene/Building.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  56 passed (56)`, `Tests  411 passed (411)`.

- [ ] **Step 6: Commit**

```bash
git add src/scene/Building.test.tsx src/scene/Building.tsx src/scene/buildingGeometry.ts
git commit -m "feat: dress the tower; 48-sided round towers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 3: A camera hook for visual checks

Development only: `DevCameraHook` puts `window.__devCamera.look(position, target)` on the page, so headless screenshot scripts can frame exact views (the roof, the entrance) instead of steering the mouse. It is guarded by `import.meta.env.DEV`, so it is stripped from the published build.

**Files:**
- Create: `src/scene/DevCameraHook.test.tsx`
- Create: `src/scene/DevCameraHook.tsx`
- Modify: `src/scene/Scene.tsx`

**Interfaces:**
- Consumes: the main scene's camera and OrbitControls.
- Produces: `DevCamera { look(position, target) }` and `<DevCameraHook />`, mounted in `Scene`.

- [ ] **Step 1: Write the failing tests**

`src/scene/DevCameraHook.test.tsx` (new):

```tsx
import { useThree } from '@react-three/fiber';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DevCameraHook, type DevCamera } from './DevCameraHook';

let camera: THREE.Camera | null = null;
function Grab() {
  camera = useThree((s) => s.camera);
  return null;
}

describe('<DevCameraHook />', () => {
  it('lets a screenshot script point the camera, in development only, and cleans up after itself', async () => {
    const w = window as unknown as { __devCamera?: DevCamera };
    const r = await ReactThreeTestRenderer.create(
      <>
        <DevCameraHook />
        <Grab />
      </>,
    );
    expect(w.__devCamera).toBeDefined();
    w.__devCamera!.look([10, 20, 30], [0, 0, 0]);
    expect(camera!.position.toArray()).toEqual([10, 20, 30]);
    await r.unmount();
    expect(w.__devCamera).toBeUndefined();
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/DevCameraHook.test.tsx`

Expected: FAIL — `Failed to resolve import "./DevCameraHook"`.

- [ ] **Step 3: Create `src/scene/DevCameraHook.tsx`**

```tsx
/// <reference types="vite/client" />
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

/** What the dev hook puts on `window` for scripted visual checks. */
export interface DevCamera {
  /** Points the camera from `position` at `target` (world metres). */
  look: (position: [number, number, number], target: [number, number, number]) => void;
}

/**
 * Development only (stripped from the published build): exposes `window.__devCamera` so headless
 * screenshot scripts can frame exact views — the roof, the entrance — instead of steering the mouse.
 */
export function DevCameraHook() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __devCamera?: DevCamera };
    w.__devCamera = {
      look: (position, target) => {
        camera.position.set(...position);
        if (controls) {
          controls.target.set(...target);
          controls.update();
        } else camera.lookAt(...target);
      },
    };
    return () => {
      delete w.__devCamera;
    };
  }, [camera, controls]);
  return null;
}
```

- [ ] **Step 4: Edit `src/scene/Scene.tsx`**

Replace:

```tsx
import { ConstructionView } from './construction/ConstructionView';
import { FoundationView } from './FoundationView';
```

with:

```tsx
import { ConstructionView } from './construction/ConstructionView';
import { DevCameraHook } from './DevCameraHook';
import { FoundationView } from './FoundationView';
```

Replace:

```tsx
        <CameraFramer frame={frame} nonce={nonce} />
      </Canvas>
```

with:

```tsx
        <CameraFramer frame={frame} nonce={nonce} />
        <DevCameraHook />
      </Canvas>
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run src/scene/DevCameraHook.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  57 passed (57)`, `Tests  412 passed (412)`.

- [ ] **Step 6: Commit**

```bash
git add src/scene/DevCameraHook.test.tsx src/scene/DevCameraHook.tsx src/scene/Scene.tsx
git commit -m "test: development-only camera hook for scripted visual checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 4: README and visual check

Tell players about the dressing, then look at it.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a README paragraph about the tower dressing.

- [ ] **Step 1: Edit `README.md`**

Replace:

```markdown

## Develop
```

with:

```markdown

Open roofs carry real rooftop kit — cooling towers, a plant room, a window-cleaning crane on its rail, an antenna with a blinking light (and wooden water tanks on old New York styles) — setback ledges become planted terraces, and the front door gets a canopy and revolving doors.

## Develop
```

- [ ] **Step 2: Check it by eye**

Run `npm run dev` and open the printed link. Frame views from the browser console with `window.__devCamera.look([x, y, z], [tx, ty, tz])`, where the lot centre is `lotCenter(site)` from `src/scene/layout.ts`; or just orbit.

- **Roof**, New York, Chicago School, Flat roof, 30 floors: cooling towers, a plant room, a wooden water tank on legs, an antenna with a red light that blinks at 🌙 Night, the parapet and coping, and the yellow cleaning crane at the edge. Add the Helipad and Pool: no machinery on them.
- **Other crowns:** with a Spire, Dome or Pagoda there is no roof kit. With Twin antennas, the kit is there but no extra antenna.
- **Terraces**, Art Deco with wedding-cake setbacks: hedges, trees and glass railings on every ledge. With Ornament amount None, only the railings.
- **Entrance:** a canopy over revolving doors, with bollards along the sidewalk.
- **Round towers** (Neo-futurist): a smooth outline.
- **Twist 120°:** the roof kit and railings turn with the floors.
- **💨 Wind on:** the dressing sways with the tower and stays attached.
- **Build it!:** the dressing appears in the crown stage, bottom up, and no roof kit floats before the roof exists.
- **Console:** no errors.

- [ ] **Step 3: Run the tests and type-check**

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  57 passed (57)`, `Tests  412 passed (412)`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe the tower dressing in the README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```
