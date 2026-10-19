# Skyscraper Studio — Plan 6: Facade Surface and Granular Detail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the tower reads as a real building from mid range to close up:
- every window has a **room behind it**, with depth, blinds, furniture and light;
- the glass sits **back from the wall** and **reflects the sky**, with a sun glint;
- panes **vary** from window to window;
- tall towers get **louvred plant floors**;
- homes get **balconies**;
- a **✨ Detail: High / Simple** switch keeps slow computers smooth.

**Architecture:**
- **Pure helpers** (`src/scene/facadeDetail.ts`): room colours by use, per-window choices (blinds, dark rooms, glass tint) from salted hashes with GLSL twins, and mechanical-floor indexes. The per-floor night attributes gain the room colour and a plant-floor flag.
- **The facade shader** (`FacadeMaterial.ts`) gains four effects:
  - **Interior mapping:** the view ray is traced into a 3 m-deep box room per bay.
  - **Parallax recess:** the glass mask is looked up again, shifted by the view direction.
  - **Fresnel sky reflection plus a sun glint**, added as emitted light.
  - **Louvres** on plant floors.

  It is all switched by a `uDetail` uniform, so turning detail on or off never recompiles. `Building` sets detail and sky.
- **A view-only store setting** `facadeDetail` drives the main tower and the construction view.
- **Balconies** (`src/scene/balconies.ts`) are new parts placed with the Close-up's helpers, drawn through `PartsMesh`, so they sway and appear floor by floor during construction.

**Tech Stack:** Vite 8, React 19, TypeScript 5.9, three 0.186, @react-three/fiber 9, Zustand 5, Vitest 5 + jsdom + Testing Library + @react-three/test-renderer 9. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-18-visual-detail-design.md` §3. Its choices marked **(assumed)** were made autonomously and await the user's review.

**Branch:** work on `plan-6-facade-detail`, cut from `master`. **Do not push.**

**Provenance:**
- This plan's code was written and run task by task on a throwaway branch.
- The plan was then replayed mechanically on a fresh checkout of `master`. After every task, `tsc` was clean and the suite passed with the counts given.
- **Headless Chrome checks:**
  - the shader compiles (three logs shader errors to the console, and there were none);
  - all 8 styles plus an all-homes tower were screenshotted at mid range and close up by day, and close up at night;
  - High and Simple were timed.

## Rulings (where this plan differs from the spec's wording)

- **Simple is a uniform (`uDetail = 0`), not a separate shader program,** so the switch is instant and never recompiles. With `uDetail = 0` the shader draws exactly the old painted tile.
- **The facade detail setting is kept across new projects.** It is about what the computer can draw, not about the design.
- **Neighbouring buildings stay simple.** They share the facade material, so `uDetail` defaults to 0 and only `Building` turns it on.
- **Daytime rooms are dimmed to 40% (`ROOM_DAYLIGHT`), and reflections are kept moderate:** `(0.08 + 0.5·fresnel) × 0.7`. With brighter values, tuned against screenshots, a glass tower turned pale grey and stopped reading as glass.
- **Balconies:**
  - Two parts each: a concrete slab and a glass railing (no separate top rail).
  - On every other bay, but **every third on walls with more than 16 bays**.
  - None on the ground floor or on plant floors.
  - The budget is under **10,000 parts** and 30 ms, not the spec's 6,000. A 150-floor, 80 m round, all-homes tower made 11,280 parts at every other bay.
- **Frame rate:** the spec's ≥ 30 fps target on a Chromebook can't be measured headless. Headless software rendering (no GPU) showed no measurable difference between High and Simple, about 9 vs 7–9 fps, mostly noise. Checking it on the real Chromebook is left to the user.
- **The shader is checked in a real browser** (Task 5), because jsdom cannot compile GLSL. A shader error that unit tests missed was caught this way while prototyping.
- **Speed tests use the fastest of five runs** (Task 1, new; not in the spec). The average was flaky under parallel load, and GitHub runs this suite before every deploy.
- **The Close-up inset is unchanged.** It already draws true 3D bays; Plan 8 will make the main tower match it up close.

## Global Constraints

- `src/sim/` is unchanged; the facade detail is view-only.
- Every per-window choice is a fixed hash of (bay, floor). JS and GLSL must agree, and blinds, dark rooms and tint are salted so they are independent of the night lights.
- Plant floors never light at night.
- With detail off (`uDetail = 0`), the facade looks exactly as before. Neighbours always stay simple.
- No new draw calls for the facade. Balconies use instanced parts.
- Use `npm`. No new dependencies. Commit after every task with the trailer lines shown. **Never push.**

## Review Focus

1. **GLSL that compiles in jsdom's eyes but not on a GPU** (undeclared identifiers, shadowed built-ins). Only the Task 5 browser check catches these, so run it.
2. **Viewing angles:** looking straight up the facade, or along it at a grazing angle. The room ray and the parallax shift divide by the view direction; they are clamped (`max(-ray.z, 0.15)`, `1e-4` guards), so check for stretching or speckle by eye.
3. **Round towers:** the room ray uses a per-pixel wall normal. Check the Neo-futurist tower close up for seams.
4. **Night on a tower with plant floors:** plant floors stay dark, and rooms glow with depth.
5. **Construction with homes:** balconies appear only on finished floors, and the detail setting applies there too.
6. **Timing-sensitive tests:** Plan 4's skeleton speed test failed while the whole suite ran in parallel and passed alone. Task 1 makes every speed test time the fastest of five runs. If a speed test still fails, re-run it alone before treating it as a regression.

## File Structure

```
src/test/fastest.ts             fastest-of-N timing for speed tests
src/scene/facadeDetail.ts       room tints, blinds / dark / tint hashes (+ GLSL twins), mechanical floors
src/scene/nightWindows.ts       per-floor attributes gain room colour and plant-floor flag
src/scene/FacadeMaterial.ts     rooms, recess, reflections, louvres; uDetail, uSkyColor, uSunDir
src/scene/Building.tsx          sets detail and sky; draws balconies
src/scene/balconies.ts          balcony parts on home floors
src/ui/FacadeDetailToggle.tsx   ✨ Detail: High / Simple
```

---

### Task 1: Steady speed tests

Speed tests compare one timing against a budget. When the whole suite runs in parallel, other test files steal the CPU at random, and Plan 4's skeleton test failed that way (35 ms against 30) while passing alone. `fastestMs(runs, fn)` times several runs and keeps the fastest: interference can slow a run but never make one faster than the code really is. The skeleton and close-up speed tests switch to it. (GitHub runs this suite before every deploy, so a flaky speed test would block publishing.)

**Files:**
- Create: `src/test/fastest.test.ts`
- Create: `src/test/fastest.ts`
- Modify: `src/scene/structure/structureParts.test.ts`
- Modify: `src/scene/detail/detailModel.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `fastestMs(runs, fn): number` (`src/test/fastest.ts`), for every speed test from here on.

- [ ] **Step 1: Write the failing tests**

`src/test/fastest.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { fastestMs } from './fastest';

describe('fastestMs', () => {
  it('runs the function the given number of times and reports the quickest run', () => {
    const seen: number[] = [];
    const ms = fastestMs(4, (i) => {
      seen.push(i);
      const until = performance.now() + (i === 2 ? 1 : 6);
      while (performance.now() < until);
    });
    expect(seen).toEqual([0, 1, 2, 3]);
    expect(ms).toBeGreaterThanOrEqual(1);
    expect(ms).toBeLessThan(5);
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/test/fastest.test.ts`

Expected: FAIL — `Failed to resolve import "./fastest"`.

- [ ] **Step 3: Create `src/test/fastest.ts`**

```ts
/**
 * The fastest of `runs` timings of `fn`, in milliseconds. Speed tests compare this to their budget rather
 * than an average: when the whole suite runs in parallel, other test files steal the CPU at random, which
 * slows some runs but never makes one faster than the code really is.
 */
export function fastestMs(runs: number, fn: (run: number) => void): number {
  let best = Infinity;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn(i);
    best = Math.min(best, performance.now() - t0);
  }
  return best;
}
```

