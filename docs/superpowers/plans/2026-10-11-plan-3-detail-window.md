# Skyscraper Studio — Plan 3: Detail Window

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a small close-up window in the 3D view showing a **Facade**, a setback **Corner** or the **Base** of the tower. Each is built in true 3D at real size, updates live, follows day/night, and can be dragged a little to look around. Changes to windows, spandrels and ornaments become clearly visible.

**Architecture:**
- **Builder:** a pure builder, `detailModel(design, view)`, makes only the piece being viewed.
- **Walls:** built bay by bay (`wallBay`) from the same catalog data that paints the main tower. They sit on the main tower's own tile grid, so the two views always agree, down to which windows are lit at night.
- **Ornaments:** ribs, mullions and fins are placed on the section's bay edges. Every other ornament is the main tower's own placement, cut down to what is in view.
- **Rendering:** a small R3F canvas with `frameloop="demand"` draws the model through the existing `PartsMesh`, so it costs nothing while idle.
- **Inset:** an overlay in the scene holds the buttons, caption and minimize.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, three 0.186, @react-three/fiber 9, Zustand 5, Vitest 5 + jsdom + Testing Library + @react-three/test-renderer 9. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-11-detail-window-design.md`, which extends `2026-10-10-skyscraper-sim-design.md` and `2026-10-10-architectural-detail-design.md`.

**Branch:** work on `plan-3-detail-window`, cut from `master`. `master` has local commits not yet pushed to GitHub. **Do not push**: pushing to `master` publishes the live site (www.jaskonas.com/skyscraper-sim), and the user decides when.

**Provenance:** this plan was executed mechanically, task by task, on a fresh clone of `master`. After every task `tsc` was clean and the suite passed with the counts given. `vite build` succeeds at the end. Headless screenshots of all three views for the 8 styles, by day and by night, were reviewed, and the framing and arch sizes were tuned against them.

## Rulings (where this plan differs from the spec's wording)

- **The arched entry becomes a true arch.** A new `arch` part shape (a half ring) replaces the full stone ring the catalog used, so the main tower changes too. The close-up made the old ring obviously wrong.
- **Windows sit on the main tower's tile grid** rather than being centred on the face. That is what makes night windows match exactly; the section is offset half a bay from the face centre.
- **Tiny walls:** a wall too short for one full bay (the top of a very slender tapered tower) gets one narrower bay instead of none, so the corner view always shows a window.
- **Ornaments are cut by their full bounds**, not by their centre. Otherwise a ground-floor arch pokes up into the facade view of a short tower.
- **Ornaments above the section** are shown up to 1 m above it in the Facade and Base views, and up to 8 m above it in the Corner view, where pinnacles and finials stand above the ledge.
- **`lighting()` moves to `src/scene/lighting.ts`** (still re-exported from `Scene.tsx`). This avoids an import cycle between `Scene.tsx` and the close-up.
- **Ease-back:** the time constant is 0.08 s, snapping under 0.01 rad, so it settles in about 0.4 s as the spec says.
- **Caption choice:** the Facade view uses the middle of the tallest run between setbacks. On a wedding-cake tower that is the bottom run, so the caption may say "Shops". That is accurate, so it stays.

## Global Constraints

- `src/sim/` imports nothing from React, three, `src/state`, `src/ui` or `src/scene`.
- The catalog is the single source of truth. The close-up reads window patterns, spandrels and ornaments from `src/sim/catalog/`, and new catalog entries must appear in it without code changes.
- No analysis changes. The close-up is view-only, and the `timeOfDay` and inset state are not part of the design or its history.
- Speed:
  - `detailModel` must take under 20 ms in the worst case (150 floors, 80 m round plate, every ornament at High), averaged over all three views.
  - It draws under 30 draw calls.
  - It does no GPU work while idle (`frameloop="demand"`).
- The camera may only be dragged ±30° sideways and ±15° up or down, eases back to the framed view, and has no zoom.
- Use `npm`. No new dependencies. Commit after every task with the trailer lines shown. **Never push.**

## Review Focus

1. **Extreme towers** (5 floors; 150 floors with 0.6 taper, 120° twist, wedding-cake setbacks and a 15 m plate; every plan shape). Every view must show at least one window, stay finite and stay in its frame. Pinned by the catalog loop in Task 2, and by the tiny-wall ruling.
2. **Night parity.** A window lit in the close-up must be the same window lit on the main tower (`windowLit(bay, floor, share)` with the shader's bay numbering, including round towers). Pinned in Task 2 ("lights the same windows at night…").
3. **Session storage blocked** (private window, strict settings). The inset must still work. Pinned in Task 4 ("still works when session storage is blocked").
4. **Slider drags with the inset open.** The model rebuilds on every tick, and the view must keep up. Pinned in Task 2 (worst-case speed test); reviewers should also drag Floors in the browser during Task 5.
5. **No WebGL** (old GPU, blocked graphics). The inset shows "Close-up needs 3D graphics" and the main view is unaffected. This uses R3F's `Canvas` `fallback`, which jsdom can't exercise. Check it by eye in Task 5 by launching Chrome with `--disable-gpu --disable-software-rasterizer`, if convenient.

## File Structure

```
src/scene/detail/frame.ts        building ↔ close-up coordinates
src/scene/detail/wallBay.ts      one bay of one floor in true 3D (from catalog panes)
src/scene/detail/detailModel.ts  facade / corner / base sections, captions, framing
src/scene/detail/camera.ts       framed camera, drag limits, ease-back
src/scene/detail/DetailCanvas.tsx  DetailScene (parts + windows + camera) inside a demand-driven canvas
src/scene/lighting.ts            day/night lighting (moved out of Scene.tsx)
src/ui/DetailInset.tsx           the inset: view buttons, minimize, caption
```

---

### Task 1: A wall bay in true 3D, and the close-up's coordinates

The basic building block of the close-up: one bay of one floor built as real geometry. It has the wall around the window opening, glass recessed 0.3 m, frames and mullions, a sill, spandrel relief (chevron strips or raised stripes), the projecting slab edge, and a dim room behind each pane. The window shape comes from the same catalog pane data and `openingFor` sizing that paint the main tower's tile, so the two views agree. This task also adds the helpers that move parts between building coordinates and the close-up's own frame, plus two small part additions: an `interior` material for rooms, and an `arch` shape. The arched entry now uses `arch`; it was a full stone ring, which only became obvious up close.

**Files:**
- Create: `src/scene/detail/frame.ts`
- Create: `src/scene/detail/frame.test.ts`
- Create: `src/scene/detail/wallBay.ts`
- Create: `src/scene/detail/wallBay.test.ts`
- Modify: `src/sim/parts.ts`
- Modify: `src/scene/parts/materials.ts`
- Modify: `src/scene/parts/geometries.ts`
- Modify: `src/scene/parts/geometries.test.ts`
- Modify: `src/sim/catalog/facades.ts`

**Interfaces:**
- Consumes: Plan 2: `Part`, `PartMaterial`, `rotateYXZ`, `strutPart`, `partBounds`, `partIsFinite` (`src/sim/parts.ts`); `FacadeRecipe`, `facadeRecipe` (`src/sim/facade.ts`); `TILE_HEIGHT_M`, `openingFor` (`src/scene/facadeTile.ts`); `Anchor` (`src/scene/parts/placement.ts`); `FloorSlice`, `FLOOR_HEIGHT`.
- Produces:
  - `src/scene/detail/frame.ts`:
  - `SectionFrame { origin: Vec3; yaw: number }`, the close-up's frame: origin on the wall at the section's bottom, +z out of the wall, +x along it.
  - `WorldAnchor { position: Vec3; yaw: number }`.
  - `worldAnchor(slice, anchor)`, `toLocalPoint(p, frame)`, `toLocalPart(part, frame)`, `placeAtAnchor(part, anchor)`.
  - `src/scene/detail/wallBay.ts`:
  - `PaneUnit { pane: Part; room: Part }`, `BayPieces { parts: Part[]; panes: PaneUnit[] }`, `GLASS_RECESS` (0.3).
  - `wallBay(recipe, width, wallMaterial, windowRatio?)`. Bay frame: x from -width/2 to width/2, y from 0 to `FLOOR_HEIGHT`, z out of the wall face (z = 0).
  - `PartShape` gains `'arch'`; `PART_MATERIALS` gains `'interior'`.

- [ ] **Step 1: Write the failing tests**

`src/scene/detail/frame.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { FloorSlice } from '../../sim/geometry';
import type { Part } from '../../sim/parts';
import { placeAtAnchor, toLocalPart, toLocalPoint, worldAnchor } from './frame';

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

