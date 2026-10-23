# Plan 12 — Building Systems Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The tower's working parts show where a real building would show them:
- **Exposed structure** that looks engineered: X-bracing with flanges and node plates, a diagrid with cast nodes, and belt trusses at plant floors.
- **Equipment on the walls:** window AC units, louvre and vent grilles.
- **Real rooftop plant:** fanned cooling towers, chillers, ducts, exhaust fans, dishes, lightning rods, a maintenance gantry with its cradle, and a staved water tank.
- **A proper entrance:** a lit canopy, a revolving door, a lit lobby, a plinth, planters and paving.

**Architecture:**
- New pure builders in `src/scene/systems/`, plus enrichment of `dressing.ts` and `bracingParts`.
- Small pieces are marked `fine`. A generalised `NearParts` (from Plan 11's `CrownFine`) draws them only when the camera is within 300 m of their area: roof fine parts near the roof, street-level fine parts near the base, wall fine parts (AC units) near the tower.
- **Machinery ignores Ornament amount.** Decorative items (planters, paving joints, canopy lights) are dropped on None.

**Tech Stack:** React 19, three 0.186, @react-three/fiber 9, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-20-surface-detail-design.md` §7 (and §2, §8).

## Global Constraints

- No new dependencies.
- **Never push or merge to `master` without the user's explicit word.**
- **Budgets on a 150-floor tower:** at most **3,000** coarse and **6,000** fine systems parts. Builders take less than **20 ms** (fastest of 3).
- Everything stays clear of a helipad or pool, inside the roof, and off triangle edges, as Plan 7's tests already require.
- **Detail: Simple** keeps today's plain dressing: the fine parts aren't drawn and AC units aren't built.
- **AC units** go only on residential and hotel floors, only on Chicago School, Gothic Revival and Art Deco, and only on non-plant floors, on about **15%** of windows, chosen by `detailHash(cell, floor, 5)`.

## Review Focus

1. **Round, triangle and twisted towers:** AC units and brace plates sit on the real wall, not floating or buried. Tests in Tasks 2 and 3 (distance to the wall plane).
2. **A setback tower:** AC units stay on the floor's own wall, not on the ledge below. Test in Task 3.
3. **Close-range 3D wall chunks (Plan 10):** AC units sit at the wall face, which the 3D bays share, so they don't clash. Visual check in Task 6.
4. **Construction:** systems parts appear with the dressing (bracing excluded, as today). Test in Task 5.
5. **Night:** canopy edge lights and the lobby glow, and nothing else in the systems parts glows. Test in Task 4.

---

### Task 1: NearParts, generalised from CrownFine

**Files:**
- Create: `src/scene/NearParts.tsx`, which replaces `crowns/CrownFine.tsx`. The crown keeps using it.
- Modify: `src/scene/Building.tsx`
- Test: `src/scene/crowns/CrownFine.test.tsx` (it imports from the new path)

**Interfaces:**
- Produces: `<NearParts name: string; parts: Part[]; centre: Vec3; offset: [number, number]; within?: number (default 300); ...PartsMesh look props />`.
  - It turns on below `within − 20 m` and off above `within + 20 m`. This also fixes Plan 11's deferred minor about switching at the edge.
- Produces: `NEAR_M = 300`. `CROWN_FINE_M` becomes a re-export of it.

- [ ] **Step 1: Write the failing test.** Add to the CrownFine test file: "doesn't flicker at the edge". Put the camera at 305 m after it was at 250 m: still shown. Then at 330 m: hidden.
- [ ] **Step 2: Run the test to check it fails.**
  - Run: `npx vitest run src/scene/crowns/CrownFine.test.tsx`
  - Expected: FAIL.
- [ ] **Step 3: Implement**, keeping the crown's `name="crown-fine"`.
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `refactor: NearParts draws fine detail near any spot, with a little hysteresis`

### Task 2: Engineered exposed structure

**Files:**
- Modify: `src/scene/ornaments.ts` (`bracingParts`)
- Create: `src/scene/systems/structure.ts`
- Test: `src/scene/systems/structure.test.ts`

**Interfaces:**
- Produces: `bracingParts(design)`. Signature unchanged; the output is richer.
- Produces: `beltTrussParts(design): Part[]`.
- **When `exposedStructure` is on:**
  - **Diagrid** (`system === 'diagrid'`): diagonal members every bay-pair crossing on each face, with a cast node (an `octagon`, coarse) at every crossing.
  - **Other systems:** today's X-braces, each built as an I-section, i.e. a web plus two flanges: 3 struts, with the flanges `fine`. Each brace gets a node plate (a coarse box) where the X crosses, gusset plates (fine) at both ends, and a bolt grid of 4 small cylinders (fine) on each plate.
- **Belt truss** for `core-outrigger` and `bundled-tube`, whether or not the structure is exposed: a steel band of V-diagonals (coarse) on each mechanical floor, set 0.25 m proud of the wall, on every face.

- [ ] **Step 1: Write the failing tests**
  - **"X-braces have flanges, node plates, gussets and bolts"**:
    - framed-tube with exposed structure, 40 floors, square;
    - per brace: 1 coarse web, 2 fine flanges, 1 node plate per X, 2 gussets, and ≥ 8 bolts per X;
    - every part is within 2 m of a wall plane.
  - **"a diagrid has cast nodes at its crossings"**: diagrid with exposed structure, 40 floors; ≥ 16 `octagon` nodes, and every node lies on a wall plane within 1.5 m.
  - **"belt trusses wrap the plant floors of outrigger and bundled-tube towers"**:
    - core-outrigger, 70 floors: truss parts lie only between y = 29·4 and 30·4, and between 59·4 and 60·4;
    - rigid-frame gives none.
  - **"round and twisted towers keep their structure on the wall"**: circle with twist 90 and exposed structure; every coarse part is within 2.5 m of the floor's outline at its height.
- [ ] **Step 2: Run the tests to check they fail.**
  - Run: `npx vitest run src/scene/systems/structure.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement.** `Building` adds `beltTrussParts` to the bracing mesh. The fine parts go to `NearParts name="structure-fine"`, centred at mid-height with `within` = 300 + height / 2.
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene`
  - Expected: PASS. Existing bracing tests are updated only where they count parts.
- [ ] **Step 5: Commit** `feat: engineered exposed structure — flanged braces, node plates and bolts, diagrid nodes, belt trusses at plant floors`

### Task 3: Equipment on the walls

**Files:**
- Create: `src/scene/systems/wallKit.ts`
- Test: `src/scene/systems/wallKit.test.ts`

**Interfaces:**
- Produces: `AC_SHARE = 0.15`, `AC_STYLES`, and `wallKitParts(design): Part[]`. They are built on the facade shader's cell grid, reusing Plan 10's `chunkCells` and `alongFace`, so each unit sits under a real window:
  - **AC units:** a box 0.75 × 0.45 × 0.55 sticking out of the wall, with a grille face (fine) and a drip bracket (fine). It sits 0.25 m below the window opening's sill, `openingFor(...)`.
  - **Louvre band:** across the front above the entrance, at the top of the ground floor; slats are fine.
  - **Vent grilles:** at the base on every face, every 12 m.

- [ ] **Step 1: Write the failing tests**
  - **"AC units on about 15% of home windows, only on old styles and only on home or hotel floors"**:
    - a Chicago tower, all residential, 40 floors: the unit count over the eligible windows is within 0.15 ± 0.04;
    - an all-office tower gets none;
    - an International-style tower gets none.
  - **"each unit sits under its window, on the wall"**:
    - for a square tower, each unit body's centre is 0.2–0.4 m out from the wall plane;
    - its x matches a cell centre;
    - it is on a non-plant floor;
    - on a wedding-cake setback tower, the same holds against that floor's own wall.
  - **"round towers: units follow the drum"**: the distance from the axis to each unit body is radius + 0.15 to 0.45.
  - **"louvres above the door and vents at the base"**: louvre slats lie between y = 3 and 4; there are vent grilles on every face.
  - **"within budget and quick"**: a 150-floor all-residential Chicago tower has ≤ 3,000 coarse and ≤ 6,000 fine parts, built in < 20 ms.
- [ ] **Step 2: Run the tests to check they fail.**
  - Run: `npx vitest run src/scene/systems/wallKit.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement.** In `Building`, when `facadeDetail` is on, add the coarse parts to a `PartsMesh name="wall-kit"` (it sways) and the fine parts to `NearParts name="wall-kit-fine"`.
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: window AC units on old home and hotel floors, louvres over the door, vents at the base`

### Task 4: Rooftop plant and the entrance, in detail

**Files:**
- Modify: `src/scene/dressing/dressing.ts`
- Test: `src/scene/dressing/dressing.test.ts`

**Spec:**
- **Cooling towers** keep their concrete body. They gain a fan shroud (a `torus` on top), a fan (4 blades, `animate: 'spin'`, fine) and louvred side grilles (fine).
- **The plant room** becomes a chiller housing with ribbed side panels (fine), plus a duct run (2–3 boxes) to the nearest cooling tower.
- **Two exhaust fans:** a cylinder with a cone cap.
- **A satellite dish:** a `dome` turned to face the sky, with a stand.
- **Lightning rods** every 6 m along the parapet (fine). There are none when the deck already has an edge.
- **The window-cleaning crane** becomes a maintenance gantry (BMU): a mast, a jib and a hanging cradle on cables. The cables are fine.
- **The water tank** gets staves (fine vertical strips) and 3 steel hoops (`torus`).
- **Entrance:**
  - the canopy gets a fascia band and a lit edge strip (`light`, glow, coarse);
  - the revolving door becomes a glass drum with 4 leaves (fine) and a steel cap;
  - a lit lobby panel goes behind the door (`light`, glow, coarse, 0.3 m inside the wall);
  - a raised plinth runs along the front;
  - two planters with shrubs flank the door (decorative, dropped on None);
  - paving joints are fine strips (decorative).
- **The rule:** machinery stays on Ornament amount None; planters, paving and canopy lights go.

- [ ] **Step 1: Write the failing tests.** Add to `dressing.test.ts`:
  - **"cooling towers have shrouds and spinning fans; the plant room has ducts and a dish"**;
  - **"the cleaning gantry hangs a cradle on cables"**;
  - **"lightning rods line the parapet, but not where the deck already has an edge"**;
  - **"the water tank has staves and hoops"**;
  - **"the entrance has a lit canopy edge, a four-leaf revolving door, a lit lobby and a plinth; planters and paving go on Ornament None"**;
  - **"only the canopy edge and the lobby glow"**;
  - and the existing 'clear of the helipad' and 'inside the roof' tests, extended to the new parts.
- [ ] **Step 2: Run the tests to check they fail.**
  - Run: `npx vitest run src/scene/dressing`
  - Expected: FAIL.
- [ ] **Step 3: Implement.** In `Building`, `dressing` splits into coarse (`PartsMesh name="dressing"`) and fine. Fine parts above the body's half-height go to `NearParts name="roof-fine"`; the rest go to `NearParts name="street-fine"`.
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: rooftop plant and the entrance in detail — fanned cooling towers, chillers and ducts, dishes, lightning rods, a BMU cradle, a staved tank, a lit canopy and lobby`

### Task 5: Construction and Simple

**Files:**
- Modify: `src/scene/Building.tsx`
- Test: `src/scene/Building.test.tsx`

- [ ] **Step 1: Write the failing tests**
  - **"Detail: Simple draws no wall kit and no fine systems parts"**: there are no `wall-kit`, `roof-fine`, `street-fine` or `structure-fine` groups with instances.
  - **"while building, the wall kit appears with the floors that are finished"**: the `wall-kit` instances all have y < floors × 4.
- [ ] **Step 2: Run the tests to check they fail.**
- [ ] **Step 3: Implement.** Filter the wall kit by `floors`, as is done for balconies.
- [ ] **Step 4: Run the tests to check they pass.**
  - Run: `npx vitest run src/scene`
  - Expected: PASS.
- [ ] **Step 5: Commit** `feat: building systems follow construction and Detail: Simple`

### Task 6: Docs and the visual check

- [ ] **Step 1: README.** One paragraph on building systems.
- [ ] **Step 2: Full suite.**
  - Run: `npx vitest run && npx tsc -b && npx vite build`
  - Expected: PASS.
- [ ] **Step 3: Visual check (CDP).**
  - Shots:
    - a High-Tech tower with exposed X-bracing, close up;
    - a diagrid;
    - a core-outrigger with a belt truss;
    - a Chicago residential tower with AC units, close up, including inside a 3D chunk;
    - a flat roof with plant and a helipad;
    - a New York tank;
    - the entrance by day and night.
  - Expected: zero console errors, and nothing floating or buried.
- [ ] **Step 4: Commit** `docs: building systems`