- [ ] **Step 4: Edit `src/scene/structure/structureParts.test.ts`**

Replace:

```ts
import { describe, expect, it } from 'vitest';
import { outriggerFloors } from '../../sim/construction/stages';
```

with:

```ts
import { describe, expect, it } from 'vitest';
import { fastestMs } from '../../test/fastest';
import { outriggerFloors } from '../../sim/construction/stages';
```

Replace:

```ts
      structureParts(design);
      const t0 = performance.now();
      let parts: StructurePart[] = [];
      for (let i = 0; i < 5; i++) parts = structureParts({ ...design, floors: 150 - i });
      expect((performance.now() - t0) / 5, system).toBeLessThan(30);
      expect(parts.length, system).toBeLessThan(8000);
```

with:

```ts
      structureParts(design);
      let parts: StructurePart[] = [];
      expect(fastestMs(5, (i) => (parts = structureParts({ ...design, floors: 150 - i }))), system).toBeLessThan(30);
      expect(parts.length, system).toBeLessThan(8000);
```

- [ ] **Step 5: Edit `src/scene/detail/detailModel.test.ts`**

Replace:

```ts
import { describe, expect, it } from 'vitest';
import { floorUses } from '../../sim/analysis/massing';
```

with:

```ts
import { describe, expect, it } from 'vitest';
import { fastestMs } from '../../test/fastest';
import { floorUses } from '../../sim/analysis/massing';
```

Replace:

```ts
    for (const { id } of DETAIL_VIEWS) detailModel(design, id);
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) for (const { id } of DETAIL_VIEWS) detailModel({ ...design, floors: 150 - i }, id);
    expect((performance.now() - t0) / 15).toBeLessThan(20);
  });
```

with:

```ts
    for (const { id } of DETAIL_VIEWS) detailModel(design, id);
    // Each run builds all three views, so the budget is three times one view's 20 ms.
    expect(fastestMs(5, (i) => DETAIL_VIEWS.forEach(({ id }) => detailModel({ ...design, floors: 150 - i }, id)))).toBeLessThan(3 * 20);
  });
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npx vitest run src/test/fastest.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  52 passed (52)`, `Tests  378 passed (378)`.

- [ ] **Step 7: Commit**

```bash
git add src/test/fastest.test.ts src/test/fastest.ts src/scene/structure/structureParts.test.ts src/scene/detail/detailModel.test.ts
git commit -m "test: speed tests time the fastest of several runs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 2: Window variety and plant floors

Pure helpers shared by the shader and the balconies. Room colours by use. Per-window choices (blinds on about 30% of windows covering 20–90% of the pane, about 3% of rooms dark by day, glass tint ±6%) from a salted hash, so they are independent of the night lights, with GLSL twins. Mechanical floors every 30 floors on towers of 40 floors or more, never the roof. The per-floor night attributes gain the room colour and a plant-floor flag, and plant floors never light.

**Files:**
- Create: `src/scene/facadeDetail.test.ts`
- Create: `src/scene/facadeDetail.ts`
- Modify: `src/scene/nightWindows.ts`

**Interfaces:**
- Consumes: `windowLit`, `NIGHT_LIGHTS`, `floorUses`, `designFor`.
- Produces:
  - `src/scene/facadeDetail.ts`: `ROOM_TINT`, `BLINDS_SHARE` (0.3), `DARK_SHARE` (0.03), `TINT_RANGE` (0.06), `detailHash(bay, floor, salt)`, `roomBlinds`, `roomDark`, `paneTint`, `mechanicalFloors(floors)`, `isMechanicalFloor(index, floors)`, `FACADE_DETAIL_GLSL`.
  - `nightWindowAttributes(design)` also returns `room` (3 per floor) and `mech` (1 per floor).

- [ ] **Step 1: Write the failing tests**

`src/scene/facadeDetail.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { designFor } from '../sim/testUtils';
import { NIGHT_LIGHTS, nightWindowAttributes, windowLit } from './nightWindows';
import {
  BLINDS_SHARE,
  DARK_SHARE,
  FACADE_DETAIL_GLSL,
  ROOM_TINT,
  isMechanicalFloor,
  mechanicalFloors,
  paneTint,
  roomBlinds,
  roomDark,
} from './facadeDetail';

const many = (f: (bay: number, floor: number) => number | boolean) => {
  const out: (number | boolean)[] = [];
  for (let floor = 0; floor < 120; floor++) for (let bay = -20; bay < 20; bay++) out.push(f(bay, floor));
  return out;
};

describe('window variety', () => {
  it('gives each use its own room colour', () => {
    expect(new Set(Object.values(ROOM_TINT)).size).toBe(4);
  });

  it('pulls blinds on about 30% of windows, covering 20–90% of the pane, the same every time', () => {
    const blinds = many(roomBlinds) as number[];
    const covered = blinds.filter((b) => b > 0);
    expect(covered.length / blinds.length).toBeGreaterThan(BLINDS_SHARE - 0.05);
    expect(covered.length / blinds.length).toBeLessThan(BLINDS_SHARE + 0.05);
    for (const b of covered) {
      expect(b).toBeGreaterThanOrEqual(0.2);
      expect(b).toBeLessThanOrEqual(0.9);
    }
    expect(roomBlinds(7, 31)).toBe(roomBlinds(7, 31));
  });

  it('leaves about 3% of rooms dark by day, and varies the glass tint by at most 6%', () => {
    const dark = many(roomDark) as boolean[];
    const share = dark.filter(Boolean).length / dark.length;
    expect(share).toBeGreaterThan(DARK_SHARE - 0.015);
    expect(share).toBeLessThan(DARK_SHARE + 0.015);
    const tints = many(paneTint) as number[];
    expect(Math.min(...tints)).toBeGreaterThanOrEqual(-0.06);
    expect(Math.max(...tints)).toBeLessThanOrEqual(0.06);
    expect(Math.max(...tints) - Math.min(...tints)).toBeGreaterThan(0.1);
  });

  it('chooses blinds, darkness and tint independently of the night lights', () => {
    // If they shared the night-light hash, every lit window would also have blinds.
    const lit = many((b, f) => windowLit(b, f, 0.5)) as boolean[];
    const blinds = many((b, f) => roomBlinds(b, f) > 0) as boolean[];
    const both = lit.filter((l, i) => l && blinds[i]).length;
    expect(both / lit.length).toBeGreaterThan(0.1);
    expect(both / lit.length).toBeLessThan(0.2);
  });

  it('has a GLSL twin of every choice for the facade shader', () => {
    for (const name of ['roomBlinds', 'roomDark', 'paneTint', 'detailHash']) expect(FACADE_DETAIL_GLSL).toContain(name);
  });
});