describe('close-up frame', () => {
  it('turns a floor-plan anchor with the floor and lifts it to the floor', () => {
    const slice: FloorSlice = { index: 3, y: 12, width: 20, depth: 20, rotation: Math.PI / 2 };
    const a = worldAnchor(slice, { x: 0, z: 10, yaw: 0 });
    close(a.position, [10, 12, 0]);
    expect(a.yaw).toBeCloseTo(Math.PI / 2);
  });

  it('puts a point straight out from the wall on the local +z axis', () => {
    const frame = { origin: [10, 12, 0] as [number, number, number], yaw: Math.PI / 2 };
    close(toLocalPoint([15, 14, 0], frame), [0, 2, 5]);
  });

  it('a bay part placed on the wall and brought back into the frame keeps its bay coordinates', () => {
    const anchor = { position: [10, 12, 0] as [number, number, number], yaw: Math.PI / 2 };
    const frame = { origin: anchor.position, yaw: anchor.yaw };
    const p: Part = { shape: 'box', position: [1, 2, 0.3], scale: [1, 1, 1], material: 'body' };
    const back = toLocalPart(placeAtAnchor(p, anchor), frame);
    close(back.position, [1, 2, 0.3]);
    close(back.rotation!, [0, 0, 0]);
  });
});
```

`src/scene/detail/wallBay.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { WINDOW_PATTERN_IDS } from '../../sim/catalog/ids';
import { facadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import { partBounds, partIsFinite } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import { GLASS_RECESS, wallBay } from './wallBay';

const recipeFor = (patch: Parameters<typeof designFor>[1]) => facadeRecipe(designFor('chicago', patch).design);

describe('wallBay', () => {
  it('builds one recessed pane per catalog pane, inside the bay, for every window pattern', () => {
    for (const windowPattern of WINDOW_PATTERN_IDS) {
      const recipe = recipeFor({ windowPattern });
      const bay = wallBay(recipe, recipe.pattern.bayWidth, 'body');
      expect(bay.panes, windowPattern).toHaveLength(recipe.pattern.panes.length);
      for (const { pane } of bay.panes) expect(pane.position[2], windowPattern).toBeCloseTo(-GLASS_RECESS);
      for (const p of [...bay.parts, ...bay.panes.flatMap((u) => [u.pane, u.room])]) {
        expect(partIsFinite(p), windowPattern).toBe(true);
        const b = partBounds(p);
        expect(b.min[0], windowPattern).toBeGreaterThanOrEqual(-recipe.pattern.bayWidth / 2 - 1e-6);
        expect(b.max[0], windowPattern).toBeLessThanOrEqual(recipe.pattern.bayWidth / 2 + 1e-6);
        expect(b.max[1], windowPattern).toBeLessThanOrEqual(FLOOR_HEIGHT + 1e-6);
      }
    }
  });

  it('gives arched windows a pointed head and diamond glass its diagonal bars', () => {
    const arched = wallBay(recipeFor({ windowPattern: 'arched' }), 3, 'stone');
    expect(arched.parts.filter((p) => p.shape === 'wedge' && p.material === 'glass')).toHaveLength(2);
    const plain = wallBay(recipeFor({ windowPattern: 'flush-grid' }), 4, 'glass').parts.length;
    expect(wallBay(recipeFor({ windowPattern: 'diamond' }), 4, 'glass').parts.length).toBe(plain + 2);
  });

  it('turns spandrel motifs into relief: eight chevron strips, or two raised stripes', () => {
    const count = (spandrel: 'plain' | 'chevron' | 'stripes') =>
      wallBay(recipeFor({ windowPattern: 'punched', spandrel }), 3.5, 'body').parts.filter((p) => p.position[2] > 0).length;
    expect(count('plain')).toBe(0);
    expect(count('chevron')).toBe(8);
    expect(count('stripes')).toBe(2);
  });

  it('makes bigger windows when the window area goes up', () => {
    const recipe = recipeFor({ windowPattern: 'punched' });
    const area = (ratio: number) => wallBay(recipe, 3.5, 'body', ratio).panes.reduce((s, { pane }) => s + pane.scale[0] * pane.scale[1], 0);
    expect(area(0.3)).toBeLessThan(area(0.8));
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/detail/frame.test.ts src/scene/detail/wallBay.test.ts`

Expected: FAIL — `Failed to resolve import "./frame"` and `"./wallBay"`, and the geometry test fails for `arch`.

- [ ] **Step 3: Create `src/scene/detail/frame.ts`**

```ts
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
```

- [ ] **Step 4: Create `src/scene/detail/wallBay.ts`**

```ts
import type { FacadeRecipe } from '../../sim/facade';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import { strutPart, type Part, type PartMaterial } from '../../sim/parts';
import { TILE_HEIGHT_M, openingFor } from '../facadeTile';

/** One window pane and the dim room behind it, kept apart so night mode can light them. */
export interface PaneUnit {
  pane: Part;
  room: Part;
}

export interface BayPieces {
  parts: Part[];
  panes: PaneUnit[];
}

/** How deep the glass sits behind the wall face, metres. */
export const GLASS_RECESS = 0.3;
const WALL_DEPTH = 0.3;

const box = (position: [number, number, number], scale: [number, number, number], material: PartMaterial): Part => ({
  shape: 'box',
  position,
  scale,
  material,
});

/**
 * One bay of one floor, in real 3D, in the bay's own frame: x runs along the wall from -width/2 to
 * width/2, y is up from the floor (0 to FLOOR_HEIGHT), z points out of the wall (the face is z = 0).
 * Window panes come from the same catalog data and opening size that paint the main tower's tile.
 */
export function wallBay(recipe: FacadeRecipe, width: number, wallMaterial: PartMaterial, windowRatio = recipe.windowRatio): BayPieces {
  const { pattern, spandrel } = recipe;
  const H = TILE_HEIGHT_M;
  const o = openingFor(windowRatio);
  const left = -width / 2;
  const x0 = left + o.x * width;
  const w = o.w * width;
  const y0 = o.y * H;
  const h = o.h * H;
  const archH = pattern.arch ? h * 0.22 : 0;
  const t = Math.max(0.05, pattern.frame * width);
  const zWall = -WALL_DEPTH / 2;
  const parts: Part[] = [];
  const panes: PaneUnit[] = [];

  // Slab edge between floors, sticking out a little, in the accent colour like the main tower's bands.
  parts.push(box([0, H + (FLOOR_HEIGHT - H) / 2, -0.1], [width, FLOOR_HEIGHT - H, 0.4], 'accent'));
  // Wall around the opening: below (the spandrel), above, left and right.
  parts.push(box([0, y0 / 2, zWall], [width, y0, WALL_DEPTH], wallMaterial));
  parts.push(box([0, (y0 + h + H) / 2, zWall], [width, H - y0 - h, WALL_DEPTH], wallMaterial));
  parts.push(box([(left + x0) / 2, y0 + h / 2, zWall], [x0 - left, h, WALL_DEPTH], wallMaterial));
  parts.push(box([(x0 + w + width / 2) / 2, y0 + h / 2, zWall], [width / 2 - x0 - w, h, WALL_DEPTH], wallMaterial));

  let cursor = 0;
  for (const p of pattern.panes) {
    // Wall-coloured piers fill any gap inside the opening between panes.
    if (p.x0 > cursor + 1e-9) {
      const gx = x0 + cursor * w;
      const gw = (p.x0 - cursor) * w;
      parts.push(box([gx + gw / 2, y0 + h / 2, zWall], [gw, h, WALL_DEPTH], wallMaterial));
    }
    cursor = p.x1;
    const px = x0 + p.x0 * w;
    const pw = (p.x1 - p.x0) * w;
    const ph = h - archH;
    const cx = px + pw / 2;
    panes.push({
      pane: box([cx, y0 + ph / 2, -GLASS_RECESS], [pw, ph, 0.05], 'glass'),
      room: box([cx, y0 + ph / 2, -GLASS_RECESS - 1.05], [pw, ph, 2], 'interior'),
    });
    if (archH > 0) {
      // A pointed head: two ramps rising to meet in the middle.
      parts.push({ shape: 'wedge', position: [px + pw / 4, y0 + ph + archH / 2, -GLASS_RECESS], scale: [pw / 2, archH, 0.05], rotation: [0, Math.PI, 0], material: 'glass' });
      parts.push({ shape: 'wedge', position: [px + (3 * pw) / 4, y0 + ph + archH / 2, -GLASS_RECESS], scale: [pw / 2, archH, 0.05], material: 'glass' });
    }
    const zf = -GLASS_RECESS + 0.06;
    parts.push(box([cx, y0 + t / 2, zf], [pw, t, 0.08], 'accent'));
    parts.push(box([cx, y0 + ph - t / 2, zf], [pw, t, 0.08], 'accent'));
    parts.push(box([px + t / 2, y0 + ph / 2, zf], [t, ph, 0.08], 'accent'));
    parts.push(box([px + pw - t / 2, y0 + ph / 2, zf], [t, ph, 0.08], 'accent'));
  }
  if (cursor < 1 - 1e-9) {
    const gx = x0 + cursor * w;
    const gw = (1 - cursor) * w;
    parts.push(box([gx + gw / 2, y0 + h / 2, zWall], [gw, h, WALL_DEPTH], wallMaterial));
  }
  if (pattern.diagonals) {
    const z = -GLASS_RECESS + 0.08;
    parts.push(strutPart([x0, y0, z], [x0 + w, y0 + h, z], t, 'accent'));
    parts.push(strutPart([x0, y0 + h, z], [x0 + w, y0, z], t, 'accent'));
  }

  // Spandrel decoration in relief on the wall below the window.
  if (spandrel.motif === 'chevron') {
    const top = y0 * 0.85;
    for (let i = 0; i < 8; i++) {
      const a: [number, number, number] = [left + (i / 8) * width, i % 2 === 0 ? top * 0.25 : top, 0.04];
      const b: [number, number, number] = [left + ((i + 1) / 8) * width, i % 2 === 0 ? top : top * 0.25, 0.04];
      parts.push(strutPart(a, b, 0.1, 'accent'));
    }
  } else if (spandrel.motif === 'stripes') {
    parts.push(box([0, y0 * 0.325, 0.04], [width, y0 * 0.25, 0.08], 'accent'));
    parts.push(box([0, y0 * 0.725, 0.04], [width, y0 * 0.25, 0.08], 'accent'));
  }
  return { parts, panes };
}
```

- [ ] **Step 5: Edit `src/sim/parts.ts`**

Replace:

```ts
  | 'torus'
```
with:

```ts
  | 'torus'
  /** A half ring standing upright in the x-y plane, open at the bottom: a doorway arch. */
  | 'arch'
```

Replace:

```ts
  'body', 'accent', 'glass', 'stone', 'concrete', 'copper', 'gold', 'steel', 'foliage', 'ruby', 'light',
```
with:

```ts
  'body', 'accent', 'glass', 'stone', 'concrete', 'copper', 'gold', 'steel', 'foliage', 'ruby', 'light', 'interior',
```

- [ ] **Step 6: Edit `src/scene/parts/materials.ts`**

Replace:

```ts
    case 'light':
      return { color: '#fff3c4', roughness: 0.5, metalness: 0 };
```
with:

```ts
    case 'light':
      return { color: '#fff3c4', roughness: 0.5, metalness: 0 };
    case 'interior':
      // The dim room behind a window, seen in the close-up.
      return { color: '#2a2f36', roughness: 0.9, metalness: 0 };
```

- [ ] **Step 7: Edit `src/scene/parts/geometries.ts`**

Replace:

```ts
function wedge(): THREE.BufferGeometry {
```
with:

```ts
function arch(): THREE.BufferGeometry {
  // The upper half of a ring in the x-y plane (y runs 0..0.5 before fitting), fitted to the unit cube.
  return new THREE.TorusGeometry(0.4, 0.1, 8, 24, Math.PI).translate(0, -0.25, 0).scale(1, 2, 5);
}

function wedge(): THREE.BufferGeometry {
```

Replace:

```ts
    case 'torus':
      return torus();
```
with:

```ts
    case 'torus':
      return torus();
    case 'arch':
      return arch();
```

- [ ] **Step 8: Edit `src/scene/parts/geometries.test.ts`**

Replace:

```ts
const SHAPES: PartShape[] = ['box', 'cylinder', 'cone', 'pyramid', 'sphere', 'dome', 'torus', 'wedge', 'plan', 'plan-cone'];
```
with:

```ts
const SHAPES: PartShape[] = ['box', 'cylinder', 'cone', 'pyramid', 'sphere', 'dome', 'torus', 'arch', 'wedge', 'plan', 'plan-cone'];
```

- [ ] **Step 9: Edit `src/sim/catalog/facades.ts`**

Replace:

```ts
      { shape: 'torus', position: [0, 5, 0.5], scale: [5.6, 1, 5.6], rotation: [Math.PI / 2, 0, 0], material: 'stone' },
```
with:

```ts
      { shape: 'arch', position: [0, 6.4, 0.5], scale: [5.6, 2.8, 1], material: 'stone' },
```

- [ ] **Step 10: Run the tests and type-check**

Run: `npx vitest run src/scene/detail/frame.test.ts src/scene/detail/wallBay.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  32 passed (32)`, `Tests  237 passed (237)`.

- [ ] **Step 11: Commit**

```bash
git add src/scene/detail/frame.ts src/scene/detail/frame.test.ts src/scene/detail/wallBay.ts src/scene/detail/wallBay.test.ts src/sim/parts.ts src/scene/parts/materials.ts src/scene/parts/geometries.ts src/scene/parts/geometries.test.ts src/sim/catalog/facades.ts
git commit -m "feat: 3D wall bay for the close-up; arch shape for doorways

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 2: The three close-up views

`detailModel(design, view)` picks the piece of tower for each view, builds its walls bay by bay on the main tower's own tile grid (so a lit window up close is the same one lit on the tower), and adds ornaments. Ribs, mullions and fins are placed on the section's own bay edges, one per floor. Every other ornament is taken from the main tower's placement and cut down to what is in view; bands become strips across the section. The views are a Facade (4 floors × up to 5 bays, from the middle of the tallest run), a Corner (the highest setback, or the roof corner), and a Base (ground floors, sidewalk and three 1.7 m people). Each view comes with a caption and a framed camera.

**Files:**
- Create: `src/scene/detail/detailModel.test.ts`
- Create: `src/scene/detail/detailModel.ts`
- Modify: `src/scene/ornaments.ts`

**Interfaces:**
- Consumes: Task 1: `wallBay`, `SectionFrame`, `worldAnchor`, `toLocalPart`, `placeAtAnchor`. Plan 2: `ornamentParts`, `crownParts`, `activeOrnaments`, `amountLevel`, `facadeRecipe`, `floorRuns`, `planCorners`, `planFaces`, `alongFace`, `setbackLevels`, `NIGHT_LIGHTS`, `windowLit`, `floorUses`.
- Produces:
  - `src/scene/detail/detailModel.ts`:
  - `DetailView = 'facade' | 'corner' | 'base'`, `DETAIL_VIEWS` (id and label).
  - `DetailWindow { pane, room, floor, bay, lit, color }`.
  - `DetailFocus { target, distance, yaw, pitch }`, `DetailModel { parts, windows, focus, caption }`.
  - `DETAIL_ASPECT` (320 / 220), `scalePeople(xs, z)`, `detailModel(design, view)`.
  - `ornamentParts(design, include?)` now takes an optional ornament filter.

- [ ] **Step 1: Write the failing tests**

`src/scene/detail/detailModel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { floorUses } from '../../sim/analysis/massing';
import { ORNAMENTS, WINDOW_PATTERNS } from '../../sim/catalog/facades';
import { ORNAMENT_IDS, SPANDREL_IDS, WINDOW_PATTERN_IDS } from '../../sim/catalog/ids';
import { FLOOR_HEIGHT } from '../../sim/geometry';
import { partBounds, partIsFinite, type Part } from '../../sim/parts';
import { designFor } from '../../sim/testUtils';
import type { Design, PlanShape } from '../../sim/types';
import { NIGHT_LIGHTS, windowLit } from '../nightWindows';
import { DETAIL_VIEWS, detailModel, type DetailModel } from './detailModel';

const SHAPES: PlanShape[] = ['square', 'rectangle', 'circle', 'triangle'];
const EXTREMES: Partial<Design>[] = [
  { floors: 5, twist: 0, taper: 0, setbacks: 'none' },
  { floors: 150, twist: 120, taper: 0.6, setbacks: 'wedding-cake', plateWidth: 15 },
];
const allParts = (m: DetailModel): Part[] => [...m.parts, ...m.windows.flatMap((w) => [w.pane, w.room])];

describe('detailModel', () => {
  it.each([...WINDOW_PATTERN_IDS])('%s: every spandrel, shape, extreme and view is finite and stays in its frame', (windowPattern) => {
    for (const spandrel of SPANDREL_IDS)
      for (const shape of SHAPES)
        for (const extreme of EXTREMES)
          for (const { id: view } of DETAIL_VIEWS) {
            const { design } = designFor('shanghai', { ...extreme, shape, windowPattern, spandrel, ornaments: [...ORNAMENT_IDS], ornament: 'high' });
            const m = detailModel(design, view);
            const label = `${windowPattern} ${spandrel} ${shape} ${extreme.floors} ${view}`;
            const parts = allParts(m);
            expect(m.windows.length, label).toBeGreaterThan(0);
            expect(parts.every(partIsFinite), label).toBe(true);
            for (const p of parts) {
              const b = partBounds(p);
              expect(Math.max(Math.abs(b.min[0]), Math.abs(b.max[0])), label).toBeLessThan(30);
              expect(b.min[1], label).toBeGreaterThan(-1);
              expect(b.max[1], label).toBeLessThan(4 * FLOOR_HEIGHT + 12);
              expect(Math.max(Math.abs(b.min[2]), Math.abs(b.max[2])), label).toBeLessThan(25);
            }
            expect(m.windows.length % WINDOW_PATTERNS[windowPattern].panes.length, label).toBe(0);
            expect(Number.isFinite(m.focus.distance) && m.focus.distance > 0, label).toBe(true);
          }
  });

  it('shows 5 bays on 4 floors of a wide facade, one window per pane', () => {
    const { design } = designFor('chicago', { shape: 'square', plateWidth: 40, floors: 40, setbacks: 'none', windowPattern: 'chicago' });
    expect(detailModel(design, 'facade').windows).toHaveLength(3 * 5 * 4);
  });

  it('changes when the windows, spandrels, window area or ornaments change', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake', ornaments: [], ornament: 'high' });
    const facade = (d: Design) => JSON.stringify(detailModel(d, 'facade'));
    expect(facade({ ...design, windowPattern: 'arched' })).not.toBe(facade({ ...design, windowPattern: 'punched' }));
    expect(facade({ ...design, spandrel: 'chevron' })).not.toBe(facade({ ...design, spandrel: 'plain' }));
    expect(facade({ ...design, windowRatio: 0.3 })).not.toBe(facade({ ...design, windowRatio: 0.8 }));
    expect(facade({ ...design, ornaments: ['stone-ribs'] })).not.toBe(facade(design));
    const corner = (d: Design) => detailModel(d, 'corner').parts.length;
    expect(corner({ ...design, ornaments: ['gargoyles'] })).toBeGreaterThan(corner(design));
  });

  it('amount None removes decorative ornaments from the close-up too', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake', ornaments: ['gargoyles', 'pinnacles'], ornament: 'none' });
    expect(detailModel(design, 'corner').parts.length).toBe(detailModel({ ...design, ornaments: [] }, 'corner').parts.length);
  });

  it('puts ribs between windows on every floor of the section', () => {
    const { design } = designFor('chicago', { shape: 'square', plateWidth: 40, floors: 40, setbacks: 'none', ornaments: [], ornament: 'high' });
    const plain = detailModel(design, 'facade').parts.length;
    const ribbed = detailModel({ ...design, ornaments: ['stone-ribs'] }, 'facade').parts.length;
    expect(ribbed - plain).toBe(6 * 4); // 6 bay edges × 4 floors, every edge at High
  });

  it('frames the corner view on the highest setback, or the roof when there is none', () => {
    const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake' });
    expect(detailModel(design, 'corner').caption).toMatch(/^Setback at floor \d+/);
    expect(detailModel({ ...design, setbacks: 'none' }, 'corner').caption).toMatch(/^Roof corner/);
  });

  it('shows the arched entry and rusticated base only when chosen, and three 1.7 m people', () => {
    const { design } = designFor('chicago', { ornaments: [], ornament: 'high' });
    const base = (d: Design) => detailModel(d, 'base');
    const plain = base(design).parts.length;
    expect(base({ ...design, ornaments: ['arched-entry'] }).parts.length).toBeGreaterThan(plain);
    expect(base({ ...design, ornaments: ['rusticated-base'] }).parts.length).toBeGreaterThan(plain);
    const heads = base(design).parts.filter((p) => p.shape === 'sphere');
    expect(heads).toHaveLength(3);
    for (const h of heads) expect(partBounds(h).max[1]).toBeCloseTo(1.7, 5);
    expect(base({ ...design, ornaments: ['arched-entry'] }).caption).toMatch(/Arched entry/);
  });

  it('lights the same windows at night as the main tower', () => {
    const { design } = designFor('chicago', { floors: 40, useMix: { retail: 10, office: 40, hotel: 0, residential: 50 } });
    const uses = floorUses(design);
    for (const { id } of DETAIL_VIEWS)
      for (const w of detailModel(design, id).windows)
        expect(w.lit).toBe(windowLit(w.bay, w.floor, NIGHT_LIGHTS[uses[w.floor]].lit));
  });

  it('captions name the floor, its use, the window pattern and the spandrel', () => {
    const { design } = designFor('chicago', { floors: 40, setbacks: 'none', windowPattern: 'chicago', spandrel: 'chevron', useMix: { retail: 0, office: 100, hotel: 0, residential: 0 } });
    expect(detailModel(design, 'facade').caption).toMatch(/^Floor \d+ · Offices · Chicago windows · Deco chevrons$/);
  });

  it('builds even the worst case fast enough to redraw on every slider tick', () => {
    const { design } = designFor('shanghai', { floors: 150, plateWidth: 80, shape: 'circle', twist: 120, taper: 0.3, setbacks: 'wedding-cake', ornaments: [...ORNAMENT_IDS], ornament: 'high' });
    for (const { id } of DETAIL_VIEWS) detailModel(design, id);
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) for (const { id } of DETAIL_VIEWS) detailModel({ ...design, floors: 150 - i }, id);
    expect((performance.now() - t0) / 15).toBeLessThan(20);
  });

  it('every ornament can appear in at least one view when the tower has setbacks', () => {
    for (const id of ORNAMENT_IDS) {
      const { design } = designFor('chicago', { floors: 50, setbacks: 'wedding-cake', ornaments: [], ornament: 'high' });
      const count = (d: Design) => DETAIL_VIEWS.reduce((s, v) => s + detailModel(d, v.id).parts.length, 0);
      expect(count({ ...design, ornaments: [id] }), `${id} (${ORNAMENTS[id].placement})`).toBeGreaterThan(count(design));
    }
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/detail/detailModel.test.ts`

Expected: FAIL — `Failed to resolve import "./detailModel"`.

- [ ] **Step 3: Edit `src/scene/ornaments.ts`**

Replace:

```ts
/** Every ornament the design builds, in building coordinates. */
export function ornamentParts(design: Design): Part[] {
  const level = amountLevel(design);
  return activeOrnaments(design).flatMap((o) => place(o, design, o.amount[level]));
}
```
with:

```ts
/** Every ornament the design builds (or just those `include` accepts), in building coordinates. */
export function ornamentParts(design: Design, include: (o: OrnamentDef) => boolean = () => true): Part[] {
  const level = amountLevel(design);
  return activeOrnaments(design)
    .filter(include)
    .flatMap((o) => place(o, design, o.amount[level]));
}
```

- [ ] **Step 4: Create `src/scene/detail/detailModel.ts`**

```ts
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
  const b = buildRuns(design, runs, frame, 8, step.isRoof ? crownParts(design) : []);
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
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run src/scene/detail/detailModel.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  33 passed (33)`, `Tests  253 passed (253)`.

- [ ] **Step 6: Commit**

```bash
git add src/scene/detail/detailModel.test.ts src/scene/detail/detailModel.ts src/scene/ornaments.ts
git commit -m "feat: facade, corner and base close-up models

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 3: The close-up canvas and its camera

`DetailScene` draws a model: its parts through the existing `PartsMesh`, and its windows as instanced glass and rooms, with lit windows glowing in their floor's colour at night. `DetailCanvas` wraps it in a small R3F canvas with `frameloop="demand"`, so it only draws when something changes. It also adds the gentle drag: up to ±30° sideways and ±15° up or down, easing back in about 0.4 s. `lighting()` moves to its own module, because the close-up needs it and `Scene.tsx` will import the inset; `Scene.tsx` re-exports it so existing imports keep working.

**Files:**
- Create: `src/scene/detail/camera.test.ts`
- Create: `src/scene/detail/DetailScene.test.tsx`
- Create: `src/scene/lighting.ts`
- Create: `src/scene/detail/camera.ts`
- Create: `src/scene/detail/DetailCanvas.tsx`
- Modify: `src/scene/Scene.tsx`

**Interfaces:**
- Consumes: Task 2: `detailModel`, `DetailFocus`, `DetailView`, `DetailWindow`. Plan 2: `PartsMesh`, `partMatrix`, `partGeometry`, `lighting`.
- Produces:
  - `src/scene/lighting.ts`: `lighting(site, night)`, still re-exported from `src/scene/Scene.tsx`.
  - `src/scene/detail/camera.ts`: `MAX_DRAG_YAW`, `MAX_DRAG_PITCH`, `Drag { yaw; pitch }`, `dragBy(drag, dx, dy)`, `easeBack(drag, dt)`, `cameraPose(focus, drag)`.
  - `src/scene/detail/DetailCanvas.tsx`: `<DetailScene site design view night drag />` (testable without WebGL) and `<DetailCanvas site design view night />`.

- [ ] **Step 1: Write the failing tests**

`src/scene/detail/camera.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_DRAG_PITCH, MAX_DRAG_YAW, cameraPose, dragBy, easeBack } from './camera';

const focus = { target: [0, 8, 0] as [number, number, number], distance: 30, yaw: 0, pitch: 0 };

describe('close-up camera', () => {
  it('sits in front of the wall at the framed distance when not dragged', () => {
    const { position, target } = cameraPose(focus, { yaw: 0, pitch: 0 });
    expect(position).toEqual([0, 8, 30]);
    expect(target).toEqual([0, 8, 0]);
  });

  it('never lets the player drag past ±30° sideways or ±15° up and down', () => {
    const far = dragBy({ yaw: 0, pitch: 0 }, -5000, 5000);
    expect(far.yaw).toBeCloseTo(MAX_DRAG_YAW);
    expect(far.pitch).toBeCloseTo(MAX_DRAG_PITCH);
    const back = dragBy(far, 10000, -10000);
    expect(back.yaw).toBeCloseTo(-MAX_DRAG_YAW);
    expect(back.pitch).toBeCloseTo(-MAX_DRAG_PITCH);
  });

  it('eases back to the framed view in about 0.4 seconds', () => {
    let d = { yaw: MAX_DRAG_YAW, pitch: -MAX_DRAG_PITCH };
    for (let i = 0; i < 25; i++) d = easeBack(d, 1 / 60);
    expect(d).toEqual({ yaw: 0, pitch: 0 });
  });
});
```

`src/scene/detail/DetailScene.test.tsx`:

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { designFor } from '../../sim/testUtils';
import { DetailScene } from './DetailCanvas';
import { detailModel } from './detailModel';

const drag = { yaw: 0, pitch: 0 };

describe('<DetailScene />', () => {
  it('draws every view without throwing', async () => {
    const { site, design } = designFor('chicago', { ornaments: ['stone-ribs', 'gargoyles', 'arched-entry'], ornament: 'high', setbacks: 'few' });
    for (const view of ['facade', 'corner', 'base'] as const) {
      const r = await ReactThreeTestRenderer.create(<DetailScene site={site} design={design} view={view} night={false} drag={drag} />);
      expect(r.scene.findAll((n) => n.props.name === 'detail')).toHaveLength(1);
      await r.unmount();
    }
  });

  it('at night, lit windows glow in their own group', async () => {
    const { site, design } = designFor('chicago');
    const lit = detailModel(design, 'facade').windows.filter((w) => w.lit).length;
    const r = await ReactThreeTestRenderer.create(<DetailScene site={site} design={design} view="facade" night drag={drag} />);
    const glowing = r.scene
      .findAll((n) => (n.instance as THREE.InstancedMesh).isInstancedMesh === true)
      .map((n) => n.instance as THREE.InstancedMesh)
      .filter((m) => (m.material as THREE.MeshStandardMaterial).emissiveIntensity > 1);
    expect(glowing.reduce((s, m) => s + m.count, 0)).toBe(lit);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/detail/camera.test.ts src/scene/detail/DetailScene.test.tsx`

Expected: FAIL — `Failed to resolve import "./camera"` and `"./DetailCanvas"`.

- [ ] **Step 3: Create `src/scene/lighting.ts`**

```ts
import type { Site } from '../sim/types';

/** Sky and light for day or night. Night is a simple dusk palette — no light simulation. */
export function lighting(site: Site, night: boolean) {
  return night
    ? { sky: '#0b1426', hemi: 0.4, hemiSky: '#6f85b5', sun: 0.35, sunColor: '#9fb4ff' }
    : { sky: site.visuals.sky, hemi: 0.9, hemiSky: '#ffffff', sun: 1.8, sunColor: '#ffffff' };
}
```

- [ ] **Step 4: Edit `src/scene/Scene.tsx`**

Delete:

```tsx
import type { Site } from '../sim/types';
```

Replace:

```tsx
import { Landmark } from './Landmark';
```
with:

```tsx
import { Landmark } from './Landmark';
import { lighting } from './lighting';
```

Replace:

```tsx
/** Sky and light for day or night. Night is a simple dusk palette — no light simulation. */
export function lighting(site: Site, night: boolean) {
  return night
    ? { sky: '#0b1426', hemi: 0.4, hemiSky: '#6f85b5', sun: 0.35, sunColor: '#9fb4ff' }
    : { sky: site.visuals.sky, hemi: 0.9, hemiSky: '#ffffff', sun: 1.8, sunColor: '#ffffff' };
}
```
with:

```tsx
export { lighting };
```

- [ ] **Step 5: Create `src/scene/detail/camera.ts`**

```ts
import type { Vec3 } from '../../sim/parts';
import type { DetailFocus } from './detailModel';

/** How far the player may drag the close-up around, radians. */
export const MAX_DRAG_YAW = (30 * Math.PI) / 180;
export const MAX_DRAG_PITCH = (15 * Math.PI) / 180;

export interface Drag {
  yaw: number;
  pitch: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Adds a pointer movement (pixels) to the drag, kept within the allowed range. */
export function dragBy(d: Drag, dx: number, dy: number): Drag {
  return {
    yaw: clamp(d.yaw - dx * 0.006, -MAX_DRAG_YAW, MAX_DRAG_YAW),
    pitch: clamp(d.pitch + dy * 0.006, -MAX_DRAG_PITCH, MAX_DRAG_PITCH),
  };
}

/** One step of easing back to the framed view after the player lets go (`dt` in seconds). */
export function easeBack(d: Drag, dt: number): Drag {
  const k = Math.exp(-dt / 0.08);
  const next = { yaw: d.yaw * k, pitch: d.pitch * k };
  // Snap the last half-degree so the canvas can stop redrawing.
  return Math.abs(next.yaw) < 0.01 && Math.abs(next.pitch) < 0.01 ? { yaw: 0, pitch: 0 } : next;
}

/** Camera position for a framed view plus the current drag. +z is out of the wall, toward the viewer. */
export function cameraPose(f: DetailFocus, d: Drag): { position: Vec3; target: Vec3 } {
  const yaw = f.yaw + d.yaw;
  const pitch = f.pitch + d.pitch;
  const [tx, ty, tz] = f.target;
  return {
    position: [
      tx + f.distance * Math.sin(yaw) * Math.cos(pitch),
      ty + f.distance * Math.sin(pitch),
      tz + f.distance * Math.cos(yaw) * Math.cos(pitch),
    ],
    target: f.target,
  };
}
```

- [ ] **Step 6: Create `src/scene/detail/DetailCanvas.tsx`**

```tsx
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import * as THREE from 'three';
import type { Design, Site } from '../../sim/types';
import { PartsMesh, partMatrix } from '../parts/PartsMesh';
import { partGeometry } from '../parts/geometries';
import { lighting } from '../lighting';
import { cameraPose, dragBy, easeBack, type Drag } from './camera';
import { detailModel, type DetailFocus, type DetailView, type DetailWindow } from './detailModel';

/** Points the camera at the framed view plus the drag; asks for one new frame when it moves. */
function CameraRig({ focus, drag }: { focus: DetailFocus; drag: Drag }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const pose = cameraPose(focus, drag);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.far = focus.distance * 6;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, focus, drag]);
  return null;
}

/** Window glass and the rooms behind it; lit windows glow in their floor's colour at night. */
function Windows({ windows, night, glass }: { windows: DetailWindow[]; night: boolean; glass: string }) {
  const groups = useMemo(() => {
    const map = new Map<string, { lit: boolean; color: string; items: DetailWindow[] }>();
    for (const w of windows) {
      const lit = night && w.lit;
      const key = lit ? w.color : 'dark';
      if (!map.has(key)) map.set(key, { lit, color: w.color, items: [] });
      map.get(key)!.items.push(w);
    }
    return [...map.values()];
  }, [windows, night]);
  return (
    <group name="detail-windows">
      {groups.map((g) => (
        <WindowGroup key={(g.lit ? 'lit-' : '') + g.color} items={g.items} lit={g.lit} color={g.color} glass={glass} />
      ))}
    </group>
  );
}

function WindowGroup({ items, lit, color, glass }: { items: DetailWindow[]; lit: boolean; color: string; glass: string }) {
  const panes = useRef<THREE.InstancedMesh>(null);
  const rooms = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    items.forEach((w, i) => {
      panes.current?.setMatrixAt(i, partMatrix(w.pane, 0, m));
      rooms.current?.setMatrixAt(i, partMatrix(w.room, 0, m));
    });
    for (const mesh of [panes.current, rooms.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [items]);
  const box = partGeometry('box', 'square');
  return (
    <>
      <instancedMesh key={`p${items.length}`} ref={panes} args={[box, undefined, items.length]}>
        <meshStandardMaterial
          color={lit ? color : glass}
          emissive={lit ? color : '#000000'}
          emissiveIntensity={lit ? 1.2 : 0}
          roughness={0.1}
          metalness={lit ? 0 : 0.5}
          transparent={!lit}
          opacity={lit ? 1 : 0.75}
        />
      </instancedMesh>
      <instancedMesh key={`r${items.length}`} ref={rooms} args={[box, undefined, items.length]}>
        <meshStandardMaterial color="#2a2f36" emissive={lit ? color : '#000000'} emissiveIntensity={lit ? 0.25 : 0} roughness={0.9} />
      </instancedMesh>
    </>
  );
}

interface DetailProps {
  site: Site;
  design: Design;
  view: DetailView;
  night: boolean;
}

/** Everything inside the close-up's canvas: lights, the section's parts, its windows and the camera. */
export function DetailScene({ site, design, view, night, drag }: DetailProps & { drag: Drag }) {
  const model = useMemo(() => detailModel(design, view), [design, view]);
  const light = lighting(site, night);
  return (
    <>
      <color attach="background" args={[light.sky]} />
      <hemisphereLight args={[light.hemiSky, site.visuals.ground, light.hemi]} />
      <directionalLight position={[30, 60, 80]} intensity={light.sun} color={light.sunColor} />
      <PartsMesh name="detail" parts={model.parts} palette={design.palette} plan={design.shape} night={night} />
      <Windows windows={model.windows} night={night} glass={design.palette.glass} />
      <CameraRig focus={model.focus} drag={drag} />
    </>
  );
}

/**
 * The close-up: a small canvas that only draws when something changes (design, view, night, drag).
 * Drag to look around a little; it eases back to the framed view when let go.
 */
export function DetailCanvas(props: DetailProps) {
  const [drag, setDragState] = useState<Drag>({ yaw: 0, pitch: 0 });
  const dragRef = useRef(drag);
  const setDrag = (d: Drag) => {
    dragRef.current = d;
    setDragState(d);
  };
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const settle = useRef<number | null>(null);

  useEffect(() => () => {
    if (settle.current !== null) cancelAnimationFrame(settle.current);
  }, []);

  const stopSettling = () => {
    if (settle.current !== null) cancelAnimationFrame(settle.current);
    settle.current = null;
  };
  const onPointerDown = (e: PointerEvent) => {
    stopSettling();
    dragging.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.x;
    const dy = e.clientY - dragging.current.y;
    dragging.current = { x: e.clientX, y: e.clientY };
    setDrag(dragBy(dragRef.current, dx, dy));
  };
  const onPointerUp = () => {
    dragging.current = null;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = easeBack(dragRef.current, dt);
      setDrag(next);
      settle.current = next.yaw === 0 && next.pitch === 0 ? null : requestAnimationFrame(step);
    };
    settle.current = requestAnimationFrame(step);
  };

  return (
    <div className="detail-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <Canvas frameloop="demand" camera={{ fov: 40, near: 0.1, far: 500 }} fallback={<p className="detail-fallback">Close-up needs 3D graphics.</p>}>
        <DetailScene {...props} drag={drag} />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 7: Run the tests and type-check**

Run: `npx vitest run src/scene/detail/camera.test.ts src/scene/detail/DetailScene.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  35 passed (35)`, `Tests  258 passed (258)`.

- [ ] **Step 8: Commit**

```bash
git add src/scene/detail/camera.test.ts src/scene/detail/DetailScene.test.tsx src/scene/lighting.ts src/scene/detail/camera.ts src/scene/detail/DetailCanvas.tsx src/scene/Scene.tsx
git commit -m "feat: close-up canvas with framed, draggable camera and night windows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 4: The close-up inset

A picture-in-picture box in the bottom-right of the 3D view. It has **Facade · Corner · Base** buttons, a minimize button, the canvas and a caption. The chosen view and minimized state are remembered for the browser session, with every storage access guarded. It starts minimized on screens narrower than 900 px, and it keeps working after the design is built.

**Files:**
- Create: `src/ui/DetailInset.test.tsx`
- Create: `src/ui/DetailInset.tsx`
- Modify: `src/scene/Scene.tsx`
- Modify: `src/ui/styles.css`

**Interfaces:**
- Consumes: Task 3: `DetailCanvas`. Task 2: `DETAIL_VIEWS`, `detailModel` (caption). Store: `timeOfDay`; `useCurrent()`.
- Produces:
  - `src/ui/DetailInset.tsx`: `<DetailInset />`, rendered by `Scene` just after the main canvas.
  - Accessible names:
  - region `Close-up`;
  - view buttons `Facade`, `Corner`, `Base`, using `aria-pressed`;
  - `Minimize close-up`;
  - when minimized, a `🔍 Close-up` button.

- [ ] **Step 1: Write the failing tests**

`src/ui/DetailInset.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../state/store';
import { DetailInset } from './DetailInset';

// WebGL is not available in jsdom; the close-up's 3D contents have their own tests.
vi.mock('../scene/detail/DetailCanvas', () => ({ DetailCanvas: ({ view }: { view: string }) => <div data-testid="detail-canvas">{view}</div> }));

describe('<DetailInset />', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.innerWidth = 1366;
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
  });
  afterEach(() => sessionStorage.clear());

  it('switches between Facade, Corner and Base, with a caption for each', () => {
    render(<DetailInset />);
    const inset = screen.getByRole('region', { name: 'Close-up' });
    expect(within(inset).getByText(/^Floor \d+ · /)).toBeInTheDocument();
    fireEvent.click(within(inset).getByRole('button', { name: 'Corner' }));
    expect(within(inset).getByRole('button', { name: 'Corner' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(inset).getByText(/^Roof corner · /)).toBeInTheDocument();
    fireEvent.click(within(inset).getByRole('button', { name: 'Base' }));
    expect(within(inset).getByText(/^Ground floor · /)).toBeInTheDocument();
    expect(screen.getByTestId('detail-canvas')).toHaveTextContent('base');
  });

  it('minimizes to a small button and remembers it for the session', () => {
    const { unmount } = render(<DetailInset />);
    fireEvent.click(screen.getByRole('button', { name: 'Minimize close-up' }));
    expect(screen.queryByRole('region', { name: 'Close-up' })).not.toBeInTheDocument();
    unmount();
    render(<DetailInset />);
    fireEvent.click(screen.getByRole('button', { name: /Close-up/ }));
    expect(screen.getByRole('region', { name: 'Close-up' })).toBeInTheDocument();
  });

  it('starts minimized on a narrow screen', () => {
    window.innerWidth = 800;
    render(<DetailInset />);
    expect(screen.queryByRole('region', { name: 'Close-up' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close-up/ })).toBeInTheDocument();
  });

  it('keeps working after the design is built', () => {
    useGame.getState().build();
    render(<DetailInset />);
    expect(screen.getByRole('region', { name: 'Close-up' })).toBeInTheDocument();
  });

  it('still works when session storage is blocked', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<DetailInset />);
    expect(screen.getByRole('region', { name: 'Close-up' })).toBeInTheDocument();
    get.mockRestore();
    set.mockRestore();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/DetailInset.test.tsx`

Expected: FAIL — `Failed to resolve import "./DetailInset"`.

- [ ] **Step 3: Create `src/ui/DetailInset.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { DetailCanvas } from '../scene/detail/DetailCanvas';
import { DETAIL_VIEWS, detailModel, type DetailView } from '../scene/detail/detailModel';
import { useCurrent } from '../state/hooks';
import { useGame } from '../state/store';

const STORE_KEY = 'detail-inset';

/** Remembered for this browser session only; storage can be missing or blocked, so every access is guarded. */
function loadPrefs(): { view: DetailView; minimized: boolean } | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePrefs(prefs: { view: DetailView; minimized: boolean }) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  } catch {
    // Not saved — the inset still works.
  }
}

/** Narrow screens (phones) start with the close-up tucked away so it doesn't cover the tower. */
const startsMinimized = () => typeof window !== 'undefined' && window.innerWidth < 900;

/** A picture-in-picture close-up of the facade, a setback corner or the base, in true 3D. */
export function DetailInset() {
  const { site, design } = useCurrent();
  const night = useGame((s) => s.timeOfDay === 'night');
  const [prefs, setPrefs] = useState(() => loadPrefs() ?? { view: 'facade' as DetailView, minimized: startsMinimized() });
  useEffect(() => savePrefs(prefs), [prefs]);
  const caption = detailModel(design, prefs.view).caption;

  if (prefs.minimized) {
    return (
      <button className="detail-open" onClick={() => setPrefs({ ...prefs, minimized: false })}>
        🔍 Close-up
      </button>
    );
  }
  return (
    <section className="detail-inset" aria-label="Close-up">
      <div className="detail-bar">
        {DETAIL_VIEWS.map((v) => (
          <button key={v.id} aria-pressed={prefs.view === v.id} onClick={() => setPrefs({ ...prefs, view: v.id })}>
            {v.label}
          </button>
        ))}
        <button className="detail-min" aria-label="Minimize close-up" onClick={() => setPrefs({ ...prefs, minimized: true })}>
          ▁
        </button>
      </div>
      <DetailCanvas site={site} design={design} view={prefs.view} night={night} />
      <p className="detail-caption">{caption}</p>
    </section>
  );
}
```

- [ ] **Step 4: Edit `src/scene/Scene.tsx`**

Replace:

```tsx
import { useGame } from '../state/store';
```
with:

```tsx
import { useGame } from '../state/store';
import { DetailInset } from '../ui/DetailInset';
```

Replace:

```tsx
      </Canvas>
      <div className="scene-overlay">
```
with:

```tsx
      </Canvas>
      <DetailInset />
      <div className="scene-overlay">
```

- [ ] **Step 5: Append to `src/ui/styles.css`**

```css
.detail-inset { position: absolute; right: 12px; bottom: 12px; width: 320px; background: rgba(17, 22, 28, 0.9); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.detail-bar { display: flex; gap: 4px; padding: 6px; }
.detail-bar button { font-size: 0.8em; padding: 3px 8px; }
.detail-bar button[aria-pressed='true'] { border-color: var(--accent); color: var(--accent); }
.detail-bar .detail-min { margin-left: auto; }
.detail-canvas { height: 220px; cursor: grab; touch-action: none; }
.detail-canvas:active { cursor: grabbing; }
.detail-caption { margin: 0; padding: 6px 8px; font-size: 0.78em; color: var(--muted); }
.detail-fallback { padding: 12px; font-size: 0.85em; color: var(--muted); }
.detail-open { position: absolute; right: 12px; bottom: 12px; }
@media (max-width: 900px) { .detail-inset { width: 240px; } .detail-canvas { height: 160px; } }
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run src/ui/DetailInset.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  36 passed (36)`, `Tests  263 passed (263)`.

- [ ] **Step 7: Commit**

```bash
git add src/ui/DetailInset.test.tsx src/ui/DetailInset.tsx src/scene/Scene.tsx src/ui/styles.css
git commit -m "feat: close-up inset with facade, corner and base views

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```


### Task 5: README and visual check

Tell players about the close-up, then check every style's three views by eye, by day and by night.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Everything above.
- Produces:
  A README paragraph about the 🔍 Close-up.

- [ ] **Step 1: Edit `README.md`**

Replace:

```markdown
Then open the printed `http://localhost:5173` link.
```
with:

```markdown
Then open the printed `http://localhost:5173` link.

In the game, the **🔍 Close-up** window (bottom-right of the 3D view) shows a piece of the tower in full detail. Use **Facade**, **Corner** and **Base** to switch, and drag to look around.
```

- [ ] **Step 2: Check every style by eye**

Run `npm run dev`, choose **Sandbox in Chicago**, and set Floors to about 45. For each of the 8 styles, pick it, then click **Facade**, **Corner** and **Base** in the close-up (bottom-right). Do this by day, then again after **🌙 Night**. Check:

- **Facade:**
  - the windows match the style: Chicago windows have three panes, Gothic windows have pointed arches, Diamond glass has diagonal bars;
  - the glass sits back from the wall;
  - Deco chevrons and Postmodern stripes stand out in relief;
  - ribs, mullions and fins sit *between* windows, on every floor.
- **Corner** (use wedding-cake setbacks for Gothic and Art Deco): pinnacles, gargoyles, Deco step ornaments and sunbursts sit on the ledge where the tower steps in. Styles without setbacks show the roof corner and cornice.
- **Base:** the arched entry is a real arch, rusticated stone shows as bands, and there is a sidewalk with three small people.
- **Round towers** (Neo-Futurist): the wall section curves.
- **Night:** windows glow in their floor's colour, with a dim room behind each. Compare with the main tower: the same pattern of lit windows.
- **Interaction:**
  - Dragging the close-up turns it a little and it springs back.
  - The caption names the floor, use, window pattern and spandrel (Facade), or the ornaments (Corner/Base).
  - Minimize, then reopen with 🔍 Close-up; reloading the page remembers the choice.
  - At a window narrower than 900 px, it starts minimized.
- **Live updates:** change windows, spandrels or ornaments in the sidebar and watch the close-up update immediately. Drag Floors from 40 to 150 with every ornament on; it should keep up.
- **Console:** the browser console shows no errors.

- [ ] **Step 3: Run the tests and type-check**

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  36 passed (36)`, `Tests  263 passed (263)`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: mention the close-up window

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