describe('mechanical floors', () => {
  it('puts plant floors every 30 floors on towers of 40 floors or more, never on the roof', () => {
    expect(mechanicalFloors(39)).toEqual([]);
    expect(mechanicalFloors(40)).toEqual([29]);
    expect(mechanicalFloors(90)).toEqual([29, 59]);
    expect(mechanicalFloors(91)).toEqual([29, 59, 89]);
    expect(isMechanicalFloor(59, 120)).toBe(true);
    expect(isMechanicalFloor(58, 120)).toBe(false);
  });

  it('never lights a mechanical floor at night', () => {
    const { design } = designFor('chicago', { floors: 70, useMix: { retail: 0, office: 100, hotel: 0, residential: 0 } });
    const a = nightWindowAttributes(design);
    expect(a.mech[29]).toBe(1);
    expect(a.lit[29]).toBe(0);
    expect(a.mech[30]).toBe(0);
    expect(a.lit[30]).toBeCloseTo(NIGHT_LIGHTS.office.lit, 6);
  });

  it('gives every floor its room colour', () => {
    const { design } = designFor('chicago', { floors: 20, useMix: { retail: 0, office: 0, hotel: 0, residential: 100 } });
    const a = nightWindowAttributes(design);
    expect(a.room.length).toBe(20 * 3);
    expect(Array.from(a.room.slice(0, 3)).every((v) => v > 0 && v <= 1)).toBe(true);
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/facadeDetail.test.ts`

Expected: FAIL — `Failed to resolve import "./facadeDetail"`.

- [ ] **Step 3: Create `src/scene/facadeDetail.ts`**

```ts
import type { UseType } from '../sim/types';

/**
 * Window-to-window variety for the facade: room colours, blinds, dark rooms and glass tint. Every choice
 * is a fixed pseudo-random number per (bay, floor) — the same every frame, here and in the shader — salted
 * so it is independent of the night-light choice.
 */

/** Colour of the rooms behind the glass, by what the floor is used for. */
export const ROOM_TINT: Record<UseType, string> = {
  office: '#c9cfd6',
  residential: '#e3d2b8',
  hotel: '#efe3c8',
  retail: '#f6f6f2',
};

/** Share of windows with blinds pulled. */
export const BLINDS_SHARE = 0.3;
/** Share of rooms dark by day. */
export const DARK_SHARE = 0.03;
/** Glass tint varies by up to this much either way. */
export const TINT_RANGE = 0.06;

const mod = (x: number, y: number) => x - y * Math.floor(x / y);

/** A fixed number 0..1 for a window and a salt (each choice uses its own salt). */
export function detailHash(bay: number, floor: number, salt: number): number {
  const v = Math.sin(mod(bay + salt * 17, 101) * 12.9898 + mod(floor + salt * 7, 89) * 78.233 + salt * 3.1) * 43758.5453;
  return v - Math.floor(v);
}

/** How far the blinds come down from the top of the pane, 0 (none) or 0.2..0.9. */
export function roomBlinds(bay: number, floor: number): number {
  return detailHash(bay, floor, 1) < BLINDS_SHARE ? 0.2 + 0.7 * detailHash(bay, floor, 2) : 0;
}

/** Whether the room is dark by day (lights off). */
export function roomDark(bay: number, floor: number): boolean {
  return detailHash(bay, floor, 3) < DARK_SHARE;
}

/** Lightness change of this pane's glass, -0.06..0.06. */
export function paneTint(bay: number, floor: number): number {
  return (detailHash(bay, floor, 4) - 0.5) * 2 * TINT_RANGE;
}

/** Plant floors with louvres instead of windows: every 30 floors on towers of 40 floors or more, never the roof. */
export function mechanicalFloors(floors: number): number[] {
  if (floors < 40) return [];
  const out: number[] = [];
  for (let i = 29; i < floors - 1; i += 30) out.push(i);
  return out;
}

export function isMechanicalFloor(index: number, floors: number): boolean {
  return floors >= 40 && index < floors - 1 && index % 30 === 29;
}

/** GLSL twins of the choices above, for the facade shader. */
export const FACADE_DETAIL_GLSL = /* glsl */ `
float detailHash(float bay, float floorIndex, float salt) {
  return fract(sin(mod(bay + salt * 17.0, 101.0) * 12.9898 + mod(floorIndex + salt * 7.0, 89.0) * 78.233 + salt * 3.1) * 43758.5453);
}
float roomBlinds(float bay, float floorIndex) {
  return detailHash(bay, floorIndex, 1.0) < ${BLINDS_SHARE.toFixed(3)} ? 0.2 + 0.7 * detailHash(bay, floorIndex, 2.0) : 0.0;
}
float roomDark(float bay, float floorIndex) {
  return detailHash(bay, floorIndex, 3.0) < ${DARK_SHARE.toFixed(3)} ? 1.0 : 0.0;
}
float paneTint(float bay, float floorIndex) {
  return (detailHash(bay, floorIndex, 4.0) - 0.5) * ${(2 * TINT_RANGE).toFixed(3)};
}`;
```

- [ ] **Step 4: Edit `src/scene/nightWindows.ts`**

Replace:

```ts
import type { Design, UseType } from '../sim/types';
```

with:

```ts
import type { Design, UseType } from '../sim/types';
import { ROOM_TINT, isMechanicalFloor } from './facadeDetail';
```

Replace:

```ts

/** Per-floor instance data for the facade shader: floor index, lit share and light colour. */
export function nightWindowAttributes(design: Design): { floor: Float32Array; lit: Float32Array; color: Float32Array } {
  const uses = floorUses(design);
```

with:

```ts

/**
 * Per-floor instance data for the facade shader: floor index, lit share and light colour, the colour of
 * the rooms behind the glass, and whether it is a mechanical floor (louvres, never lit).
 */
export function nightWindowAttributes(design: Design): {
  floor: Float32Array;
  lit: Float32Array;
  color: Float32Array;
  room: Float32Array;
  mech: Float32Array;
} {
  const uses = floorUses(design);
```

Replace:

```ts
  const color = new Float32Array(uses.length * 3);
  uses.forEach((u, i) => {
    floor[i] = i;
    lit[i] = NIGHT_LIGHTS[u].lit;
    color.set(rgb(NIGHT_LIGHTS[u].color), i * 3);
  });
  return { floor, lit, color };
}
```

with:

```ts
  const color = new Float32Array(uses.length * 3);
  const room = new Float32Array(uses.length * 3);
  const mech = new Float32Array(uses.length);
  uses.forEach((u, i) => {
    const plant = isMechanicalFloor(i, uses.length);
    floor[i] = i;
    lit[i] = plant ? 0 : NIGHT_LIGHTS[u].lit;
    color.set(rgb(NIGHT_LIGHTS[u].color), i * 3);
    room.set(rgb(ROOM_TINT[u]), i * 3);
    mech[i] = plant ? 1 : 0;
  });
  return { floor, lit, color, room, mech };
}
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run src/scene/facadeDetail.test.ts`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  53 passed (53)`, `Tests  386 passed (386)`.

- [ ] **Step 6: Commit**

```bash
git add src/scene/facadeDetail.test.ts src/scene/facadeDetail.ts src/scene/nightWindows.ts
git commit -m "feat: window variety and mechanical floors for the facade

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 3: The facade shader: rooms, recess, reflections, louvres

The facade material gains three things:

- **Rooms:** each pane traces the view ray into a 3 m-deep room (back wall with a furniture band, side walls, floor and ceiling), tinted by use, with blinds, dark rooms and glass tint from Task 1. Rooms are dimmed by day.
- **Recess:** a second, shifted lookup of the glass mask draws the opening's reveal, so the glass sits 0.3 m back.
- **Sky and sun:** a Fresnel reflection of the sky colour and a sun glint are added as emitted light, weaker at night.

Plant floors get louvres and no glass. Lit rooms glow with their room shading at night. Everything is under a `uDetail` uniform (default 0, so neighbours stay simple). `Building` passes the new per-floor attributes, turns detail on (unless `facadeDetail={false}`), and hands the glass the scene's sky colour and sun direction.

**Files:**
- Modify: `src/scene/FacadeMaterial.test.ts`
- Modify: `src/scene/Building.test.tsx`
- Modify: `src/scene/FacadeMaterial.ts`
- Modify: `src/scene/Building.tsx`

**Interfaces:**
- Consumes: Task 1: `FACADE_DETAIL_GLSL`, `nightWindowAttributes` (`room`, `mech`). Existing: `lighting`.
- Produces:
  - `FacadeUniforms` gains `uDetail`, `uSkyColor` and `uSunDir`.
  - New functions: `facadeUniforms(glowMap)`, `setFacadeDetail(material, on)`, `setFacadeSky(material, sky, sunDir)`.
  - The program cache key becomes `facade-v3`.
  - `<Building … facadeDetail? />` (default `true`).

- [ ] **Step 1: Write the failing tests**

In `src/scene/FacadeMaterial.test.ts`:

Replace:

```ts
import { unitGeometry } from './buildingGeometry';
import { createFacadeMaterial, facadeAcross, patchFacadeShader, setFacadeNight, type FacadeUniforms } from './FacadeMaterial';
```

with:

```ts
import { unitGeometry } from './buildingGeometry';
import { createFacadeMaterial, facadeAcross, facadeUniforms, patchFacadeShader, setFacadeDetail, setFacadeNight, setFacadeSky, type FacadeUniforms } from './FacadeMaterial';
```

Replace:

```ts
    };
    const uniforms: FacadeUniforms = { uNight: { value: 0 }, uTileSize: { value: new THREE.Vector2(3, 3.4) }, uGlowMap: { value: null }, uRound: { value: 0 } };
    patchFacadeShader(shader, uniforms);
```

with:

```ts
    };
    const uniforms: FacadeUniforms = facadeUniforms(null);
    uniforms.uTileSize.value.set(3, 3.4);
    patchFacadeShader(shader, uniforms);
```

Replace:

```ts
    expect(shader.uniforms.uNight).toBe(uniforms.uNight);
  });
```

with:

```ts
    expect(shader.uniforms.uNight).toBe(uniforms.uNight);
  });

  it('adds rooms behind the glass, recessed windows, sky reflections and louvred plant floors', () => {
    const shader = {
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
      uniforms: {} as Record<string, unknown>,
    };
    patchFacadeShader(shader, facadeUniforms(null));
    expect(shader.vertexShader).toContain('attribute vec3 aRoomTint;');
    expect(shader.vertexShader).toContain('attribute float aMech;');
    expect(shader.vertexShader).toContain('vFacadeWorld =');
    // Rooms: a ray traced into a box behind each pane.
    expect(shader.fragmentShader).toContain('roomBlinds(');
    expect(shader.fragmentShader).toContain('ROOM_DEPTH');
    // Recess: the glass mask looked up again, shifted by the view direction.
    expect(shader.fragmentShader).toContain('GLASS_RECESS');
    // Reflections and the sun glint go into the emitted light.
    expect(shader.fragmentShader).toContain('totalEmissiveRadiance += facadeRefl');
    expect(shader.fragmentShader).toContain('uSunDir');
    // Plant floors.
    expect(shader.fragmentShader).toContain('vMech > 0.5');
    expect(shader.uniforms.uDetail).toBeDefined();
  });

  it('turns the detail on and off and follows the sky without rebuilding the material', () => {
    const m = createFacadeMaterial(options);
    const u = m.userData.facadeUniforms as FacadeUniforms;
    // Off unless asked for: neighbouring buildings share this material and stay simple.
    expect(u.uDetail.value).toBe(0);
    setFacadeDetail(m, true);
    expect(u.uDetail.value).toBe(1);
    setFacadeDetail(m, false);
    expect(u.uDetail.value).toBe(0);
    setFacadeSky(m, '#123456', [0, 1, 0]);
    expect('#' + u.uSkyColor.value.getHexString()).toBe('#123456');
    expect(u.uSunDir.value.toArray()).toEqual([0, 1, 0]);
    expect(m.customProgramCacheKey()).toBe('facade-v3');
  });
```


In `src/scene/Building.test.tsx`:

Replace:

```tsx
    expect((body.instance as THREE.InstancedMesh).count).toBe(25);
  });
```

with:

```tsx
    expect((body.instance as THREE.InstancedMesh).count).toBe(25);
  });

  it('gives every floor its room colour and plant-floor flag, with the facade detail on unless turned off', async () => {
    const { site, design } = designFor('chicago', { floors: 70 });
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    const body = r.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    expect(body.geometry.getAttribute('aRoomTint').count).toBe(70);
    expect((body.geometry.getAttribute('aMech').array as Float32Array)[29]).toBe(1);
    const material = body.material as THREE.MeshStandardMaterial;
    expect(material.userData.facadeUniforms.uDetail.value).toBe(1);
    await r.unmount();
    const simple = await ReactThreeTestRenderer.create(<Building site={site} design={design} facadeDetail={false} />);
    const plain = simple.scene.findAll((n) => n.props.name === 'body')[0].instance as THREE.InstancedMesh;
    expect((plain.material as THREE.MeshStandardMaterial).userData.facadeUniforms.uDetail.value).toBe(0);
  });
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/FacadeMaterial.test.ts src/scene/Building.test.tsx`

Expected: FAIL — `facadeUniforms` and `setFacadeDetail` are not exported; `aRoomTint` is missing from the body geometry.

- [ ] **Step 3: Edit `src/scene/FacadeMaterial.ts`**

Replace:

```ts
import * as THREE from 'three';
import { WINDOW_HASH_GLSL } from './nightWindows';
```

with:

```ts
import * as THREE from 'three';
import { FACADE_DETAIL_GLSL } from './facadeDetail';
import { WINDOW_HASH_GLSL } from './nightWindows';
```

Replace:

```ts
  uRound: { value: number };
}
```

with:

```ts
  uRound: { value: number };
  /** 1: rooms behind the glass, recessed windows, reflections, louvred plant floors. 0: the plain painted tile. */
  uDetail: { value: number };
  uSkyColor: { value: THREE.Color };
  /** Direction toward the sun, world space, normalised. */
  uSunDir: { value: THREE.Vector3 };
}

/** Fresh uniforms for one facade material. */
export function facadeUniforms(glowMap: THREE.Texture | null): FacadeUniforms {
  return {
    uNight: { value: 0 },
    uTileSize: { value: new THREE.Vector2() },
    uGlowMap: { value: glowMap },
    uRound: { value: 0 },
    uDetail: { value: 0 },
    uSkyColor: { value: new THREE.Color('#bcd4e6') },
    uSunDir: { value: new THREE.Vector3(300, 600, 250).normalize() },
  };
}
```

Replace:

```ts
attribute vec3 aLitColor;
uniform vec2 uTileSize;
```

with:

```ts
attribute vec3 aLitColor;
attribute vec3 aRoomTint;
attribute float aMech;
uniform vec2 uTileSize;
```

Replace:

```ts
varying vec3 vLitColor;
`;
```

with:

```ts
varying vec3 vLitColor;
varying vec3 vRoomTint;
varying float vMech;
varying vec3 vFacadeWorld;
varying vec3 vFacadeNormal;
`;
```

Replace:

```ts
 * Facade UVs in metres: across = distance along the wall, up = height from the bottom of the instance.
 * Scale comes from the instance matrix, so a tapered floor keeps full-size window bays.
 */
```

with:

```ts
 * Facade UVs in metres: across = distance along the wall, up = height from the bottom of the instance.
 * Scale comes from the instance matrix, so a tapered floor keeps full-size window bays. Also passes the
 * world position and wall normal on, for the rooms, recess and reflections.
 */
```

Replace:

```ts
vec3 facadeScale = vec3(1.0);
#ifdef USE_INSTANCING
  facadeScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#endif
```

with:

```ts
vec3 facadeScale = vec3(1.0);
mat4 facadeModel = modelMatrix;
#ifdef USE_INSTANCING
  facadeScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  facadeModel = modelMatrix * instanceMatrix;
#endif
```

Replace:

```ts
vLitColor = aLitColor;
`;
```

with:

```ts
vLitColor = aLitColor;
vRoomTint = aRoomTint;
vMech = aMech;
vFacadeWorld = (facadeModel * vec4(transformed, 1.0)).xyz;
vFacadeNormal = normalize(mat3(facadeModel) * normal);
`;
```

Replace:

```ts
uniform float uNight;
uniform sampler2D uGlowMap;
```

with:

```ts
uniform float uNight;
uniform float uDetail;
uniform vec2 uTileSize;
uniform vec3 uSkyColor;
uniform vec3 uSunDir;
uniform sampler2D uGlowMap;
```

Replace:

```ts
varying vec3 vLitColor;
${WINDOW_HASH_GLSL}
`;
```

with:

```ts
varying vec3 vLitColor;
varying vec3 vRoomTint;
varying float vMech;
varying vec3 vFacadeWorld;
varying vec3 vFacadeNormal;
${WINDOW_HASH_GLSL}
${FACADE_DETAIL_GLSL}
const float ROOM_DEPTH = 3.0;
const float GLASS_RECESS = 0.3;
// How bright rooms read through the glass by day (they are much dimmer than the sky outside).
const float ROOM_DAYLIGHT = 0.4;
// Set while shading the surface and used again for the night glow and the reflections.
float facadeGlass = 0.0;
float facadeRoomShade = 1.0;
vec3 facadeRefl = vec3(0.0);

/** Traces the view ray into a box room behind the pane; returns its colour by day, and a 0..1.2 light shade. */
vec3 facadeRoom(vec2 cell, vec3 ray, vec3 tint, float bay, float floorIndex, out float shade) {
  vec3 p = vec3(cell.x * uTileSize.x, cell.y * uTileSize.y, 0.0);
  vec3 d = ray;
  float tx = d.x > 0.0 ? (uTileSize.x - p.x) / max(d.x, 1e-4) : p.x / max(-d.x, 1e-4);
  float ty = d.y > 0.0 ? (uTileSize.y - p.y) / max(d.y, 1e-4) : p.y / max(-d.y, 1e-4);
  float tz = ROOM_DEPTH / max(-d.z, 1e-4);
  float t = min(tx, min(ty, tz));
  vec3 hit = p + d * t;
  vec3 c;
  if (t == tz) {
    c = tint;
    // Desks, sofas and cabinets: a darker band along the back wall, broken into pieces.
    if (hit.y < 1.0 && fract(hit.x / 1.7 + bay * 0.37) > 0.25) c *= 0.5;
  } else if (t == ty) {
    c = d.y < 0.0 ? tint * 0.55 : tint * 1.15;
  } else {
    c = tint * 0.8;
  }
  c *= mix(1.0, 0.7, clamp(-hit.z / ROOM_DEPTH, 0.0, 1.0));
  shade = clamp(dot(c, vec3(0.333)) / max(dot(tint, vec3(0.333)), 0.05), 0.0, 1.2);
  float blinds = roomBlinds(bay, floorIndex);
  if (blinds > 0.0 && cell.y > 1.0 - blinds) {
    c = vec3(0.86, 0.85, 0.8) * (0.85 + 0.15 * step(0.5, fract(cell.y * uTileSize.y * 12.0)));
    shade = 0.8;
  }
  if (roomDark(bay, floorIndex) > 0.5) c *= 0.25;
  return c * (1.0 + paneTint(bay, floorIndex));
}
`;
```

Replace:

```ts
#endif
`;
```

with:

```ts
#endif
facadeGlass = texture2D( uGlowMap, vFacadeUv ).r;
if (uDetail > 0.5 && abs(vFacadeNormal.y) < 0.5) {
  vec3 N = normalize(vFacadeNormal);
  vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N));
  vec3 V = normalize(vFacadeWorld - cameraPosition);
  vec3 ray = vec3(dot(V, T), V.y, dot(V, N));
  float bay = floor(vFacadeUv.x);
  float floorIndex = floor(vFloor + 0.5) + floor(vFacadeUv.y);
  if (vMech > 0.5) {
    // A plant floor: louvres in place of windows, and nothing behind them to light up.
    float slat = step(0.45, fract(vFacadeUv.y * uTileSize.y * 2.5));
    diffuseColor.rgb *= mix(0.55, 1.05, slat);
    facadeGlass = 0.0;
  } else if (facadeGlass > 0.5) {
    // The glass sits back from the wall: look the mask up again where the view ray meets the glass.
    vec2 shift = (ray.xy / max(-ray.z, 0.15)) * GLASS_RECESS / uTileSize;
    if (texture2D( uGlowMap, vFacadeUv + shift ).r < 0.5) {
      // The inside face of the opening (its reveal), in the wall's colour.
      diffuseColor.rgb = texture2D( map, vFacadeUv + shift ).rgb * 0.7;
      facadeGlass = 0.0;
    } else {
      vec3 room = facadeRoom(fract(vFacadeUv), ray, vRoomTint, bay, floorIndex, facadeRoomShade);
      float fresnel = pow(1.0 - clamp(-ray.z, 0.0, 1.0), 3.0);
      float mirror = (0.08 + 0.5 * fresnel) * (1.0 - 0.75 * uNight);
      vec3 sky = mix(uSkyColor, vec3(1.0), 0.15 * (1.0 - clamp(reflect(V, N).y, 0.0, 1.0)));
      // Seen from outside by day, rooms read much darker than the sky on the glass.
      diffuseColor.rgb = mix(room * mix(ROOM_DAYLIGHT, 0.15, uNight), diffuseColor.rgb, 0.5) * (1.0 - mirror);
      float glint = pow(max(dot(reflect(V, N), normalize(uSunDir)), 0.0), 220.0) * (1.0 - uNight);
      facadeRefl = sky * mirror * 0.7 + vec3(glint);
    }
  }
}
`;
```

Replace:

```ts
if (uNight > 0.0) {
  float glass = texture2D( uGlowMap, vFacadeUv ).r;
  // vFloor is the same at every vertex but interpolation can wobble it, so round it.
  float on = step( windowHash( floor( vFacadeUv.x ), floor( vFloor + 0.5 ) + floor( vFacadeUv.y ) ), vLit );
  totalEmissiveRadiance += uNight * glass * on * vLitColor * 1.3;
}
`;

/** Rewrites a standard material's shaders so the facade tile repeats in metres and windows light up at night. */
export function patchFacadeShader(shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> }, uniforms: FacadeUniforms): void {
```

with:

```ts
if (uNight > 0.0) {
  // vFloor is the same at every vertex but interpolation can wobble it, so round it.
  float on = step( windowHash( floor( vFacadeUv.x ), floor( vFloor + 0.5 ) + floor( vFacadeUv.y ) ), vLit );
  totalEmissiveRadiance += uNight * facadeGlass * on * vLitColor * 1.3 * mix(1.0, facadeRoomShade, uDetail);
}
totalEmissiveRadiance += facadeRefl;
`;

/** Rewrites a standard material's shaders so the facade tile repeats in metres, with rooms, recess and reflections. */
export function patchFacadeShader(shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> }, uniforms: FacadeUniforms): void {
```

Replace:

```ts
 * A standard material wearing a facade tile. Create it once per texture and finish, then update it in
 * place with `setFacadeLook` and `setFacadeNight` — recreating it on every slider tick would make
 * three recompile the shader each time.
 */
```

with:

```ts
 * A standard material wearing a facade tile. Create it once per texture and finish, then update it in
 * place with `setFacadeLook`, `setFacadeNight`, `setFacadeDetail` and `setFacadeSky` — recreating it on
 * every slider tick would make three recompile the shader each time.
 */
```

Replace:

```ts
  });
  const uniforms: FacadeUniforms = {
    uNight: { value: 0 },
    uTileSize: { value: new THREE.Vector2() },
    uGlowMap: { value: o.glowMap },
    uRound: { value: 0 },
  };
  material.userData.facadeUniforms = uniforms;
  material.onBeforeCompile = (shader) => patchFacadeShader(shader, uniforms);
  material.customProgramCacheKey = () => 'facade-v2';
  setFacadeLook(material, o);
```

with:

```ts
  });
  const uniforms = facadeUniforms(o.glowMap);
  material.userData.facadeUniforms = uniforms;
  material.onBeforeCompile = (shader) => patchFacadeShader(shader, uniforms);
  material.customProgramCacheKey = () => 'facade-v3';
  setFacadeLook(material, o);
```

Replace:

```ts
  if (u) u.uNight.value = night && u.uGlowMap.value ? 1 : 0;
}
```

with:

```ts
  if (u) u.uNight.value = night && u.uGlowMap.value ? 1 : 0;
}

/** Rooms behind the glass, recessed windows and reflections on (or the plain painted tile). */
export function setFacadeDetail(material: THREE.Material, on: boolean): void {
  const u = material.userData.facadeUniforms as FacadeUniforms | undefined;
  if (u) u.uDetail.value = on ? 1 : 0;
}

/** The sky the glass reflects and the sun it glints in. */
export function setFacadeSky(material: THREE.Material, sky: string, sunDir: [number, number, number]): void {
  const u = material.userData.facadeUniforms as FacadeUniforms | undefined;
  if (!u) return;
  u.uSkyColor.value.set(sky);
  u.uSunDir.value.set(...sunDir).normalize();
}
```

- [ ] **Step 4: Edit `src/scene/Building.tsx`**

Replace:

```tsx
import { bodyInstances, facadeColor, instanceMatrix, slabInstances, unitGeometry, type BoxInstance } from './buildingGeometry';
import { createFacadeMaterial, setFacadeLook, setFacadeNight } from './FacadeMaterial';
import { TILE_HEIGHT_M } from './facadeTile';
```

with:

```tsx
import { bodyInstances, facadeColor, instanceMatrix, slabInstances, unitGeometry, type BoxInstance } from './buildingGeometry';
import { createFacadeMaterial, setFacadeDetail, setFacadeLook, setFacadeNight, setFacadeSky } from './FacadeMaterial';
import { lighting } from './lighting';
import { TILE_HEIGHT_M } from './facadeTile';
```

Replace:

```tsx
const swayMatrix = new THREE.Matrix4();
```

with:

```tsx
const swayMatrix = new THREE.Matrix4();
/** Where the scene's sun shines from (the main view's directional light). */
const SUN_DIRECTION: [number, number, number] = [300, 600, 250];
```

Replace:

```tsx
 */
function Body({ design, night, floors, litFloors, sway }: { design: Design; night: boolean; floors?: number; litFloors?: number; sway?: SwaySignal }) {
  const ref = useRef<THREE.InstancedMesh>(null);
```

with:

```tsx
 */
function Body({
  design,
  night,
  floors,
  litFloors,
  sway,
  detail,
  sky,
}: {
  design: Design;
  night: boolean;
  floors?: number;
  litFloors?: number;
  sway?: SwaySignal;
  /** Rooms behind the glass, recessed windows, reflections and louvred plant floors. */
  detail: boolean;
  /** The sky colour the glass reflects. */
  sky: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
```

Replace:

```tsx
      g.setAttribute('aLitColor', new THREE.InstancedBufferAttribute(a.color, 3));
      return g;
```

with:

```tsx
      g.setAttribute('aLitColor', new THREE.InstancedBufferAttribute(a.color, 3));
      g.setAttribute('aRoomTint', new THREE.InstancedBufferAttribute(a.room, 3));
      g.setAttribute('aMech', new THREE.InstancedBufferAttribute(a.mech, 1));
      return g;
```

Replace:

```tsx
    setFacadeNight(material, night);
  });
```

with:

```tsx
    setFacadeNight(material, night);
    setFacadeDetail(material, detail);
    setFacadeSky(material, sky, SUN_DIRECTION);
  });
```

Replace:

```tsx
  hideTopFloors = 0,
}: {
```

with:

```tsx
  hideTopFloors = 0,
  facadeDetail = true,
}: {
```

Replace:

```tsx
  hideTopFloors?: number;
}) {
```

with:

```tsx
  hideTopFloors?: number;
  /** Rooms behind the glass, recessed windows and reflections (on unless turned off). */
  facadeDetail?: boolean;
}) {
```

Replace:

```tsx
    <group name="building" position={[lx, 0, lz]}>
      <Body design={design} night={night || !!reveal?.lights} floors={floors} litFloors={reveal?.litFloors} sway={sway} />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} count={floors} sway={sway} />
```

with:

```tsx
    <group name="building" position={[lx, 0, lz]}>
      <Body
        design={design}
        night={night || !!reveal?.lights}
        floors={floors}
        litFloors={reveal?.litFloors}
        sway={sway}
        detail={facadeDetail}
        sky={lighting(site, night).sky}
      />
      <Instanced name="slabs" geometry={geometry} items={slabs} color={design.palette.accent} count={floors} sway={sway} />
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run src/scene/FacadeMaterial.test.ts src/scene/Building.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  53 passed (53)`, `Tests  389 passed (389)`.

- [ ] **Step 6: Commit**

```bash
git add src/scene/FacadeMaterial.test.ts src/scene/Building.test.tsx src/scene/FacadeMaterial.ts src/scene/Building.tsx
git commit -m "feat: rooms behind the glass, recessed windows and sky reflections

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 4: The ✨ Detail switch

A view-only store setting, `facadeDetail: 'high' | 'simple'`, which defaults to High and is kept for new projects. It has a toggle button in the 3D view's overlay. `Scene` passes it to the tower, and the construction view reads it too.

**Files:**
- Create: `src/ui/FacadeDetailToggle.test.tsx`
- Modify: `src/state/store.ts`
- Create: `src/ui/FacadeDetailToggle.tsx`
- Modify: `src/scene/Scene.tsx`
- Modify: `src/scene/construction/ConstructionView.tsx`

**Interfaces:**
- Consumes: Task 2: `<Building facadeDetail />`.
- Produces: `FacadeDetail = 'high' | 'simple'`, store `facadeDetail` and `setFacadeDetail(d)`, `<FacadeDetailToggle />` (button `✨ Detail: High` / `✨ Detail: Simple`).

- [ ] **Step 1: Write the failing tests**

`src/ui/FacadeDetailToggle.test.tsx` (new):

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '../state/store';
import { FacadeDetailToggle } from './FacadeDetailToggle';

describe('facade detail setting', () => {
  beforeEach(() => {
    useGame.getState().newProject();
    useGame.getState().startProject('chicago', 'sandbox');
  });

  it('starts on High, and switches to Simple and back', () => {
    expect(useGame.getState().facadeDetail).toBe('high');
    render(<FacadeDetailToggle />);
    const button = screen.getByRole('button', { name: /Detail: High/ });
    fireEvent.click(button);
    expect(useGame.getState().facadeDetail).toBe('simple');
    expect(screen.getByRole('button', { name: /Detail: Simple/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Detail: Simple/ }));
    expect(useGame.getState().facadeDetail).toBe('high');
  });

  it('is a view setting: kept for a new project, never in the design history', () => {
    const history = useGame.getState().history;
    useGame.getState().setFacadeDetail('simple');
    expect(useGame.getState().history).toBe(history);
    useGame.getState().newProject();
    expect(useGame.getState().facadeDetail).toBe('simple');
    useGame.getState().setFacadeDetail('high');
  });
});
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui/FacadeDetailToggle.test.tsx`

Expected: FAIL — `Failed to resolve import "./FacadeDetailToggle"`.

- [ ] **Step 3: Edit `src/state/store.ts`**

Replace:

```ts
export type ForceView = 'none' | 'wind' | 'quake';
```

with:

```ts
export type ForceView = 'none' | 'wind' | 'quake';
/** How much detail the facade is drawn with: rooms, recess and reflections, or the plain painted tile. */
export type FacadeDetail = 'high' | 'simple';
```

Replace:

```ts
  force: ForceView;
  /** Construction stage being shown (0..5) while building. */
```

with:

```ts
  force: ForceView;
  /** View only, and kept for new projects: it is about what the computer can draw smoothly, not the design. */
  facadeDetail: FacadeDetail;
  /** Construction stage being shown (0..5) while building. */
```

Replace:

```ts
  toggleForce: (f: Exclude<ForceView, 'none'>) => void;
}
```

with:

```ts
  toggleForce: (f: Exclude<ForceView, 'none'>) => void;
  setFacadeDetail: (d: FacadeDetail) => void;
}
```

Replace:

```ts
  force: 'none',
  buildStage: 0,
```

with:

```ts
  force: 'none',
  facadeDetail: 'high',
  buildStage: 0,
```

Replace:

```ts
  toggleForce: (f) => set({ force: get().force === f ? 'none' : f }),
}));
```

with:

```ts
  toggleForce: (f) => set({ force: get().force === f ? 'none' : f }),

  setFacadeDetail: (facadeDetail) => set({ facadeDetail }),
}));
```

- [ ] **Step 4: Create `src/ui/FacadeDetailToggle.tsx`**

```tsx
import { useGame } from '../state/store';

/** Switches the facade between full detail (rooms, recess, reflections) and the plain look, for slower computers. */
export function FacadeDetailToggle() {
  const detail = useGame((s) => s.facadeDetail);
  const setFacadeDetail = useGame((s) => s.setFacadeDetail);
  return (
    <button
      title="Rooms behind the windows, recessed glass and reflections. Simple is faster on slow computers."
      onClick={() => setFacadeDetail(detail === 'high' ? 'simple' : 'high')}
    >
      ✨ Detail: {detail === 'high' ? 'High' : 'Simple'}
    </button>
  );
}
```

- [ ] **Step 5: Edit `src/scene/Scene.tsx`**

Replace:

```tsx
import { DetailInset } from '../ui/DetailInset';
import { ForceBanner, ForceButtons, ForceReadout } from '../ui/ForceControls';
```

with:

```tsx
import { DetailInset } from '../ui/DetailInset';
import { FacadeDetailToggle } from '../ui/FacadeDetailToggle';
import { ForceBanner, ForceButtons, ForceReadout } from '../ui/ForceControls';
```

Replace:

```tsx
  const [sway] = useState(createSway);
  const light = lighting(site, night);
```

with:

```tsx
  const [sway] = useState(createSway);
  const facadeDetail = useGame((s) => s.facadeDetail === 'high');
  const light = lighting(site, night);
```

Replace:

```tsx
            hideTopFloors={forceOn === 'wind' && design.damping === 'tmd' ? 3 : 0}
          />
```

with:

```tsx
            hideTopFloors={forceOn === 'wind' && design.damping === 'tmd' ? 3 : 0}
            facadeDetail={facadeDetail}
          />
```

Replace:

```tsx
        <ForceButtons />
      </div>
```

with:

```tsx
        <ForceButtons />
        <FacadeDetailToggle />
      </div>
```

- [ ] **Step 6: Edit `src/scene/construction/ConstructionView.tsx`**

Replace:

```tsx
  const [lx, lz] = lotCenter(site);
  const floors = Math.floor(state.facadeTop / FLOOR_HEIGHT + 1e-6);
```

with:

```tsx
  const [lx, lz] = lotCenter(site);
  const facadeDetail = useGame((s) => s.facadeDetail === 'high');
  const floors = Math.floor(state.facadeTop / FLOOR_HEIGHT + 1e-6);
```

Replace:

```tsx
        night={night}
        reveal={{ floors, crown: Math.round(state.crown * 20) / 20, litFloors: state.litFloors, lights: state.litFloors > 0 }}
```

with:

```tsx
        night={night}
        facadeDetail={facadeDetail}
        reveal={{ floors, crown: Math.round(state.crown * 20) / 20, litFloors: state.litFloors, lights: state.litFloors > 0 }}
```

- [ ] **Step 7: Run the tests and type-check**

Run: `npx vitest run src/ui/FacadeDetailToggle.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  54 passed (54)`, `Tests  391 passed (391)`.

- [ ] **Step 8: Commit**

```bash
git add src/ui/FacadeDetailToggle.test.tsx src/state/store.ts src/ui/FacadeDetailToggle.tsx src/scene/Scene.tsx src/scene/construction/ConstructionView.tsx
git commit -m "feat: facade detail High / Simple switch

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 5: Balconies on homes

`balconyParts(design)` puts a concrete slab (1.5 m deep) and a glass railing (1.1 m) on every other bay of every home floor, or every third on walls with more than 16 bays. It skips the ground floor and plant floors, and uses the Close-up's placement helpers, so balconies follow taper, twist and round plans. `Building` draws them through `PartsMesh` (so they sway), and only up to the finished floors during construction.

**Files:**
- Create: `src/scene/balconies.test.ts`
- Modify: `src/scene/Building.test.tsx`
- Create: `src/scene/balconies.ts`
- Modify: `src/scene/Building.tsx`

**Interfaces:**
- Consumes: Task 1: `isMechanicalFloor`. Existing: `worldAnchor`, `placeAtAnchor` (`src/scene/detail/frame.ts`), `alongFace`, `planFaces`, `facadeRecipe`, `floorUses`.
- Produces: `balconyParts(design): Part[]`, and a `PartsMesh` named `balconies` inside `Building`.

- [ ] **Step 1: Write the failing tests**

`src/scene/balconies.test.ts` (new):

```ts
import { describe, expect, it } from 'vitest';
import { fastestMs } from '../test/fastest';
import { FLOOR_HEIGHT, floorSlices, plateDims } from '../sim/geometry';
import { partBounds, partIsFinite } from '../sim/parts';
import { designFor } from '../sim/testUtils';
import type { Design, PlanShape } from '../sim/types';
import { balconyParts } from './balconies';
import { isMechanicalFloor } from './facadeDetail';

const homes = { retail: 0, office: 0, hotel: 0, residential: 100 };
const offices = { retail: 0, office: 100, hotel: 0, residential: 0 };
const build = (patch: Partial<Design>) => {
  const { design } = designFor('shanghai', { shape: 'square', plateWidth: 40, floors: 30, setbacks: 'none', taper: 0, twist: 0, ...patch });
  return { design, parts: balconyParts(design) };
};

describe('balconyParts', () => {
  it('puts balconies only on homes', () => {
    expect(build({ useMix: offices }).parts).toHaveLength(0);
    expect(build({ useMix: homes }).parts.length).toBeGreaterThan(0);
  });

  it('gives every home floor a slab and a glass railing on every other bay, but not plant floors', () => {
    const { design, parts } = build({ useMix: homes, floors: 70 });
    const slabs = parts.filter((p) => p.material === 'concrete');
    const rails = parts.filter((p) => p.material === 'glass');
    expect(rails.length).toBe(slabs.length);
    const floorsWith = new Set(slabs.map((p) => Math.floor(p.position[1] / FLOOR_HEIGHT)));
    for (let f = 1; f < design.floors; f++) expect(floorsWith.has(f), `floor ${f}`).toBe(!isMechanicalFloor(f, design.floors));
    // A 40 m square with 3 m bays: 13 bays a side, balconies on 7 of them.
    const perFloor = slabs.filter((p) => Math.floor(p.position[1] / FLOOR_HEIGHT) === 10).length;
    expect(perFloor).toBe(4 * 7);
  });

  it.each(['square', 'rectangle', 'circle', 'triangle'] as PlanShape[])('%s: stands out from the wall, finite and within reach', (shape) => {
    for (const extreme of [{ floors: 5 }, { floors: 150, taper: 0.6, twist: 120, setbacks: 'wedding-cake' as const, plateWidth: 15 }]) {
      const { design, parts } = build({ useMix: homes, shape, ...extreme });
      const { width, depth } = plateDims(design);
      expect(parts.length).toBeGreaterThan(0);
      for (const p of parts) {
        expect(partIsFinite(p)).toBe(true);
        const b = partBounds(p);
        expect(Math.hypot(p.position[0], p.position[2])).toBeLessThan(Math.hypot(width, depth) / 2 + 2);
        expect(b.min[1]).toBeGreaterThanOrEqual(-1e-6);
        expect(b.max[1]).toBeLessThanOrEqual(design.floors * FLOOR_HEIGHT + 1e-6);
      }
    }
  });

  it('follows a round plan: every balcony sits just outside its floor', () => {
    const { design, parts } = build({ useMix: homes, shape: 'circle', floors: 20 });
    const r = floorSlices(design)[5].width / 2;
    for (const p of parts.filter((q) => q.material === 'concrete' && Math.floor(q.position[1] / FLOOR_HEIGHT) === 5)) {
      const d = Math.hypot(p.position[0], p.position[2]);
      expect(d).toBeGreaterThan(r);
      expect(d).toBeLessThan(r + 1.6);
    }
  });

  it('builds the worst case quickly, under 10,000 parts', () => {
    const { design } = designFor('shanghai', { floors: 150, plateWidth: 80, shape: 'circle', useMix: homes, setbacks: 'none' });
    balconyParts(design);
    let n = 0;
    expect(fastestMs(5, (i) => (n = balconyParts({ ...design, floors: 150 - i }).length))).toBeLessThan(30);
    expect(n).toBeLessThan(10000);
  });
});
```


In `src/scene/Building.test.tsx`:

Replace:

```tsx
import type { PlanShape } from '../sim/types';
import { Building } from './Building';
```

with:

```tsx
import type { PlanShape } from '../sim/types';
import { balconyParts } from './balconies';
import { Building } from './Building';
```

Replace:

```tsx
    expect((plain.material as THREE.MeshStandardMaterial).userData.facadeUniforms.uDetail.value).toBe(0);
  });
```

with:

```tsx
    expect((plain.material as THREE.MeshStandardMaterial).userData.facadeUniforms.uDetail.value).toBe(0);
  });

  it('draws balconies on home floors, and only up to the floors built so far during construction', async () => {
    const { site, design } = designFor('chicago', { floors: 30, useMix: { retail: 0, office: 0, hotel: 0, residential: 100 } });
    const all = balconyParts(design);
    const r = await ReactThreeTestRenderer.create(<Building site={site} design={design} />);
    expect(instanceTotal(r, 'balconies')).toBe(all.length);
    await r.unmount();
    const half = await ReactThreeTestRenderer.create(<Building site={site} design={design} reveal={{ floors: 10, crown: 0, litFloors: 0, lights: false }} />);
    expect(instanceTotal(half, 'balconies')).toBe(all.filter((p) => p.position[1] < 10 * 4).length);
    expect(instanceTotal(half, 'balconies')).toBeLessThan(all.length);
  });
```


- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/scene/balconies.test.ts src/scene/Building.test.tsx`

Expected: FAIL — `Failed to resolve import "./balconies"`.

- [ ] **Step 3: Create `src/scene/balconies.ts`**

```ts
import { floorUses } from '../sim/analysis/massing';
import { facadeRecipe } from '../sim/facade';
import { floorSlices } from '../sim/geometry';
import type { Part } from '../sim/parts';
import type { Design } from '../sim/types';
import { placeAtAnchor, worldAnchor } from './detail/frame';
import { isMechanicalFloor } from './facadeDetail';
import { alongFace, planFaces } from './parts/placement';

/** How far a balcony stands out from the wall, and its railing's height, metres. */
const DEPTH = 1.5;
const RAIL = 1.1;
const SLAB = 0.2;
/** Walls with more bays than this get a balcony on every third bay instead of every other. */
const LONG_WALL_BAYS = 16;

/**
 * Balconies on every other bay (every third on long walls) of every home floor (not the ground floor or plant floors): a concrete
 * slab standing out from the wall and a glass railing along its edge. Placed on each wall with the same
 * helpers as the close-up, so they follow taper, twist and round plans. Building coordinates.
 */
export function balconyParts(design: Design): Part[] {
  const uses = floorUses(design);
  const bay = facadeRecipe(design).pattern.bayWidth;
  const width = bay * 0.85;
  const parts: Part[] = [];
  for (const slice of floorSlices(design)) {
    if (slice.index === 0 || uses[slice.index] !== 'residential' || isMechanicalFloor(slice.index, design.floors)) continue;
    for (const face of planFaces(design.shape, slice.width, slice.depth)) {
      const n = Math.floor(face.length / bay);
      // Every other bay; every third on long walls, which keeps the biggest towers within budget.
      const step = n > LONG_WALL_BAYS ? 3 : 2;
      for (let k = 0; k < n; k += step) {
        const anchor = worldAnchor(slice, alongFace(design.shape, slice.width, slice.depth, face, (k - (n - 1) / 2) * bay));
        parts.push(placeAtAnchor({ shape: 'box', position: [0, SLAB / 2, DEPTH / 2], scale: [width, SLAB, DEPTH], material: 'concrete' }, anchor));
        parts.push(placeAtAnchor({ shape: 'box', position: [0, SLAB + RAIL / 2, DEPTH - 0.05], scale: [width, RAIL, 0.06], material: 'glass' }, anchor));
      }
    }
  }
  return parts;
}
```

- [ ] **Step 4: Edit `src/scene/Building.tsx`**

Replace:

```tsx
import { nightWindowAttributes } from './nightWindows';
import { crownParts } from './crownParts';
```

with:

```tsx
import { nightWindowAttributes } from './nightWindows';
import { balconyParts } from './balconies';
import { crownParts } from './crownParts';
```

Replace:

```tsx
  const bracing = useMemo(() => bracingParts(design), [design]);
  const share = reveal ? reveal.crown : 1;
```

with:

```tsx
  const bracing = useMemo(() => bracingParts(design), [design]);
  const balconies = useMemo(() => balconyParts(design), [design]);
  const share = reveal ? reveal.crown : 1;
```

Replace:

```tsx
  const floors = Math.min(reveal?.floors ?? design.floors, design.floors - hideTopFloors);
  return (
```

with:

```tsx
  const floors = Math.min(reveal?.floors ?? design.floors, design.floors - hideTopFloors);
  // During construction, balconies only on the floors finished so far.
  const shownBalconies = useMemo(
    () => (floors >= design.floors ? balconies : balconies.filter((p) => p.position[1] < floors * FLOOR_HEIGHT)),
    [balconies, floors, design.floors],
  );
  return (
```

Replace:

```tsx
      <PartsMesh name="ornaments" parts={top.ornaments} {...look} />
      {/* While building, exposed bracing is part of the bare structure instead. */}
```

with:

```tsx
      <PartsMesh name="ornaments" parts={top.ornaments} {...look} />
      <PartsMesh name="balconies" parts={shownBalconies} {...look} />
      {/* While building, exposed bracing is part of the bare structure instead. */}
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npx vitest run src/scene/balconies.test.ts src/scene/Building.test.tsx`

Expected: PASS.

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  55 passed (55)`, `Tests  400 passed (400)`.

- [ ] **Step 6: Commit**

```bash
git add src/scene/balconies.test.ts src/scene/Building.test.tsx src/scene/balconies.ts src/scene/Building.tsx
git commit -m "feat: balconies on residential floors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```

---

### Task 6: README, shader check and visual check

Tell players about the detail, then check in a real browser: the shader compiles, and it looks right in every style.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a README paragraph about the facade detail.

- [ ] **Step 1: Edit `README.md`**

Replace:

```markdown
**💨 Wind** and **〰️ Earthquake** (bottom-left of the 3D view) show those forces acting on your tower, while you design or after it is built: the tower sways (drawn much bigger than real), the ground shakes, and dampers and base isolation visibly do their jobs. The card beside them explains what you are seeing with your tower's own numbers.
```

with:

```markdown
**💨 Wind** and **〰️ Earthquake** (bottom-left of the 3D view) show those forces acting on your tower, while you design or after it is built: the tower sways (drawn much bigger than real), the ground shakes, and dampers and base isolation visibly do their jobs. The card beside them explains what you are seeing with your tower's own numbers.

Up close, every window has a room behind it — with depth, blinds and furniture — and the glass sits back from the wall and reflects the sky. Homes get balconies and tall towers get louvred plant floors every 30 floors. If your computer struggles, switch **✨ Detail** to Simple.
```

- [ ] **Step 2: Check the shader compiles, and check it by eye**

Run `npm run dev`, open the printed link in Chrome, and open the developer console.

- **Shader:** choose **Sandbox in Chicago**. The console must show **no** `THREE.WebGLProgram: Shader Error`. jsdom cannot compile GLSL, so this is the only check that catches a GPU compile error.
- **Every style** (choose each from the Style menu), by day and at 🌙 Night, at the normal framing and zoomed in close with the mouse wheel:
  - mid range: glass styles still read as glass (dark, slightly reflective), not pale;
  - close: each window shows a room with depth (side walls, floor, ceiling, a darker furniture band); some have blinds, a few are dark; the glass sits back from the wall with a visible reveal;
  - night: lit rooms glow with depth; unlit rooms are dark.
- **Plant floors:** with 60+ floors, a louvred band at floors 30 and 60. It is never lit at night.
- **Homes:** set the use mix to 100% homes. Balconies with glass railings appear on every other bay, and on every third on big round plates. Build it: balconies appear floor by floor.
- **Grazing angles:** orbit to look along a wall and straight up it. There should be no speckle or stretching.
- **Round towers** (Neo-futurist): no seams in the rooms close up.
- **✨ Detail: Simple:** the facade returns to the plain painted look at once; High brings the detail back.
- **Chromebook:** with High, orbiting stays smooth. If not, Simple must be.

- [ ] **Step 3: Run the tests and type-check**

Run: `npm run typecheck && npm test`

Expected: no type errors; `Test Files  55 passed (55)`, `Tests  400 passed (400)`.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe the facade detail in the README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QVGH2YYxvj7u3KsN7AmuMp"
```
